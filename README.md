# Glosso Manual

The Glosso documentation site is a Vue application using TypeScript 7,
Tailwind CSS, and Nub for dependency management and every development command.
It contains the language manual, complete grammar and directive references,
an indexed standard-library reference, full-text search, and Hoogle-style
function signature search.

The checked-in `src/generated/docs.ts` snapshot makes this directory portable.
While it remains inside the Glosso repository, `nub run generate` refreshes the
snapshot from `../docs/glosso-manual.typ`, `../src/lexer.rs`, `../src/parser.rs`,
and `../std`. If this directory becomes a separate repository, the generator
keeps the committed snapshot instead.

## Local development

```sh
nub install
nub run dev
```

Open the local address printed by Vite. To validate the TypeScript, signature
search, provided Tree-sitter WASM parser, and production bundle together:

```sh
nub run check
```

This command also checks manual coverage against the current lexer and parser:
all language keywords and directives must be documented, and every parser
routine must be mapped to a manual chapter or a complete-grammar section. A
new language construct therefore makes the check fail until it is documented.

## Editing the documentation

Do not edit `src/generated/docs.ts` directly. It is generated, so the next
`nub run generate`, `nub run dev`, or `nub run check` will overwrite manual
changes made there.

Edit the following source files instead:

| Documentation | Source |
| --- | --- |
| Language-manual chapters | `../docs/glosso-manual.typ` |
| Additional web-only explanations | `scripts/manual-enrichment.ts` |
| Complete EBNF grammar | `scripts/generate-docs.ts`, in `grammarGroups` |
| Directive descriptions | `scripts/generate-docs.ts`, in `directiveDetails` and `directiveDocs` |
| Standard-library descriptions | Comments in `../std/**/*.glo` |
| Chapter sidebar organization | `src/App.vue`, in `manualGroupDefinitions` |
| Page layout and reusable UI | `src/App.vue` and `src/components/` |
| Colors and styling | `src/style.css` |

### Editing or adding a language chapter

Language chapters are read from the part of `../docs/glosso-manual.typ`
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
`../std`. Put explanatory comments immediately before a declaration:

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

The generator reads the preceding comments, parameter names and types, default
values, return type, and `#memory` contracts. It also groups typeclass methods,
associated types, minimal definitions, positive instances, and negative
instances. A source file's opening comment becomes its module summary.

Declarations after `#enable(private_section)` are omitted until the matching
`#disable(private_section)`. A leading `__` is only a naming convention; the
site keeps such functions and constants at the bottom of their sections.

### Previewing changes

From this directory, generate the documentation and start the development
server:

```sh
nub run generate
nub run dev
```

`nub run dev` generates once before starting Vite. If the server is already
running and you edit `../docs/glosso-manual.typ`, `../std`, the lexer, or the
parser, run `nub run generate` again in another terminal. Vite will then reload
the changed generated snapshot.

Before publishing, run the complete validation pipeline:

```sh
nub run check
```

### Moving `manual` into a separate repository

The generator currently reads `../docs`, `../src`, and `../std`. When those
Glosso source directories are unavailable, it deliberately keeps and uses the
committed `src/generated/docs.ts` snapshot instead of regenerating it.

Before turning this directory into an independent repository, move or copy the
canonical editable inputs into that repository (for example under `content/`)
and update `scripts/generate-docs.ts` to read them. Alternatively, provide the
Glosso source repository as a sibling checkout or submodule and update
`repoRoot`. Without one of those arrangements, the standalone website remains
buildable, but language and standard-library documentation cannot be
regenerated there.

## GitHub Pages

The parent Glosso repository uses `/.github/workflows/manual-pages.yml`. The
copy at `manual/.github/workflows/pages.yml` becomes active automatically if
`manual` is later promoted to its own repository.

In the repository on GitHub, open **Settings → Pages**, set **Source** to
**GitHub Actions**, then run **Actions → Deploy Glosso manual → Run workflow**
or push to the default branch. The deployment job exposes the final Pages URL.
