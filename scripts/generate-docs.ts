import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { manualEnrichment } from "./manual-enrichment";

type DocBlock = {
  kind: "paragraph" | "code" | "list" | "heading" | "note" | "table";
  text?: string;
  language?: string;
  items?: string[];
  columns?: string[];
  rows?: string[][];
};

type ManualSection = { id: string; title: string; blocks: DocBlock[] };
type DirectiveDoc = { name: string; site: string; syntax: string; summary: string; details?: string[] };
type StdTypeclassMember = {
  id: string;
  name: string;
  kind: "method" | "associated-type";
  signature: string;
  summary: string;
  sourcePath: string;
  sourceLine: number;
  hasDefault: boolean;
  function?: StdFunctionInfo;
};
type StdTypeclassInfo = {
  minimal: string;
  minimalExplicit: boolean;
  members: StdTypeclassMember[];
};
type StdParameter = {
  name: string;
  type: string;
  defaultValue?: string;
  modifiers: string[];
};
type StdMemoryContract = {
  effect: string;
  arguments: string[];
};
type StdFunctionInfo = {
  parameters: StdParameter[];
  returnType: string;
  memoryContracts: StdMemoryContract[];
};
type StdSymbol = {
  id: string;
  name: string;
  module: string;
  kind: "function" | "method" | "typeclass" | "type" | "constant";
  signature: string;
  searchableSignature: string;
  summary: string;
  sourcePath: string;
  sourceLine: number;
  ownerTypeclass?: string;
  hasDefault?: boolean;
  typeclass?: StdTypeclassInfo;
  function?: StdFunctionInfo;
};
type StdInstance = {
  id: string;
  typeclass: string;
  head: string;
  module: string;
  signature: string;
  summary: string;
  sourcePath: string;
  sourceLine: number;
  negative: boolean;
};
type StdModule = {
  id: string;
  name: string;
  summary: string;
  sourcePath: string;
  symbols: StdSymbol[];
  instances: StdInstance[];
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const manualDir = resolve(scriptDir, "..");
const repoRoot = resolve(manualDir, "..");
const generatedDir = resolve(manualDir, "src", "generated");
const publicDir = resolve(manualDir, "public");

mkdirSync(generatedDir, { recursive: true });
mkdirSync(publicDir, { recursive: true });
copyFileSync(resolve(manualDir, "tree-sitter-glosso.wasm"), resolve(publicDir, "tree-sitter-glosso.wasm"));
const runtimeWasm = resolve(manualDir, "node_modules", "web-tree-sitter", "tree-sitter.wasm");
if (existsSync(runtimeWasm)) copyFileSync(runtimeWasm, resolve(publicDir, "tree-sitter.wasm"));

if (!existsSync(resolve(repoRoot, "src", "lexer.rs"))) {
  const snapshot = resolve(generatedDir, "docs.ts");
  if (!existsSync(snapshot)) {
    throw new Error("The Glosso source tree is unavailable and src/generated/docs.ts has not been committed.");
  }
  console.log("Glosso source tree not found; using the committed documentation snapshot.");
  process.exit(0);
}

const read = (path: string): string => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const slugify = (value: string): string =>
  value
    .replace(/`/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

function cleanTypstLine(line: string): string {
  return line
    .replace(/^\s*#note\($/, "")
    .replace(/^\s*title:\s*\[(.*)\],?$/, "$1")
    .replace(/^\s*body:\s*\[$/, "")
    .replace(/^\s*tone:\s*"[^"]+",?$/, "")
    .replace(/^\s*[\]\)],?\s*$/, "")
    .replace(/\\\"/g, '"')
    .trim();
}

function parseManual(): ManualSection[] {
  const lines = read(resolve(repoRoot, "docs", "glosso-manual.typ")).split("\n");
  const start = lines.findIndex((line) => line === "= Detailed Language Reference");
  const end = lines.findIndex((line) => line === "= Grammar Appendix");
  if (start < 0 || end < 0) throw new Error("Could not locate the language reference in docs/glosso-manual.typ");

  const sections: ManualSection[] = [];
  let current: ManualSection | undefined;
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] | undefined;
  let codeLanguage = "text";

  const flushParagraph = (): void => {
    const text = paragraph.join(" ").replace(/\s+/g, " ").trim();
    if (text && current) current.blocks.push({ kind: "paragraph", text });
    paragraph = [];
  };
  const flushList = (): void => {
    if (list.length && current) current.blocks.push({ kind: "list", items: list });
    list = [];
  };
  const flushAll = (): void => {
    flushParagraph();
    flushList();
  };

  for (const rawLine of lines.slice(start + 1, end)) {
    const heading = rawLine.match(/^==\s+(.+)$/);
    if (heading) {
      flushAll();
      const title = heading[1].trim();
      current = { id: slugify(title), title, blocks: [] };
      sections.push(current);
      continue;
    }
    if (!current) continue;

    const subheading = rawLine.match(/^={3,4}\s+(.+)$/);
    if (subheading) {
      flushAll();
      current.blocks.push({ kind: "heading", text: subheading[1].trim() });
      continue;
    }

    const fence = rawLine.match(/^```(.*)$/);
    if (fence) {
      if (code) {
        current.blocks.push({ kind: "code", language: codeLanguage, text: code.join("\n") });
        code = undefined;
      } else {
        flushAll();
        code = [];
        codeLanguage = fence[1].trim() || "text";
      }
      continue;
    }
    if (code) {
      code.push(rawLine);
      continue;
    }

    const line = cleanTypstLine(rawLine);
    if (!line) {
      flushAll();
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      list.push(line.slice(2).trim());
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushAll();

  // Keep these two sections aligned with the lexer. The source Typst manual
  // still describes the pre-Erlang-style literal syntax.
  const integerLiterals = sections.find((section) => section.id === "integer-literals");
  if (integerLiterals) {
    integerLiterals.blocks = [
      {
        kind: "paragraph",
        text: "Decimal integer literals use digits and may contain underscores between digits. Based integers use base#digits, where the base is from 2 through 36 and alphabetic digits are case-insensitive. The 0x and 0b prefixes are not part of Glosso syntax.",
      },
      {
        kind: "code",
        language: "glosso",
        text: "decimal := 1_032_000;\nfive := 2#101;\nmessage := 16#4865_316F_774F_6C64;\nmax_digit := 36#Z;",
      },
    ];
  }
  const floatingPointLiterals = sections.find((section) => section.id === "floating-point-literals");
  if (floatingPointLiterals) {
    floatingPointLiterals.blocks = [
      {
        kind: "paragraph",
        text: "Floating-point literals use a decimal fraction, an e or E exponent, or both. The exponent may have a leading plus or minus sign, and digit sequences may contain underscores.",
      },
      {
        kind: "code",
        language: "glosso",
        text: "pi := 3.141_592;\navogadro := 6.022_140_76e23;\nmilli := 1e-3;\nlarge := 2E+10;",
      },
    ];
  }
  const pattern = sections.find((section) => section.id === "pattern");
  if (pattern) {
    pattern.title = "Pattern";
    pattern.blocks = [
      {
        kind: "paragraph",
        text: "`#pattern` tests a value's structure and can introduce typed captures at the same time. A direct pattern test returns `bool`; captures are available in the successful `if` or `while` body and in later parts of the same condition.",
      },
      { kind: "heading", text: "Pattern syntax" },
      {
        kind: "table",
        columns: ["Form", "Meaning"],
        rows: [
          ["`42`, `3.5`, `\"text\"`, `true`, `false`, `null`", "Match the same literal value."],
          ["`name`", "Capture the matched value as `name`."],
          ["`_`", "Match any value without creating a capture."],
          ["`*name`", "Capture a pointer to the matched storage, allowing mutation through `name.*`."],
          ["`.Variant` or `Type.Variant`", "Match an enum value or a payload-free tagged-union variant."],
          ["`.Variant(pattern)` or `Type.Variant(pattern)`", "Match a tagged-union variant and recursively match its payload."],
          ["`.{ fields }`", "Match a struct whose type is inferred from the tested value."],
          ["`Type.{ fields }`", "Match a struct and require the declared struct type."],
          ["`.field`", "Match a named struct field and capture it using the field's name."],
          ["`.field = pattern`", "Match a named struct field with a nested pattern."],
          ["`...`", "Explicitly ignore remaining struct fields."],
          ["`(pattern)`", "Group a pattern."],
        ],
      },
      {
        kind: "code",
        language: "ebnf",
        text: "PatternTest   ::= \"#pattern\" PatternArm\n                | \"#pattern\" \"{\" PatternArm { (\";\" | \",\") PatternArm } [\";\" | \",\"] \"}\"\nPatternArm    ::= Pattern \"=\" Expr\nPattern       ::= Literal | Ident | \"_\" | \"*\" Ident | \"...\"\n                | [TypeName] \".\" Variant [\"(\" Pattern \")\"]\n                | [TypeName] \".{\" [FieldPattern { \",\" FieldPattern } [\",\"]] \"}\"\n                | \"(\" Pattern \")\"\nFieldPattern  ::= \".\" Ident [\"=\" Pattern] | Pattern | \"...\"",
      },
      { kind: "heading", text: "Testing and capturing" },
      {
        kind: "code",
        language: "glosso",
        text: "Point :: struct { x: int; y: int; }\nMaybe_Point :: union { Some: Point; None: void; }\n\npoint := Point.{ .x = 1, .y = 2 };\nif #pattern Point.{ .x = 1, .y, ... } = point && y > 0 {\n    print(\"y = %\\n\", y);\n}\n\nmaybe: Maybe_Point = .Some(point);\nif #pattern .Some(.{ .x = *x, ... }) = maybe {\n    x.* += 1;\n}",
      },
      {
        kind: "paragraph",
        text: "A bare identifier is always a capture, not a constant comparison. Use literals, enum members, or union variants for value matching. A qualified struct or union pattern is checked against the subject's actual type. A union variant accepts zero or one nested payload pattern, according to whether that variant has a payload.",
      },
      { kind: "heading", text: "Grouped pattern tests" },
      {
        kind: "paragraph",
        text: "Braces combine multiple `pattern = value` arms into one boolean test. Every arm must match. Captures from all arms are combined, and reusing a capture name requires the captured types to agree.",
      },
      {
        kind: "code",
        language: "glosso",
        text: "while #pattern {\n    Point.{ .x = *x, ... } = current;\n    .Some(limit) = maybe_limit;\n} {\n    if x.* >= limit break;\n    x.* += 1;\n}",
      },
      { kind: "heading", text: "Pattern switches" },
      {
        kind: "paragraph",
        text: "A subject-based pattern switch matches every `case` against one value. Write the pattern directly after `case`; do not repeat `#pattern`. Captures exist only inside that case body.",
      },
      {
        kind: "code",
        language: "glosso",
        text: "if #pattern maybe == {\ncase .Some(.{ .x, .y, ... });\n    print(\"point: %, %\\n\", x, y);\ncase .None;\n    print(\"no point\\n\");\nelse;\n    // Required unless the switch is marked #partial.\n}",
      },
      {
        kind: "paragraph",
        text: "A subjectless pattern switch lets each case provide its own grouped tests or an ordinary boolean condition. Pattern switches require `else` by default because the compiler does not infer pattern coverage; write `if #partial #pattern == { ... }` when intentionally omitting it.",
      },
      {
        kind: "code",
        language: "glosso",
        text: "if #partial #pattern == {\ncase {\n    .Some(left) = first;\n    .Some(right) = second;\n};\n    print(\"both: %, %\\n\", left, right);\ncase ready;\n    print(\"ready without captures\\n\");\n}",
      },
      {
        kind: "list",
        items: [
          "Use `&&` to add a guard after a pattern test; captures are available to the guard and successful body.",
          "Use separate `case` clauses for alternatives. Pattern syntax itself has no or-pattern form.",
          "Use `...` when omitted struct fields are intentional, making partial destructuring explicit to readers.",
          "A failed match does not expose its captures to the `else` branch or outside the condition-controlled scope.",
        ],
      },
    ];
  }
  enrichManualSections(sections);
  const operatorDeclarations = sections.find((section) => section.id === "operator-declarations");
  if (operatorDeclarations) operatorDeclarations.blocks.push(...buildStdOperatorPrecedenceBlocks());
  // Keywords have a dedicated lexer-derived reference page. Keeping the
  // prose chapter as well would create two indistinguishable navigation items.
  return sections.filter((section) => section.id !== "keywords");
}

function enrichManualSections(sections: ManualSection[]): void {
  for (const section of sections) {
    const enrichment = manualEnrichment[section.id];
    if (!enrichment) continue;
    section.blocks.push(
      { kind: "heading", text: enrichment.heading },
      { kind: "paragraph", text: enrichment.overview },
      { kind: "list", items: enrichment.rules },
      ...(enrichment.blocks ?? []),
    );
  }
}

const grammarGroups = [
  {
    title: "Lexical grammar",
    grammar: `SourceFile       ::= { WhiteSpace | Comment | Token }
WhiteSpace       ::= " " | Tab | CarriageReturn | Newline
Comment          ::= "//" { Character - Newline } [Newline]
                   | "/*" { Character | Comment } "*/"
Ident            ::= (UnicodeLetter | "_") { UnicodeLetter | UnicodeDigit | "_" }
Keyword          ::= "if" | "ifx" | "else" | "while" | "for" | "return"
                   | "break" | "continue" | "struct" | "union" | "case" | "enum"
                   | "using" | "defer" | "context" | "cast" | "acast" | "where"
                   | "noalias"
Directive        ::= "#" Ident
Label            ::= "'" Ident
OperatorName     ::= "'" OperatorToken "'"
BacktickName     ::= "\`" Ident
SpliceName       ::= "\`\`" Ident
OperatorChar     ::= "+" | "-" | "*" | "/" | "<" | ">" | "!" | "@" | "%"
                   | "^" | "&" | "|" | "~" | "?" | "." | "," | ":" | "="
OperatorToken    ::= OperatorChar { OperatorChar }
Integer          ::= Digits | Base "#" BaseDigits
Base             ::= Digits                         (* numeric value 2 through 36 *)
Float            ::= Digits "." Digits [Exponent] | Digits Exponent
Exponent         ::= ("e" | "E") ["+" | "-"] Digits
Digits           ::= Digit { ["_"] Digit }
String           ::= '"' { Character | Escape } '"'
Escape           ::= "\\" ("a" | "b" | "f" | "n" | "r" | "t" | "v" | "0"
                   | "\\" | '"' | "'" | "?" | "x" HexDigit HexDigit | Character)
BaseDigits       ::= BaseDigit { ["_"] BaseDigit }
Token            ::= Keyword | Ident | Directive | Label | OperatorName | OperatorToken
                   | Integer | Float | String | MultilineLine | Punctuation
Punctuation      ::= "(" | ")" | "{" | "}" | "[" | "]" | ";" | "," | "." | "$"
MultilineLine    ::= "\\\\" { Character - Newline } Newline`,
  },
  {
    title: "Files, imports, and bindings",
    grammar: `File             ::= { TopLevelItem }
TopLevelItem     ::= FeatureToggle | ImportDecl | LoadDecl | MemoryOverlay
                   | InsertDecl | ThreadLocalDecl | TopComptime | InstanceDecl | NamedDecl
FeatureToggle    ::= ("#enable" | "#disable") "(" PrivateFeature ["," "siblings"] ")" [";"]
PrivateFeature   ::= "private_section" | "private_sections"
ImportDecl       ::= [Ident "::"] ImportTail
ImportTail       ::= "#import" ["," ("only" | "hide")
                     "(" [ImportName {"," ImportName} [","]] ")"] String [";"]
ImportName       ::= Name | OperatorName
LoadDecl         ::= [Ident "::"] LoadTail
LoadTail         ::= "#load" String [";"]
InsertDecl       ::= "#insert" Expr [";"]
ThreadLocalDecl  ::= "#thread_local" MutableGlobal
TopComptime      ::= "#comptime" (ComptimeBlock | Block | Expr) [";"]
NamedDecl        ::= Name "::" NamedTail
                   | Ident ":" GlobalAfterColon
                   | Ident (":=" | "::=") Expr [";"]
NamedTail        ::= ImportTail | LoadTail | LibraryTail | FnPtrTail | TypeclassTail
                   | StructTail | UnionTail | EnumTail | FunctionTail | Expr [";"]
LibraryTail      ::= "#library" ["," ("system" | "dyn" | "static")] String [";"]
GlobalAfterColon ::= [Type] ((":" | "::") Expr | ("=" | ":=") Expr | ";")
MutableGlobal    ::= Ident ":" Type [("=" | ":=") Expr] [";"]
Name             ::= Ident | OperatorName
QualifiedName    ::= Ident {"." Ident}
NameList         ::= Name {"," Name} [","]`,
  },
  {
    title: "Types",
    grammar: `Type             ::= InlineAggregateType | ("#aos" | "#soa") ArrayType
                   | "$" Ident | SpliceName | PointerType | ManyPointerType | ArrayType
                   | TupleOrFunctionType | "#Context" | SimdType | MatrixType | AppliedType
AppliedType      ::= QualifiedName ["(" TypeList ")"] ["." Ident {"." Ident}]
PointerType      ::= Stars {TypeQualifier} Type
Stars            ::= "*" {"*"}
ManyPointerType  ::= "[*]" {TypeQualifier} Type
TypeQualifier    ::= "const" | "volatile"
ArrayType        ::= "[]" Type | "[..]" Type | "[" (Integer | Ident) "]" Type
TupleOrFunctionType ::= "(" [FunctionTypeParam {"," FunctionTypeParam}] ")"
                     ["->" Type]
FunctionTypeParam ::= ["noalias"] [Ident ":"] Type
TypeList         ::= Type {"," Type}
InlineAggregateType ::= "struct" StructModifiers StructBody
                     | "union" UnionModifiers UnionBody
                     | "enum" [Type] EnumBody
                     | "enum_flags" Type EnumBody
PrimitiveType    ::= "int" | "uint" | "bool" | "string" | "cstring"
                   | "string16" | "cstring16" | "type" | "void" | "any"
                   | "label" | "Code" | "s8" | "s16" | "s32" | "s64" | "s128"
                   | "u8" | "u16" | "u32" | "u64" | "u128"
                   | "f16" | "f32" | "f64" | "f80" | "f128"
                   | "c32" | "c64" | "c128" | "c160" | "c256"
SimdType         ::= "Simd" "(" Type "," Integer ")"
MatrixType       ::= "Matrix" "(" Type "," (Integer | Ident) "," (Integer | Ident) ")"`,
  },
  {
    title: "Functions and parameters",
    grammar: `FunctionDecl     ::= Name "::" FunctionTail
FunctionTail     ::= Parameters ["->" Type] {FunctionDirective} {"where" Expr}
                     (Block | ";" (* signature-only only in a typeclass *))
Parameters       ::= "(" [Parameter {"," Parameter} [","]] ")"
Parameter        ::= {"using" | "noalias"}
                     (ParamNames ":" Type ["=" Expr] | Ident ":=" Expr)
                   | "#comptime" ParamNames ":" Type ["=" Expr]
                   | "#empty" ":" Type {"," Type}
                   | Ident ":" VariadicType
                   | "..."
ParamNames       ::= Ident ["," Ident]
VariadicType     ::= "..." [Ident | "$" Ident | "(" Ident {"&&" Ident} ")"]
FunctionDirective ::= "#operator" "(" OperatorMode ["," Integer] ")"
                   | "#precedence" "(" BinaryMode ["," Integer] ")"
                   | "#expand" ["," "expression"] | "#magic" String
                   | "#foreign" (String | Ident) [String] | "#c_call" | "#no_context"
                   | "#noreturn" | "#returns_twice" | "#dump" | "#must"
                   | "#inline" ["," ("always" | "never")] | "#modify" (Block | Expr)
                   | MemoryDirective
OperatorMode     ::= "left" | "right" | "prefix" | "suffix" | "assign"
BinaryMode       ::= "left" | "right" | "assign"
FnPtrDecl        ::= Ident "::" FnPtrTail
FnPtrTail        ::= "#fn_ptr" "(" [FnPtrParam {"," FnPtrParam} [","]] ")"
                     ["->" Type] {"#c_call" | "#no_context"} [";"]
FnPtrParam       ::= ["noalias"] Ident ":" Type | "..."
Lambda           ::= ("||" | "|" [LambdaParam {"," LambdaParam} [","]] "|")
                     ["->" Type] (Block | Expr)
LambdaParam      ::= ["noalias"] Ident [":" Type]`,
  },
  {
    title: "Aggregates",
    grammar: `StructDecl       ::= Ident "::" StructTail
StructTail       ::= "struct" StructModifiers StructBody
StructModifiers  ::= {"#c_call" | "#derive" "(" IdentList ")" | "#magic" String
                   | "#modify" (Block | Expr)}
StructBody       ::= "{" {StructField | EmptyField} "}"
StructField      ::= ["using"] ["#as" ["using"]] Ident ":" Type ["=" Expr] ";"
EmptyField       ::= "#empty" ":" Type {"," Type} [","] ";"
UnionDecl        ::= Ident "::" UnionTail
UnionTail        ::= "union" UnionModifiers UnionBody
UnionModifiers   ::= {"#raw" | "#derive" "(" IdentList ")" | "#magic" String}
UnionBody        ::= "{" {Ident ":" Type ";"} "}"
EnumDecl         ::= Ident "::" EnumTail
EnumTail         ::= ("enum" [Type] | "enum_flags" Type) EnumBody
EnumBody         ::= "{" {Ident ["::" Integer] ";"} "}"
IdentList        ::= Ident {"," Ident}
StructLiteral    ::= [AppliedType] ".{" [FieldInit {"," FieldInit} [","]] "}"
FieldInit        ::= "." Name "=" Expr | Expr
ArrayLiteral     ::= ".[" [Expr {"," Expr} [","]] "]"
TupleLiteral     ::= ".(" [Expr {"," Expr} [","]] ")"
SimdLiteral      ::= "#simd" ArrayLiteral`,
  },
  {
    title: "Typeclasses and instances",
    grammar: `TypeclassDecl    ::= Ident "::" TypeclassTail
TypeclassTail    ::= "typeclass" "("
                     [TypeclassParam {"," TypeclassParam} [","]] ")"
                     {"where" Expr} {TypeclassDirective} TypeclassBody
TypeclassParam   ::= Ident ":" Type
TypeclassDirective ::= "#derive" "(" IdentList ")" | "#minimal" "(" [MinimalExpr] ")"
TypeclassBody    ::= "{" {TypeclassMember} "}"
TypeclassMember  ::= Name "::" FunctionTail | Ident "::" Type [";"]
MinimalExpr      ::= MinimalConjunction {"|" MinimalConjunction}
MinimalConjunction ::= MinimalAtom {"," MinimalAtom}
MinimalAtom      ::= Name | "(" MinimalExpr ")"
InstanceDecl     ::= InstanceHead "::" "instance" ["!"] Ident {"where" Expr} InstanceBody
InstanceHead     ::= Type | "(" TypeList ")" | SpliceName
InstanceBody     ::= "{" {InstanceMember} "}"
InstanceMember   ::= Name "::" FunctionTail | Ident "::" Type [";"]`,
  },
  {
    title: "Statements and control flow",
    grammar: `Block            ::= "{" {Stmt} "}"
Stmt             ::= Block | LocalDecl | NestedDecl | ReturnStmt | "break" [";"]
                   | "continue" [";"] | "defer" Stmt | "using" Ident [";"]
                   | IfStmt | StaticIfStmt | WhileStmt | ForStmt | LabelStmt
                   | PushContextStmt | PushAllocatorStmt | ComptimeStmt | InsertStmt
                   | CompileErrorStmt | InlineBytesStmt | InlineAsmStmt | MemoryOverlay
                   | AssignmentStmt | Expr [";"]
NestedDecl       ::= Name "::" (FunctionTail | StructTail | UnionTail | EnumTail)
LocalDecl        ::= LocalNames (":=" | "::=" | "::") Expr [MemoryDirective] [";"]
                   | LocalNames ":" [Type]
                     [("=" | ":=" | ":" | "::") Expr] [MemoryDirective] [";"]
LocalNames       ::= Name {"," Name}
AssignmentStmt   ::= Expr ("=" | AssignmentOperator) Expr [";"]
ReturnStmt       ::= "return" [Expr {"," Expr}] [";"]
IfStmt           ::= "if" Expr StmtOrBlock ["else" (IfStmt | StmtOrBlock)]
StaticIfStmt     ::= "#if" Expr StmtOrBlock ["else" (StaticIfStmt | StmtOrBlock)]
WhileStmt        ::= ["#inline"] "while" Expr StmtOrBlock
ForStmt          ::= ["#inline"] "for" ["<"] [":" Ident]
                     [(Ident ["," Ident]) ":"] Expr StmtOrBlock
LabelStmt        ::= Label (":" | ";")
PushContextStmt  ::= "#push_context" [Expr] StmtOrBlock
PushAllocatorStmt ::= "#push_allocator" "(" Expr ")" [";"]
ComptimeStmt     ::= "#comptime" (ComptimeBlock | Expr) [";"]
InsertStmt       ::= "#insert" Expr [";"]
CompileErrorStmt ::= "#compile_error" Expr [";"]
InlineBytesStmt  ::= "#bytes" Expr [";"]
StmtOrBlock      ::= Stmt | Block`,
  },
  {
    title: "Switches and patterns",
    grammar: `RuntimeSwitch    ::= "if" ["#partial"] Expr "==" "{" {CaseArm} [ElseArm] "}"
StaticSwitch     ::= "#if" Expr "==" "{" {CaseArm} [ElseArm] "}"
CaseArm          ::= "case" Expr ";" {Stmt | "#falling" [";"]}
ElseArm          ::= "else" ";" {Stmt}
PatternTest      ::= "#pattern" PatternArm
                   | "#pattern" "{" PatternArm {(";" | ",") PatternArm} [";" | ","] "}"
PatternArm       ::= Pattern "=" Expr
PatternSwitch    ::= "if" ["#partial"] "#pattern" [Expr] "=="
                     "{" {PatternCase} [ElseArm] "}"
PatternCase      ::= "case" (Pattern | "{" PatternArm {(";" | ",") PatternArm} [";" | ","] "}"
                     | Expr) ";" {Stmt | "#falling" [";"]}
Pattern          ::= LiteralPattern | Ident | "*" Ident | "..." | "." Ident
                   | QualifiedName ["(" [Pattern {"," Pattern}] ")"]
                   | [QualifiedName] ".{" [FieldPattern {"," FieldPattern} [","]] "}"
                   | "(" Pattern ")"
FieldPattern     ::= "." Name ["=" Pattern] | Pattern | "..."
LiteralPattern   ::= Integer | Float | String | "true" | "false" | "null"`,
  },
  {
    title: "Expressions",
    grammar: `Expr             ::= UnaryExpr {InfixOperator UnaryExpr}
UnaryExpr        ::= "#comptime" (ComptimeBlock | UnaryExpr)
                   | "#try" "{" Expr "}" | PatternTest
                   | "#meaningful" (Block | UnaryExpr)
                   | "cast" "(" Type ")" UnaryExpr | "acast" UnaryExpr
                   | "*" UnaryExpr | PrefixOperator UnaryExpr | PostfixExpr
PostfixExpr      ::= PrimaryExpr {PostfixPart}
PostfixPart      ::= "." (Name | Integer) | Call | Index | ".cast" "(" Type ")"
                   | ".acast" | ".*" | ",," Label | ".{" [FieldInitList] "}"
                   | MemoryDirective | SuffixOperator
PrimaryExpr      ::= Integer | Float | String | "#string" MultilineString | "#char" String
                   | Label | "true" | "false" | "null" | "#undefined" | "context"
                   | Ident | OperatorName | "$" Ident | BacktickName | SpliceName
                   | ContextualMember | Lambda | StructLiteral | ArrayLiteral | TupleLiteral | SimdLiteral
                   | ".."
                   | "(" Expr ")" | "#code" Block | "#inline" (WhileStmt | ForStmt)
Call             ::= "(" [Argument {"," Argument} [","]] ")"
Argument         ::= ["." Ident "="] Expr ["..."]
Index            ::= "[" Expr "]"
ComptimeBlock    ::= ["->" Type] Block
FieldInitList    ::= FieldInit {"," FieldInit} [","]
ContextualMember ::= "." Name
MultilineString  ::= MultilineLine {MultilineLine}
PrefixOperator   ::= a visible operator declared prefix
SuffixOperator   ::= "?" | a visible operator declared suffix
InfixOperator    ::= a visible left, right, or assignment operator`,
  },
  {
    title: "Memory contracts and low-level statements",
    grammar: `MemoryDirective  ::= "#memory" MemoryEffect
                   | "#memory" "(" MemoryEffect {"," MemoryEffect} ")"
MemoryEffect     ::= "returns_fresh" | "returns_borrow" "(" ParamRef ")"
                   | "returns_static" | "released_by" "(" QualifiedName ")"
                   | "resource" "(" "released_by" ":" QualifiedName ")"
                   | "leak" | "kills" "(" ParamRef ")"
                   | "invalidates" "(" ParamRef ")" | "noescape" "(" ParamRef ")"
                   | "escapes" "(" ParamRef ")" | "reads" "(" ParamRef ")"
                   | "writes" "(" ParamRef ")" | "unknown"
ParamRef         ::= Ident | "arg" "(" Integer ")"
MemoryOverlay    ::= "#memory" QualifiedName "{"
                     MemoryEffect {"," MemoryEffect} [","] "}" [";"]
InlineAsmStmt    ::= "#asm" (LegacyAsm | StructuredAsm) [";"]
LegacyAsm        ::= (Expr | MultilineString)
                     [":" [LegacyAsmOperand {"," LegacyAsmOperand}]
                      [":" [LegacyAsmOperand {"," LegacyAsmOperand}]
                       [":" [String {"," String}]]]]
LegacyAsmOperand ::= ("in" | "out" | "inout") "(" String "," (Expr | Ident) ")"
StructuredAsm    ::= "{" MultilineString {AsmOperand} [ClobberClause] "}"
AsmOperand       ::= Ident ":" ("in" | "out" | "inout") "(" AsmConstraint
                     ["," ".Early_Clobber"] ")" ["=" (Expr | Ident)] ";"
AsmConstraint    ::= ".Register" | ".Byte_Register" | ".Floating_Register"
                   | ".Vector_Register" | ".Predicate_Register" | ".Memory"
                   | ".Immediate" | ".Constant" | ".Address"
                   | ".Register_Or_Memory" | ".Register_Or_Immediate"
                   | ".Register_Memory_Or_Immediate" | ".Any" | "fixed" "(" Ident ")"
ClobberClause    ::= "clobber" ":" AsmClobber {"," AsmClobber} ";"
AsmClobber       ::= Ident | ".Memory" | ".Condition_Codes"`,
  },
] as const;

const directiveDetails: Record<string, string[]> = {
  "#Context": [
    "Valid in a type position and resolves to the compiler's current Context struct type.",
    "Ordinary functions receive context implicitly; #c_call and #no_context functions do not.",
  ],
  "#aos": [
    "Applies only to an array type. It explicitly selects the normal array-of-structs layout.",
    "It is the counterpart of #soa and does not add allocation or ownership by itself.",
  ],
  "#as": [
    "The marked struct field remains stored and becomes the one implicit coercion field used when its type is expected.",
    "The current struct representation stores one effective conversion-field name; use one unambiguous #as field.",
  ],
  "#asm": [
    "The structured form uses raw instruction lines, named in/out/inout operands, optional fixed registers, and one clobber clause.",
    "Templates and constraints are target-specific. The legacy colon-separated form remains accepted.",
  ],
  "#bytes": [
    "The operand must be compile-time byte data suitable for direct insertion into the selected target's instruction stream.",
    "Use only inside a narrow OUT.cpu/OUT.os gate; invalid bytes are not made portable by the directive.",
  ],
  "#c_call": [
    "On a function definition or function-pointer type, selects the C ABI and removes the implicit Glosso context parameter.",
    "On a struct, enables recursive C-ABI representation validation for by-value use.",
  ],
  "#char": [
    "The lexer requires exactly one Unicode scalar or supported escape inside the string spelling.",
    "ASCII may infer as u8, s8, or u32; non-ASCII may infer only as u32.",
  ],
  "#code": [
    "Produces a compile-time Code syntax tree; it does not execute the enclosed statements immediately.",
    "Ordinary generated bindings are hygienic, single-backtick names are non-hygienic, and double-backtick names splice compile-time syntax/name values.",
  ],
  "#compile_error": [
    "The expression must evaluate to a string during compilation.",
    "Only a selected/evaluated branch triggers the diagnostic, so it can guard unsupported specializations and targets.",
  ],
  "#comptime": [
    "As an expression/block, runs through the compiler VM and returns a compile-time value; runtime-only values are unavailable.",
    "On a parameter, requires a compile-time argument, adds it to specialization identity, and erases it from the runtime call.",
  ],
  "#derive": [
    "On an aggregate, invokes named derive expansion with structural type information and inserts the generated instances.",
    "On a typeclass, records the declared derive mechanism. The parser does not accept #derive directly on an instance declaration; generated instances still undergo ordinary coherence and minimal-method checks.",
  ],
  "#disable": [
    "The implemented feature is private_section (private_sections is an accepted plural spelling).",
    "Disabling it changes visibility of following declarations back to public; the region is stateful rather than brace-delimited.",
  ],
  "#dump": [
    "Prints the function's lowered typed IR while compiling.",
    "It is diagnostic output only and does not change function semantics.",
  ],
  "#empty": [
    "An empty field or parameter carries type/specialization evidence but is omitted from ordinary runtime storage/calling parameters.",
    "Several types may follow one #empty marker, separated by commas.",
  ],
  "#enable": [
    "#enable(private_section) makes following declarations source-private; add siblings to share them within one logical multi-file module.",
    "The parser rejects unknown feature names or modes.",
  ],
  "#expand": [
    "Marks a compile-time expansion procedure whose call substitutes arguments and inserts generated code at the call site.",
    "#expand,expression requires a body containing exactly one return expression and permits the call in expression position.",
  ],
  "#falling": [
    "Without this marker, a switch case does not continue into the next case body.",
    "The marker belongs inside a case body and sets that case's explicit fallthrough flag.",
  ],
  "#fn_ptr": [
    "Parameters require names and types; omitting -> Type means void. noalias and C ellipsis are retained in compatibility.",
    "#c_call is represented in the pointer type. The parser currently accepts #no_context here but does not retain it as a distinct pointer-type bit.",
  ],
  "#foreign": [
    "Accepts either a declared #library handle or a direct library string, followed by an optional external symbol string.",
    "The declaration has no Glosso body, uses the C ABI, and defaults the symbol to the Glosso function name.",
  ],
  "#if": [
    "Evaluates its condition at compile time and checks/emits only the selected body for that specialization.",
    "An unselected body must parse, but its target-specific names do not need to typecheck for the selected target.",
  ],
  "#import": [
    "Without an alias, selected public names enter the current namespace; with Alias :: they are reached through Alias.name.",
    "only(...) keeps named public declarations and hide(...) removes them. Unknown, duplicate, or private names are errors.",
  ],
  "#inline": [
    "On a function, bare #inline is a hint; #inline,always and #inline,never request the explicit mode.",
    "Before while/for, #inline requests compile-time loop expansion rather than ordinary machine-code function inlining.",
  ],
  "#insert": [
    "Accepts Code or string source. Code is cloned hygienically; strings are parsed and cached by content.",
    "A top-level insertion must yield top-level declarations, while a body insertion must yield syntax valid at that body site.",
  ],
  "#library": [
    "Default/static/system libraries become target-specific linker inputs only when a reachable foreign call/reference uses them.",
    "system currently uses the same linker name conversion/search as the default. dyn uses LoadLibraryA or dlopen/dlsym at runtime and is unavailable on wasm/WASI.",
  ],
  "#load": [
    "Loads a concrete source path into the logical module; unlike #import, it is file-oriented rather than public-module selection.",
    "Relative paths are resolved by the source-tree loader from the loading source/module context.",
  ],
  "#magic": [
    "Binds the declaration to a compiler-known intrinsic/service string and normally omits a Glosso body.",
    "Unknown magic names or signatures are not a user extension mechanism; they must match compiler implementation support.",
  ],
  "#meaningful": [
    "Returns bool after typechecking a cloned expression/block in the current compile-time generic environment.",
    "The probed runtime operation is not emitted or executed; lookup, coercion, and constraints are still checked.",
  ],
  "#memory": [
    "May annotate a function/call/binding or overlay a qualified declaration with effects such as returns_fresh, reads, writes, noescape, escapes, kills, and invalidates.",
    "Effects are consumed by temporal checking; they do not generate allocation or release code themselves.",
  ],
  "#minimal": [
    "Names the method combinations an instance must implement when typeclass defaults do not define one mandatory set.",
    "Comma is conjunction and | is an alternative; #minimal() explicitly requires no methods.",
  ],
  "#modify": [
    "Runs declaration-modification logic during specialization/checking before where constraints and body selection.",
    "A false/failed modification makes the candidate inapplicable and can contribute a focused constraint diagnostic.",
  ],
  "#must": [
    "A call result may not be silently discarded as an expression statement.",
    "Bind it, return it, consume it in another expression, or write `_ := call();` to acknowledge an intentional discard.",
  ],
  "#no_context": [
    "On a function definition, removes implicit context passing and makes `context` access a compile error.",
    "Current limitation: the named #fn_ptr parser accepts the marker but its pointer type does not retain a separate no-context identity.",
  ],
  "#noreturn": [
    "The checker rejects explicit returns and any body path that can fall through normally.",
    "Call sites treat a resolved noreturn call as terminating for reachability/control-flow analysis.",
  ],
  "#operator": [
    "Belongs on an operation typeclass method. prefix/suffix take no numeric precedence; left/right/assign binary forms require one.",
    "Instance implementations inherit the declared syntax and normally omit the directive.",
  ],
  "#partial": [
    "May modify only the `if subject == { ... }` switch forms, including pattern switches.",
    "It permits a tagged-union or pattern switch to omit complete coverage/else; ordinary if rejects it.",
  ],
  "#pattern": [
    "Direct tests use `#pattern pattern = value`; grouped tests combine several arms and introduce captures only on success.",
    "Pattern switches use `if #pattern [subject] == { case pattern; ... }`; do not repeat #pattern after case.",
  ],
  "#precedence": [
    "Declares operator position/associativity/level without separately marking it as a new operator owner.",
    "Binary levels are non-negative and larger numbers bind more tightly; same-level operators must agree on associativity.",
  ],
  "#push_allocator": [
    "Saves `context.allocator`, installs the supplied Allocator, and schedules restoration at the enclosing defer-scope exit.",
    "It changes the current general allocator field—not `context.temp_allocator` itself.",
  ],
  "#push_context": [
    "With no expression, pushes a copy/current context for the following statement or block; with an expression, installs that Context value.",
    "The previous context is restored through defer machinery on normal and structured early exits.",
  ],
  "#raw": [
    "Removes the active tag from a union and overlays all member storage.",
    "Raw unions cannot be used as tagged-switch subjects; active-member validity is entirely the program/external format's responsibility.",
  ],
  "#returns_twice": [
    "Marks lowered function metadata and the emitted LLVM function with returns-twice semantics.",
    "Use only for control-transfer primitives whose external contract can resume a call site more than once.",
  ],
  "#simd": [
    "Creates a SIMD-typed vector literal rather than an ordinary fixed-array literal.",
    "The expected Simd element/count type determines lane validation; SIMD has no portable by-value C ABI in Glosso.",
  ],
  "#soa": [
    "Applies only to array types of suitable struct elements and stores one backing array per field.",
    "Dynamic arrays and views are supported; fixed #soa arrays are rejected.",
  ],
  "#string": [
    "Consumes consecutive raw source lines introduced by `\\` and joins them with newline characters.",
    "It is useful for generated source/templates when ordinary quoted escapes would obscure the content.",
  ],
  "#thread_local": [
    "May prefix only a top-level mutable global variable declaration.",
    "Each runtime thread receives separate storage according to the selected backend/target TLS model.",
  ],
  "#try": [
    "Contains exactly one expression—statements, semicolons, and return are not allowed inside the braces.",
    "It creates a local Try boundary: successful output is wrapped with from_output and a propagated residual exits to the boundary result.",
  ],
  "#undefined": [
    "Has no standalone runtime type. The declaration, call, return, or aggregate context supplies the expected concrete type.",
    "Lowering treats the storage as deliberately uninitialized; reading it before a valid write is not made safe by the directive.",
  ],
};

const directiveDocs: DirectiveDoc[] = [
  ["#Context", "type", "#Context", "Names the built-in context type."],
  ["#aos", "type", "#aos ArrayType", "Selects array-of-structures layout."],
  ["#as", "struct field", "#as [using] name: Type;", "Marks the conversion field for an aggregate."],
  ["#asm", "statement", "#asm [options] (template, operands...);", "Emits inline assembly, including the structured form."],
  ["#bytes", "statement", "#bytes expression;", "Injects literal bytes into generated code."],
  ["#c_call", "function/type", "#c_call", "Uses the C calling convention."],
  ["#char", "literal", "#char \"x\"", "Creates a character integer literal."],
  ["#code", "expression", "#code { statements }", "Captures syntax as a Code value."],
  ["#compile_error", "statement", "#compile_error expression;", "Raises a compile-time diagnostic."],
  ["#comptime", "declaration/expression/parameter", "#comptime [-> Type] { ... }", "Evaluates code at compile time; also marks erased parameters."],
  ["#derive", "aggregate/typeclass", "#derive(Name, ...)", "Requests generated implementations or typeclass derivation."],
  ["#disable", "top level", "#disable(feature[, mode]);", "Disables a parser feature such as a private section."],
  ["#dump", "function", "#dump", "Requests compiler diagnostic output for a function."],
  ["#empty", "field/parameter", "#empty: Type, ...", "Adds an erased field or parameter."],
  ["#enable", "top level", "#enable(feature[, mode]);", "Enables a parser feature such as a private section."],
  ["#expand", "function", "#expand[,expression]", "Declares a compile-time expansion procedure."],
  ["#falling", "case arm", "#falling;", "Allows a switch case to fall through."],
  ["#fn_ptr", "declaration", "Name :: #fn_ptr(params) -> Type;", "Declares a named function-pointer type."],
  ["#foreign", "function", "#foreign Library [\"symbol\"]", "Declares an external function reference."],
  ["#if", "statement", "#if condition statement [else statement]", "Selects code statically at compile time."],
  ["#import", "top level", "[Alias ::] #import[,only|hide (...)] \"Module\";", "Imports a standard or project module."],
  ["#inline", "function/loop", "#inline[,always|never]", "Controls inlining or requests compile-time loop expansion."],
  ["#insert", "statement/top level", "#insert code_expression;", "Splices generated Code or source into the program."],
  ["#library", "declaration", "Name :: #library[,system|dyn|static] \"path\";", "Declares a native library dependency."],
  ["#load", "top level", "[Alias ::] #load \"path.glo\";", "Loads a concrete source file."],
  ["#magic", "aggregate/function", "#magic \"compiler_name\"", "Binds a declaration to compiler-provided behavior."],
  ["#meaningful", "expression", "#meaningful expression", "Tests at compile time whether an expression or block typechecks."],
  ["#memory", "function/call/binding/overlay", "#memory effect | #memory(effect, ...)", "Declares temporal memory effects."],
  ["#minimal", "typeclass", "#minimal(method_a | method_b, ...)", "States the minimal complete method definition."],
  ["#modify", "aggregate/function", "#modify expression | #modify { ... }", "Rewrites a declaration through compile-time code."],
  ["#must", "function", "#must", "Marks a result as requiring use."],
  ["#no_context", "function/function pointer", "#no_context", "Omits the implicit Glosso context parameter."],
  ["#noreturn", "function", "#noreturn", "Declares that a function cannot return normally."],
  ["#operator", "function", "#operator(mode[, precedence])", "Declares prefix, suffix, binary, or assignment operator behavior."],
  ["#partial", "switch", "if #partial subject == { ... }", "Allows a switch to omit otherwise required coverage."],
  ["#pattern", "expression/switch", "#pattern [value] { ... }", "Introduces structural pattern testing."],
  ["#precedence", "function", "#precedence(mode, level)", "Assigns precedence to an operator declaration."],
  ["#push_allocator", "statement", "#push_allocator(allocator);", "Temporarily replaces context.allocator until scope exit."],
  ["#push_context", "statement", "#push_context [context] statement", "Runs a statement with a pushed context."],
  ["#raw", "union", "union #raw { ... }", "Selects an untagged union representation."],
  ["#returns_twice", "function", "#returns_twice", "Marks a function with returns-twice control-flow behavior."],
  ["#simd", "literal", "#simd .[values]", "Creates a SIMD literal."],
  ["#soa", "type", "#soa ArrayType", "Selects structure-of-arrays layout."],
  ["#string", "literal", "#string \\\\multiline", "Collects multiline-string source lines."],
  ["#thread_local", "top level", "#thread_local GlobalDecl", "Declares thread-local storage."],
  ["#try", "expression", "#try { expression }", "Evaluates one fallible expression with propagation semantics."],
  ["#undefined", "literal", "#undefined", "Creates a contextually typed uninitialized value."],
].map(([name, site, syntax, summary]) => ({ name, site, syntax, summary, details: directiveDetails[name] ?? [] }));

function extractKeywords(): string[] {
  const lexer = read(resolve(repoRoot, "src", "lexer.rs"));
  const block = lexer.match(/fn word_kind\(word: &str\)[\s\S]*?\n}\n/)?.[0] ?? "";
  return [...block.matchAll(/"([A-Za-z_]+)"\s*=>\s*TokenKind::/g)].map((match) => match[1]);
}

