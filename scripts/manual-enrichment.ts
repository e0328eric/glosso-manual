export type ManualEnrichment = {
  heading: string;
  overview: string;
  rules: string[];
  replacements?: Array<{
    from: string;
    to: string;
  }>;
  blocks?: Array<{
    kind: "paragraph" | "code" | "list" | "heading" | "note" | "table";
    text?: string;
    language?: string;
    items?: string[];
    columns?: string[];
    rows?: string[][];
  }>;
};

// The source manual is also used for the printable reference. These additions
// are web-oriented explanations: they connect syntax to consequences and make
// the shorter chapters useful without duplicating their existing examples.
export const manualEnrichment: Record<string, ManualEnrichment> = {
  "visibility-and-private-sections": {
    heading: "Visibility state and import filtering",
    overview:
      "Visibility controls which declarations an importer may name. It does not introduce a new runtime scope: the declarations still belong to the source file, but the compiler filters them when another file imports that file.",
    rules: [
      "`#enable(private_section)` affects declarations that follow it, so place the matching `#disable(private_section)` immediately after the implementation-only region.",
      "Add `siblings` only when neighboring implementation files must share the hidden declarations; ordinary importers still cannot see them.",
      "A leading `__` is a Glosso naming convention for implementation details, not an access-control mechanism. Use a private section when the compiler must enforce the boundary.",
      "Apply `only(...)` and `hide(...)` at imports to make dependencies explicit; those filters cannot restore a declaration already hidden by its defining file.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Directive", "Visibility of following declarations"],
        rows: [
          ["`#enable(private_section);`", "Private to the defining source unit"],
          ["`#enable(private_sections);`", "Accepted plural spelling; the same behavior"],
          ["`#enable(private_section, siblings);`", "Visible to sibling files of the same logical module, but hidden from importers"],
          ["`#disable(private_section);`", "Public again"],
        ],
      },
      {
        kind: "paragraph",
        text: "A feature directive changes parser state for declarations that follow it; braces do not delimit the region. During source resolution the compiler gives hidden declarations stable internal names and rewrites implementation references, so private types, typeclass methods, operators, instances, and `#foreign` library handles continue to work internally without leaking their source spelling.",
      },
      {
        kind: "code",
        language: "glosso",
        text: "// module.glo\npublic_before :: () {}\n\n#enable(private_section);\nhelper :: () {}\nHidden :: struct { value: s64; }\n#disable(private_section);\n\npublic_after :: () { helper(); }\n\n// consumer.glo\n#import,only (public_before, public_after) \"module\";\n// `helper` and `Hidden` are not public names here.",
      },
      {
        kind: "note",
        text: "Import selection sees only public declarations. Naming a private or unknown declaration in `#import,only(...)` or `#import,hide(...)` is an error; the diagnostic lists available public names. Repeated `only` imports of the same module combine their selected public declarations.",
      },
    ],
  },
  "unique-operations-and-coherence": {
    heading: "Candidate uniqueness",
    overview:
      "An operation spelling is owned by one protocol/typeclass interface, but a call may still have several concrete and generic implementation candidates. The current checker matches arguments and constraints, scores the surviving candidates, and rejects a tie at the best score; source or import order is not a tiebreaker.",
    rules: [
      "Arity, named/default binding, operand order, operator fixity, generic unification, coercions, `#modify`, and `where` conditions all participate in applicability.",
      "An exact non-generic signature receives a large score advantage; parameters more specific than `any` also score above erased matches.",
      "A typeclass requirement declaration is discarded when a real implementation candidate survives for the call.",
      "When the best candidates have the same witness status and score, the compiler emits an ambiguous-operation diagnostic naming both instances.",
    ],
    blocks: [
      {
        kind: "heading",
        text: "Current selection sequence",
      },
      {
        kind: "list",
        items: [
          "Collect visible declarations for the operation spelling (or only the explicitly scoped typeclass when a scope is present).",
          "Normalize named arguments when all overloaded interfaces agree on parameter names; otherwise require positional arguments.",
          "Reject candidates whose arity, defaults, variadic position, parameter types, generic bindings, or coercions do not fit.",
          "Evaluate `#modify` and every `where` clause using the inferred compile-time bindings; a false condition removes the candidate.",
          "Sort applicable candidates by implicit empty-witness use and then descending specificity score. Select the top candidate only when it beats the next one.",
        ],
      },
      {
        kind: "note",
        text: "The scoring details describe the current compiler implementation, not permission to create fragile overload sets. Public APIs should still prefer domains whose intended winner is apparent from concrete parameter types and constraints.",
      },
    ],
  },
  "hello-world-and-program-entry": {
    heading: "Entry-point behavior and termination",
    overview:
      "A linked executable starts at the top-level, zero-parameter `main`. Omitting its return type gives the familiar `main :: ()` form and a successful status on normal completion. Alternatively, `main` may return any type that implements the prelude `Termination` typeclass; the runtime passes the returned value to `termination_status` to obtain the process status.",
    replacements: [
      {
        from: "A compiled program starts at `main`. The entry procedure has no parameters and no declared result type. To read command-line arguments, call `get_cmdline_args()`. To return a process status, call `exit(status)`.",
        to: "A compiled program starts at `main`. The entry procedure has no parameters. It may omit its result type, or return a type that implements `Termination`. To read command-line arguments, call `get_cmdline_args()`.",
      },
    ],
    rules: [
      "`main` must not take source parameters. Use `get_cmdline_args()` for a borrowed `[]string` view of process arguments, including the executable entry according to the runtime platform's construction.",
      "A `main :: () { ... }` that reaches the end normally returns process status 0. `exit(status: int)` remains available for immediate termination and is marked `#noreturn`.",
      "Every integer type implements `Termination`; `termination_status` casts the value to `s32`, after which the host applies its platform exit-code rules.",
      "`Result(void, E)` implements `Termination` when `E` implements `Error`. Success becomes status 0; an error is reported with `report_error` and becomes status 1, making `?` convenient in fallible entry points.",
      "Application-specific result types may implement `Termination` by defining `termination_status(value: T) -> s32`. A non-void `main` whose return type has no matching instance is rejected.",
      "The prelude and ordinary implicit context are available in `main` unless the declaration is deliberately changed to a no-context/C-ABI form.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Entry signature", "Normal process status"],
        rows: [
          ["`main :: ()`", "0 when execution reaches the end"],
          ["`main :: () -> I` where `Is_Integer(I)`", "The returned integer, cast to `s32`"],
          ["`main :: () -> Result(void, E)` where `Error(E)`", "0 for `Ok`; report `Err` and return 1"],
          ["`main :: () -> T` where `Termination(T)`", "The `s32` produced by `termination_status`"],
        ],
      },
      {
        kind: "heading",
        text: "Returning an integer status",
      },
      {
        kind: "code",
        language: "glosso",
        text: "main :: () -> int {\n    if get_cmdline_args().count < 2 return 2;\n    return 0;\n}",
      },
      {
        kind: "heading",
        text: "Propagating a typed error",
      },
      {
        kind: "code",
        language: "glosso",
        text: "#import \"File\";\n\nmain :: () -> Result(void, File_Error) {\n    file := open_read(\"input.txt\")?;\n    _ := close(file)?;\n}",
      },
      {
        kind: "note",
        text: "Falling through the end of a `Result(void, E)` entry point is the successful `void` output and becomes `Ok`; a propagated `Err` is reported through the error type's `Error` instance before the process exits with status 1.",
      },
      {
        kind: "heading",
        text: "Defining an application-specific status",
      },
      {
        kind: "code",
        language: "glosso",
        text: "Exit_Status :: struct { code: s32; }\n\nExit_Status :: instance Termination {\n    termination_status :: (value: Exit_Status) -> s32 {\n        return value.code;\n    }\n}\n\nmain :: () -> Exit_Status {\n    return .{ .code = 9 };\n}",
      },
      {
        kind: "code",
        language: "glosso",
        text: "#import \"Io\";\n\nmain :: () {\n    args := get_cmdline_args();\n    if args.count < 2 {\n        print(\"usage: % <input>\\n\", args[0]);\n        exit(2);\n    }\n    print(\"input: %\\n\", args[1]);\n}",
      },
    ],
  },
  comments: {
    heading: "Lexical behavior",
    overview:
      "Comments are lexical whitespace: they never create declarations or attach metadata to the following symbol. Line comments are best for local intent, while nestable block comments are useful for temporarily excluding a region that already contains comments.",
    rules: [
      "Use `//` for short explanations and `/* ... */` for multi-line prose or temporary exclusion.",
      "Block comments nest, so commenting out code that already contains `/* ... */` remains well formed.",
      "Directives inside comments are inert. Keep required build, memory, and calling-convention directives in code where the compiler can validate them.",
      "Explain invariants and surprising decisions rather than restating the syntax on the next line.",
    ],
  },
  "identifiers-and-names": {
    heading: "Lookup and qualification",
    overview:
      "Names identify declarations, fields, captures, and modules. Qualification makes ownership explicit, while the backtick form deliberately asks a macro-like facility to resolve a name in the insertion environment instead of where the code value was created.",
    rules: [
      "Use module qualification when two imports expose the same spelling or when ownership is important to the reader.",
      "Keep ordinary names stable across generated and handwritten code; qualification is safer than relying on incidental import order.",
      "Reserve backtick names for `#code`, `#expand`, and generated fragments that intentionally capture a caller-side binding.",
      "A leading `__` communicates implementation-only intent by convention, but does not make a declaration private.",
    ],
  },
  "integer-literals": {
    heading: "Typing and validation",
    overview:
      "An integer literal begins as an exact compile-time value and is checked against the type required by its context. This lets the same spelling initialize different integer widths while still rejecting a value that the destination cannot represent.",
    rules: [
      "Use `base#digits` for bases 2 through 36; alphabetic digits are case-insensitive and must be valid for the chosen base.",
      "Underscores improve grouping but do not change the value. Group digits according to the domain, such as bytes in hexadecimal or thousands in decimal.",
      "Add an explicit type annotation when width or signedness is part of an interface instead of relying on surrounding inference.",
      "A negative number is a prefix operation applied to a positive literal, so the resulting value must still fit its selected signed type.",
    ],
  },
  "floating-point-literals": {
    heading: "Typing and precision",
    overview:
      "Floating literals are converted to the floating type selected by context. Decimal source text may not be exactly representable in binary, so compile-time conversion establishes the same precision and rounding constraints that later arithmetic uses.",
    rules: [
      "Use an explicit `f32`, `f64`, or other annotation at API and storage boundaries where precision is significant.",
      "The exponent is decimal even when the value is very large or small; based-integer syntax does not apply to floating literals.",
      "Underscores may group digits in the significand or exponent, but should not obscure the decimal scale.",
      "Do not compare computed floating values for exact equality unless the domain guarantees an exactly representable result.",
    ],
  },
  "string-literals": {
    heading: "Encoding, length, and storage",
    overview:
      "A string literal represents encoded text, not an array of Unicode characters. Byte length, Unicode scalar count, and displayed width are different measurements; choose the appropriate UTF library operation when traversing human text.",
    rules: [
      "Use escapes for quotes, control characters, and values that would make source layout ambiguous.",
      "Multiline strings preserve their line-oriented contents and are preferable to long chains of escaped newlines.",
      "Indexing or slicing raw string storage operates on encoding units. Do not cut arbitrary byte positions when a valid UTF sequence must be preserved.",
      "Use `cstring` or `cstring16` only at APIs that require terminator-based strings, and account for embedded zero values at that boundary.",
    ],
  },
  "character-literals": {
    heading: "Character values",
    overview:
      "`#char` lexes exactly one Unicode scalar or one supported escape from a string spelling and produces an integer character value. Its allowed inferred destination types depend on whether the scalar is ASCII.",
    rules: [
      "The argument must denote exactly one character or escape, rather than an arbitrary-length string.",
      "An ASCII `#char` may infer as `u8`, `s8`, or `u32`; another expected integer type such as `s32` is rejected.",
      "A non-ASCII `#char` may infer only as `u32`.",
      "A character value does not carry string encoding or length information. Convert through the UTF facilities when appending it to encoded text.",
      "User-perceived characters can contain several Unicode scalars, so `#char` is not a grapheme-cluster literal for arbitrary displayed text.",
    ],
    blocks: [
      {
        kind: "code",
        language: "glosso",
        text: "ascii_byte: u8 = #char \"A\";\nsigned_ascii: s8 = #char \"|\";\nrune: u32 = #char \"가\";\nnewline: u8 = #char \"\\n\";\n\n// Rejected:\n// wrong: s32 = #char \"A\";\n// too_small: u8 = #char \"가\";",
      },
    ],
  },
  "label-and-undefined-literals": {
    heading: "Symbolic and uninitialized values",
    overview:
      "Labels are symbolic values used by label-oriented APIs and control helpers. `#undefined` deliberately supplies no initialized value and should be limited to places where later initialization is structurally guaranteed.",
    rules: [
      "Do not use a label where ordinary user text is expected; its identity is symbolic rather than string data.",
      "Treat every read of a `#undefined` value before initialization as a program error, even when a low-level layout makes the read appear to work.",
      "Prefer a default value, tagged union, or `Option`-style representation when absence can occur during normal execution.",
      "Keep undefined state local and short-lived so reviewers can see the write that makes the value valid.",
    ],
  },
  "values-constants-and-variables": {
    heading: "Declaration forms",
    overview:
      "The declaration operator communicates both mutability and evaluation time. Choosing it precisely lets readers distinguish a compile-time fact, a mutable inferred local, and storage whose public type is intentionally stated.",
    rules: [
      "Use `::` for compile-time constants and definitions, including functions and types.",
      "Use `:=` for mutable storage whose type should be inferred from its initializer.",
      "Use `name: Type` when the declared type is part of the contract; add an initializer when the default value is not appropriate.",
      "Prefer the narrowest scope that contains all uses, especially for mutable variables and temporary pointers.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Form", "Binding created"],
        rows: [
          ["`Name :: expression;`", "Compile-time constant. The expression must be evaluable during compilation."],
          ["`Name : Type : expression;`", "Compile-time constant with an explicit checked type."],
          ["`name := expression;`", "Mutable variable whose type is inferred from the initializer."],
          ["`name: Type = expression;`", "Mutable variable with an explicit type and initializer."],
          ["`name: Type;`", "Mutable variable initialized with the type's default value."],
          ["`name ::= expression;`", "A body-local compile-time binding form; the initializer is evaluated at compile time."],
        ],
      },
      {
        kind: "paragraph",
        text: "At top level, `::` also introduces named definitions such as functions, structs, unions, enums, imports, libraries, function-pointer types, and typeclasses; the token following `::` determines which declaration parser is used. Inside a body, `::` creates a constant variable and `::=` marks a compile-time local. `:=` and typed `=` forms create mutable storage.",
      },
      {
        kind: "code",
        language: "glosso",
        text: "Limit :: 64;\nHalf : f32 : 0.5;\n\nmain :: () {\n    count := 0;          // inferred mutable int\n    ratio: f32 = Half;  // explicit mutable f32\n    cached ::= Limit * 2;\n    count += cached;\n}",
      },
      {
        kind: "note",
        text: "A declaration without an initializer uses the type's default construction rules. Struct field defaults are applied; remaining scalar and aggregate storage receives its type-default value. Use `#undefined` only when deliberately bypassing meaningful initialization and when every later read is dominated by a valid write.",
      },
    ],
  },
  "assignment-and-update-assignment": {
    heading: "Writable locations and update operators",
    overview:
      "Assignment changes existing storage; it does not introduce a new binding. Update assignment combines an operator with a write and therefore depends on both the operator implementation and the assignability of the left-hand location.",
    rules: [
      "The left side must denote mutable storage such as a variable, dereferenced pointer, field, or writable index.",
      "Use plain `=` when replacing a value and a compound form such as `+=` when the read-modify-write intent is meaningful.",
      "An overloaded assignment operator must still produce a value coercible to the left operand's type.",
      "For custom containers, define `[]=` alongside `[]` when callers need indexed mutation; a readable index result alone does not imply a writable location.",
    ],
  },
  "primitive-types": {
    heading: "Representation and width",
    overview:
      "Primitive types define the compiler's fundamental value representations. Width-specific names are the right choice for binary layouts and foreign interfaces, while `int` and `uint` are fixed 64-bit convenience types rather than platform-sized aliases.",
    rules: [
      "Use signed or unsigned integer widths deliberately; signedness affects comparisons, shifts, overflow, and foreign ABI compatibility.",
      "Select floating and complex widths based on required precision and interoperability, not only on the size of nearby integer data.",
      "`void`, `type`, `any`, `label`, and `Code` describe special semantic roles and should not be treated as interchangeable storage types.",
      "At serialization and C boundaries, spell the exact primitive width so the layout remains stable across targets.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Family", "Built-in names", "Meaning"],
        rows: [
          ["Signed integers", "`s8`, `s16`, `s32`, `s64`, `s128`, `int`", "Two's-complement integer widths; `int` is an alias for the fixed 64-bit signed domain."],
          ["Unsigned integers", "`u8`, `u16`, `u32`, `u64`, `u128`, `uint`", "Unsigned integer widths; `uint` is an alias for the fixed 64-bit unsigned domain."],
          ["Floating point", "`f16`, `f32`, `f64`, `f80`, `f128`", "Binary floating formats supported by the selected backend and target."],
          ["Complex", "`c32`, `c64`, `c128`, `c160`, `c256`", "Two components whose component widths are respectively 16, 32, 64, 80, and 128 bits."],
          ["Text descriptors", "`string`, `cstring`, `string16`, `cstring16`", "Count/data/capacity descriptors; `c` forms maintain a trailing zero code unit."],
          ["Compiler and control", "`bool`, `type`, `void`, `any`, `label`, `Code`", "Boolean, compile-time type value, no-value type, erased value, jump label, and syntax value."],
        ],
      },
      {
        kind: "note",
        text: "Primitive availability in the parser does not guarantee that every target ABI can pass every primitive by value. In particular, complex primitives have no declared C ABI in Glosso; use scalar components or pointed-to storage at foreign boundaries.",
      },
    ],
  },
  booleans: {
    heading: "Conditions and short-circuiting",
    overview:
      "Control-flow conditions are boolean values rather than implicit truthiness conversions. The short-circuit operators also define evaluation order, making them suitable for guards whose right side is only valid after the left side succeeds.",
    rules: [
      "Use `&&` when the second expression depends on the first, such as a null check followed by dereference.",
      "Use `||` for fallbacks whose later alternatives should run only after earlier ones fail.",
      "Do not encode a boolean protocol with magic integers; compare explicitly at an external boundary and keep internal conditions typed as `bool`.",
      "Parenthesize mixed boolean expressions when domain meaning matters more than relying on precedence alone.",
    ],
  },
  "numeric-operations": {
    heading: "Conversions and overflow behavior",
    overview:
      "Numeric operators use the selected operand types, so width, signedness, and overflow mode are part of the operation. Conversions should be visible where losing range or precision is possible.",
    rules: [
      "Keep mixed-width arithmetic explicit at interface boundaries so sign extension, truncation, and floating conversion are reviewable.",
      "Choose checked, wrapping, or saturating behavior according to the domain; each expresses a different invariant rather than a performance hint.",
      "Shift counts and division operands need validation when they originate outside the program.",
      "Use wider intermediates for accumulation when the final result fits but individual operations could overflow the storage type.",
    ],
  },
  "fixed-arrays": {
    heading: "Layout and value semantics",
    overview:
      "A fixed array stores its elements inline and carries its length in the type. It is therefore a value with predictable layout, not a resizable container or an automatically bounds-independent pointer.",
    rules: [
      "Use fixed arrays for compile-time-known counts, embedded buffers, and layouts where allocation is undesirable.",
      "Changing the length changes the type, so public APIs that accept several lengths should usually take a view or a generic length.",
      "Copying a fixed array copies its elements; take a pointer or view when mutation must affect the original storage.",
      "Keep index validation in mind even when the array itself lives on the stack or inside another aggregate.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Property", "`[N]T` behavior"],
        rows: [
          ["Length", "Part of the type and available as `.count`; `N` is an integer literal or named compile-time constant."],
          ["Storage", "Elements are inline in the containing value; no separate capacity field or resize operation exists."],
          ["Assignment/copy", "Copies all elements because the array is a value type."],
          ["Indexing", "Returns an element location for a mutable array; bounds checks trap at `-O0` and `-O1` and are omitted at `-O2` and `-O3`."],
          ["Conversion", "A view may be formed when an `[]T` parameter or operation needs borrowed contiguous storage."],
        ],
      },
    ],
  },
  "array-views": {
    heading: "Borrowing and lifetime",
    overview:
      "An array view describes a contiguous region owned elsewhere. Copying the view copies the descriptor, not the elements, and does not extend the lifetime of the backing storage.",
    rules: [
      "The owner must outlive every view, iterator, and pointer derived from that storage.",
      "A mutable view writes through to the owner; use a const-qualified view when an API promises observation only.",
      "Operations that reallocate or release a dynamic array invalidate its existing views even if their old addresses still appear readable.",
      "Pass views for borrowed variable-length input and dynamic arrays when ownership transfer or resizing is required.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["View component", "Meaning"],
        rows: [
          ["`data`", "Pointer to the first borrowed element"],
          ["`count`", "Number of elements available through the view"],
          ["Capacity", "Not present; a view cannot grow the owner"],
          ["Ownership", "Not present; copying or dropping a view never frees elements"],
        ],
      },
      {
        kind: "code",
        language: "glosso",
        text: "increment_all :: (values: []int) {\n    for value, index: values values[index] = value + 1;\n}\n\nfixed: [4]int;\ndynamic: [..]int;\narray_add(*dynamic, 10, 20);\nincrement_all(fixed);\nincrement_all(array_view(dynamic));",
      },
      {
        kind: "note",
        text: "A view over a dynamic array becomes invalid when an operation replaces or frees that array's storage. The view's copied `count` and `data` fields are not automatically updated after append, reserve, resize, reset-to-new-storage, or free operations.",
      },
    ],
  },
  "dynamic-arrays": {
    heading: "Ownership, capacity, and invalidation",
    overview:
      "A dynamic array owns a resizable allocation described by data, count, and capacity. Mutating operations may replace that allocation, so the container's address and the lifetime of borrowed element references matter.",
    rules: [
      "Call mutating helpers through the form required by the API so updated data and capacity fields are written back to the owner.",
      "Assume append, reserve, resize, and similar growth can invalidate element pointers and views unless capacity guarantees otherwise.",
      "Distinguish clearing elements from releasing capacity; choose the operation that matches the intended reuse and ownership lifecycle.",
      "Release owned storage exactly once, and leave borrowed views responsible for neither growth nor deallocation.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Operation", "Header/storage effect"],
        rows: [
          ["`array_add(*array, values...)`", "Appends values; may allocate and replace `data`, and updates `count`/`capacity` through the pointer."],
          ["`array_view(array)`", "Returns a non-owning `[]T` over the live prefix without transferring allocation ownership."],
          ["`array_reset(*array)`", "Sets the logical count to zero while retaining capacity for later reuse."],
          ["`array_free(*array)`", "Releases the owned allocation and invalidates views and element pointers."],
        ],
      },
      {
        kind: "paragraph",
        text: "Mutators receive `*[..]T` because a growth operation may change all three header fields. Passing only the old data pointer or a copied view cannot update the owner. After any operation that may grow the array, reacquire element pointers and views from the updated header.",
      },
    ],
  },
  "ranges-and-slices": {
    heading: "Bounds and endpoint forms",
    overview:
      "Ranges describe bounds and direction, while slicing applies those bounds to storage. Endpoint form is semantically important: an inclusive bound names the last element, whereas a half-open bound names the position after it.",
    rules: [
      "Prefer half-open ranges for counts and nested slices because adjacent ranges compose without overlap.",
      "Use inclusive ranges when the domain naturally names both endpoint values, and handle the maximum representable endpoint carefully.",
      "Open bounds derive their missing endpoint from the sliced value; they are meaningful only when that value supplies a limit.",
      "Array slicing returns borrowed storage and follows view lifetime rules; slicing a built-in string instead returns an owned value of the same string type with independent storage.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Range", "Selected indices"],
        rows: [
          ["`a..b`", "`a` through `b - 1` (half-open)"],
          ["`a..=b`", "`a` through `b` (inclusive)"],
          ["`a..`", "`a` through the indexed value's end"],
          ["`..b`", "Origin through `b - 1`"],
          ["`..=b`", "Origin through `b`"],
          ["Full range", "Represented by `RangeFull` internally"],
        ],
      },
      {
        kind: "paragraph",
        text: "Ranges are ordinary prelude values and implement `Iterable`, so the same objects drive slicing and `for`. The meaning of an open end is supplied by the indexing implementation; standalone iteration requires a range whose iteration bounds are defined. The result type belongs to the target's `[]` implementation: array-like slices are views, while built-in string slices are independent owned strings.",
      },
    ],
  },
  "structure-of-arrays-and-array-of-structs": {
    heading: "Physical layout",
    overview:
      "`#soa` and `#aos` choose how collections of aggregates are laid out. Array-of-structs keeps each record together; structure-of-arrays keeps each field together, which can improve field-wise traversal but changes addressing and interoperability expectations.",
    rules: [
      "Choose layout from the dominant access pattern: whole-record processing favors AoS, while tight loops over a few fields often favor SoA.",
      "Do not assume a field projection from SoA has the same address relationship as a field inside one ordinary struct value.",
      "Use explicitly compatible AoS layouts at foreign interfaces unless the external API was designed for separate field arrays.",
      "Benchmark representative workloads; layout improves locality only when it matches actual traversal.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Form", "Layout and restrictions"],
        rows: [
          ["`#aos [..]Record`", "Normal array of complete records; field data for one element is adjacent."],
          ["`#soa [..]Record`", "One backing array per record field; `items.field[index]` addresses that field's column."],
          ["`#soa []Record`", "Borrowed structure-of-arrays view when supported by the source layout."],
          ["`#soa [N]Record`", "Rejected: fixed arrays are not accepted for SoA layout."],
        ],
      },
      {
        kind: "paragraph",
        text: "Appending a record to an SoA collection distributes each field into its corresponding field array while preserving one shared logical index. The resulting storage is not C-compatible with an array of the original struct; convert or expose separate field pointers when interoperating with an external API.",
      },
    ],
  },
  "single-pointers": {
    heading: "Addressing, qualifiers, and lifetime",
    overview:
      "A single pointer names one typed storage location. Taking an address creates a non-owning capability to that location; dereferencing it is valid only while the pointee is alive, correctly aligned, and permitted by its qualifiers.",
    rules: [
      "Use the prefix pointer operation to take an address and postfix `.*` to access the pointee.",
      "A `const` pointee prevents mutation through that pointer, while `volatile` describes externally observable access rather than thread synchronization.",
      "Pointers do not keep stack locals or allocation owners alive. Never return or store one beyond the lifetime of its pointee.",
      "Keep ownership separate from addressability: the code that holds a pointer is not automatically responsible for freeing it.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Form", "Meaning"],
        rows: [
          ["`*T`", "Pointer to one mutable `T`"],
          ["`*const T`", "Pointer through which the `T` cannot be modified"],
          ["`*volatile T`", "Pointer whose loads and stores are volatile backend operations"],
          ["`*value`", "Takes the address of an assignable value"],
          ["`pointer.*`", "Dereferences a single pointer to produce its pointee location/value"],
          ["`cast(*U)pointer`", "Explicitly reinterprets/converts the pointer type; alignment and validity remain the caller's responsibility"],
        ],
      },
      {
        kind: "code",
        language: "glosso",
        text: "read :: (source: *const s32) -> s32 { return source.*; }\nwrite :: (destination: *s32, value: s32) { destination.* = value; }\n\nx: s32 = 10;\np := *x;\nwrite(p, 42);\nanswer := read(p);",
      },
      {
        kind: "note",
        text: "`volatile` only controls whether individual memory accesses may be removed or merged. It is not an atomic operation, a lock, or a cross-thread happens-before guarantee. Use the synchronization facilities required by the shared-memory protocol.",
      },
    ],
  },
  "many-pointers": {
    heading: "Unbounded pointer sequences",
    overview:
      "A many pointer addresses the first element of an unspecified-length sequence. It enables low-level traversal and C interoperability but carries no count, capacity, or automatic bounds guarantee.",
    rules: [
      "Carry a separate length or sentinel contract whenever the pointed-to sequence is consumed.",
      "Pointer arithmetic must remain within the allocation and preserve the element type's alignment.",
      "Prefer an array view for ordinary Glosso APIs because the view transports the bounds needed for validation.",
      "Foreign APIs may retain a many pointer; confirm the capture and release contract before passing temporary or movable storage.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Type", "Carries count?", "Supported access"],
        rows: [
          ["`*T`", "No", "One pointee through `.*`"],
          ["`[*]T`", "No", "Indexed sequence and pointer arithmetic supplied by prelude operations"],
          ["`[]T`", "Yes", "Indexed borrowed sequence with `count`"],
          ["`[..]T`", "Yes, plus capacity", "Owned resizable sequence"],
        ],
      },
      {
        kind: "paragraph",
        text: "Indexing a many pointer computes an address from the base and element stride; there is no stored length for the compiler to compare against. The separate count in an API is therefore part of its safety contract. A pointer one past the end may be useful for comparison, but it must not be dereferenced.",
      },
    ],
  },
  "pointers-and-null": {
    heading: "Nullability and validity",
    overview:
      "`null` represents the absence of a valid address and receives its pointer type from context. A typed null value is still not dereferenceable; validity must be established along every path that reaches pointer access.",
    rules: [
      "Check a nullable pointer before dereference and use short-circuit conditions when a later guard reads the pointee.",
      "Prefer a non-null pointer parameter when absence is not a meaningful input, so callers and implementations share the invariant.",
      "Do not use null to stand in for an empty view when a valid zero-length descriptor expresses the state more accurately.",
      "At C boundaries, document whether null is allowed separately from ownership, mutability, and lifetime.",
    ],
    blocks: [
      {
        kind: "code",
        language: "glosso",
        text: "Node :: struct { next: *Node; value: s64; }\n\nhead: *Node = null;  // the annotation supplies the pointee type\nif head != null {\n    print(\"%\\n\", head.*.value);\n}\n\n// Invalid: a bare null declaration has no pointee type to infer.\n// missing := null;",
      },
      {
        kind: "paragraph",
        text: "Nullability is not a separate pointer type in the current type system: every pointer representation can contain null. The checker uses the surrounding annotation, parameter, return, or comparison context to type the literal, but a successful comparison does not transfer allocation ownership or extend the pointee lifetime.",
      },
    ],
  },
  "struct-declarations": {
    heading: "Construction and layout",
    overview:
      "A struct groups named fields into one value and establishes their declared types, defaults, and layout-related directives. Construction should make invariants visible while leaving truly conventional values to field defaults.",
    rules: [
      "Use named field initializers so source remains stable when declarations are reordered or extended.",
      "Keep representation-sensitive structs explicit and review every change when they cross a binary or foreign boundary.",
      "Put validation in constructors or helper functions when not every mechanically constructible field combination is valid.",
      "Use `#derive` for supported mechanical behavior and handwritten operations for semantics that require domain choices.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Struct part", "Compiler behavior"],
        rows: [
          ["`field: Type;`", "Required stored field with type-default initialization when omitted from a literal"],
          ["`field: Type = expression;`", "Stored field whose omitted initializer uses the declared default expression"],
          ["A field type containing `$T`", "Introduces/infer a generic type parameter; later uses may write `T` without `$`"],
          ["`#c_call`", "Marks the representation for C-ABI validation and target aggregate passing rules"],
          ["`#derive(Name, ...)`", "Requests the named derive expansion for the completed type"],
          ["`#modify`", "Runs the declared modification hook over the declaration during compilation"],
          ["`#magic \"name\"`", "Associates compiler-provided behavior; reserved for known compiler/standard-library integration"],
        ],
      },
      {
        kind: "paragraph",
        text: "Field order is source order and every field ends with `;`. A typed literal uses `Type.{ .field = value }`; an inferred `.{ ... }` requires an expected struct type. Omitted fields are default initialized. Inline struct, union, and enum field types receive field-qualified nominal identities rather than becoming anonymous structural types.",
      },
    ],
  },
  "embedded-fields-with-using": {
    heading: "Current lookup behavior",
    overview:
      "The parser accepts `using field: Type;` inside a struct, but the current checker records it as an ordinary field. It does not promote nested members through the containing value: `entity.x` is rejected when only `entity.pos.x` exists.",
    rules: [
      "Access a marked field through its declared name, exactly like an unmarked field.",
      "`using local;` is a different statement feature: a struct local's fields can then be read as bare identifiers.",
      "The current assignment checker does not accept a bare promoted field as a write target; qualify writes as `local.field = value`.",
      "The marker changes neither layout, initialization, ownership, nor lifetime in the current implementation.",
    ],
    blocks: [
      {
        kind: "code",
        language: "glosso",
        text: "Position :: struct { x: f32; y: f32; }\nEntity :: struct { using pos: Position; id: u64; }\n\ne: Entity;\ne.pos.x = 10; // implemented\n// e.x = 10;  // error: no field 'x' in 'Entity'\n\nposition := e.pos;\nusing position;\ncopy := x;       // read lookup through `position`\nposition.x = 20; // qualify a write",
      },
      {
        kind: "note",
        text: "This section documents the current compiler, not the intended promotion design. If member promotion is implemented later, this page and its compiler-backed examples should be updated together.",
      },
    ],
  },
  "empty-and-conversion-fields": {
    heading: "Type evidence and conversion lookup",
    overview:
      "`#empty` records compile-time type relationships without adding ordinary runtime payload, while `#as` marks a field as an intentional conversion view of its containing value. Both features shape type behavior and should communicate a real abstraction relationship.",
    rules: [
      "Use `#empty` for type-level evidence or association, not as hidden runtime state.",
      "Use `#as` only when conversion is unambiguous and preserves the invariant expected by callers.",
      "Add `using` only when the converted or embedded interface should also participate in member lookup.",
      "Prefer an explicitly named conversion function when the operation allocates, can fail, or loses information.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Field form", "Stored?", "Lookup/conversion effect"],
        rows: [
          ["`#empty: T;`", "No ordinary runtime field", "Records `T` as type-level evidence and can introduce/retain generic type information"],
          ["`#empty: T, U;`", "No ordinary runtime fields", "Adds several empty type markers in one declaration"],
          ["`#as field: T;`", "Yes", "Makes `field` the struct's implicit conversion field when a `T` is expected"],
          ["`#as using field: T;`", "Yes", "Parses the same conversion field plus the current `using` marker; embedded member promotion remains subject to the limitation documented in the preceding chapter"],
        ],
      },
      {
        kind: "paragraph",
        text: "An implicit `#as` conversion is selected only when the containing struct is being coerced to the marked field's type. It is not a general cast hook and does not run arbitrary code. The compiler stores one effective `as_field` name for the struct, so a type should declare one unambiguous conversion field.",
      },
    ],
  },
  "tagged-union-construction": {
    heading: "Active variants and payloads",
    overview:
      "A tagged union stores one active variant together with the information needed to identify it. Constructing a variant selects that active case, and payload syntax must agree with whether the declared variant carries data.",
    rules: [
      "Name the variant at construction so the active state is obvious at the point where data enters the union.",
      "Payload-free variants express states such as absence or completion without inventing sentinel data.",
      "Never read a payload until control flow has established the corresponding active variant.",
      "Use a struct payload when a variant needs several named values; it keeps pattern matching and evolution readable.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Variant declaration", "Activation"],
        rows: [
          ["`Some: T;`", "Assign the payload through the variant field, such as `value.Some = payload`, or construct contextually as `.Some(payload)` where supported"],
          ["`None: void;`", "Select the payload-free variant by naming it, such as `value.None`, or use contextual `.None` construction"],
          ["Inline aggregate payload", "Construct/match the inline nominal payload under that variant"],
        ],
      },
      {
        kind: "note",
        text: "The active tag changes when a variant is activated. A field access alone is not proof that a payload-bearing variant is active; switch or pattern-match before reading uncertain payload storage.",
      },
    ],
  },
  "tagged-union-switching": {
    heading: "Narrowing and exhaustiveness",
    overview:
      "Switching on a tagged union narrows each case to one active variant and makes its payload available under that case's rules. Exhaustive handling is the safest default because adding a variant then reveals every decision point that needs review.",
    rules: [
      "Handle every variant or add an explicit `else` when several states intentionally share behavior.",
      "Use `#partial` only when ignoring unmatched variants is part of the operation's contract, not to silence an incomplete implementation.",
      "Keep payload-dependent work inside the matched case so the active-tag proof remains local.",
      "Prefer pattern switches when nested payload structure needs to be destructured at the same time.",
    ],
    blocks: [
      {
        kind: "paragraph",
        text: "`if union_value == { ... }` is the tagged-union switch form. `case .Variant;` is the contextual spelling and `case Variant;` remains accepted for compatibility. Within a payload case, access through the subject (`union_value.Variant`) or use a pattern case to bind the payload directly.",
      },
      {
        kind: "code",
        language: "glosso",
        text: "show :: (value: Option(string)) {\n    if value == {\n        case .Some; print(\"%\\n\", value.Some);\n        case .None; print(\"none\\n\");\n    }\n}\n\n// Destructuring alternative\nif #pattern value == {\ncase .Some(text); print(\"%\\n\", text);\ncase .None; print(\"none\\n\");\n}",
      },
    ],
  },
  "raw-unions": {
    heading: "Untagged storage",
    overview:
      "A raw union overlays its fields without recording which one is active. This is a representation tool for foreign layouts and tightly controlled low-level code, not a substitute for an ordinary sum type.",
    rules: [
      "Track the active interpretation in surrounding state and update that state together with every union write.",
      "Reading a field different from the one established by the representation contract can produce invalid values.",
      "Prefer tagged unions whenever the program itself owns the data model and can afford an explicit tag.",
      "Verify size, alignment, and field types against the external ABI when a raw union mirrors foreign data.",
    ],
    blocks: [
      {
        kind: "paragraph",
        text: "`Name :: union #raw { ... }` allocates enough aligned storage for its largest member and emits no active-variant tag. Consequently the tagged switch and coverage rules do not apply. Writing one field and reading another is a representation reinterpretation whose validity comes from the external format or low-level algorithm, not from the type checker.",
      },
    ],
  },
  enums: {
    heading: "Members and backing values",
    overview:
      "An enum gives symbolic names to a closed set of values. The enum type is a domain boundary: callers should reason in member names, while the backing representation matters mainly for layout, serialization, or foreign interoperability.",
    rules: [
      "Use enum members in APIs instead of unrelated integers so invalid states are harder to express.",
      "Choose and document an explicit backing type when values cross a binary boundary.",
      "Handle members exhaustively when each value has distinct behavior; newly added members will then expose stale logic.",
      "Keep stable explicit numeric values for persistent formats rather than depending on declaration order.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Syntax", "Assigned value"],
        rows: [
          ["`First;`", "0 when no earlier member changes the sequence"],
          ["`Named :: 4;`", "Exactly 4; enum member values use `::`, not `=`"],
          ["The member after `Named :: 4;`", "5; implicit numbering resumes from the explicit value plus one"],
          ["`Name :: enum u8 { ... }`", "Uses the explicit backing type; omit it for the compiler's default enum representation"],
        ],
      },
    ],
  },
  "flag-enums": {
    heading: "Bit-set representation",
    overview:
      "A flag enum models a set of independently combinable options in an integer backing value. Individual flags should occupy distinct bits; combined values then represent membership rather than a single alternative.",
    rules: [
      "Assign powers of two to independent flags and reserve zero for the empty set when that state is useful.",
      "Use bitwise set, clear, and test operations rather than equality when several flags may be present.",
      "Mask unknown bits when decoding untrusted or versioned data according to the format's compatibility policy.",
      "Use an ordinary enum when exactly one member may be active; flag enums intentionally permit combinations.",
    ],
    blocks: [
      {
        kind: "paragraph",
        text: "The syntax is `Name :: enum_flags IntegerType { Member :: value; ... }`; unlike an ordinary enum, the backing type is mandatory. The compiler does not invent power-of-two values for omitted members—the same sequential enum numbering rule applies—so independently combinable flags should be assigned explicit bit values.",
      },
      {
        kind: "code",
        language: "glosso",
        text: "Permissions :: enum_flags u32 {\n    None    :: 0;\n    Read    :: 1;\n    Write   :: 2;\n    Execute :: 4;\n}\n\npermissions := Permissions.Read | Permissions.Write;\ncan_write := (permissions & Permissions.Write) != cast(Permissions)0;",
      },
    ],
  },
  "default-and-named-parameters": {
    heading: "Argument binding",
    overview:
      "Default parameters make an argument optional at a call site, while named arguments make the selected parameter explicit. Together they work best for stable, unsurprising configuration rather than for inputs whose omission changes the operation's fundamental meaning.",
    rules: [
      "Place required parameters before optional ones and choose defaults that are safe for the common case.",
      "Use named arguments when skipping earlier defaults or when several adjacent values have the same type.",
      "Treat parameter names used by external callers as part of the source-level API.",
      "Prefer an options struct when optional settings become numerous, evolve independently, or need reuse across calls.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Parameter form", "Call-site behavior"],
        rows: [
          ["`name: Type`", "Required runtime argument"],
          ["`name: Type = expression`", "Optional argument with an explicit parameter type"],
          ["`name := expression`", "Optional argument whose parameter type is inferred from its default"],
          ["`a, b: Type`", "Several parameters sharing one type annotation"],
          ["`.name = expression` at a call", "Binds that parameter by name instead of by position"],
        ],
      },
      {
        kind: "paragraph",
        text: "Call matching first assigns named arguments to their parameter slots and then fills remaining positional slots in order. Supplying the same parameter twice, naming an unknown parameter, omitting a required argument, or providing too many non-variadic arguments makes that declaration inapplicable. Parameter names are therefore part of the source-level calling interface.",
      },
      {
        kind: "code",
        language: "glosso",
        text: "connect :: (host: string, port: string = \"443\", retries := 3) {}\n\nconnect(\"example.com\");\nconnect(.host = \"example.com\", .retries = 5);\nconnect(\"example.com\", .retries = 1);",
      },
    ],
  },
  "variadic-parameters": {
    heading: "Glosso packs and C ellipses",
    overview:
      "A variadic parameter collects a call site's remaining arguments. Typed variadics preserve one element contract, while foreign C varargs follow separate promotion and ABI rules and should not be treated as an ordinary Glosso collection.",
    rules: [
      "Use a typed variadic when every supplied argument has the same semantic role and element type.",
      "Keep the variadic parameter last so fixed arguments and defaults remain unambiguous.",
      "Forward variadic values only through syntax or helpers that preserve their intended expansion.",
      "Use the `VarArg` facilities for C varargs; the caller is responsible for the external function's expected promoted types.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Form", "Accepted argument pack"],
        rows: [
          ["`items: ...T`", "Homogeneous values coercible to concrete `T`; the body observes array-like `items`"],
          ["`items: ...$T`", "Homogeneous generic pack whose element type is inferred for specialization"],
          ["`items: ...any`", "Heterogeneous erased-value pack"],
          ["`items: ...(ClassA && ClassB)`", "Heterogeneous pack where each value satisfies all listed unary typeclasses"],
          ["`items: ...`", "Unconstrained rest form represented through the variadic array machinery"],
          ["Bare `...` with no parameter name", "C ellipsis; a distinct feature covered in the C Varargs chapter"],
        ],
      },
      {
        kind: "list",
        items: [
          "A named Glosso variadic parameter cannot have a default and must use one parameter name.",
          "Parameters following a Glosso variadic parameter are allowed only when all of them have defaults.",
          "At a call, `array_or_pack...` spreads an existing compatible array/rest value instead of adding it as one element.",
          "The body iterates the packed value with ordinary array/iterable operations; it is not a C `va_list`.",
        ],
      },
    ],
  },
  "function-pointers": {
    heading: "Signature and calling convention",
    overview:
      "A function pointer is a callable value with a precise parameter, return, and calling-convention contract. Matching source-level types are not sufficient when the target function uses a different ABI or implicit-context rule.",
    rules: [
      "Match parameter order, widths, return representation, and calling convention exactly.",
      "Account for `#c_call` and `#no_context`; functions with different implicit calling requirements are not interchangeable callbacks.",
      "Keep any captured state separate because a plain function pointer does not carry a lambda environment.",
      "Check nullable callbacks before invocation when an external API uses null to mean that no callback was installed.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Declaration", "Type identity"],
        rows: [
          ["`F :: #fn_ptr(a: T) -> U;`", "Ordinary Glosso function pointer with the declared parameter/result types"],
          ["`F :: #fn_ptr(a: T) -> U #c_call;`", "C-ABI function pointer; not implicitly interchangeable with the ordinary form"],
          ["`F :: #fn_ptr(noalias p: *T);`", "The `noalias` promise is retained in callback compatibility"],
          ["`F :: #fn_ptr(first: T, ...) -> U #c_call;`", "C-variadic function pointer; requires at least one fixed parameter"],
        ],
      },
      {
        kind: "paragraph",
        text: "Named function-pointer parameters require names and types. Omitting `->` means `void`. Function values can be stored, passed, and invoked indirectly after exact signature matching. Lambdas can initialize non-variadic pointer types when their parameter/return types match, but lambdas are noncapturing and cannot initialize a C-variadic pointer.",
      },
      {
        kind: "note",
        text: "Current limitation: the named `#fn_ptr` parser accepts `#no_context` but does not retain a separate no-context bit in the resulting pointer type. `#no_context` is effective on function definitions; do not use the pointer marker as an enforced compatibility distinction until the compiler representation supports it.",
      },
    ],
  },
  "constraints-with-where": {
    heading: "Specialization constraints",
    overview:
      "A `where` constraint defines the type domain in which a generic declaration is valid. It is checked during specialization, before the body becomes an implementation candidate for a concrete call.",
    rules: [
      "State the weakest constraint that guarantees every operation used by the body.",
      "Keep constraints semantically disjoint when several overloads share a name; Glosso does not rank overlapping candidates by cleverness.",
      "Move repeated capability checks into a typeclass or named compile-time predicate so diagnostics and intent remain consistent.",
      "Test both accepted and deliberately rejected types to keep the boundary from widening accidentally.",
    ],
    blocks: [
      {
        kind: "paragraph",
        text: "Function directives must appear before `where` clauses. A declaration may contain several `where expression` clauses; all are evaluated with the inferred type and compile-time value bindings. A false result removes an overload/instance candidate. If no candidate remains, the call diagnostic reports that the constraint failed instead of checking an invalid specialized body.",
      },
      {
        kind: "code",
        language: "glosso",
        text: "clamp_zero :: (value: $T) -> T\n    where Is_Numeric(T)\n    where #meaningful { value < cast(T)0 }\n{\n    if value < cast(T)0 return cast(T)0;\n    return value;\n}",
      },
      {
        kind: "note",
        text: "Constraints affect applicability, not runtime branching. Every expression they use must be evaluable in the specialization environment. Use static `#if` inside the body when the declaration should remain applicable but emit different code for different compile-time cases.",
      },
    ],
  },
  meaningful: {
    heading: "Compile-time expression probing",
    overview:
      "`#meaningful` asks whether an expression is valid for the concrete compile-time types currently being considered. It is a structural capability probe and is most useful for selecting optional generic behavior without executing the probed operation.",
    rules: [
      "Probe the exact expression the implementation will later use, including qualifiers and argument order.",
      "Use the result in compile-time selection so an invalid alternative is not emitted for that specialization.",
      "Prefer a named typeclass when the capability is a public abstraction rather than a local implementation fallback.",
      "Do not use capability probing to create overlapping overload domains that violate coherence.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Probe form", "Result"],
        rows: [
          ["`#meaningful expression`", "`true` when the expression can be typed in the current compile-time environment"],
          ["`#meaningful { statements/expression }`", "Checks the complete snippet, including declarations, member lookup, calls, and result expression"],
          ["A probe that fails name/type/constraint checking", "`false`; the probe records the internal failure for a surrounding constraint diagnostic"],
        ],
      },
      {
        kind: "paragraph",
        text: "The compiler typechecks a cloned probe with the currently inferred generic bindings. It does not emit or execute the probed runtime operation. Because the check uses the complete expression, pointer qualifiers, overload selection, argument order, and result coercions are part of the answer.",
      },
    ],
  },
  typeclasses: {
    heading: "Instance selection and laws",
    overview:
      "A typeclass names a family of operations and associated types that concrete instances must provide. Calls use ordinary function syntax; instance selection supplies the implementation from the concrete participating types.",
    rules: [
      "Design the required operations around one coherent abstraction, not as an unrelated utility collection.",
      "Keep a single canonical instance for each concrete type tuple so selection remains independent of imports and ordering.",
      "Use associated types when a relationship belongs to the instance and cannot be inferred as a simple input parameter.",
      "Document laws such as ordering consistency or iterator progress because the compiler checks signatures, not behavioral contracts.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Typeclass part", "Meaning"],
        rows: [
          ["Header parameters `(T: type, ...)`", "The type tuple used as instance evidence and operation selection input"],
          ["Associated declaration `Output :: type;`", "A type chosen by each instance and usable in method signatures"],
          ["Bodyless method `method :: (...) -> T;`", "Required operation unless satisfied through an allowed default/minimal alternative"],
          ["Method with a body", "Default implementation available to instances"],
          ["`Concrete :: instance Class { ... }`", "Instance for one head type"],
          ["`(Left, Right) :: instance Class { ... }`", "Instance for a multi-parameter typeclass tuple"],
          ["Generic instance with `where`", "Candidate specialized only when its head unifies and all evidence/conditions hold"],
        ],
      },
      {
        kind: "paragraph",
        text: "Typeclass methods enter ordinary call lookup under their method name. The selected instance supplies associated types and the implementation target. A bodyless requirement alone is not callable evidence: the checker requires a matching instance binding before accepting it.",
      },
    ],
  },
  "default-methods-and-negative-instances": {
    heading: "Required methods and excluded instances",
    overview:
      "Default methods derive convenient behavior from a smaller required core. Negative instances exclude type combinations deliberately, making the absence of an implementation part of the model instead of an accidental missing definition.",
    rules: [
      "Keep the minimal required set sufficient to implement every default without circular dependency.",
      "Override a default when a concrete type can provide stronger semantics or substantially better complexity.",
      "Use negative instances to protect a meaningful boundary, especially when a broad generic instance would otherwise match.",
      "When the typeclass evolves, verify that defaults and negative cases still describe disjoint, complete intentions.",
    ],
    blocks: [
      {
        kind: "paragraph",
        text: "Without an explicit `#minimal`, the compiler derives an implicit required set from methods that have no usable default body. `#minimal(a, b)` requires both operations; `#minimal(a | b)` accepts either alternative; parentheses combine conjunction and alternatives. `#minimal()` explicitly requires no methods, which is useful for evidence-only classes.",
      },
      {
        kind: "code",
        language: "glosso",
        text: "Parse :: typeclass (T: type) #minimal(parse_text | parse_bytes) {\n    parse_text :: (text: string) -> T;\n    parse_bytes :: (bytes: []u8) -> T;\n}\n\nExact_Order :: typeclass (T: type) #minimal() {}\n// Explicit negative evidence for every floating type matched by the constraint.\n$T :: instance !Exact_Order where Is_Float(T) {}",
      },
      {
        kind: "list",
        items: [
          "A `#minimal` name must identify a method of that typeclass, and only one `#minimal` directive is allowed.",
          "An instance that supplies none of the required alternative sets is rejected at its declaration.",
          "Negative instances contribute evidence that the class intentionally does not hold; they do not provide callable method bodies.",
          "A positive candidate that depends on evidence excluded by a matching negative instance is not applicable.",
        ],
      },
    ],
  },
  "higher-kinded-typeclasses-and-derive": {
    heading: "Type constructors and generated instances",
    overview:
      "Higher-kinded parameters abstract over type constructors such as containers, not only over completed value types. Derivation then reuses structural knowledge to synthesize instances where the required operations are mechanically determined.",
    rules: [
      "Distinguish a constructor from one of its applications; the abstraction should work across the element types it claims to support.",
      "Constrain the constructor at the operations actually required rather than assuming every container has identical behavior.",
      "Use derive only when the generated semantics are canonical; ordering, equality, or formatting may require a domain-specific implementation.",
      "Review generated instances when fields or variants change because structural derivation follows the type's current shape.",
    ],
    blocks: [
      {
        kind: "paragraph",
        text: "A higher-kinded parameter stands for a type constructor that will later be applied to an element type. The standard `Functor` machinery inspects the focused generic parameter and derives mapping only when every occurrence is covariant. Raw unions and non-covariant placements are rejected rather than receiving an unsound generated instance.",
      },
      {
        kind: "paragraph",
        text: "`#derive(Name, ...)` on a struct or union invokes the named derive facility with compile-time `Derive_Type_Info`. The expansion returns declarations inserted for that concrete nominal type. Derivation is therefore compile-time source generation, and its generated instances obey the same uniqueness, constraints, and minimal-method checks as handwritten instances.",
      },
    ],
  },
  "assignment-operators": {
    heading: "Result and storage contract",
    overview:
      "An assignment operator participates in a read-modify-write expression. Its result must be usable as the new left-hand value, so the declaration connects operator semantics to the storage type rather than acting as an arbitrary side-effect hook.",
    rules: [
      "Return a value coercible to the left operand's type.",
      "Keep the operation consistent with the corresponding non-assignment operator when both exist.",
      "Avoid hidden ownership changes that would surprise callers using familiar compound-assignment spelling.",
      "Declare the narrowest coherent operand domain to prevent ambiguity with generic numeric or container operators.",
    ],
  },
  "operator-coherence": {
    heading: "Lookup and ambiguity",
    overview:
      "Operator lookup uses the same candidate matching and specificity scoring as named typeclass operations. Import order never resolves a conflict: one candidate must score above the rest, or the checker reports ambiguity.",
    rules: [
      "Consider prefix, suffix, infix, and assignment forms separate operation shapes.",
      "A concrete or otherwise more specific implementation may outrank a broad generic one; equal-scoring overlaps remain ambiguous.",
      "Keep symmetric operations consistent for both operand orders, or document why only one direction exists.",
      "Test downstream modules that import several operator-providing packages together, where coherence conflicts become visible.",
    ],
    blocks: [
      {
        kind: "paragraph",
        text: "Parsing and implementation selection are separate. The visible typeclass declaration supplies the operator token, position, precedence, and associativity before expression parsing. After operand types are known, the checker selects the instance implementation. Two operators at the same precedence must advertise the same associativity or their combined syntax is rejected as inconsistent.",
      },
    ],
  },
  "indexing-and-slicing-operators": {
    heading: "Read and write hooks",
    overview:
      "Index operators let a type participate in bracket syntax, but read access and write access are independent contracts. The argument types determine whether the syntax means a single index, key lookup, range, or another domain-specific selection.",
    rules: [
      "Define `[]` for reading and `[]=` separately for indexed mutation.",
      "Validate bounds or key validity inside the implementation unless the API explicitly provides an unchecked operation.",
      "Return a view for borrowed slices and an owned value only when allocation or copying is intentional.",
      "Keep range and scalar overload domains distinct so a bracket expression has one coherent interpretation.",
    ],
  },
  "blocks-and-scope": {
    heading: "Lifetime and deferred execution",
    overview:
      "A block creates a lexical scope and an ordered region for cleanup. Locals introduced inside it cease to be nameable after the closing brace, and deferred work belongs to the dynamic exits from that block.",
    rules: [
      "Declare resources near the start of the scope that owns their cleanup, then place the corresponding `defer` immediately after successful acquisition.",
      "Use nested blocks to shorten lifetimes and release large temporaries before the surrounding function ends.",
      "A name introduced by a successful pattern belongs only to the condition-controlled scope described by that construct.",
      "Prefer structured exits so cleanup and invariants stay visible; reserve jump helpers for low-level cases that require them.",
    ],
    blocks: [
      {
        kind: "paragraph",
        text: "Each explicit block, loop body, branch body, and function body establishes a defer scope. Deferred statements execute in last-in-first-out order on normal scope completion and before `return`, `break`, `continue`, or Try propagation leaves that scope. Defers from inner scopes run before defers from surrounding scopes.",
      },
      {
        kind: "code",
        language: "glosso",
        text: "work :: () {\n    acquire_a();\n    defer release_a();\n\n    {\n        acquire_b();\n        defer release_b();\n        if failed() return; // release_b(), then release_a()\n    }\n}",
      },
      {
        kind: "note",
        text: "The deferred statement is typechecked where it is declared but emitted when its scope exits. Values it references must therefore remain valid until that exit. A nonlocal jump facility may have a different resource contract; consult `std/Jump` rather than assuming it behaves like structured `return`.",
      },
    ],
  },
  "if-statements": {
    heading: "Condition typing and branch results",
    overview:
      "`if` selects execution from a boolean condition and can appear wherever the language permits its statement or value form. Branches should make both the happy path and the exceptional or absent path explicit enough that the resulting type and state are clear.",
    rules: [
      "Conditions require boolean meaning; compare non-boolean domain values explicitly rather than relying on truthiness.",
      "Use `else if` for one decision chain and nested `if` only when the inner decision belongs exclusively to one outer branch.",
      "When an `if` supplies a value, keep branch result types compatible and avoid hidden side effects that obscure the selected value.",
      "Pattern captures are available only in the successful branch and any guard portion that follows the pattern test.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Form", "Parsed body"],
        rows: [
          ["`if condition statement`", "One statement controlled by a boolean condition"],
          ["`if condition { ... }`", "A scoped then body"],
          ["`else statement` / `else { ... }`", "Optional alternative body"],
          ["`else if ...`", "Nested `if` forming one chain"],
          ["`if subject == { case ... }`", "Not an ordinary `if`; parsed as the switch form documented next"],
        ],
      },
      {
        kind: "paragraph",
        text: "The current parser represents ordinary `if` as a statement and its branches do not yield an expression value. The condition must synthesize as `bool`, except that `#pattern` conditions additionally introduce captures into the successful branch environment. The `else` environment does not receive those captures.",
      },
    ],
  },
  "switch-cases": {
    heading: "Selection, coverage, and fallthrough",
    overview:
      "A switch compares one subject against several cases and makes the chosen control path visible. Tagged unions and closed enums benefit from exhaustive cases, while open-ended numeric or label domains generally need an `else` policy.",
    rules: [
      "Keep cases non-overlapping so readers can identify the selected branch without reasoning about ordering tricks.",
      "Use `#falling` only when execution must continue into the next case and annotate the shared invariant.",
      "Prefer exhaustive handling for closed domains; use `#partial` only when doing nothing for the remainder is deliberate.",
      "Use a pattern switch when a case must both select a variant and destructure its payload.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Switch subject", "Coverage rule"],
        rows: [
          ["Tagged union", "Every declared variant must appear, or provide `else`, unless the switch is marked `#partial`"],
          ["Raw union", "Rejected because no active tag exists"],
          ["Pattern switch", "Requires `else` by default because the compiler does not prove pattern coverage; `#partial` may omit it"],
          ["Other value (integer, enum, string, label, etc.)", "Case expressions are coerced to the subject type; `else` is optional and enum coverage is not currently enforced"],
        ],
      },
      {
        kind: "list",
        items: [
          "Write `if #partial subject == { ... }` only for a switch; `#partial` on an ordinary `if` is a parse error.",
          "A case begins with `case expression;` and continues until the next `case`, `else`, or closing brace.",
          "`#falling` marks that case to continue into the next case body; ordinary cases do not fall through.",
          "Range syntax is accepted as an ordinary case expression and is prepared using the subject type's range/index operations.",
        ],
      },
    ],
  },
  "static-if": {
    heading: "Compile-time branch selection",
    overview:
      "Static `#if` chooses a branch during compilation. It is appropriate for target capabilities, compile-time parameters, and structural differences that should disappear from the emitted program.",
    rules: [
      "Base the condition only on information available at compile time.",
      "Keep target-specific regions narrow so most behavior remains shared and can be tested on every platform.",
      "Both branches must remain syntactically well formed even though only the selected branch participates in the specialization.",
      "Use a runtime `if` when the choice depends on input or state that can vary between executions.",
    ],
    blocks: [
      {
        kind: "paragraph",
        text: "The checker evaluates the `#if` condition with the compile-time environment and checks only the selected body for that specialization. The other body must still be lexically and syntactically parseable, but its names and operations do not need to typecheck for the selected target. No runtime condition or branch instruction is emitted.",
      },
      {
        kind: "code",
        language: "glosso",
        text: "read_clock :: () -> u64 {\n    #if OUT.os == Target_OS.Windows {\n        return windows_clock();\n    } else #if OUT.os == Target_OS.Linux {\n        return linux_clock();\n    } else {\n        #compile_error \"read_clock is not implemented for this target\";\n    }\n}",
      },
    ],
  },
  while: {
    heading: "Condition scope and iteration",
    overview:
      "A `while` loop repeats while its boolean or pattern-based condition succeeds. The condition is re-evaluated before each iteration, so any captures or guards describe the state for that iteration only.",
    rules: [
      "Make progress toward termination visible in the body, especially when the condition depends on pointers or external state.",
      "Use `break` for a completed loop-wide decision and `continue` for an early transition to the next condition check.",
      "Pattern captures are recreated for each successful test and do not escape the loop.",
      "Use `#inline` only for compile-time-known iteration where expansion cost and generated code size are acceptable.",
    ],
    blocks: [
      {
        kind: "paragraph",
        text: "The condition is checked before the first iteration and before every later iteration. A `#pattern` condition is checked through the same pattern-condition path as `if`; captures are bound in a fresh loop environment for each successful test. `break` and `continue` are rejected outside a loop and run defers for scopes they leave.",
      },
      {
        kind: "note",
        text: "`#inline while` invokes compile-time loop expansion rather than merely suggesting machine-code inlining. Its condition and progress must be evaluable by the compiler, and unbounded expansion is a compile-time failure risk.",
      },
    ],
  },
  for: {
    heading: "Iterable expansion and bindings",
    overview:
      "A `for` loop consumes the iterable protocol and binds each produced element for one iteration. The loop form hides traversal mechanics but does not change ownership or protect the source from mutation-induced invalidation.",
    rules: [
      "Use the default element and index bindings when their conventional names are clear, or spell bindings explicitly when several loops are nested.",
      "The reverse form changes traversal direction; it does not automatically make every custom iterable bidirectional.",
      "Do not resize or release a collection while an iterator derived from its storage is active unless that iterator explicitly permits it.",
      "Use `#inline` for compile-time expansion only when each element is available during compilation and code growth is intentional.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Header", "Bindings/selection"],
        rows: [
          ["`for values`", "Uses `it`; the default index name is available as `it_index` when the expansion supplies it"],
          ["`for value: values`", "Names the element binding"],
          ["`for value, index: values`", "Names element and index bindings"],
          ["`for < value: values`", "Requests reverse iteration from the iterable expansion"],
          ["`for :expansion value: values`", "Selects a named expansion entry instead of the default iterable expansion"],
          ["`#inline for ...`", "Expands compile-time-known iterations into the surrounding body"],
        ],
      },
      {
        kind: "paragraph",
        text: "The checker resolves the iterable's `Iterable.for_expansion` protocol (or the explicitly named expansion) and lowers the produced traversal. Reverse iteration is a capability request passed to that expansion, not a guarantee that every iterable supports reverse order. The loop body receives a fresh lexical/temporary scope per iteration.",
      },
    ],
  },
  "labels-goto-and-jump-helpers": {
    heading: "Non-structured control transfer",
    overview:
      "Labels and jump helpers expose non-structured control flow for systems-level mechanisms that cannot be expressed naturally with returns, loops, or switches. They make reachability and cleanup harder to reason about and therefore deserve a very small, documented scope.",
    rules: [
      "Prefer ordinary structured control flow whenever it can express the same transition.",
      "Keep every jump target in the smallest enclosing region that makes the state requirements obvious.",
      "Document which variables and resources are valid at a target; a jump must not manufacture initialized state.",
      "Use the standard `Jump` helpers according to their stated save/restore contract rather than assuming an ordinary function call model.",
    ],
  },
  "compile-time-constants-with-comptime": {
    heading: "Evaluation phase and restrictions",
    overview:
      "`#comptime` requires an expression or block to be evaluated while the program is compiled. Its result can guide specialization or generated code, but it cannot depend on values known only when the executable runs.",
    rules: [
      "Use compile-time evaluation for validation, layout decisions, generated tables, and work that is invariant across executions.",
      "Keep failures diagnostic and deterministic; a compile-time error becomes part of the user's build experience.",
      "Avoid unnecessary external I/O in reusable compile-time logic because it weakens reproducibility and caching.",
      "Move work to runtime when its cost, inputs, or side effects properly belong to each execution.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Form", "Result/effect"],
        rows: [
          ["`value := #comptime expression;`", "Evaluates the expression during checking and embeds its resulting constant value"],
          ["`Value :: #comptime { ... return expression; };`", "Runs a compile-time block and defines its returned value as a constant"],
          ["`#comptime { statements }` at top level", "Runs the block for compile-time side effects; it does not emit a runtime function body"],
          ["`#comptime T: type` function parameter", "Requires a compile-time argument, participates in specialization identity, and is erased from runtime parameters"],
          ["`$T`", "Syntactic generic shorthand for an inferred compile-time type parameter"],
        ],
      },
      {
        kind: "paragraph",
        text: "Compile-time evaluation uses the compiler VM and the current constant environment. Runtime locals and values obtained only after program start are unavailable. Calls must have an implementation supported by compile-time evaluation—ordinary evaluable Glosso bodies and compiler `#magic` services may run, while unsupported foreign/runtime-only behavior fails during compilation.",
      },
      {
        kind: "note",
        text: "A compile-time result is cached only through the mechanisms documented by the operation being used (for example string `#insert` or native archive caches). `#comptime` itself does not promise that arbitrary filesystem/process side effects will be replayed or invalidated as a build-system dependency.",
      },
    ],
  },
  "code-values-with-code": {
    heading: "Syntax values and name capture",
    overview:
      "A `Code` value stores parsed Glosso syntax for later insertion rather than plain source text. Backtick names and splices control how the fragment connects to its generation and insertion environments.",
    rules: [
      "Construct syntax with `#code` so the compiler can preserve structure instead of concatenating strings.",
      "Use backtick capture deliberately for names that must resolve at the insertion site.",
      "Keep generated fragments small and typed around a clear interface; large opaque expansions are difficult to diagnose.",
      "Inspect expanded output when debugging name capture, source location, or generated control flow.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Inside `#code`", "Meaning during insertion"],
        rows: [
          ["Ordinary local declaration/name", "Hygienic: generated bindings receive fresh names and internal references are rewritten"],
          ["Single backtick `` `name ``", "Non-hygienic name: preserves the written name instead of receiving a fresh generated name"],
          ["Double backtick ` ``name `", "Code splice: substitute the compile-time macro argument/value/name into that syntax position"],
          ["`#insert code_value;`", "Clone and insert the represented syntax into the current body"],
          ["`#insert string_value;`", "Parse generated Glosso source text, cache the bytes, and insert the parsed declarations/statements"],
        ],
      },
      {
        kind: "paragraph",
        text: "Splicing is supported in identifiers, type names, field names, labels, and other parser positions that accept generated names. Hygiene applies recursively to declarations and lambda parameters in the inserted tree. Use a single backtick only when deliberate caller-visible capture is required; ordinary generated temporaries should remain hygienic.",
      },
      {
        kind: "note",
        text: "`#insert` accepts only a `Code` value or string source. A top-level insertion must produce top-level-compatible syntax. Recursive expansion is diagnosed with insertion-site notes rather than executing without a boundary.",
      },
    ],
  },
  reflection: {
    heading: "Compile-time structural queries",
    overview:
      "Reflection exposes compile-time facts about types and declarations so generic or generated code can adapt to structure. The information describes the compiler's model; it should not be confused with a stable serialized schema unless the program defines one.",
    rules: [
      "Perform reflection during compilation and emit ordinary typed code for runtime use.",
      "Filter fields, variants, and methods according to the abstraction being generated rather than assuming every member participates.",
      "Do not make persistent formats depend accidentally on declaration order or target-dependent layout.",
      "Pair reflection with constraints so unsupported shapes fail with a focused explanation.",
    ],
    blocks: [
      {
        kind: "paragraph",
        text: "Reflection operations are compiler intrinsics exposed through `std/Meta`. They consume compile-time `type` values and return compile-time facts such as kind, name, size, alignment, field count/name/type, enum items, union variants, generic arguments, and covariance. No runtime RTTI object is created automatically.",
      },
      {
        kind: "table",
        columns: ["Question", "Use"],
        rows: [
          ["What kind of type is this?", "Kind predicates/tags before selecting structure-specific reflection"],
          ["Which struct fields exist?", "`field_count`, `field_name`, and field-type queries inside compile-time expansion"],
          ["Which enum/union alternatives exist?", "Enum-item and union-variant queries for generated switches, formatting, or bindings"],
          ["Can a generic parameter be mapped safely?", "Occurrence/covariance queries used by higher-kinded derive helpers"],
        ],
      },
      {
        kind: "note",
        text: "Source field order and target storage layout are different contracts. Reflection that enumerates fields follows the compiler's declaration model; use explicit format metadata rather than raw field order for persistent serialization.",
      },
    ],
  },
  "context-values": {
    heading: "Implicit parameter and scoped replacement",
    overview:
      "The context carries ambient runtime services through ordinary Glosso calls without repeating them in every source signature. Pushing a context creates a scoped replacement, so code can override one service and restore the previous environment automatically.",
    rules: [
      "Use context for cross-cutting services such as allocators and diagnostics, not for arbitrary hidden business inputs.",
      "Keep overrides in narrow scopes and initialize every field the called code expects.",
      "Remember that `#c_call` and `#no_context` functions do not receive the ordinary implicit context.",
      "Pass essential domain dependencies explicitly when doing so makes the function's behavior easier to test and reason about.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Construct", "Context behavior"],
        rows: [
          ["Ordinary Glosso function", "Receives the current context implicitly"],
          ["Function marked `#no_context`", "No implicit context; referencing `context` in its body is rejected"],
          ["Function marked `#c_call` / any `#foreign` call", "Uses the C ABI and has no implicit Glosso context parameter"],
          ["`#push_context { ... }`", "Copies/pushes the current context for the body, then restores the saved context on every structured exit"],
          ["`#push_context replacement { ... }`", "Installs the supplied `Context` value for the body and restores the previous one afterward"],
          ["`#push_allocator(allocator);`", "Replaces `context.allocator` until the enclosing defer scope exits, then restores it"],
        ],
      },
      {
        kind: "paragraph",
        text: "The prelude `Context` value contains allocator, temporary allocator, print style, logger, random generator, and user-data fields. A pushed context is restored through the same LIFO defer machinery as user `defer` statements, including early return and loop exits that leave its scope.",
      },
    ],
  },
  "debug-allocation": {
    heading: "Instrumentation and reports",
    overview:
      "Debug allocation instruments allocation activity so leaks and ownership mistakes are easier to locate. It is a diagnostic mode, not a replacement for the program's release discipline or a guarantee that production allocation behaves identically.",
    rules: [
      "Run representative success and error paths because leaks often occur only after partial initialization.",
      "Release every owned allocation even when the debug allocator will report it at process exit.",
      "Treat retained globals and caches explicitly so intentional lifetime does not hide accidental retention.",
      "Recheck behavior in optimized builds after fixing ownership because debug instrumentation can change timing and layout.",
    ],
  },
  "c-libraries-and-foreign-functions": {
    heading: "Declaration forms",
    overview:
      "`#library` creates a compile-time library handle. `#foreign` creates a bodyless function whose call uses the C ABI and whose external symbol is resolved from either that handle or a directly written library name. A library handle must be declared before a referencing `#foreign` declaration is registered.",
    rules: [
      "`name :: #library[, static|system|dyn] \"file\";` declares a reusable handle. The default kind is `static`; only one kind modifier is allowed.",
      "`fn_name :: (parameters) -> Return #foreign library_handle [\"symbol\"];` uses a declared handle. An unknown handle is a compile error.",
      "`fn_name :: (parameters) -> Return #foreign \"file\" [\"symbol\"];` bypasses `#library` and behaves as a non-dynamic link input.",
      "When the optional symbol string is absent, the external symbol is the Glosso declaration name. A foreign declaration has no Glosso body.",
    ],
    blocks: [
      {
        kind: "code",
        language: "glosso",
        text: "// Reusable library handle; `c` is the linker input.\nlibc :: #library \"c\";\nstrlen :: (text: *const s8) -> u64 #foreign libc \"strlen\";\n\n// The symbol string may be omitted when both names are equal.\nputs :: (text: *const s8) -> s32 #foreign libc;\n\n// A direct library string needs no #library declaration.\nmemcmp :: (a: *const void, b: *const void, count: u64) -> s32\n    #foreign \"c\" \"memcmp\";",
      },
      { kind: "heading", text: "Library kinds" },
      {
        kind: "table",
        columns: ["Declaration", "Resolution time", "Compiler behavior"],
        rows: [
          ["`#library \"name\"`", "Link time", "The default; identical to `#library,static`. The name or path becomes a target-specific linker input."],
          ["`#library,static \"name\"`", "Link time", "Explicit spelling of the default link kind. It does not force a system linker to choose a static archive when only a shared/import library is available; use an archive path to force one file."],
          ["`#library,system \"name\"`", "Link time", "Marks the declaration as a system library. It currently uses the same name translation and linker search path as the default kind; Glosso does not scan system directories itself."],
          ["`#library,dyn \"path-or-name\"`", "Runtime", "Does not add that library to the normal link. The generated program loads it with `LoadLibraryA` on Windows or `dlopen(..., RTLD_NOW)` elsewhere, then resolves the function with `GetProcAddress` or `dlsym`."],
        ],
      },
      { kind: "heading", text: "Which libraries are linked" },
      {
        kind: "paragraph",
        text: "Declaring a library does not by itself add it to the final link. After lowering the program, the compiler walks runtime-reachable functions and function references. A non-dynamic library is added only when a reachable call or function value refers to one of its foreign functions. Repeated library inputs are deduplicated. This is why a target-specific foreign declaration may exist harmlessly when no reachable code selects it.",
      },
      { kind: "heading", text: "Name conversion and search" },
      {
        kind: "paragraph",
        text: "Glosso converts a logical library spelling to the input shown below. The linker then performs the actual directory search. `#library,system` does not add another directory and does not call a Glosso package resolver. Supply an explicit path to select a particular file, or pass a target-appropriate search-path option through `--linker-arg` or `Compiler.add_current_linker_arg`.",
      },
      {
        kind: "table",
        columns: ["Target", "Logical spelling", "Linker input"],
        rows: [
          ["Windows MSVC", "`c` or `libc`", "`legacy_stdio_definitions.lib` and `ucrt.lib`"],
          ["Windows MSVC", "`user32` or `libuser32`", "`user32.lib`"],
          ["Windows MSVC", "A path or a name ending in `.lib`", "Passed as written; the Clang/lld-link SDK and `/LIBPATH:` directories resolve a bare name"],
          ["Windows GNU", "`c` or `libc`", "`libmsvcrt.a`"],
          ["Windows GNU", "`user32`, `libuser32`, or `user32.lib`", "`libuser32.a`"],
          ["Windows GNU", "A path or a name ending in `.a`", "Passed as written"],
          ["Linux, macOS, and other non-Windows targets", "`c` or `libc`", "No extra input; the target C runtime is already part of the link plan"],
          ["Linux, macOS, and other non-Windows targets", "`ssl` or `libssl`", "`-lssl`"],
          ["Linux, macOS, and other non-Windows targets", "A path or a name ending in `.a`, `.so`, or `.dylib`", "Passed as written"],
        ],
      },
      {
        kind: "code",
        language: "text",
        text: "# Search an additional Unix directory\nglosso app.glo --linker-arg -L/opt/vendor/lib\n\n# Search an additional MSVC directory\nglosso app.glo --linker-arg /LIBPATH:C:\\vendor\\lib",
      },
      { kind: "heading", text: "Dynamic-library behavior" },
      {
        kind: "list",
        items: [
          "The `dyn` string is embedded as the runtime loader input. It is not converted to `-l...`, `.lib`, or `.a` form.",
          "The resolved function address is cached in a generated slot after the first successful lookup.",
          "A program using dynamic foreign calls links the platform loader support (`-ldl` on non-Windows native targets).",
          "Dynamic libraries are rejected for WebAssembly and WASI targets.",
          "The compile-time VM can execute dynamic foreign calls only in its supported Windows/libffi configuration; ordinary linked executables use the LLVM backend behavior described above.",
          "A missing library or symbol is a runtime loading failure for `dyn`, but a missing non-dynamic library or symbol is normally a linker error.",
        ],
      },
      {
        kind: "note",
        text: "`#foreign` declares a signature; it cannot verify a C header. Integer widths, struct layout, pointer constness, nullability, ownership, and the external symbol's real prototype must match. Use `#memory` effects on opaque foreign functions when temporal checking needs to know whether pointers are borrowed, stored, invalidated, released, or returned.",
      },
    ],
  },
  "c-calling-convention": {
    heading: "C ABI validation",
    overview:
      "`#foreign` declarations always use the C ABI. `#c_call` applies that ABI to a Glosso function definition, function-pointer type, or interoperable struct declaration. Unlike an ordinary Glosso call, a C-ABI call has no implicit `context` parameter.",
    rules: [
      "Use `callback :: (...) -> T #c_call { ... }` for a Glosso body callable through C, and `Callback :: #fn_ptr(...) -> T #c_call;` for the matching pointer type.",
      "Accessing implicit `context` inside a `#c_call` body is a compile error. Pass required state through an explicit pointer or parameter.",
      "A C function-pointer type is distinct from an ordinary Glosso function-pointer type, even when its written parameters and return type otherwise match.",
      "Mark structs used by value across the ABI as `struct #c_call`; their fields are recursively checked for unsupported representations.",
    ],
    blocks: [
      {
        kind: "code",
        language: "glosso",
        text: "User_Data :: struct #c_call { total: s64; }\nCallback :: #fn_ptr(data: *void, value: s32) -> s32 #c_call;\n\nadd_to_total :: (data: *void, value: s32) -> s32 #c_call {\n    user := cast(*User_Data)data;\n    user.*.total += value;\n    return value;\n}\n\n// An ordinary Glosso wrapper may use context and call the C surface.\nrun_callback :: (callback: Callback, data: *void) -> s32 {\n    return callback(data, 42);\n}",
      },
      { kind: "heading", text: "Rejected by-value representations" },
      {
        kind: "paragraph",
        text: "The checker walks C-ABI parameters, returns, callback signatures, and fields of non-generic `#c_call` structs. Complex primitives, `Simd(...)`, and `Matrix(...)` are rejected because Glosso does not declare a portable by-value C ABI for them. The check is recursive through structs, unions, tuples, fixed arrays, and C function pointers. Pass scalar components or compatible storage through a pointer instead.",
      },
      {
        kind: "list",
        items: [
          "On Windows x64, `#c_call` structs follow the platform aggregate ABI: sizes 1, 2, 4, and 8 bytes travel as integers; other by-value aggregates use indirect storage where required.",
          "Builtin `string` values are Glosso descriptors, not `char *`. A C text parameter normally uses `*const s8`, `[*]const s8`, or another prototype-matching pointer type.",
          "Pointer ownership and nullability are not inferred from the C ABI. Describe temporal behavior with `#memory` and expose safer Glosso wrappers where appropriate.",
          "The external header remains authoritative. Glosso validates supported representation categories, but cannot prove that a handwritten declaration matches a particular C prototype.",
        ],
      },
    ],
  },
  "c-varargs": {
    heading: "Ellipsis rules and default promotions",
    overview:
      "A bare `...` declares a C ellipsis, not a Glosso rest sequence. It is allowed on a `#foreign` declaration or a `#c_call` definition and becomes part of that function or function-pointer type.",
    rules: [
      "The marker must be last and must follow at least one fixed parameter. `(...)` by itself is rejected.",
      "Fixed parameters must be concrete runtime parameters; compile-time or generic fixed parameters are rejected.",
      "Operators and expansion procedures cannot be C-variadic. A lambda cannot initialize a variadic function pointer.",
      "For each extra call argument, Glosso applies C default promotions: `bool`, 8-bit integers, and 16-bit integers become 32-bit integers; `f16` and `f32` become `f64`.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Source argument type", "Type passed through `...`"],
        rows: [
          ["`bool`", "32-bit integer"],
          ["`s8`, `u8`, `s16`, `u16`", "32-bit integer"],
          ["`f16`, `f32`", "`f64` / C `double`"],
          ["Other supported scalar, pointer, or aggregate type", "Its C-ABI type without a default-promotion change"],
        ],
      },
      {
        kind: "code",
        language: "glosso",
        text: "libc :: #library \"c\";\nprintf :: (format: *const s8, ...) -> s32 #foreign libc;\n\nmain :: () {\n    // `small` is promoted before the foreign call.\n    small: u8 = 7;\n    _ := printf(\"value=%d ratio=%f\\n\", small, 0.5f32);\n}",
      },
      {
        kind: "paragraph",
        text: "A Glosso definition that receives C ellipsis arguments uses `std/VarArg` to start, copy, read, and finish the platform vararg list. The format string or another fixed discriminator must agree with the promoted types; neither the callee nor the compiler receives runtime type tags. Dynamic `#library,dyn` calls through the compile-time VM do not support C varargs.",
      },
    ],
  },
  diagnostics: {
    heading: "Compile-time and call-site enforcement",
    overview:
      "Diagnostic directives turn violated compile-time assumptions into focused build failures and annotate functions whose control-flow contract matters to callers. Good diagnostics identify the unsupported input and the requirement that would make it valid.",
    rules: [
      "Use compile errors for impossible specializations and configuration mistakes that cannot be handled at runtime.",
      "Use `#must` when ignoring a result would discard an important error or ownership action.",
      "Use `#noreturn` only when every path truly terminates or transfers control away from the caller.",
      "Keep dump-style diagnostics temporary or intentionally gated so normal builds remain readable.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Directive", "Enforced behavior"],
        rows: [
          ["`#compile_error expression;`", "Expression must evaluate to a compile-time string; compilation fails at that statement with the string as its message"],
          ["Function `#must`", "Discarding a call result as an expression statement is an error; `_ := call();` is an explicit acknowledged discard"],
          ["Function `#noreturn`", "The checker rejects an explicit return or a body that can fall through normally; call sites treat a guaranteed call as terminating"],
          ["Function `#returns_twice`", "Marks lowered/LLVM function metadata for control-flow operations with returns-twice semantics"],
          ["Function `#dump`", "Prints that function's lowered typed IR during compilation"],
        ],
      },
      {
        kind: "code",
        language: "glosso",
        text: "Owned :: () -> string #must { return \"value\"; }\nstop :: (message: string) #noreturn {\n    print(\"%\\n\", message);\n    exit(1);\n}\n\nmain :: () {\n    _ := Owned(); // explicit discard satisfies #must\n    #if OUT.os == Target_OS.Unknown\n        #compile_error \"unsupported target\";\n}",
      },
    ],
  },
  "target-gated-code": {
    heading: "Target constants and static selection",
    overview:
      "Target constants expose compile-time facts about the selected output platform. Static selection can choose compatible declarations and implementations without paying a runtime branch or compiling an impossible foreign dependency.",
    rules: [
      "Gate the smallest target-specific layer and present one shared interface to the rest of the program.",
      "Use target facts at compile time; runtime environment detection belongs to ordinary program logic.",
      "Provide an explicit unsupported-target diagnostic when no implementation exists.",
      "Build every supported target in automation so inactive branches do not silently decay.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["Constant", "Fields"],
        rows: [
          ["`OUT: Output_Target`", "Selected output `os`, `cpu`, and `abi`; changes with `--target`"],
          ["`HOST: Host_Target`", "Compiler host `os` and `cpu`; does not change merely because the output is cross-compiled"],
          ["`target_endian()`", "Prelude helper returning `.Little` or `.Big` from the selected output CPU"],
        ],
      },
      {
        kind: "paragraph",
        text: "`OUT.os`, `OUT.cpu`, and `OUT.abi` are installed as compile-time enum values after the prelude target types are available. Use `OUT` for emitted-code decisions and `HOST` only for compile-time tools that execute on the build machine. Confusing them is especially visible during cross-compilation.",
      },
    ],
  },
  "build-time-compilation-helpers": {
    heading: "Build graph inputs and linker arguments",
    overview:
      "Build helpers let compile-time code discover sources, construct compilation units, and coordinate generated inputs. Because this work participates in the build graph, deterministic paths and declared inputs are essential for reliable caching.",
    rules: [
      "Derive outputs from explicit source and option inputs, and write generated files to predictable build-owned locations.",
      "Avoid timestamps, random values, and undeclared environment dependencies unless they are deliberately part of the build key.",
      "Keep host-tool behavior separate from target-program behavior when cross-compiling.",
      "Report generated-command failures with the command purpose and relevant path rather than only an exit number.",
    ],
    blocks: [
      {
        kind: "table",
        columns: ["API group", "Purpose"],
        rows: [
          ["`compile` / `compile_args`", "Run a one-shot nested Glosso compilation and return status plus captured output"],
          ["`compiler_create_workspace`, `add_build_file`, `add_build_string`", "Accumulate several source inputs under a workspace handle"],
          ["`get_build_options`, `set_build_options`", "Read and replace workspace output/backend/path/argument settings"],
          ["`compile_c_archive`", "Compile target-aware C sources into a cached native archive and return its artifact path"],
          ["`find_header`, `find_library`, `find_resource`", "Locate compiler/bundle resources for compile-time integration"],
          ["`add_current_linker_arg`", "Add one raw argument to the final link of the program currently being compiled"],
          ["`run_command`", "Execute a host command at compile time and capture its status/output"],
        ],
      },
      {
        kind: "paragraph",
        text: "`Compile_Options` controls backend, target, optimization level, compiler/linker arguments, sanitizers, temporal checking, color, and temporary allocator size for a one-shot compile. `Build_Options` adds output kind/paths, import paths, source-string emission, and workspace command-line settings. `C_Compile_Options` controls include paths, definitions, native compiler arguments, optimization, and PIC for archive generation.",
      },
      {
        kind: "note",
        text: "These are compile-time compiler services, not runtime subprocess APIs. Results use `Compiler_Result` or `Native_Compile_Result`; always test `.ok` and include `.output` in a generated diagnostic before using an artifact path.",
      },
    ],
  },
  "style-guidelines-for-glosso-code": {
    heading: "Public surface and internal conventions",
    overview:
      "Glosso style aims to make ownership, compile-time behavior, and public surface visible without depending on compiler-enforced privacy. Consistency matters most at module boundaries, where names and signatures become navigation for other programmers.",
    rules: [
      "Use clear public names and reserve a leading `__` for functions and constants intended as implementation details; the prefix is a convention and does not enforce privacy.",
      "Place `__` functions and constants after the public declarations of the same category so the supported surface appears first.",
      "Use private sections when access must be enforced, and the `__` convention when signaling internal intent is sufficient.",
      "Prefer explicit width, ownership, and borrowing information at APIs, even when local inference could shorten the spelling.",
      "Keep compile-time metaprogramming behind ordinary typed interfaces and document generated behavior that is not evident at the call site.",
    ],
  },
};
