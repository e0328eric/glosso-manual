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
- `src/section_catalog.glo` contains section state and titles. It is the single
  source of the chapter order; `SECTION_COUNT` and the titles must agree with the
  `render_section_N` procedures that exist.
- `src/sections_*.glo` contains the manual chapters, one file per topic group,
  each holding a contiguous run of `render_section_N` procedures. The group
  order matches `manualSidebarGroups` in `app.js`.
- `src/generated/std_reference.glo` is the generated standard-library data
  rendered by Glosso and Clay.
- `src/reference_ui.glo` contains reference, search-result, and browser-bridge
  UI state.
- `src/manual_ui.glo` contains section dispatch, navigation, layout, and the
  Wasm entry point.
- `scripts/generate-reference-source.glo` extracts public declarations and their
  documentation comments directly from a supplied Glosso standard-library
  directory into an ignored JSON file.
- `scripts/generate-reference.glo` converts that intermediate data into the
  compact Glosso and browser reference files, and rebuilds the language-manual
  half of the search index by reading the chapter sources: titles from
  `src/section_catalog.glo`, prose from the `src/sections_*.glo` files that
  `main.glo` loads. Code blocks are excluded, so a chapter is searched by what
  it says rather than by the programs it quotes.
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
glosso first.glo -- gen-reference ../glosso/std
```

`build` compiles `main.glo` and stages the complete site in `dist/`.
`tree-sitter` updates the query embedded in `app.js` from
`tree-sitter/highlights.scm`. `gen-reference <std-directory>` reads public
standard-library declarations and their documentation comments from the supplied
directory, then updates `src/generated/std_reference.glo` and
`reference-index.js`. Its temporary `build/reference-source.json` input is
ignored and is never checked in.

## Document the standard library

Only marked comments reach the reference. A `///` line documents the declaration
written under it, and `//!` lines write the file's intro, which becomes the
module summary. A plain `//` is an implementation note the reference never
shows, and a further slash cancels the marker, which keeps the `////` rules
drawn above a section out of the reference:

```glosso
//! ASCII classification, written in the block the file opens with.

#import "Meta";

/// Whether the byte is an ASCII digit.
// A note about the implementation, which the reference never shows.
is_ascii_digit :: (byte: u8) -> bool { ... }
```

A `///` block runs for as many lines as it needs, and an unmarked note inside it
is stepped over rather than ending it. A blank line does end it: prose that far
from a declaration documents whatever stands above the gap instead. The intro
ends at the file's first line of code, so a `//!` written below that documents
nothing. A module with no intro falls back to
`Public declarations from <path>.`.

## Update the standard-library reference

The reference extractor is written in Glosso and requires a current Glosso
source checkout. After changing declarations or documentation comments under
`glosso/std/`, run:

```sh
glosso first.glo -- gen-reference ../glosso/std
glosso first.glo -- build
```

Review and commit the regenerated `src/generated/std_reference.glo`,
`reference-index.js`, and staged files under `dist/`. The extractor rebuilds the
modules, symbols, signatures, and typeclass instances directly from Glosso
sources, and rebuilds the language-manual search entries from the chapter
sources in the same pass. Run it after editing chapters as well as after editing
`glosso/std/`; it reports how many chapters produced no prose, which is how a
missing or misnamed `render_section_N` shows up.

Adding or removing a chapter therefore means editing three things: the title and
`SECTION_COUNT` in `src/section_catalog.glo`, the `render_section_N` procedure in
the matching `src/sections_*.glo`, and the section index lists in
`manualSidebarGroups` in `app.js`. Everything else follows from those.

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
