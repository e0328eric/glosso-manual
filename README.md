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
  `src/` with `#load,embed`; these UI and chapter fragments intentionally
  share one module and ownership unit. Shared declarations use `#public(unit)`;
  embedding preserves each fragment's private source identity.
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
  directory into an ignored JSON file. Whole-file reads use `read_file_up_to` so short
  reads cannot truncate declarations.
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
- `tree-sitter/README.md` documents rebuilding the grammar for the current
  language with the accompanying source patch.
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

After regenerating the reference, run `node scripts/test-reference.mjs` to check
compact signatures, parameter constraints and defaults, pointer mutability,
flag enums, lazy parameters, function-pointer declarations, private-name
filtering, `#Self_Type` factory results, `#Never` returns, and boundary-aware
`try(Target)` operators.
The reference gives each module separate Declarations and Methods sections;
associated functions appear in Methods, while typeclass operations stay inside
their class declaration. Search opens the matching section and page.

`node scripts/test-language.mjs` uses the installed `glosso` on PATH to check
operators, Try boundary witnesses, propagation cleanup, array reservation,
source locations, visibility, receiver methods, associated factories, domain
free functions, managed destruction and `ManuallyDrop`, string-view layouts and aliasing, and
builder cloning and ownership transfer. They also verify free, unevaluated
`type_of(value)` queries, lexical scope for local functions and types, local
type aliases, `#align(N)` record layouts, compile-time source builders,
recursive reflection, and rejection of non-exhaustive switches and overflowing
integer or float constants. Syntax checks cover prefix and suffix
pointer operators, C-string and byte-array literals, Unicode character
escapes, signed enums, grouped constants, bracket-type aliases, nested tuple
access, and generic struct literals. It also checks rejection of removed
directives, invalid Try contracts, string capacity, removed memory contracts, and removed pointer qualifiers. It also
checks that escaping builder views compile, since pointer lifetimes are the
programmer's responsibility; that dangling-view fixture is never executed.
Pass a compiler path as its optional first argument to test another build.
For the local installation, run
`node scripts/test-language.mjs "$HOME/.local/glosso/bin/glosso"` with
`GLOSSO_STD` pointing to `../glosso/std`. All output and caches stay under `build/`. The collection checks exercise
automatic element destruction, nested dynamic arrays, and `take()` / `replace()`
ownership transfers.

`node scripts/test-manual.mjs` checks staged assets and exercises the actual
Wasm renderer for every chapter and reference module at narrow and wide widths,
including the search bridge, current operator and ownership syntax, and rejection
of the removed `#precedence` directive. Its synthetic font metrics check layout
validity and the browser/Clay ABI; they do not replace a visual browser check.

`build` compiles `main.glo` and stages the complete site in `dist/`.
`tree-sitter` updates the query embedded in `app.js` from
`tree-sitter/highlights.scm`. `gen-reference <std-directory>` reads public
standard-library declarations and their documentation comments from the supplied
directory, then updates `src/generated/std_reference.glo` and
`reference-index.js`, then assembles its streamed parts at runtime. Its temporary `build/reference-source.json` input is
ignored and is never checked in.

## Document the standard library

Only public declarations and marked comments reach the reference. Explicit
`#public` declarations and public groups are included; private and
`#public(unit)` declarations are excluded. Inherent methods and associated
functions retain their qualified owner names. Inherent headers such as
`Counter ::: #public { ... }` set the default visibility of their members;
nested visibility groups and individual overrides are respected. A `///` line documents the declaration
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

When updating for a new compiler checkout, check the current declarations and
module documentation under `../glosso/std/` as well as regenerating the reference.
The library uses receiver methods for a value's own behavior, associated
functions for constructors, and free functions for domain operations. For
example, use `file.read()`, `File.open(path)`, and `read_file(path, max_count)`, respectively.
Core string, numeric, and collection methods remain available. Compiler and
Bindgen option lists are string slices; use
`Library_Spec.library_spec("name", artifact)` to describe a Bindgen artifact,
`Workspace.create_workspace("name")` to create a workspace, and
`add_build_file(path, workspace)` to compile a source file. Managed values
move by value and clean up through `Drop`; fallible cleanup needs a compatible
result boundary or `#on_drop_error`. Chapter examples, the build driver, and the
reference extractor must all use the same current API.

Primitive `string` and `string16` values are borrowed `{data, count}` views;
`cstring` and `cstring16` contain only a zero-terminated pointer. Slices,
substrings, trimmed text, and split pieces borrow the original storage. Keep
that storage alive, clone text that must outlive it, and release explicitly
allocated strings with the allocator that created them. `String_Builder`
owns its buffer and releases it automatically through `Drop`: `to_string()`
borrows it, `clone()` copies it, and `into_string()` transfers it to the caller.
`Path`, filesystem owners, and process owners also use automatic cleanup.
Standard containers and dynamic arrays also clean up automatically, including
their live elements. Use `take()` and `replace()` to transfer dynamic-array
storage and leave the original descriptor reusable. Dynamic arrays allocate and
release through `context.allocator`; keep that allocator installed until cleanup.
Containers capture their constructor's allocator. Dynamic arrays append values
with `push()` or `append()`.
`type_of(value)` is a free function from `Meta`; its argument is typechecked
but never evaluated or moved. Local functions and type declarations belong to
their containing lexical block. Structs accept `#align(N)` with a literal
power-of-two alignment, including alongside `#packed`.
Runtime concatenation uses builders
or `.cat()`; `+` is available for compile-time string constants.

Address-of is `&value` or `value.&`; dereference is `*pointer` or `pointer.*`.
Pointer types use read-only `*T` and writable `*mut T`; many-pointers and views
use `[*]T` / `[*]mut T` and `[]T` / `[]mut T`. The `const` qualifier,
`#memory` contracts, and borrow-check options have been removed. Ownership
checking rejects reuse after a move; it does not enforce pointer/view lifetimes.
The literal `c"hello"` is a zero-terminated
`cstring`; `b"hello"` is a fixed byte array. `ManuallyDrop(T)` suppresses automatic
destruction until the value is extracted or explicitly destroyed. The generated
reference includes the `Gui` modules and the `Memory/ManuallyDrop` API.

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
