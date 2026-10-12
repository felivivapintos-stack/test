# Engine

Componentes do motor copiados para `PCEmu.app/Engine` durante a compilação no CI:

- `fex/` — `libarm64ecfex.dll` e `libwow64fex.dll` do FEX-Emu (compilados com llvm-mingw).
- `wine/` — Wine para iOS (ainda não existe).
- `dxmt/` — DXMT (ainda não existe).

Não se faz commit dos binários; o workflow `.github/workflows/ios.yml` gera-os.
