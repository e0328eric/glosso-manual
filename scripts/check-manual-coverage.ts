import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { directives, grammarGroups, keywords, manualSections } from "../src/generated/docs";
import { findGlossoSourceRoot } from "./glosso-source";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const manualDir = resolve(scriptDir, "..");
const repoRoot = findGlossoSourceRoot(manualDir);
const read = (path: string): string => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

const expectedKeywords = [
  "if", "ifx", "else", "while", "for", "return", "break", "continue", "struct", "union",
  "case", "enum", "using", "defer", "context", "cast", "acast", "where", "noalias",
];

const expectedDirectives = [
  "#Context", "#aos", "#as", "#asm", "#bytes", "#c_call", "#char", "#code",
  "#compile_error", "#comptime", "#derive", "#disable", "#dump", "#empty", "#enable",
  "#expand", "#falling", "#fn_ptr", "#foreign", "#if", "#import", "#inline", "#insert",
  "#library", "#load", "#magic", "#meaningful", "#memory", "#minimal", "#modify", "#must",
  "#no_context", "#noreturn", "#operator", "#partial", "#pattern", "#precedence",
  "#push_allocator", "#push_context", "#raw", "#returns_twice", "#simd", "#soa", "#string",
  "#thread_local", "#try", "#undefined",
];

// Every parser routine is mapped to the chapter or grammar group that documents
// its source surface. Adding a new parse_* routine makes this check fail until
// its manual coverage is chosen explicitly.
const parserFunctionCoverage: Record<string, string> = {
  parse_program: "grammar:Files, imports, and bindings",
  parse_feature_directive: "manual:visibility-and-private-sections",
  parse_type: "manual:type-syntax-and-type-values",
  parse_type_inner: "grammar:Types",
  parse_inline_aggregate_type: "manual:type-syntax-and-type-values",
  parse_aggregate_field_type: "manual:struct-declarations",
  parse_type_qualifiers: "manual:type-syntax-and-type-values",
  parse_parenthesized_type: "manual:tuple-types-and-values",
  parse_matrix_dimension: "manual:simd-and-matrix-values",
  parse_ptr_tail: "manual:single-pointers",
  parse_expr: "grammar:Expressions",
  parse_expr_with: "manual:operator-declarations",
  parse_unary: "grammar:Expressions",
  parse_postfix: "manual:member-access-calls-and-argument-expansion",
  parse_primary: "grammar:Expressions",
  parse_lambda: "manual:lambdas",
  parse_array_literal: "manual:aggregate-and-collection-literals",
  parse_struct_literal_fields: "manual:aggregate-and-collection-literals",
  parse_primary_inner: "grammar:Expressions",
  parse_block: "manual:blocks-and-scope",
  parse_block_or_single_stmt: "manual:statements-semicolons-and-nested-declarations",
  parse_stmt: "manual:statements-semicolons-and-nested-declarations",
  parse_stmt_inner: "grammar:Statements and control flow",
  parse_inline_asm: "manual:inline-assembly-and-bytes",
  parse_structured_inline_asm: "manual:inline-assembly-and-bytes",
  parse_structured_asm_constraint: "manual:inline-assembly-and-bytes",
  parse_multiline_string_literal: "manual:string-literals",
  parse_asm_operands: "manual:inline-assembly-and-bytes",
  parse_vardecl: "manual:values-constants-and-variables",
  parse_for: "manual:for",
  parse_static_if: "manual:static-if",
  parse_if: "manual:if-statements",
  parse_switch_cases: "manual:switch-cases",
  parse_pattern_switch_cases: "manual:pattern",
  parse_case_body: "manual:switch-cases",
  parse_comptime_block_after_directive: "manual:compile-time-constants-with-comptime",
  parse_pattern_test: "manual:pattern",
  parse_pattern_arm: "manual:pattern",
  parse_pattern_test_body: "manual:pattern",
  parse_pattern_expr: "manual:pattern",
  parse_pattern_postfix: "manual:pattern",
  parse_pattern_struct_fields: "manual:pattern",
  parse_pattern_primary: "manual:pattern",
  parse_decl: "manual:top-level-declarations-and-thread-local-storage",
  parse_global_after_colon: "manual:top-level-declarations-and-thread-local-storage",
  parse_import: "manual:source-files-imports-and-loads",
  parse_load: "manual:source-files-imports-and-loads",
  parse_library: "manual:c-libraries-and-foreign-functions",
  parse_fn_ptr: "manual:function-pointers",
  parse_enum: "manual:enums",
  parse_union: "manual:tagged-union-construction",
  parse_struct: "manual:struct-declarations",
  parse_identifier_arguments: "manual:function-and-aggregate-directives",
  parse_memory_effect: "manual:memory-contracts-and-temporal-checking",
  parse_memory_qualified_name: "manual:memory-contracts-and-temporal-checking",
  parse_memory_parameter: "manual:memory-contracts-and-temporal-checking",
  parse_memory_directive: "manual:memory-contracts-and-temporal-checking",
  parse_memory_overlay: "manual:memory-contracts-and-temporal-checking",
  parse_func: "manual:function-declarations",
  parse_function_parameters: "manual:default-and-named-parameters",
  parse_variadic_annotation: "manual:variadic-parameters",
  parse_operator_directive: "manual:operator-declarations",
  parse_minimal_atom: "manual:default-methods-and-negative-instances",
  parse_minimal_conjunction: "manual:default-methods-and-negative-instances",
  parse_minimal_disjunction: "manual:default-methods-and-negative-instances",
  parse_typeclass: "manual:typeclasses",
  parse_instance: "manual:typeclasses",
  parse_decls_into: "grammar:Files, imports, and bindings",
  parse_stmts_into: "grammar:Statements and control flow",
  parse_decls: "grammar:Files, imports, and bindings",
  parse_stmts: "grammar:Statements and control flow",
};