function listFiles(directory: string, extension: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = resolve(directory, entry);
    if (statSync(path).isDirectory()) files.push(...listFiles(path, extension));
    else if (path.endsWith(extension)) files.push(path);
  }
  return files.sort();
}

function buildStdOperatorPrecedenceBlocks(): DocBlock[] {
  type OperatorEntry = { operator: string; mode: "left" | "right" | "assign" | "prefix" | "suffix"; precedence?: number };
  const entries: OperatorEntry[] = [];
  const declaration = /'([^'\r\n]+)'\s*::[^;{]*?#operator\(\s*(left|right|assign|prefix|suffix)(?:\s*,\s*(-?\d+))?\s*\)/g;

  for (const path of listFiles(resolve(repoRoot, "std"), ".glo")) {
    for (const match of read(path).matchAll(declaration)) {
      entries.push({
        operator: match[1],
        mode: match[2] as OperatorEntry["mode"],
        precedence: match[3] === undefined ? undefined : Number(match[3]),
      });
    }
  }

  const binaryByPrecedence = new Map<number, { operators: Set<string>; mode: OperatorEntry["mode"] }>();
  const prefix = new Set<string>();
  const suffix = new Set<string>();
  for (const entry of entries) {
    if (entry.mode === "prefix") prefix.add(entry.operator);
    else if (entry.mode === "suffix") suffix.add(entry.operator);
    else if (entry.precedence !== undefined) {
      const group = binaryByPrecedence.get(entry.precedence) ?? { operators: new Set<string>(), mode: entry.mode };
      group.operators.add(entry.operator);
      binaryByPrecedence.set(entry.precedence, group);
    }
  }

  if (!binaryByPrecedence.size) throw new Error("No standard-library operator precedences were discovered.");
  const binaryRows = [...binaryByPrecedence.entries()]
    .sort(([left], [right]) => right - left)
    .map(([precedence, group]) => [
      String(precedence),
      [...group.operators].map((operator) => `\`${operator}\``).join(", "),
      group.mode === "assign" ? "Right (assignment)" : group.mode === "right" ? "Right" : "Left",
    ]);

  return [
    { kind: "heading", text: "Rules for defining custom operators" },
    {
      kind: "paragraph",
      text: "A custom operator is an operation typeclass method, not a specially named free function. Declare the syntax once on the owning typeclass, then provide implementations in instances for concrete or generic operand types. The instance method normally omits `#operator` because it inherits the operator's syntax from the typeclass declaration, as in the example above.",
    },
    {
      kind: "list",
      items: [
        "Write the method name as a quoted operator token, such as `'%%'`. Usable punctuation tokens are composed from `+ - * / < > ! @ % ^ & | ~ ? . , : =`; `#` begins a directive and is not an operator character.",
        "A unary operator has one operand and uses `#operator(prefix)` or `#operator(suffix)`. Prefix and suffix declarations do not take a numeric precedence.",
        "A binary operator has two operands and must use `#operator(left, n)`, `#operator(right, n)`, or `#operator(assign, n)`. The non-negative integer `n` is its precedence: larger values bind more tightly.",
        "`left` groups repeated operators from the left, `right` groups them from the right, and `assign` is right-associative assignment syntax. An assignment operator must return a value coercible to the left operand type.",
        "Exactly one visible typeclass may own a given operator with the same arity and fixity. Instances specialize that owner; two equally specific implementations for the same operand tuple are ambiguous.",
        "Every declaration of the same binary token must agree on precedence and associativity. If different operators share a precedence but use different associativity, an unparenthesized chain is rejected as ambiguous.",
        "The tokens `=`, `.`, `,`, `,,`, `:=`, `::`, `:`, `->`, `::=`, `.*`, and `...`, plus the single- and double-backtick name markers, are reserved and cannot be overloaded. A custom token cannot end in `.` except for `..`.",
        "Square brackets are reserved for the special operations `[]` and `[]=`. `[]` has exactly two parameters, `[]=` has exactly three, and neither declares ordinary operator precedence.",
        "An all-star unary token such as `**` cannot be prefix because leading stars are pointer syntax; if unary, it must be suffix. The same token may still be a normal binary operator.",
      ],
    },
    { kind: "heading", text: "Predefined standard-library precedence" },
    {
      kind: "paragraph",
      text: "The standard library declares the following binary precedence levels. Higher numbers bind more tightly. Operators at the same level share associativity; assignment operators are right-associative.",
    },
    { kind: "table", columns: ["Precedence", "Operators", "Associativity"], rows: binaryRows },
    {
      kind: "paragraph",
      text: "Prefix and suffix operators are positional and do not carry a numeric precedence. They bind as part of prefix and postfix expression parsing.",
    },
    {
      kind: "table",
      columns: ["Position", "Operators"],
      rows: [
        ["Prefix", [...prefix].map((operator) => `\`${operator}\``).join(", ")],
        ["Suffix", [...suffix].map((operator) => `\`${operator}\``).join(", ")],
      ],
    },
  ];
}

