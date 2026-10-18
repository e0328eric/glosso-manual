# Glosso syntax assets

The query files and Wasm parser are used by the manual's browser highlighter.
The parser uses the sibling `../tree-sitter-glosso` grammar, including visibility
on inherent block headers, receiver syntax, `#Never`, and `#on_drop_error`.
The current grammar includes read-only and writable pointer/view types,
`c"..."` and `b"..."` literals, suffix address-of (`value.&`), repeated prefix
`&`, negative enum values and bracket type expressions.
It supports leading `#memory` contracts, trailing contracts, overlays, trusted
blocks, labelled effect operands, typed releasers such as
`released_by((?*void).mem_free)`, and `const` for read-only access.
Bare pointers and views are writable; the compiler rejects the old `mut` qualifier.
The sibling grammar includes `#align(N)` struct modifiers.
The `current-language.patch` adds `#matrix` literals with semicolon-separated
rows, optional trailing commas and a final semicolon, and empty matrix literals.
It also adds custom `!!` suffix operators alongside the `#fresh_result` /
`#unchecked_transfer` modifiers already in the sibling grammar.
Rebuild in a local copy so the sibling repository stays unchanged.
Include `src/scanner.c`: the grammar uses it to distinguish symbolic suffix
operators from infix operators. Omitting it leaves unresolved scanner exports
and prevents web-tree-sitter from loading the parser.

On Linux, use the installed Tree-sitter CLI and Clang:

```sh
mkdir -p build/tree-sitter-current/include build/tree-sitter-current/src
cp ../tree-sitter-glosso/grammar.js ../tree-sitter-glosso/tree-sitter.json build/tree-sitter-current/
cp ../tree-sitter-glosso/src/scanner.c build/tree-sitter-current/src/
git apply --unidiff-zero --directory=build/tree-sitter-current tree-sitter/current-language.patch
(cd build/tree-sitter-current && tree-sitter generate --js-runtime native)
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
```

Linking with `wasm-ld` directly also avoids host linker flags injected by
Nix's Clang wrapper during cross-compilation.

From the manual repository root, rebuild on Windows with the installed
Tree-sitter CLI and LLVM toolchain:

```powershell
$grammarSource = (Resolve-Path ../tree-sitter-glosso).Path
$grammarStage = Join-Path (Get-Location) build/tree-sitter-current
$treeSitterCli = Join-Path $grammarSource node_modules/tree-sitter-cli/tree-sitter.exe
$clang = Join-Path $env:USERPROFILE .local/llvm-project/x86_64-windows-msvc/bin/clang.exe
New-Item -ItemType Directory -Force -Path $grammarStage | Out-Null
Copy-Item -LiteralPath (Join-Path $grammarSource grammar.js) -Destination $grammarStage -Force
Copy-Item -LiteralPath (Join-Path $grammarSource tree-sitter.json) -Destination $grammarStage -Force
git apply --unidiff-zero --directory=build/tree-sitter-current tree-sitter/current-language.patch
Push-Location $grammarStage
try { & $treeSitterCli generate --js-runtime native } finally { Pop-Location }
Copy-Item -LiteralPath (Join-Path $grammarSource src/scanner.c) -Destination "$grammarStage/src/scanner.c" -Force

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
```

`--js-runtime native` uses the CLI's embedded JavaScript runtime. LLVM's shared
Wasm output includes the dynamic-linking metadata required by web-tree-sitter.
When updating the grammar, copy its matching highlight and locals queries from
`../tree-sitter-glosso/queries/` into `tree-sitter/` as well.

Rebuild the manual afterward to embed the highlight query and copy all syntax
assets to `dist`, then run `scripts/test-manual.mjs` with Node. That smoke test
checks the staged assets, query validity, and parsing of current language syntax.
