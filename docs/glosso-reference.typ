// Glosso language reference. No Typst packages or Glosso compiler required.
// From the repository root:
//   node scripts/generate-typst-reference.mjs
//   typst compile docs/glosso-reference.typ docs/glosso-reference.pdf
// To verify the checked-in snapshot:
//   node scripts/generate-typst-reference.mjs --check

#let manual = json("reference-manual.json")
#let ink = rgb("202b38")
#let muted = rgb("626c78")
#let blue = rgb("234bb1")
#let orange = rgb("d66636")
#let paper = rgb("f3f5f8")
#let rule = rgb("d8dee7")
#let serif = ("Libertinus Serif", "New Computer Modern")
#let sans = ("DejaVu Sans", "Liberation Sans")
#let mono = ("DejaVu Sans Mono", "Liberation Mono")

#set document(
  title: "Glosso Language Reference",
  author: "Glosso Manual",
  description: "The Glosso language manual in a printable, linked reference edition.",
  date: none,
)
#set page(
  paper: "a4",
  margin: (top: 20mm, bottom: 19mm, left: 19mm, right: 19mm),
  header: context [
    #set text(font: sans, size: 7.5pt, fill: muted)
    #let markers = query(<running-head>).filter(it => it.location().page() <= here().page())
    #let title = if markers.len() > 0 { markers.last().value } else { "Language reference" }
    #grid(columns: (auto, 1fr), [GLOSSO], align(right, title))
    #v(3pt)
    #line(length: 100%, stroke: 0.5pt + rule)
  ],
  footer: context [
    #set text(font: sans, size: 7.5pt, fill: muted)
    #grid(columns: (1fr, auto), [Language reference], counter(page).display("1 / 1", both: true))
  ],
)
#set text(font: serif, size: 10pt, fill: ink, lang: "en")
#set par(justify: true, leading: 0.55em, spacing: 0.8em)
#set heading(numbering: "1.1")
#set raw(tab-size: 4)
#set list(indent: 1em, body-indent: 0.5em, spacing: 0.4em)
#show link: set text(fill: blue)
#show raw: set text(font: mono, size: 0.85em, hyphenate: false)
#show raw.where(block: false): set text(fill: blue)
#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  set text(font: sans, size: 23pt, weight: "bold", fill: ink)
  block(above: 4pt, below: 16pt, width: 100%)[
    #line(length: 25mm, stroke: 2pt + orange)
    #v(8pt)
    #it
  ]
}
#show heading.where(level: 2): it => {
  set text(font: sans, size: 15pt, weight: "bold", fill: ink)
  block(above: 18pt, below: 9pt, it)
}
#show heading.where(level: 3): it => {
  set text(font: sans, size: 10.5pt, weight: "bold", fill: ink)
  block(above: 12pt, below: 6pt, it)
}

// Construct content directly from strings: Glosso #directives, $, underscores,
// brackets, and quotations must never be evaluated as Typst markup.
#let inline(value) = {
  // Match equal-length delimiter runs. A single-backtick span can contain
  // Glosso's double-backtick syntax, and double spans can quote single ticks.
  let marks = value.matches(regex("`+"))
  let cursor = 0
  let i = 0
  while i < marks.len() {
    let open = marks.at(i)
    text(value.slice(cursor, open.start))
    let j = i + 1
    while j < marks.len() and marks.at(j).text != open.text { j += 1 }
    if j < marks.len() {
      let close = marks.at(j)
      raw(value.slice(open.end, close.start))
      cursor = close.end
      i = j + 1
    } else {
      // Preserve unmatched delimiters as literal source text.
      text(open.text)
      cursor = open.end
      i += 1
    }
  }
  text(value.slice(cursor))
}

#let code-block(item) = {
  let caption = (
    glosso: "GLOSSO",
    text: "CONSOLE / OUTPUT",
    ebnf: "GRAMMAR",
  ).at(item.language)
  block(
    width: 100%, breakable: true, fill: paper,
    inset: 9pt, radius: 2pt, above: 7pt, below: 9pt,
  )[
    #set text(size: 9pt)
    #set par(justify: false, leading: 0.45em, spacing: 0.5em)
    #block(sticky: true, above: 0pt, below: 5pt)[
      #text(font: sans, size: 6.5pt, weight: "bold", fill: muted, caption)
    ]
    #block(above: 0pt, below: 0pt)[
      #raw(item.text, block: true, lang: "text")
    ]
  ]
}

