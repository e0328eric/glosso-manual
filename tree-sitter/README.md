# Glosso syntax assets

The query files and Wasm parser are used by the manual's browser highlighter.
The parser includes the sibling `../tree-sitter-glosso` grammar's visibility,
inherent method, and receiver syntax. `current-language.patch` adds `#Never`,
`#on_drop_error`, and custom `!!` suffix parsing required by the current compiler,
and removes the obsolete `#noreturn` function directive.
It applies to a build copy; the sibling repository stays unchanged.

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
If the upstream grammar changes, review and update the patch before rebuilding.

Rebuild the manual afterward to embed the highlight query and copy all syntax
assets to `dist`, then run `scripts/test-manual.mjs` with Node. That smoke test
checks the staged assets, query validity, and parsing of current language syntax.