function moduleNameFor(path: string): string {
  let name = relative(resolve(repoRoot, "std"), path).split(sep).join("/").replace(/\.glo$/, "");
  if (name.endsWith("/module")) name = name.slice(0, -7);
  return name;
}

function stripLineComment(line: string): string {
  let quote = "";
  for (let index = 0; index < line.length - 1; index += 1) {
    const char = line[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "/" && line[index + 1] === "/") return line.slice(0, index);
  }
  return line;
}

function braceDelta(line: string): number {
  let delta = 0;
  let quote = "";
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "{") delta += 1;
    else if (char === "}") delta -= 1;
  }
  return delta;
}

function matchingParen(text: string, open: number): number {
  let depth = 0;
  let quote = "";
  for (let index = open; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "(") depth += 1;
    else if (char === ")" && --depth === 0) return index;
  }
  return -1;
}

function splitTopLevel(text: string, delimiter = ","): string[] {
  const result: string[] = [];
  let start = 0;
  let round = 0;
  let square = 0;
  let brace = 0;
  let quote = "";
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "(") round += 1;
    else if (char === ")") round -= 1;
    else if (char === "[") square += 1;
    else if (char === "]") square -= 1;
    else if (char === "{") brace += 1;
    else if (char === "}") brace -= 1;
    else if (char === delimiter && round === 0 && square === 0 && brace === 0) {
      result.push(text.slice(start, index));
      start = index + 1;
    }
  }
  result.push(text.slice(start));
  return result.map((part) => part.trim()).filter(Boolean);
}