#let reference-table(item) = {
  let count = if item.headers.len() > 0 { item.headers.len() } else { item.rows.first().len() }
  let widths = if count == 2 { (1.2fr, 2fr) } else if count == 3 { (1.4fr, 1.8fr, 1.2fr) } else { (1fr,) }
  block(above: 6pt, below: 9pt, width: 100%, breakable: true)[
    #set text(size: 8.8pt)
    #set par(justify: false, leading: 0.45em)
    #table(
      columns: widths,
      inset: (x: 6pt, y: 6pt),
      stroke: (top: none, bottom: 0.4pt + rule, left: none, right: none),
      fill: (x, y) => if y == 0 and item.headers.len() > 0 { paper },
      ..if item.headers.len() > 0 {
        (table.header(..item.headers.map(value => text(font: sans, size: 7.5pt, weight: "bold", inline(value)))),)
      } else { () },
      ..item.rows.flatten().map(inline),
    )
  ]
}

#let render(item) = {
  if item.kind == "paragraph" {
    par(inline(item.text))
  } else if item.kind == "subheading" {
    heading(level: 3, numbering: none, outlined: false, inline(item.text))
  } else if item.kind == "bullet" {
    list(inline(item.text))
  } else if item.kind == "note" {
    block(
      width: 100%, breakable: true, fill: rgb("fbf5ee"),
      stroke: (left: 2pt + orange), inset: 9pt, above: 8pt, below: 9pt,
    )[
      #set text(size: 9pt)
      #set par(justify: false)
      #block(sticky: true, below: 5pt)[
        #text(font: sans, size: 7pt, weight: "bold", fill: orange, "NOTE")
      ]
      #par(inline(item.text))
    ]
  } else if item.kind == "code_block" {
    code-block(item)
  } else if item.kind == "table" {
    reference-table(item)
  } else {
    panic("Unknown reference block: " + item.kind)
  }
}

#let section-link(id, title) = link(label("section-" + str(id)), title)

#page(header: none, footer: none)[
  #set par(justify: false)
  #v(14mm)
  #text(font: sans, size: 12pt, weight: "bold", tracking: 2pt, fill: blue)[GLOSSO]
  #v(20mm)
  #line(length: 35mm, stroke: 3pt + orange)
  #v(10mm)
  #text(font: serif, size: 45pt, weight: "bold")[Language\ reference]
  #v(8mm)
  #text(font: sans, size: 12pt, fill: muted)[Syntax, semantics, and the compilation model]
  #v(12mm)
  #text(size: 12pt)[
    A printable reference edition of the Glosso Manual, with the complete
    language chapters, code examples, grammar, and diagnostic reference.
  ]
  #v(1fr)
  #line(length: 100%, stroke: 0.5pt + rule)
  #v(5mm)
  #text(font: sans, size: 9pt, fill: muted)[
    #manual.sections.len() sections #h(1em) / #h(1em)
    #manual.groups.len() topic groups #h(1em) / #h(1em)
    #manual.counts.code_block examples and transcripts
  ]
  #v(5mm)
]

#text(font: sans, size: 23pt, weight: "bold")[Finding your way]
#metadata("Finding your way") <running-head>
#v(8pt)

This edition follows the chapter order and content of the manual in this
repository. It preserves the prose, examples, output, notes, and reference
tables. The contents and the PDF bookmarks link to the language sections.

Examples include both successful programs and deliberately invalid programs
followed by their diagnostics. Target-specific output and paths are reproduced
as written in the manual. The final topic group contains the standard library
map, grammar reference, diagnostic reference, and style guidelines; the
website's generated per-symbol standard library API is a separate reference.

