# Glosso syntax assets

The query files and Wasm parser are used by the manual's browser highlighter.
The parser uses the sibling `../tree-sitter-glosso` grammar, including visibility
on inherent block headers, receiver syntax, `#Never`, and `#on_drop_error`.
`current-language.patch` adds custom `!!` suffix parsing, negative enum values,
and bracket types in expression positions, which the current compiler accepts
but the upstream grammar does not yet recognize. Rebuild in a local copy so the
sibling repository stays unchanged.

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
git apply --directory=build/tree-sitter-current tree-sitter/current-language.patch
Push-Location $grammarStage
try { & $treeSitterCli generate --js-runtime native } finally { Pop-Location }

# The generated parser includes stdlib.h but uses no allocator or libc calls.
# A freestanding shim supplies NULL and size_t; Clang supplies stdint/stdbool.
New-Item -ItemType Directory -Force -Path "$grammarStage/include" | Out-Null
Set-Content -LiteralPath "$grammarStage/include/stdlib.h" -Encoding ascii -Value '#include <stddef.h>'
& $clang --target=wasm32-unknown-unknown -O2 -fPIC -ffreestanding -nostdlib -shared `
  '-Wl,--no-entry' '-Wl,--export=tree_sitter_glosso' '-Wl,--allow-undefined' `
  -I "$grammarStage/include" -I "$grammarStage/src" "$grammarStage/src/parser.c" `
  -o "$grammarStage/tree-sitter-glosso.wasm"
if ($LASTEXITCODE -ne 0) { throw 'Tree-sitter Wasm build failed' }
Copy-Item -LiteralPath "$grammarStage/tree-sitter-glosso.wasm" -Destination tree-sitter/tree-sitter-glosso.wasm -Force
```

`--js-runtime native` uses the CLI's embedded JavaScript runtime. LLVM's shared
Wasm output includes the dynamic-linking metadata required by web-tree-sitter.
When updating the grammar, check whether the compatibility patch is still needed
and copy its matching highlight and locals queries from
`../tree-sitter-glosso/queries/` into `tree-sitter/` as well.

Rebuild the manual afterward to embed the highlight query and copy all syntax
assets to `dist`, then run `scripts/test-manual.mjs` with Node. That smoke test
checks the staged assets, query validity, and parsing of current language syntax.
