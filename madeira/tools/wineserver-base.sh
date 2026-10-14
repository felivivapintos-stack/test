#!/bin/bash
# Build the base libwineserver.a that Madeira's build/wineserver/build.sh expects
# to find in app/Madeira (it is git-ignored upstream and not documented): every
# wineserver source compiled for iOS with the same flags that script uses. The
# script then swaps in its patched objects. Run from the Madeira checkout root.
set -u
R="$PWD"
SDK=$(xcrun --sdk iphoneos --show-sdk-path)
B="$R/build/wineserver"
OUT="$B/base-obj"
mkdir -p "$OUT"
FLAGS=(
    -arch arm64 -isysroot "$SDK" -miphoneos-version-min=17.0 -O2
    -I"$R/wine/include" -I"$R/wine/include/wine" -I"$R/wine/build-macos/include"
    -I"$B" -I"$R/wine/server" -I"$R/build/ntdll-unix/shims"
    -I"$R/build/madsync" -DHAVE_LINUX_NTSYNC_H=1
    -include "$B/config_ios.h" -include stdarg.h -include "$B/unicode_fix.h"
    -include "$B/wineserver_ios_kill.h"
    -DBINDIR=\"/usr/local/bin\" -DDATADIR=\"/usr/local/share\"
    -D__WINESRC__ -DWINE_IOS=1 -Dmain=wineserver_main
    -Wno-implicit-function-declaration
)
SOURCES=$(sed -n '/SOURCES/,/^$/p' "$R/wine/server/Makefile.in" | tr -s ' \t\\' '\n' | grep '\.c$')
ok=0; failed=""
for src in $SOURCES; do
    name=${src%.c}
    if xcrun -sdk iphoneos clang "${FLAGS[@]}" -c "$R/wine/server/$src" -o "$OUT/$name.o" 2>"$OUT/$name.err"; then
        ok=$((ok + 1))
    else
        failed="$failed $name"
    fi
done
echo "wineserver base: $ok compiled; failed:${failed:- none}"
for name in $failed; do echo "== $name"; grep -m5 "error" "$OUT/$name.err"; done
rm -f "$R/app/Madeira/libwineserver.a"
ar rcs "$R/app/Madeira/libwineserver.a" "$OUT"/*.o
ls -la "$R/app/Madeira/libwineserver.a"