#v(5pt)
#text(font: sans, size: 12pt, weight: "bold")[Quick lookup]
#v(6pt)
#set table(
  inset: (x: 6pt, y: 6pt),
  stroke: (top: none, bottom: 0.4pt + rule, left: none, right: none),
)
#table(
  columns: (1fr, 2fr),
  table.header(
    text(font: sans, size: 8pt, weight: "bold", "LOOK UP"),
    text(font: sans, size: 8pt, weight: "bold", "START HERE"),
  ),
  [Program entry and the compiler], [#section-link(0, [Program entry]) · #section-link(1, [Compiler options]) · #section-link(138, [Targets])],
  [Imports and visibility], [#section-link(4, [Imports and loads]) · #section-link(20, [Visibility and ownership units])],
  [Declarations], [#section-link(16, [Binding forms]) · #section-link(19, [Scope and shadowing])],
  [Literals and primitive types], [#section-link(8, [Integers]) · #section-link(10, [Strings]) · #section-link(22, [Primitive types])],
  [Conversions and precedence], [#section-link(31, [Implicit conversions]) · #section-link(32, [Casts]) · #section-link(36, [Precedence])],
  [Aggregates], [#section-link(37, [Structs]) · #section-link(42, [Enums]) · #section-link(43, [Unions])],
  [Pointers and collections], [#section-link(49, [Pointers]) · #section-link(51, [Arrays and views]) · #section-link(52, [Slicing])],
  [Functions and generics], [#section-link(56, [Functions]) · #section-link(62, [Generics]) · #section-link(63, [Constraints])],
  [Typeclasses and operators], [#section-link(68, [Typeclasses]) · #section-link(70, [Instances]) · #section-link(83, [Operators])],
  [Options and error handling], [#section-link(47, [Options]) · #section-link(48, [Results]) · #section-link(79, [Try]) · #section-link(80, [Propagation])],
  [Branching and patterns], [#section-link(89, [Switches]) · #section-link(90, [ifx]) · #section-link(91, [Patterns])],
  [Iteration], [#section-link(99, [while]) · #section-link(100, [for]) · #section-link(101, [Custom iteration])],
  [Compile-time programming], [#section-link(106, [Comptime]) · #section-link(111, [Macros]) · #section-link(112, [Reflection])],
  [Memory and resource ownership], [#section-link(117, [Allocators]) · #section-link(120, [Drop]) · #section-link(121, [Moves]) · #section-link(123, [Lifetimes])],
  [C interop and builds], [#section-link(131, [Calling C]) · #section-link(134, [Bindgen]) · #section-link(114, [Build scripts])],
  [Grammar and diagnostics], [#section-link(143, [Grammar]) · #section-link(144, [Diagnostics]) · #section-link(145, [Style])],
)

#pagebreak()
#text(font: sans, size: 23pt, weight: "bold")[Contents]
#metadata("Contents") <running-head>
#v(12pt)
#columns(2, gutter: 9mm)[
  #set text(size: 8.7pt)
  #set par(justify: false, leading: 0.35em)
  #set outline(indent: auto)
  #outline(title: none, depth: 2)
]

#for group in manual.groups {
  heading(level: 1, group.title)
  [#metadata(group.title)<running-head>]
  for id in group.sections {
    let section = manual.sections.at(id)
    [#heading(level: 2, inline(section.title))#label("section-" + str(id))]
    for item in section.blocks { render(item) }
  }
}

#pagebreak()
#text(font: sans, size: 23pt, weight: "bold")[Source and reproduction]
#metadata("Source and reproduction") <running-head>
#v(10pt)

The language content comes from the #manual.sections.len() sections declared in
#raw("src/section_catalog.glo") and loaded by #raw("main.glo"). Topic groups
follow #raw("manualSidebarGroups") in #raw("app.js"). Content is reproduced
from the repository sources without changing the language examples or claims.

The Typst file reads a checked-in content snapshot. Building this document needs
Typst and the adjacent #raw("reference-manual.json"); refreshing the snapshot
also needs Node.js. No external Typst packages, network access, or Glosso compiler
are needed. The font lists fall back to Libertinus Serif / New Computer Modern,
DejaVu Sans / Liberation Sans, and DejaVu Sans Mono / Liberation Mono.

#raw("node scripts/generate-typst-reference.mjs\ntypst compile docs/glosso-reference.typ docs/glosso-reference.pdf\nnode scripts/generate-typst-reference.mjs --check", block: true, lang: "text")

Run these commands from the repository root. The check compares the snapshot
with the current manual and reports an error if the sources have changed.
To update the document, refresh the snapshot before compiling the PDF.

#v(10pt)
#text(font: sans, size: 10pt, weight: "bold")[Manual sources]
#v(5pt)
#set text(size: 8.5pt)
#for group in manual.groups {
  let source = manual.sections.at(group.sections.first()).source
  par(raw(source))
}
#v(8pt)
#text(font: sans, size: 8pt, fill: muted)[Snapshot SHA-256]
#par(raw(manual.sourceHash))
