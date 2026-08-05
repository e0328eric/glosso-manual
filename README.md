# Glosso Manual

The Glosso documentation site is a Vue application using TypeScript 7,
Tailwind CSS, and Nub for dependency management and every development command.
It contains the language manual, complete grammar and directive references,
an indexed standard-library reference, full-text search, and Hoogle-style
function signature search.

The checked-in `src/generated/docs.ts` snapshot makes this directory portable.
When a Glosso source checkout exists at `../glosso`, `nub run generate`
refreshes the snapshot from its compiler and standard-library sources. If that
checkout also contains `docs/glosso-manual.typ`, the language chapters are
refreshed from it; otherwise the committed manual chapters are preserved. Set
`GLOSSO_SOURCE_ROOT` to use a different checkout location. In a standalone
checkout such as GitHub Actions, the generator keeps the committed snapshot.

## Local development

Enter the Nix development environment to install the pinned Nub CLI:

```sh
nix develop .
```

Alternatively, install Nub separately. Then install the project dependencies
and start the development server:

```sh
nub install
nub run dev
```

Open the local address printed by Vite. To validate the TypeScript, signature
search, provided Tree-sitter WASM parser, and production bundle together:

```sh
nub run check
```

When Glosso compiler sources are available, this command also checks manual
coverage against the current lexer and parser: all language keywords and
directives must be documented, and every parser routine must be mapped to a
manual chapter or complete-grammar section. Without the compiler checkout, it
validates the committed documentation snapshot and skips only the source-drift
checks.

## Editing the documentation

Do not edit `src/generated/docs.ts` directly. It is generated, so the next
`nub run generate`, `nub run dev`, or `nub run check` will overwrite manual
changes made there.

Edit the following source files instead:

| Documentation | Source |
| --- | --- |
| Language-manual chapters | `../glosso/docs/glosso-manual.typ` |
| Additional web-only explanations | `scripts/manual-enrichment.ts` |
| Complete EBNF grammar | `scripts/generate-docs.ts`, in `grammarGroups` |
| Directive descriptions | `scripts/generate-docs.ts`, in `directiveDetails` and `directiveDocs` |
| Standard-library descriptions | Comments in `../glosso/std/**/*.glo` |
| Chapter sidebar organization | `src/App.vue`, in `manualGroupDefinitions` |
| Page layout and reusable UI | `src/App.vue` and `src/components/` |
| Colors and styling | `src/style.css` |

### Editing or adding a language chapter

Language chapters are read from the part of `../glosso/docs/glosso-manual.typ`
between `= Detailed Language Reference` and `= Grammar Appendix`. Use `==` for
a chapter and `===` or `====` for headings inside it:

````text
== My New Feature

Explain what the feature does, when it is used, and its restrictions.

=== Syntax

```glosso
example :: () {
    // Example
}
```

- First rule.
- Second rule.
````

The generator derives the chapter ID from its title. For example,
`== My New Feature` becomes `my-new-feature`. Add that ID to the appropriate
entry in `manualGroupDefinitions` in `src/App.vue`; otherwise the site places
the chapter under **Additional topics**.

Use `scripts/manual-enrichment.ts` only for explanations that should appear on
the website but not in the printable Typst manual. Its object key must equal
the generated chapter ID.

### Editing standard-library documentation

The standard-library reference is extracted from the public declarations in
`../glosso/std`. Put explanatory comments immediately before a declaration:

```glosso
// Converts UTF-8 text into an owned UTF-16 string.
// Release the returned value with cstring16_free.
cstring16_from_string :: (
    text: string,
    allocator: Allocator = context.allocator,
) -> cstring16
    #memory(returns_fresh, released_by(cstring16_free),
            reads(text), noescape(text));
```

The generator reads the preceding comments, struct fields, union and enum
variants, parameter names and types, default values, return type, and `#memory`
contracts. It also groups typeclass methods,
associated types, minimal definitions, positive instances, and negative
instances. A source file's opening comment becomes its module summary.

Declarations after `#enable(private_section)` are omitted until the matching
`#disable(private_section)`. A leading `__` is only a naming convention; the
site keeps such functions and constants at the bottom of their sections.

### Updating the site after a standard-library change

First edit the declarations and their documentation comments in
`../glosso/std/**/*.glo`. Then regenerate and validate the committed website
snapshot from the standalone manual repository:

```powershell
cd C:\Users\almag\Github\glosso-manual
$env:GLOSSO_SOURCE_ROOT = "..\glosso"
nub run generate
nub run check
```

Review the generated diff, then publish it:

```powershell
git diff -- src/generated/docs.ts
git add src/generated/docs.ts
git commit -m "Update standard library documentation"
git push
```

Pushing the default branch runs the GitHub Pages workflow and redeploys the
updated reference. The generator needs the Glosso checkout to contain
`src/lexer.rs`, `src/parser.rs`, and `std/`. If these are missing,
`nub run generate` keeps the existing snapshot instead of partially replacing
it. When `docs/glosso-manual.typ` is absent, the generator keeps the committed
manual chapters while still refreshing the lexer, parser, and standard-library
references. Do not substitute an older manual copy that omits newer chapters.

### Previewing changes

From this directory, generate the documentation and start the development
server:

```sh
nub run generate
nub run dev
```

`nub run dev` generates once before starting Vite. If the server is already
running and you edit the Glosso manual, standard library, lexer, or parser, run
`nub run generate` again in another terminal. Vite will then reload the changed
generated snapshot.

Before publishing, run the complete validation pipeline:

```sh
nub run check
```

### Connecting the Glosso source checkout

The default local layout is:

```text
Github/
├── glosso/
└── glosso-manual/
```

In that layout no configuration is necessary. For a different layout, point
`GLOSSO_SOURCE_ROOT` at the Glosso repository before generating:

```powershell
$env:GLOSSO_SOURCE_ROOT = "C:\path\to\glosso"
nub run generate
```

```sh
GLOSSO_SOURCE_ROOT=/path/to/glosso nub run generate
```

The configured directory must contain `src/lexer.rs`, `src/parser.rs`, and
`std/`; `docs/glosso-manual.typ` is optional. After regeneration, commit the
updated `src/generated/docs.ts` so standalone builds and GitHub Pages receive
the new documentation.

If the Glosso checkout is unavailable, generation deliberately leaves the
committed snapshot unchanged. `nub run check` still validates that snapshot,
TypeScript, search, WASM highlighting, and the production bundle; it reports
that parser-drift checks were skipped.

## GitHub Pages

This repository deploys with `.github/workflows/pages.yml`.

In the repository on GitHub, open **Settings → Pages**, set **Source** to
**GitHub Actions**, then run **Actions → Deploy Glosso manual → Run workflow**
or push to the default branch. The deployment job exposes the final Pages URL.
