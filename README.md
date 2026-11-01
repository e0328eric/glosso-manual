# Glosso Manual

The Glosso language manual is a static website rendered by Glosso and
[Clay](https://github.com/nicbarker/clay) in freestanding WebAssembly.

The site includes the language manual, a generated public standard-library
reference, global name and function-signature search, a persistent light/dark
theme, and Tree-sitter Glosso highlighting running through WebAssembly.

The manual has 98 chapters in three parts. A two-part tutorial (chapters 0-14)
teaches the language by building complete programs, ending with a
word-frequency counter. The reference (chapters 15-91) states the rules topic
by topic: programs and builds, source text, types and values, structured data,
declarations and control flow, procedures and generics, typeclasses and
operators, memory and ownership, concurrency, metaprogramming, and platforms
and interop. Appendices (92-97) cover the diagnostic format, an index of error
messages, the grammar, the standard library modules, the environment and exit
codes, and style conventions.

The chapters and the reference track the sibling `../glosso` checkout,
including `#module_params`, `#specialize` and `#meaningful { T,,foo; }`
(2026-11-01). Chapter 18 covers parameterized imports with `(arguments)` and
`{selectors}`, shared module instances, and bundled libglosso paths. Chapter 54
explains when `#lazy` arguments are evaluated and cached, including the
difference between a compile-time call and a `#comptime #lazy` parameter.
Chapters 55 and 58 cover field requirements, specialization order, type
rewriting, and inherent-method restrictions. `scripts/test-examples.mjs` compiles chapter
examples and compares their output with the output shown in the manual.

The interface follows Rustdoc's documentation layout: a fixed sidebar, a wide
search bar, section links, and compact module listings, using Glosso's existing
light and dark palettes. `#/manual` opens the language manual index; `#/std`
opens the standard-library index. On narrow screens, the sidebar opens from the
navigation button and wide code examples and tables scroll within the article.
Search is available with `/` or Ctrl/Command+K, with help beside the search field.

GitHub Pages publishes precompiled files from `dist/`. It does not access the
private Glosso repository or compile the project in GitHub Actions.

## Files

- `first.glo` is the compile-time build driver.
- `main.glo` is the manual compiler entry point. It imports the sources under
  `src/`; every file is a module with its own imports, the UI and chapter
  modules import each other where they need to (cyclic imports are allowed),
  and each exposes its shared declarations in a `#public { }` group.
- `src/clay_bindings.glo` builds Clay and inserts its target-specific bindings.
- `src/clay_ui.glo` contains shared Clay declarations and content primitives.
- `src/section_catalog.glo` contains section state and titles. It is the single
  source of the chapter order; `SECTION_COUNT` and the titles must agree with the
  `render_section_N` procedures that exist.
- `src/sections_*.glo` contains the manual chapters, one module per sidebar
  group, each holding a contiguous run of `render_section_N` procedures:
  `sections_tour_*.glo` for the tutorial, `sections_ref_*.glo` for the
  reference and `sections_appendix.glo`. The group order matches
  `manualSidebarGroups` in `app.js`.
- `src/generated/std_reference.glo` is the generated standard-library data
  rendered by Glosso and Clay.
- `src/reference_ui.glo` contains reference, search-result, and browser-bridge
  UI state.
- `src/manual_ui.glo` contains section dispatch, navigation, layout, and the
  Wasm entry point.
- `scripts/generate-reference-source.glo` extracts public declarations and their
  documentation comments directly from a supplied Glosso standard-library
  directory into an ignored JSON file. Whole-file reads use `read_file_up_to` so short
  reads cannot truncate declarations. The file's `//!` intro supplies the
  module description.
- `scripts/generate-reference.glo` converts that intermediate data into the
  compact Glosso and browser reference files, and rebuilds the language-manual
  half of the search index by reading the chapter sources: titles from
  `src/section_catalog.glo`, prose from the `src/sections_*.glo` files that
  `main.glo` imports. Code blocks are excluded, so a chapter is searched by what
  it says rather than by the programs it quotes.
- `scripts/tree_sitter.glo` embeds the Tree-sitter highlight query in the
  browser host.
- `vendor/clay/clay.h` is the pinned Clay source used during compilation.
- `vendor/web-tree-sitter/` and `tree-sitter-glosso.wasm` are the pinned syntax
  highlighting runtime and grammar.
- `tree-sitter/README.md` documents rebuilding the grammar Wasm and queries
  from the sibling `../tree-sitter-glosso` repository.
- `index.html` and `app.js` are the browser host, search engine, theme switch,
  syntax highlighter, and Clay command renderer.
- `scripts/test-*.mjs` are the checks described below; `scripts/tests/` holds
  their fixtures and `manual-fragments.txt`, the list of chapter code blocks
  that are deliberately incomplete.
- `dist/` contains the complete precompiled site deployed to GitHub Pages.

## How the build works

Compiling `first.glo` executes its top-level `#comptime` build procedure. That
procedure:

1. Compiles `main.glo` for `wasm32-freestanding`.
2. During that compilation, builds a cached Clay static library for the active
   target and inserts matching Bindgen declarations directly into the module.
3. Links the result as `dist/manual.wasm`.
4. Copies the browser host, search index, and Tree-sitter assets to `dist/`.

Before compilation, `build` synchronizes the highlight query embedded in the
browser host. This keeps it compatible with the staged grammar when language
directives and pointer syntax change.

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

`src/clay_bindings.glo` uses `Native_Compile_Output.compile_c_archive`,
`Library_Spec.library_spec`, and the free function `generate_source` with named
slice parameters and Result error handling.
Use a current Glosso checkout whose Compiler/Bindgen service records preserve
their field order on wasm32; the old local ABI adapters are no longer needed.
Binding generation explicitly disables textual fallback so Clay uses Clang's
complete C layouts.
`Build_Options.output_executable_name` takes an executable base name: Windows
builds append `.exe`, even if the supplied name already has that suffix.
The build driver supplies base names and uses platform-specific paths to run
the resulting tools. A CLI `-o` path still names the exact output file.

After regenerating the reference, run `node scripts/test-reference.mjs` to check
compact signatures, parameter constraints and defaults, pointer mutability,
flag enums, lazy parameters, function-pointer declarations, private-name
filtering, documentation comments, `#Self_Type` factory results, `#Never`
returns, and boundary-aware `try(Target)` operators.
The reference gives each module a compact index of types, typeclasses,
constants, and functions. Item links open dedicated documentation pages; type
pages include their inherent methods and associated functions, including those
from other modules. Primitive and generic receivers also have type pages.
Sections, method documentation, and implementations fold independently. Search
and direct links open the matching item and expand the selected method.
Item URLs support browser history, reloads, and opening in another tab; old
Declarations/Methods URLs redirect to the unified module index.
Types and functions in signatures, parameter tables, and documentation link to
their item pages. Primitive types link to their language chapters. References
prefer the current receiver and module; ambiguous names remain plain text.
`node scripts/test-reference-links.mjs` checks resolution and destination validity.

`node scripts/test-examples.mjs` uses the installed `glosso` on PATH to compile
every `glosso` code block of the chapters. A block with `main` is run, and its
standard output must equal the `text` block shown right after it, unless that
block is a command transcript (it starts with `$ `) or a diagnostic (it starts
with `//`). A block whose first line is `// name.glo` is saved under that name
so later blocks of the same chapter can import it. Blocks listed in
`scripts/tests/manual-fragments.txt` (`chapter:index`) are excerpts, quotes of
standard-library declarations, programs for another target or programs that
fail on purpose; they are checked by hand. Pass a compiler path as the first
argument and chapter numbers after it to check a subset. Chapters run in
parallel; output and caches stay under `build/example-tests/`.

`node scripts/test-language.mjs` checks language behavior the chapters rely on
beyond their own examples: operators, Try boundary witnesses, array
reservation, source locations, visibility, receiver methods, string views,
formatting selectors and invalid formats, matrix literals and conversions,
argument-vector commands, compile-time builders and reflection, compile-time
execution budgets, and the rejection of removed or invalid syntax. Pass a
compiler path as its optional first argument to test another build. All output
and caches stay under `build/`.

`node scripts/test-manual.mjs` checks staged assets and exercises the actual
Wasm renderer for every chapter, reference module, and item page at narrow and
wide widths, including item routes, folding, method anchors, the search bridge, parsing of
current syntax with the staged grammar, and rejection of removed syntax. Its synthetic font metrics check layout
validity and the browser/Clay ABI; they do not replace a visual browser check.

`node scripts/test-browser-navigation.mjs` checks actual chapter and module
index clicks, including a redraw while a link is pressed, keyboard navigation,
Back navigation, touch taps, and cancelled clicks. Serve `dist/` on port 8000 and start a
Chromium browser with `--remote-debugging-port=9222` first. Optional arguments
set the site and DevTools URLs; the test creates and closes its own tab.

`build` compiles `main.glo` and stages the complete site in `dist/`.
`tree-sitter` updates the query embedded in `app.js` from
`tree-sitter/highlights.scm`. `gen-reference <std-directory>` reads public
standard-library declarations and their documentation comments from the supplied
directory, then updates `src/generated/std_reference.glo` and
`reference-index.js`, then assembles its streamed parts at runtime. Its temporary `build/reference-source.json` input is
ignored and is never checked in.

## Document the standard library

Only public declarations and marked comments reach the reference. Explicit
`#public` declarations and public groups are included; private,
`#public,unit` and `#public,to(...)` declarations are excluded. Inherent methods and associated
functions retain their qualified owner names. Inherent headers such as
`Counter ::: #public { ... }` set the default visibility of their members;
nested visibility groups and individual overrides are respected.
A `///` line documents the declaration
written under it, and `//!` lines write the file's intro, which becomes the
module summary. A plain `//` is an implementation note the reference never
shows, and a further slash cancels the marker, which keeps the `////` rules
drawn above a section out of the reference:

```glosso
//! ASCII classification, written in the block the file opens with.

#import "Meta";

/// Whether the byte is an ASCII digit.
// A note about the implementation, which the reference never shows.
#public is_ascii_digit :: (byte: u8) -> bool { ... }
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

Review the regenerated `src/generated/std_reference.glo`, then commit
`reference-index.js` and staged files under `dist/`. The generated Glosso data is
ignored and recreated locally. The extractor rebuilds the
modules, symbols, signatures, and typeclass instances directly from Glosso
sources, and rebuilds the language-manual search entries from the chapter
sources in the same pass. Run it after editing chapters as well as after editing
`glosso/std/`; it reports how many chapters produced no prose, which is how a
missing or misnamed `render_section_N` shows up.

## Write chapters

A chapter is one `render_section_N :: () { ... }` procedure in a
`src/sections_*.glo` module. Its body is a sequence of calls to the content
primitives of `src/clay_ui.glo`: `paragraph`, `subheading`, `code_block`
(`"glosso"`, `"text"` or `"ebnf"`), `bullet`, `note`, `table_header` and
`table_row`. The first argument of each call is an index that counts up from 0
within the chapter. Prose uses `#string,oneline`; backticks mark inline code.
Code uses `#string`, which keeps every line as written.

Describe the language as the current compiler implements it. Every `glosso`
block is a complete program unless it is listed in
`scripts/tests/manual-fragments.txt`; paste a program's real output into the
`text` block after it, and real diagnostics, with the offending code as a
`// comment` line above them. `node scripts/test-examples.mjs` checks all of
this. Refer to other chapters by their exact titles. Tutorial chapters teach
through runnable programs and end by naming the reference chapters for the
topics they touched; reference chapters are complete and precise.

Adding or removing a chapter means editing three things: the title and
`SECTION_COUNT` in `src/section_catalog.glo`, the `render_section_N` procedure in
the matching `src/sections_*.glo`, and the section index lists in
`manualSidebarGroups` in `app.js`. Chapter titles that primitive types link to
are listed in `reference-links.js`; update them when a title they use changes.

## Compile locally

Keep this repository and the private Glosso repository as sibling directories:

```text
Github/
|-- glosso/
`-- glosso-manual/
```

Use the installed `glosso` compiler on PATH. Locate it with `Get-Command glosso`
in PowerShell or `command -v glosso` on Unix. Set `GLOSSO_STD` to the sibling
checkout so the driver and every nested compilation use the same current
standard library as the reference. The compiler must support that checkout's
syntax. Regenerate the ignored reference data before the first build and
whenever the library or chapters change.

### Windows PowerShell

```powershell
$env:GLOSSO_STD = (Resolve-Path ../glosso/std).Path
glosso first.glo -- gen-reference ../glosso/std
glosso first.glo -- build
```

### Linux or macOS

```sh
export PATH="$HOME/.local/glosso/bin:$PATH"
export GLOSSO_STD="$(cd ../glosso/std && pwd)"
glosso --cache-dir build/cache first.glo -- gen-reference ../glosso/std
glosso --cache-dir build/cache first.glo -- build
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
