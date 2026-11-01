# Glosso syntax assets

The query files and Wasm parser are used by the manual's browser highlighter.
They are built from the sibling `../tree-sitter-glosso` grammar, which follows
the current compiler: `#module_params`, import arguments and selectors
(`M :: #import "M"(COUNT = 4) { a, Class };`), nested block
comments (through `src/scanner.c`), `#public,unit` and `#public,to(...)`,
`#matrix` literals, `#temp_scope`, read-only `*const T` pointers and views,
`c"..."` and `b"..."` literals, suffix address-of (`value.&`), symbolic suffix
operators such as `x!!`, `#align(N)` structs, `#specialize`, and
`#meaningful { T,,foo; }` field requirements. Syntax the compiler rejects
(for example `#load`, `#memory` contracts or the `mut` qualifier) does not
parse.

Build in a staging directory so the sibling repository stays unchanged.
Include `src/scanner.c`: the grammar uses it for comments and to distinguish
symbolic suffix operators from infix operators. Omitting it leaves unresolved
scanner exports and prevents web-tree-sitter from loading the parser.

On Linux, use the installed Tree-sitter CLI and Clang:

```sh
mkdir -p build/tree-sitter-current/include build/tree-sitter-current/src
cp ../tree-sitter-glosso/src/parser.c ../tree-sitter-glosso/src/scanner.c build/tree-sitter-current/src/
cp -R ../tree-sitter-glosso/src/tree_sitter build/tree-sitter-current/src/
echo '#include <stddef.h>' > build/tree-sitter-current/include/stdlib.h
clang --target=wasm32-unknown-unknown -O2 -fPIC -ffreestanding -nostdlib \
  -I build/tree-sitter-current/include -I build/tree-sitter-current/src \
  -c build/tree-sitter-current/src/parser.c -o build/tree-sitter-current/parser.o
clang --target=wasm32-unknown-unknown -O2 -fPIC -ffreestanding -nostdlib \
  -I build/tree-sitter-current/include -I build/tree-sitter-current/src \
  -c build/tree-sitter-current/src/scanner.c -o build/tree-sitter-current/scanner.o
wasm-ld -shared --no-entry --export=tree_sitter_glosso --allow-undefined \
  build/tree-sitter-current/parser.o build/tree-sitter-current/scanner.o \
  -o tree-sitter/tree-sitter-glosso.wasm
cp ../tree-sitter-glosso/queries/highlights.scm ../tree-sitter-glosso/queries/locals.scm tree-sitter/
```

Use the generated parser committed with the sibling grammar. If changing
`grammar.js`, run `tree-sitter generate --js-runtime native` in that grammar
checkout before copying its generated sources. Linking with `wasm-ld` directly avoids
host linker flags injected by Nix's Clang wrapper during cross-compilation.

From the manual repository root, rebuild on Windows with the installed
Tree-sitter CLI and LLVM toolchain:

```powershell
$grammarSource = (Resolve-Path ../tree-sitter-glosso).Path
$grammarStage = Join-Path (Get-Location) build/tree-sitter-current
$clang = Join-Path $env:USERPROFILE .local/llvm-project/x86_64-windows-msvc/bin/clang.exe
New-Item -ItemType Directory -Force -Path "$grammarStage/src" | Out-Null
Copy-Item -LiteralPath (Join-Path $grammarSource src/parser.c) -Destination "$grammarStage/src/parser.c" -Force
Copy-Item -LiteralPath (Join-Path $grammarSource src/scanner.c) -Destination "$grammarStage/src/scanner.c" -Force
Copy-Item -LiteralPath (Join-Path $grammarSource src/tree_sitter) -Destination "$grammarStage/src/" -Recurse -Force

# The generated parser includes stdlib.h but uses no allocator or libc calls.
# A freestanding shim supplies NULL and size_t; Clang supplies stdint/stdbool.
New-Item -ItemType Directory -Force -Path "$grammarStage/include" | Out-Null
Set-Content -LiteralPath "$grammarStage/include/stdlib.h" -Encoding ascii -Value '#include <stddef.h>'
& $clang --target=wasm32-unknown-unknown -O2 -fPIC -ffreestanding -nostdlib -shared `
  '-Wl,--no-entry' '-Wl,--export=tree_sitter_glosso' '-Wl,--allow-undefined' `
  -I "$grammarStage/include" -I "$grammarStage/src" "$grammarStage/src/parser.c" "$grammarStage/src/scanner.c" `
  -o "$grammarStage/tree-sitter-glosso.wasm"
if ($LASTEXITCODE -ne 0) { throw 'Tree-sitter Wasm build failed' }
Copy-Item -LiteralPath "$grammarStage/tree-sitter-glosso.wasm" -Destination tree-sitter/tree-sitter-glosso.wasm -Force
Copy-Item -LiteralPath (Join-Path $grammarSource queries/highlights.scm) -Destination tree-sitter/ -Force
Copy-Item -LiteralPath (Join-Path $grammarSource queries/locals.scm) -Destination tree-sitter/ -Force
```

`--js-runtime native` uses the CLI's embedded JavaScript runtime. LLVM's shared
Wasm output includes the dynamic-linking metadata required by web-tree-sitter.

Rebuild the manual afterward to embed the highlight query and copy all syntax
assets to `dist`, then run `scripts/test-manual.mjs` with Node. That smoke test
checks the staged assets, query validity, parsing of current language syntax and
rejection of removed syntax.
