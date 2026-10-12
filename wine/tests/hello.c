/* Smoke test + CPU benchmark for the Wine/FEX stack.
 * Built as aarch64 (native) and x86_64 (runs through FEX) to compare. */
#include <stdio.h>
#include <windows.h>

static int count_primes(int limit)
{
    int count = 0;
    for (int n = 2; n < limit; n++)
    {
        int prime = 1;
        for (int d = 2; d * d <= n; d++)
            if (n % d == 0) { prime = 0; break; }
        count += prime;
    }
    return count;
}

int main(void)
{
    SYSTEM_INFO info;
    LARGE_INTEGER freq, start, end;

    GetNativeSystemInfo(&info);
#if defined(__x86_64__)
    const char *arch = "x86_64";
#elif defined(__aarch64__)
    const char *arch = "aarch64";
#else
    const char *arch = "other";
#endif
    printf("PCEmu hello: built for %s, native arch %u, page size %lu, %lu CPUs\n",
           arch, info.wProcessorArchitecture, info.dwPageSize, info.dwNumberOfProcessors);

    QueryPerformanceFrequency(&freq);
    QueryPerformanceCounter(&start);
    int primes = count_primes(3000000);
    QueryPerformanceCounter(&end);
    printf("PCEmu bench: %d primes in %.0f ms\n", primes,
           (double)(end.QuadPart - start.QuadPart) * 1000.0 / freq.QuadPart);
    return 0;
}