function topLevelIndex(text: string, needle: string): number {
  let round = 0;
  let square = 0;
  for (let index = 0; index <= text.length - needle.length; index += 1) {
    const char = text[index];
    if (char === "(") round += 1;
    else if (char === ")") round -= 1;
    else if (char === "[") square += 1;
    else if (char === "]") square -= 1;
    else if (round === 0 && square === 0 && text.startsWith(needle, index)) return index;
  }
  return -1;
}

function parameterType(parameter: string): string {
  let value = parameter.replace(/^(?:using|noalias)\s+/, "").replace(/^#(?:comptime|empty)\s*/, "").trim();
  const equals = topLevelIndex(value, "=");
  if (equals >= 0) value = value.slice(0, equals).trim();
  const colon = topLevelIndex(value, ":");
  if (colon >= 0) value = value.slice(colon + 1).trim();
  return value || "any";
}

function documentedParameter(parameter: string): StdParameter {
  let value = parameter.trim();
  const modifiers: string[] = [];
  while (/^(?:using|noalias)\s+/.test(value)) {
    const modifier = value.match(/^(using|noalias)\s+/)?.[1];
    if (!modifier) break;
    modifiers.push(modifier);
    value = value.slice(modifier.length).trim();
  }

  const equals = topLevelIndex(value, "=");
  const defaultValue = equals >= 0 ? value.slice(equals + 1).trim() : undefined;
  if (equals >= 0) value = value.slice(0, equals).trim();

  if (value === "...") {
    return { name: "…", type: "any", modifiers: [...modifiers, "C variadic"] };
  }

  const colon = topLevelIndex(value, ":");
  let name = colon >= 0 ? value.slice(0, colon).trim() : value;
  let type = colon >= 0 ? value.slice(colon + 1).trim() : "any";
  const special = name.match(/^#(comptime|empty)$/);
  if (special) modifiers.push(special[1] === "empty" ? "empty type witness" : "compile-time");
  if (type.startsWith("...")) {
    modifiers.push("variadic");
    type = type.slice(3).trim() || "any";
  }
  if (!name) name = "—";
  return { name, type: type || "any", defaultValue, modifiers };
}

function returnTypeFromTail(tail: string): string {
  const arrow = tail.match(/->\s*([\s\S]+)/);
  if (!arrow) return "void";
  return arrow[1]
    .replace(/\s+#(?:memory|operator|precedence|expand|magic|foreign|c_call|no_context|noreturn|returns_twice|dump|must|inline|modify)\b[\s\S]*$/, "")
    .replace(/\s+where\b[\s\S]*$/, "")
    .trim() || "void";
}

function documentedMemoryContract(raw: string): StdMemoryContract | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  const open = value.indexOf("(");
  if (open < 0 || !value.endsWith(")")) return { effect: value, arguments: [] };
  return {
    effect: value.slice(0, open).trim(),
    arguments: splitTopLevel(value.slice(open + 1, -1)),
  };
}

function memoryContractsFromTail(tail: string): StdMemoryContract[] {
  const contracts: StdMemoryContract[] = [];
  let offset = 0;
  while (offset < tail.length) {
    const marker = tail.indexOf("#memory", offset);
    if (marker < 0) break;
    let cursor = marker + "#memory".length;
    while (/\s/.test(tail[cursor] ?? "")) cursor += 1;
    let raw = "";
    if (tail[cursor] === "(") {
      const close = matchingParen(tail, cursor);
      if (close < 0) break;
      raw = tail.slice(cursor + 1, close);
      offset = close + 1;
    } else {
      raw = tail.slice(cursor).match(/^[^\s;{]+/)?.[0] ?? "";
      offset = cursor + raw.length;
    }
    for (const part of splitTopLevel(raw)) {
      const contract = documentedMemoryContract(part);
      if (contract) contracts.push(contract);
    }
    if (!raw) break;
  }
  return contracts;
}

function documentedFunction(parameters: string, tail: string): StdFunctionInfo {
  return {
    parameters: splitTopLevel(parameters).map(documentedParameter),
    returnType: returnTypeFromTail(tail),
    memoryContracts: memoryContractsFromTail(tail),
  };
}

function searchableSignature(parameters: string, tail: string): string {
  const inputs = splitTopLevel(parameters)
    .filter((parameter) => !/^#(?:comptime|empty)\b/.test(parameter.trim()))
    .map(parameterType);
  return `(${inputs.join(", ")}) -> ${returnTypeFromTail(tail)}`;
}

function leadingSummary(lines: string[]): string {
  const comments: string[] = [];
  for (const line of lines) {
    const match = line.trim().match(/^\/\/\s?(.*)$/);
    if (!match) break;
    if (match[1]) comments.push(match[1]);
  }
  return comments.join(" ").replace(/\s+/g, " ").trim();
}

function declarationSummary(lines: string[], line: number): string {
  const comments: string[] = [];
  for (const candidate of lines.slice(Math.max(0, line - 5), line - 1).reverse()) {
    const comment = candidate.trim().match(/^\/\/\s?(.*)$/);
    if (!comment) {
      if (candidate.trim()) break;
      continue;
    }
    comments.unshift(comment[1]);
  }
  return comments.join(" ").replace(/\s+/g, " ").trim();
}

function extractTypeclassMinimal(text: string, start: number): { value: string; explicit: boolean } {
  const bodyOpen = text.indexOf("{", start);
  if (bodyOpen < 0) return { value: "", explicit: false };
  const header = text.slice(start, bodyOpen);
  const directive = header.search(/#minimal\s*\(/);
  if (directive < 0) return { value: "", explicit: false };
  const open = start + directive + header.slice(directive).indexOf("(");
  const close = matchingParen(text, open);
  if (close < 0 || close > bodyOpen) return { value: "", explicit: false };
  return {
    value: text.slice(open + 1, close).replace(/\s+/g, " ").trim(),
    explicit: true,
  };
}

function parseStdFile(path: string): StdModule {
  const sourcePath = relative(repoRoot, path).split(sep).join("/");
  const module = moduleNameFor(path);
  const rawLines = read(path).split("\n");
  const summary = leadingSummary(rawLines).replace(/^std\/[^ ]+\s*-\s*/, "");
  let isPrivate = false;
  const visibleLines = rawLines.map((line) => {
    if (/^\s*#enable\(private_sections?(?:,siblings)?\)/.test(line)) {
      isPrivate = true;
      return "";
    }
    if (/^\s*#disable\(private_sections?\)/.test(line)) {
      isPrivate = false;
      return "";
    }
    return isPrivate ? "" : stripLineComment(line);
  });
  const text = visibleLines.join("\n");
  const typeclassMethodContexts = new Map<number, { owner: string; constraint: string }>();
  const associatedTypeContexts = new Map<number, { owner: string; name: string; annotation: string }>();
  const lineDepths: number[] = [];
  let depth = 0;
  let typeclassDepth = -1;
  let pendingTypeclass = false;
  let typeclassName = "";
  let typeclassContext = "";
  for (let index = 0; index < visibleLines.length; index += 1) {
    const line = visibleLines[index];
    lineDepths.push(depth);
    if (typeclassDepth >= 0 && depth === typeclassDepth && /^[ \t]+[^\s].*::\s*\(/.test(line)) {
      typeclassMethodContexts.set(index + 1, { owner: typeclassName, constraint: typeclassContext });
    } else if (typeclassDepth >= 0 && depth === typeclassDepth) {
      const associated = line.match(/^[ \t]+([\p{L}_][\p{L}\p{N}_]*)\s*::\s*([^;]+);/u);
      if (associated) {
        associatedTypeContexts.set(index + 1, {
          owner: typeclassName,
          name: associated[1],
          annotation: associated[2].trim(),
        });
      }
    }
    const startsTypeclass = depth === 0 && /::\s*typeclass\b/.test(line);
    if (startsTypeclass) {
      pendingTypeclass = true;
      const header = line.match(/^([\p{L}_][\p{L}\p{N}_]*)\s*::\s*typeclass\s*\(([^)]*)\)/u);
      if (header) {
        const parameters = splitTopLevel(header[2]).map((parameter) => parameter.split(":")[0].trim());
        typeclassName = header[1];
        typeclassContext = `${header[1]}(${parameters.join(", ")})`;
      }
    }
    const opensTypeclassBody = pendingTypeclass && line.includes("{");
    depth += braceDelta(line);
    if (opensTypeclassBody) {
      pendingTypeclass = false;
      if (depth > 0) {
        typeclassDepth = depth;
      } else {
        typeclassName = "";
        typeclassContext = "";
      }
    }
    if (typeclassDepth >= 0 && depth < typeclassDepth) {
      typeclassDepth = -1;
      pendingTypeclass = false;
      typeclassName = "";
      typeclassContext = "";
    }
  }
  const symbols: StdSymbol[] = [];
  const occupied = new Set<number>();
  const functionPattern = /^([ \t]*)([\p{L}_][\p{L}\p{N}_]*|'[^'\n]+')\s*::\s*(\()/gmu;
  for (const match of text.matchAll(functionPattern)) {
    const start = match.index ?? 0;
    const open = start + match[0].lastIndexOf("(");
    const close = matchingParen(text, open);
    if (close < 0) continue;
    const line = text.slice(0, start).split("\n").length;
    if (match[1].length > 0 && !typeclassMethodContexts.has(line)) continue;
    const lineEnd = text.indexOf("\n", close);
    const scanEnd = lineEnd < 0 ? text.length : Math.min(text.length, lineEnd + 4000);
    const remainder = text.slice(close + 1, scanEnd);
    const terminator = remainder.search(/[;{]/);
    const tail = (terminator >= 0 ? remainder.slice(0, terminator) : remainder.split("\n")[0]).replace(/\s+/g, " ").trim();
    const parameters = text.slice(open + 1, close).replace(/\s+/g, " ").trim();
    const name = match[2].replace(/^'|'$/g, "");
    const methodContext = typeclassMethodContexts.get(line);
    const documentedTail = methodContext && !/\bwhere\b/.test(tail)
      ? `${tail} where ${methodContext.constraint}`.trim()
      : tail;
    const signature = `${match[2]} :: (${parameters})${documentedTail ? ` ${documentedTail}` : ""}`;
    symbols.push({
      id: `${slugify(module)}-${slugify(name)}-${line}`,
      name,
      module,
      kind: match[1].length > 0 ? "method" : "function",
      signature,
      searchableSignature: searchableSignature(parameters, tail),
      summary: declarationSummary(rawLines, line),
      sourcePath,
      sourceLine: line,
      ownerTypeclass: methodContext?.owner,
      hasDefault: methodContext
        ? remainder[terminator] === "{" || /#magic\b/.test(tail)
        : undefined,
      function: documentedFunction(parameters, tail),
    });
    occupied.add(line);
  }

  const declarationPattern = /^([\p{L}_][\p{L}\p{N}_]*)\s*::\s*([^\n]+)/gmu;
  for (const match of text.matchAll(declarationPattern)) {
    const line = text.slice(0, match.index ?? 0).split("\n").length;
    if (occupied.has(line) || /\binstance\b/.test(match[2])) continue;
    const name = match[1];
    const definition = match[2].trim();
    const kind: StdSymbol["kind"] = /^typeclass\b/.test(definition)
      ? "typeclass"
      : /^(?:struct|union|enum\b|enum_flags\b|#fn_ptr\b)/.test(definition)
        ? "type"
        : "constant";
    const minimal = kind === "typeclass"
      ? extractTypeclassMinimal(text, match.index ?? 0)
      : undefined;
    symbols.push({
      id: `${slugify(module)}-${slugify(name)}-${line}`,
      name,
      module,
      kind,
      signature: `${name} :: ${definition.replace(/[;{].*$/, "").trim()}`,
      searchableSignature: "",
      summary: declarationSummary(rawLines, line),
      sourcePath,
      sourceLine: line,
      typeclass: minimal ? { minimal: minimal.value, minimalExplicit: minimal.explicit, members: [] } : undefined,
    });
  }


  const associatedMembers: StdTypeclassMember[] = [...associatedTypeContexts.entries()].map(
    ([line, associated]) => ({
      id: `${slugify(module)}-${slugify(associated.owner)}-${slugify(associated.name)}-${line}`,
      name: associated.name,
      kind: "associated-type",
      signature: `${associated.name} :: ${associated.annotation}`,
      summary: declarationSummary(rawLines, line),
      sourcePath,
      sourceLine: line,
      hasDefault: false,
    }),
  );

  for (const typeclass of symbols.filter((symbol) => symbol.kind === "typeclass")) {
    const methods: StdTypeclassMember[] = symbols
      .filter((symbol) => symbol.kind === "method" && symbol.ownerTypeclass === typeclass.name)
      .map((method) => ({
        id: method.id,
        name: method.name,
        kind: "method",
        signature: method.signature,
        summary: method.summary,
        sourcePath: method.sourcePath,
        sourceLine: method.sourceLine,
        hasDefault: Boolean(method.hasDefault),
        function: method.function,
      }));
    const members = [...methods, ...associatedMembers.filter((member) => associatedTypeContexts.get(member.sourceLine)?.owner === typeclass.name)]
      .sort((left, right) => left.sourceLine - right.sourceLine);
    if (!typeclass.typeclass) continue;
    typeclass.typeclass.members = members;
    if (!typeclass.typeclass.minimalExplicit) {
      typeclass.typeclass.minimal = methods
        .filter((method) => !method.hasDefault)
        .map((method) => method.signature.startsWith("'") ? `'${method.name}'` : method.name)
        .join(", ");
    }
  }

  const instances: StdInstance[] = [];
  const instancePattern = /^([^\s`][^\n]*?)\s*::\s*instance\s+(!\s*)?([\p{L}_][\p{L}\p{N}_]*)/gmu;
  for (const match of text.matchAll(instancePattern)) {
    const start = match.index ?? 0;
    const line = text.slice(0, start).split("\n").length;
    if (lineDepths[line - 1] !== 0) continue;
    const bodyOpen = text.indexOf("{", start);
    if (bodyOpen < 0) continue;
    const signature = text.slice(start, bodyOpen).replace(/\s+/g, " ").trim();
    instances.push({
      id: `${slugify(module)}-${slugify(match[3])}-${slugify(match[1])}-${line}`,
      typeclass: match[3],
      head: match[1].trim(),
      module,
      signature,
      summary: declarationSummary(rawLines, line),
      sourcePath,
      sourceLine: line,
      negative: Boolean(match[2]),
    });
  }
  symbols.sort((left, right) => left.sourceLine - right.sourceLine);
  return {
    id: slugify(module),
    name: module,
    summary: summary || `Public declarations from ${sourcePath}.`,
    sourcePath,
    symbols,
    instances: instances.sort((left, right) => left.sourceLine - right.sourceLine),
  };
}

function buildModules(): StdModule[] {
  const files = listFiles(resolve(repoRoot, "std"), ".glo");
  const byName = new Map<string, StdModule>();
  for (const file of files) {
    const next = parseStdFile(file);
    const previous = byName.get(next.name);
    if (!previous) byName.set(next.name, next);
    else {
      previous.symbols.push(...next.symbols);
      previous.instances.push(...next.instances);
      if (next.sourcePath.endsWith("/module.glo")) {
        previous.summary = next.summary;
        previous.sourcePath = next.sourcePath;
      }
    }
  }
  return [...byName.values()]
    .map((module) => ({
      ...module,
      symbols: module.symbols.sort((a, b) => a.name.localeCompare(b.name)),
      instances: module.instances.sort((a, b) => a.sourceLine - b.sourceLine),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

const manualSections = parseManual();
const keywords = extractKeywords();
const modules = buildModules();
const symbols = modules.flatMap((module) => module.symbols);
const instances = modules.flatMap((module) => module.instances);
const metadata = {
  generatedAt: new Date().toISOString(),
  sourceManual: "docs/glosso-manual.typ",
  sourceLexer: "src/lexer.rs",
  sourceParser: "src/parser.rs",
  moduleCount: modules.length,
  sourceFileCount: listFiles(resolve(repoRoot, "std"), ".glo").length,
  symbolCount: symbols.length,
  instanceCount: instances.length,
};

const output = `/* This file is generated by scripts/generate-docs.ts. Do not edit. */
import type { DirectiveDoc, ManualSection, StdInstance, StdModule, StdSymbol } from "../types";

export const metadata = ${JSON.stringify(metadata, null, 2)} as const;
export const keywords = ${JSON.stringify(keywords, null, 2)} as readonly string[];
export const directives = ${JSON.stringify(directiveDocs, null, 2)} as DirectiveDoc[];
export const grammarGroups = ${JSON.stringify(grammarGroups, null, 2)} as readonly { title: string; grammar: string }[];
export const manualSections = ${JSON.stringify(manualSections, null, 2)} as ManualSection[];
export const stdModules = ${JSON.stringify(modules, null, 2)} as StdModule[];
export const stdSymbols = ${JSON.stringify(symbols, null, 2)} as StdSymbol[];
export const stdInstances = ${JSON.stringify(instances, null, 2)} as StdInstance[];
`;

writeFileSync(resolve(generatedDir, "docs.ts"), output, "utf8");
console.log(
  `Generated ${manualSections.length} manual chapters, ${directiveDocs.length} directives, ` +
    `${modules.length} modules, ${symbols.length} public symbols, and ${instances.length} instances.`,
);
