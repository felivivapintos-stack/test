# Wine para iOS

Estratégia: partir do Wine oficial, que já suporta ARM64 em Darwin e páginas de 16 KB, e
acrescentar patches (`patches/`) até correr dentro da app iOS.

1. **macOS ARM64 (banco de testes no CI)** — compilar com `--enable-archs=arm64ec,aarch64`
   e correr `tests/hello.c` nativo (aarch64) e x86_64 via FEX (`libarm64ecfex.dll`).
   O macOS ARM tem páginas de 16 KB como o iOS, por isso apanha a maioria dos problemas
   sem precisar do iPhone.
2. **iOS** — compilar o lado unix para `arm64-apple-ios`, carregar o Wine como biblioteca
   dentro da app (sem `exec` do loader), wineserver numa thread, sem `fork`.