function sameMembers(actual: readonly string[], expected: readonly string[], label: string): void {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = expected.filter((item) => !actualSet.has(item));
  const extra = actual.filter((item) => !expectedSet.has(item));
  if (missing.length || extra.length) {
    throw new Error(`${label} coverage differs. Missing: ${missing.join(", ") || "none"}. Extra: ${extra.join(", ") || "none"}.`);
  }
}

sameMembers(keywords, expectedKeywords, "Keyword");
sameMembers(directives.map((directive) => directive.name), expectedDirectives, "Directive");

for (const directive of directives) {
  if (!directive.syntax.trim() || !directive.summary.trim() || (directive.details?.length ?? 0) < 2) {
    throw new Error(`${directive.name} needs syntax, a summary, and at least two semantic details.`);
  }
}

const sectionIds = new Set(manualSections.map((section) => section.id));
const grammarTitles = new Set(grammarGroups.map((group) => group.title));
for (const [parserFunction, target] of Object.entries(parserFunctionCoverage)) {
  const [kind, name] = target.split(":", 2);
  const exists = kind === "manual" ? sectionIds.has(name) : kind === "grammar" && grammarTitles.has(name);
  if (!exists) throw new Error(`${parserFunction} points to missing coverage target ${target}.`);
}

const grammar = grammarGroups.map((group) => `${group.title}\n${group.grammar}`).join("\n");
const requiredProductions = [
  "Lexical grammar", "Files, imports, and bindings", "Types", "Aggregates",
  "Functions and parameters", "Typeclasses and instances", "Statements and control flow",
  "Switches and patterns", "Expressions", "Memory contracts and low-level statements",
  "LibraryTail", "FnPtrTail", "StructModifiers", "FunctionDirective", "PatternSwitch",
  "ComptimeBlock", "StructuredAsm", "MemoryEffect",
];
for (const production of requiredProductions) {
  if (!grammar.includes(production)) throw new Error(`Complete grammar is missing ${production}.`);
}

const staleGrammar = [
  'ForBinding "in"', "returns_alias", "borrows", "captures", "releases", "leaks", "stores",
];
for (const stale of staleGrammar) {
  if (grammar.includes(stale)) throw new Error(`Complete grammar still contains stale syntax: ${stale}.`);
}

const manualText = manualSections
  .flatMap((section) => [section.title, ...section.blocks.flatMap((block) => [block.text ?? "", ...(block.items ?? [])])])
  .join("\n");
for (const stale of ["Practical guidance", "pattern-tests", "Exponent notation is not part", "0xff00_ff00", "0b1010_0011"]) {
  if (manualText.includes(stale)) throw new Error(`Manual still contains stale content: ${stale}.`);
}

if (repoRoot) {
  const parser = read(resolve(repoRoot, "src", "parser.rs"));
  const lexer = read(resolve(repoRoot, "src", "lexer.rs"));
  const parserFunctions = [...parser.matchAll(/\bfn\s+(parse_[a-z_]+)\s*\(/g)].map((match) => match[1]);
  sameMembers(parserFunctions, Object.keys(parserFunctionCoverage), "Parser routine");
  for (const directive of expectedDirectives) {
    const spelling = directive.slice(1);
    if (!parser.includes(`"${spelling}"`) && !lexer.includes(`"${spelling}"`)) {
      throw new Error(`${directive} has no parser/lexer source signal.`);
    }
  }
  console.log(`Manual coverage verified: ${manualSections.length} chapters, ${parserFunctions.length} parser routines, ${keywords.length} keywords, and ${directives.length} directives.`);
} else {
  console.log(`Documentation snapshot verified: ${manualSections.length} chapters, ${keywords.length} keywords, and ${directives.length} directives. Glosso compiler sources are unavailable, so parser-drift checks were skipped.`);
}
