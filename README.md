# Glosso Manual

The Glosso language manual is a static website rendered by Glosso and
[Clay](https://github.com/nicbarker/clay) in freestanding WebAssembly.

The site includes the language chapters, a generated public standard-library
reference, global name and function-signature search, a persistent light/dark
theme, written memory-contract tables, and Tree-sitter Glosso highlighting
running through WebAssembly.

The latest reference refresh uses the sibling `../glosso` checkout at
`0a17910d` (2026-10-18), including `#matrix` literals, the current filesystem
API names, and the argument-vector command runner.

The interface follows Rustdoc's documentation layout: a fixed sidebar, a wide
search bar, section links, and compact module listings, using Glosso's existing
light and dark palettes. `#/manual` opens the language manual index; `#/std`
opens the standard-library index. On narrow screens, the sidebar opens from the
navigation button and wide code examples and tables scroll within the article.
Search is available with `/` or Ctrl/Command+K, with help beside the search field.

GitHub Pages publishes precompiled files from `dist/`. It does not access the
private Glosso repository or compile the project in GitHub Actions.

## Printable language reference

`docs/glosso-reference.typ` typesets the complete language manual as a linked,
printable reference. Open `docs/glosso-reference.pdf` for the compiled edition.
It includes all 146 sections, code examples and transcripts, notes, tables,
grammar, and diagnostics, with a quick lookup page and PDF bookmarks.
The website's generated per-symbol standard-library API is separate.

Build with Typst (validated with 0.15.1):

```sh
typst compile docs/glosso-reference.typ docs/glosso-reference.pdf
```

The adjacent `docs/reference-manual.json` is a checked-in snapshot extracted
from the catalog, chapter files loaded by `main.glo`, and the sidebar groups
in `app.js`. After editing the manual, refresh it with Node.js before compiling:

```sh
node scripts/generate-typst-reference.mjs
typst compile docs/glosso-reference.typ docs/glosso-reference.pdf
node scripts/generate-typst-reference.mjs --check
```

The check fails when the snapshot differs from the current sources. The build
uses local fonts and no external Typst packages or Glosso compiler. Its font
fallbacks are listed in the Typst source and the PDF's reproduction notes.

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
  Public declarations in `#load,embed` fragments are grouped under their owning
  module's import path, including nested fragments, while source links retain the
  physical file and line. The root file supplies the module description.
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
`Build_Options.output_executable_name` takes an executable base name: Windows
builds append `.exe`, even if the supplied name already has that suffix.
The build driver supplies base names and uses platform-specific paths to run
the resulting tools. A CLI `-o` path still names the exact output file.

After regenerating the reference, run `node scripts/test-reference.mjs` to check
compact signatures, parameter constraints and defaults, pointer mutability,
flag enums, lazy parameters, function-pointer declarations, private-name
filtering, leading memory-contract attachment and documentation,
embedded fragments with their owner's import path and original source links,
`#Self_Type` factory results, `#Never` returns, and boundary-aware
`try(Target)` operators.
The reference restores a separate `#MEMORY CONTRACTS` table for functions,
receiver methods, named function-pointer types, and nested typeclass operations.
Effects and their arguments come from leading or historical trailing contracts.
Typed releasers such as `(?*void).mem_free` retain their complete owner syntax,
and read-only receiver parameters retain `*const` in the displayed tables.
Written empty contracts are distinguished from declarations without a contract;
these are source contracts, while compiler inference is available through the
compiler report flags. Named result places and allocator/releaser labels are
preserved.
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

`node scripts/test-language.mjs` uses the installed `glosso` on PATH to check
operators, Try boundary witnesses, propagation cleanup, array reservation,
source locations, visibility, receiver methods, associated factories, domain
free functions, managed destruction and `ManuallyDrop`, string-view layouts and aliasing, and
builder cloning and ownership transfer. They also verify free, unevaluated
`type_of(value)` queries, lexical scope for local functions and types, local
type aliases, `#align(N)` record layouts, compile-time source builders,
recursive reflection and source-spelled type names, the `Strings` umbrella and allocator-matched cleanup,
builder repetition and compile-time string concatenation, configurable execution
limits for both compile-time engines, and rejection of removed string helpers,
runtime string concatenation, non-exhaustive switches and overflowing
integer or float constants. Syntax checks cover prefix and suffix
pointer operators, C-string and byte-array literals, Unicode character
escapes, signed enums, grouped constants, bracket-type aliases, nested tuple
access, and generic struct literals. It also checks rejection of removed
directives, invalid Try contracts, string capacity, and the removed `mut` qualifier.
Formatting checks cover brace selectors, escaped braces, indexed and repeated
arguments, compile-time rendering, custom formatters, builder `writef`, and
invalid formats. Matrix checks cover `#matrix` row/column syntax, expected types,
empty shapes, independent fixed-array copies, and rejection of plain arrays,
incorrect shapes, ragged rows, and mismatched conversion element types. Valid
matrix cases run at compile time and at runtime. Command checks cover literal
argument vectors, byte-preserving capture, nonzero exits, timeouts, working
directories, shell execution, compile-time build commands, and renamed helpers.
Pointer-field checks cover reads, writes, addresses, nested access, qualifiers,
and rejection of access through optional pointers.
Memory checks cover leading contracts, strict exported boundaries, double release,
body-contract violations, indirect calls, separate tuple-result release identities,
report flags, and warning/error/off analysis modes. Strict boundary requirements
are also checked with body analysis disabled.
Escaping local pointers check the diagnostics. A separate builder-view escape
records a current analysis gap; neither dangling fixture is executed.
Use-after-move and consumed `ManuallyDrop` fixtures are also compile-only:
automatic `Drop` cleanup no longer enforces ownership or lifetime validity.
Pass a compiler path as its optional first argument to test another build.
For the local installation, run
`node scripts/test-language.mjs "$HOME/.local/glosso/bin/glosso"` with
`GLOSSO_STD` pointing to `../glosso/std`. All output and caches stay under `build/`. The collection checks exercise
automatic element destruction, allocator-captured object deletion, nested dynamic arrays, and `take()` / `replace()`
ownership transfers.

`node scripts/test-manual.mjs` checks staged assets and exercises the actual
Wasm renderer for every chapter, reference module, and item page at narrow and
wide widths, including item routes, folding, method anchors, the search bridge, current operator and ownership syntax, and rejection
of the removed `#precedence` directive. Its synthetic font metrics check layout
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
`#public` declarations and public groups are included; private and
`#public(unit)` declarations are excluded. Inherent methods and associated
functions retain their qualified owner names. Inherent headers such as
`Counter ::: #public { ... }` set the default visibility of their members;
nested visibility groups and individual overrides are respected. Leading `#memory` blocks stay attached to the following signature and its documentation.
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

When updating for a new compiler checkout, check the current declarations and
module documentation under `../glosso/std/` as well as regenerating the reference.
The library uses receiver methods for a value's own behavior, associated
functions for constructors, and free functions for domain operations. For
example, use `file.read()`, `File.open(path)`, and `read_file(path, max_count)`, respectively.
Core string, numeric, and collection methods remain available. Compiler and
Bindgen option lists are string slices; use
`Library_Spec.library_spec("name", artifact)` to describe a Bindgen artifact,
`Workspace.create("name")` to create a workspace, and
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
`File` destruction is infallible and discards close errors. Use `file.close()`
to observe them; it disarms the handle even on failure. `Directory` and
`Mapping` still have fallible cleanup. `File_System/Directory` also exports
user-location queries such as `get_home_dir`, `get_config_dir`, and `get_download_dir`:
each returns an owned `?Path` without creating the directory.
Construct a path with `Path.from_string(text)`; the former
`Path.path_from_string` name has been removed.
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
Runtime concatenation and repetition use builders or formatting; `+` is
available for compile-time string constants. The `string.cat()`,
`string.repeat()` helpers have been removed. `string.into_temporary()` is
available again for owned temporary-arena allocations: it transfers the release
obligation to the arena without extending the bytes' lifetime.
Import `Strings/Memory` for owned UTF-8 buffer cleanup with `string.free()`,
or import the `Strings` umbrella for `Memory`, `Utf8`, and `Utf16`. A temporary
string expires when its arena is reset or restored. Use `into_temporary()` only
when handing an owned arena allocation back to that arena; never for heap storage.
Both compile-time engines use a default execution budget of 2^28 steps;
`GLOSSO_COMPTIME_STEP_LIMIT=0` removes that limit.

Formatting uses `{}` for default rendering, `{c}` for a character, `{x}` for
hexadecimal, and `{name}` for a custom selector. `{{` and `}}` emit braces;
percent signs are ordinary text. `{0}` and `{1:x}` select zero-based arguments,
and explicit indices leave the automatic counter unchanged. Each argument is
evaluated once and must be referenced at least once. `String_Builder.writef`
uses the same syntax, stages output before appending, and returns void.

Matrix literals use `#matrix .[1, 2, 3; 4, 5, 6]` in a `Matrix(T, Rows, Cols)`
context. Commas separate columns and semicolons separate rows; both dimensions
must match. Ordinary array literals no longer initialize matrices. Import
`Math/Matrix` for `matrix_from_array(M, values)`, `matrix_to_array(m)`,
`m.to_array()`, and `matrix_array_type(M)`. Conversions copy a flat fixed array
with exactly the matrix's element type and element count. `#matrix .[]`
initializes shapes with zero rows or zero columns.

Import `Process/Command` for `run_command(program, args...)`, which runs literal
arguments with optional output capture and a timeout, returning
`Command_Run_Error!Command_Output`.
The result owns its captured stdout and stderr; nonzero exits and timeouts are
`.Ok` outcomes to inspect. `run_shell_command(line)` replaces `run_command_line`
for intentional shell interpretation. The compiler's former `run_command` is
now `run_build_command(line)`, a compile-time shell helper returning
`Compiler_Error!string`; nonzero exits remain `.Err` in that API.

Address-of is `&value` or `value.&`; dereference is `*pointer` or `pointer.*`.
For struct and union pointers, `pointer.field` is shorthand for
`pointer.*.field`, including writes and taking addresses. Qualifiers remain in
force; optional pointers require unwrapping and tagged-union payload rules
still apply.
Pointer types use writable `*T` and read-only `*const T`; many-pointers and views
use `[*]T` / `[*]const T` and `[]T` / `[]const T`. The former `mut` qualifier
has been removed; bare pointers and views are writable. Leading
`#memory { ... }` contracts describe access, escapes, invalidation, allocation,
release, and returned origins. Body contracts are checked; bodyless declarations
supply external contracts. Private functions can use inference. Temporal memory
analysis defaults to `--borrow-check=warning`; use `--borrow-check=error` to
reject findings, `--borrow-check=off` to disable body analysis, and
`--borrow-check-std` to include standard-library bodies. `#enable(memory_strict);`
requires contracts at public and external memory boundaries, rejects overlays
on imported functions, and requires explicit `unknown(...)` holes. These
requirements also apply when temporal body checking is off.
`--memory-signatures`, `--memory-axioms`, and `--memory-report` print inferred
contracts, external contracts, and the inventory. `Drop` generates automatic
destruction and disarms source cleanup on by-value transfers. It does not check
ownership, borrowing, or lifetimes: use after a move, repeated transfers, and
access after `ManuallyDrop.take()` or `.drop()` are unchecked. Keep accesses and
resource transfers valid independently of the memory analyzer's findings.
The literal `c"hello"` is a zero-terminated
`cstring`; `b"hello"` is a fixed byte array. `ManuallyDrop(T)` suppresses automatic
destruction until the value is extracted or explicitly destroyed. The generated
reference includes the `Gui` modules and the `Memory/ManuallyDrop` and `Memory/Object` APIs. `new(T)` allocates and
initializes one object; `delete(pointer)` destroys it and frees storage through
its captured allocator, including when destruction fails.

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
