#include "jit.h"

#include <CoreFoundation/CoreFoundation.h>
#include <errno.h>
#include <libkern/OSCacheControl.h>
#include <mach/mach.h>
#include <stdio.h>
#include <string.h>
#include <sys/mman.h>
#include <unistd.h>

#define CS_OPS_STATUS 0
#define CS_DEBUGGED 0x10000000

extern int csops(pid_t pid, unsigned int ops, void *useraddr, size_t usersize);
extern void *SecTaskCreateFromSelf(CFAllocatorRef allocator);
extern CFTypeRef SecTaskCopyValueForEntitlement(void *task, CFStringRef entitlement, CFErrorRef *error);

static char last_error[256];

static void set_error(const char *what, int code) {
    snprintf(last_error, sizeof last_error, "%s (%d: %s)", what, code, strerror(code));
}

const char *jit_last_error(void) {
    return last_error;
}

// StikJIT universal script protocol (see StikJIT INTEGRATION.md).
// A brk without the script attached crashes the process.
__attribute__((noinline, optnone, naked))
static void JIT26Detach(void) {
    __asm__(
        "mov x16, #0\n"
        "brk #0xf00d\n"
        "ret\n"
    );
}

__attribute__((noinline, optnone, naked))
static void *JIT26PrepareRegion(void *address, size_t length) {
    __asm__(
        "mov x16, #1\n"
        "brk #0xf00d\n"
        "ret\n"
    );
}

bool jit_has_get_task_allow(void) {
    void *task = SecTaskCreateFromSelf(NULL);
    if (task == NULL) {
        return false;
    }
    CFTypeRef value = SecTaskCopyValueForEntitlement(task, CFSTR("get-task-allow"), NULL);
    bool result = value == kCFBooleanTrue;
    if (value != NULL) {
        CFRelease(value);
    }
    CFRelease((CFTypeRef)task);
    return result;
}

bool jit_is_debugged(void) {
    uint32_t flags = 0;
    if (csops(getpid(), CS_OPS_STATUS, &flags, sizeof flags) != 0) {
        return false;
    }
    return (flags & CS_DEBUGGED) != 0;
}

bool jit_region_create(jit_region *out, size_t size, bool txm) {
    size_t page = (size_t)getpagesize();
    size = (size + page - 1) & ~(page - 1);

    void *rx;
    if (txm) {
        rx = JIT26PrepareRegion(NULL, size);
        if (rx == NULL) {
            set_error("JIT26PrepareRegion devolveu NULL", 0);
            return false;
        }
    } else {
        rx = mmap(NULL, size, PROT_READ | PROT_EXEC, MAP_ANON | MAP_PRIVATE, -1, 0);
        if (rx == MAP_FAILED) {
            set_error("mmap RX falhou", errno);
            return false;
        }
    }

    vm_address_t rw = 0;
    vm_prot_t cur_prot, max_prot;
    kern_return_t kr = vm_remap(mach_task_self(), &rw, size, 0, VM_FLAGS_ANYWHERE,
                                mach_task_self(), (vm_address_t)rx, FALSE,
                                &cur_prot, &max_prot, VM_INHERIT_NONE);
    if (kr != KERN_SUCCESS) {
        snprintf(last_error, sizeof last_error, "vm_remap falhou (kern_return %d)", kr);
        return false;
    }
    if (mprotect((void *)rw, size, PROT_READ | PROT_WRITE) != 0) {
        set_error("mprotect RW do alias falhou", errno);
        return false;
    }

    out->rx = rx;
    out->rw = (void *)rw;
    out->size = size;
    return true;
}

void jit_finish_setup(bool txm) {
    if (txm) {
        JIT26Detach();
    }
}

int32_t jit_selftest(const jit_region *region, int32_t a, int32_t b) {
    static const uint32_t code[] = {
        0x0B010000, // add w0, w0, w1
        0xD65F03C0, // ret
    };
    memcpy(region->rw, code, sizeof code);
    sys_icache_invalidate(region->rx, sizeof code);
    int32_t (*fn)(int32_t, int32_t) = (int32_t (*)(int32_t, int32_t))region->rx;
    return fn(a, b);
}
