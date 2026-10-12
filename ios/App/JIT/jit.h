#ifndef PCEMU_JIT_H
#define PCEMU_JIT_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/// Executable memory with a separate writable alias (W^X).
typedef struct {
    void *rx;
    void *rw;
    size_t size;
} jit_region;

/// True if this build was signed with get-task-allow (needed for any JIT method).
bool jit_has_get_task_allow(void);

/// True once a debugger (StikDebug, Xcode…) has attached: CS_DEBUGGED is set.
bool jit_is_debugged(void);

/// Allocates an RX region and its RW alias. With `txm`, uses the StikJIT
/// universal breakpoint protocol; must only be called once CS_DEBUGGED is set.
bool jit_region_create(jit_region *out, size_t size, bool txm);

/// Ends the TXM protocol (JIT26Detach). No-op without `txm`.
void jit_finish_setup(bool txm);

/// Emits `add w0, w0, w1; ret` into the region and runs it.
int32_t jit_selftest(const jit_region *region, int32_t a, int32_t b);

/// Human-readable description of the last failure.
const char *jit_last_error(void);

#endif
