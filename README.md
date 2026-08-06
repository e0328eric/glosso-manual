# Glosso Manual

The Glosso language manual is a static website rendered by Glosso and
[Clay](https://github.com/nicbarker/clay) in freestanding WebAssembly.

The site includes the language chapters, a generated public standard-library
reference, global name and function-signature search, a persistent light/dark
theme, and Tree-sitter Glosso highlighting running through WebAssembly.

GitHub Pages publishes precompiled files from `dist/`. It does not access the
private Glosso repository or compile the project in GitHub Actions.

## Files

- `first.glo` is the compile-time build driver.
- `main.glo` is the manual compiler entry point and loads the sources under
  `src/`.
- `src/clay_bindings.glo` builds Clay and inserts its target-specific bindings.
- `src/clay_ui.glo` contains shared Clay declarations and content primitives.
- `src/section_catalog.glo` contains section state and titles.
- `src/sections_*.glo` contains the manual chapters, grouped by topic.
- `src/generated/docs.ts` is the checked-in legacy documentation snapshot used
  as the source for reference-data regeneration.
- `src/generated/std_reference.glo` is the generated standard-library data
  rendered by Glosso and Clay.
- `src/reference_ui.glo` contains reference, search-result, and browser-bridge
  UI state.
- `src/manual_ui.glo` contains section dispatch, navigation, layout, and the
  Wasm entry point.
- `scripts/generate-reference.glo` regenerates both compact reference data
  files from the documentation snapshot.
- `scripts/tree_sitter.glo` embeds the Tree-sitter highlight query in the
  browser host.
- `vendor/clay/clay.h` is the pinned Clay source used during compilation.
- `vendor/web-tree-sitter/` and `tree-sitter-glosso.wasm` are the pinned syntax
  highlighting runtime and grammar.
- `index.html` and `app.js` are the browser host, search engine, theme switch,
  syntax highlighter, and Clay command renderer.
- `dist/` contains the complete precompiled site deployed to GitHub Pages.

## How the build works

Compiling `first.glo` executes its top-level `#comptime` build procedure. That
procedure:

1. Compiles `main.glo` for `wasm32-freestanding`.
2. During that compilation, builds a cached Clay static library for the active
   target and inserts matching Bindgen declarations directly into the module.
3. Links the result as `dist/manual.wasm`.
4. Copies the browser host, search index, and Tree-sitter assets to `dist/`.

`first.glo` marks its outer build-driver compilation as output-free and starts
the `main.glo` compilation with an explicit wasm target. This gives both the C
compiler and Bindgen the correct active target without creating a disposable
helper object or LLVM IR file. The browser binary is `dist/manual.wasm`.

The compile-time build driver accepts a task after the compiler's `--`
separator:

```sh
glosso first.glo -- build
glosso first.glo -- tree-sitter
glosso first.glo -- gen-reference
```

`build` compiles `main.glo` and stages the complete site in `dist/`.
`tree-sitter` updates the query embedded in `app.js` from
`tree-sitter/highlights.scm`. `gen-reference` reads the checked-in legacy
documentation snapshot at `src/generated/docs.ts` and regenerates the Glosso
and browser reference data; an alternative snapshot path can be supplied after
the command.

## Compile locally

Keep this repository and the private Glosso repository as sibling directories:

```text
Github/
|-- glosso/
`-- glosso-manual/
```

First build the Glosso compiler.

### Windows PowerShell

```powershell
& glosso.exe first.glo -- build
```

### Linux or macOS

```sh
glosso first.glo -- build
```

After a successful build, serve `dist/` over HTTP:

```sh
python -m http.server 8000 -d dist
```

Open `http://localhost:8000`. Loading `dist/index.html` directly with a
`file:` URL will not work because the browser fetches `manual.wasm`.

## Publish

Commit the regenerated deployment files and push them:

```sh
git add dist
git commit -m "Update compiled manual"
git push
```

The workflow in `.github/workflows/pages.yml` uploads the committed `dist/`
directory and deploys it to GitHub Pages. The generated `build/` directory is
not required for rendering or deployment and should not be committed.
