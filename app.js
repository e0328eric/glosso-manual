import { Language, Parser, Query } from "./web-tree-sitter.js";
import { referenceIndex } from "./reference-index.js";
import { createReferenceLinker } from "./reference-links.js";

const referenceLinker = createReferenceLinker(referenceIndex);

// BEGIN GENERATED TREE-SITTER QUERY
const GLOSSO_HIGHLIGHTS_QUERY = "[\n  \"if\"\n  \"ifx\"\n  \"else\"\n  \"while\"\n  \"for\"\n  \"return\"\n  \"break\"\n  \"continue\"\n  \"struct\"\n  \"union\"\n  \"enum\"\n  \"enum_flags\"\n  \"using\"\n  \"noalias\"\n  \"mut\"\n  \"const\"\n  \"raw\"\n  \"raw_mut\"\n  \"volatile\"\n  \"defer\"\n  \"where\"\n  \"cast\"\n  \"acast\"\n  \"typeclass\"\n  \"instance\"\n  \"distinct\"\n] @keyword\n\n(caller_return_statement \"`return\" @keyword)\n(caller_defer_statement \"`defer\" @keyword)\n\n[\n  \"#comptime\"\n  \"#lazy\"\n  \"#import\"\n  \"#load\"\n  \"#export\"\n  \"#thread_local\"\n  \"#library\"\n  \"#fn_ptr\"\n  \"#as\"\n  \"#empty\"\n  \"#raw\"\n  \"#aos\"\n  \"#soa\"\n  \"#operator\"\n  \"#modify\"\n  \"#expand\"\n  \"#magic\"\n  \"#foreign\"\n  \"#c_call\"\n  \"#packed\"\n  \"#align\"\n  \"#no_context\"\n  \"#dump\"\n  \"#must\"\n  \"#on_drop_error\"\n  \"#returns_twice\"\n  \"#inline\"\n  \"#bytes\"\n  \"#asm\"\n  \"#push_context\"\n  \"#push_allocator\"\n  \"#if\"\n  \"#insert\"\n  \"#compile_error\"\n  \"#pattern\"\n  \"#try\"\n  \"#minimal\"\n  \"#falling\"\n  \"#meaningful\"\n  \"#code\"\n  \"#string\"\n  \"#simd\"\n  \"#matrix\"\n  \"#enable\"\n  \"#disable\"\n  \"#derive\"\n  \"#lifetimes\"\n  \"#memory\"\n  \"#fresh_result\"\n  \"#unchecked_transfer\"\n  \"#assert\"\n  \"#public\"\n  \"#private\"\n] @attribute\n\n(from_directive) @attribute\n(comptime_modifier) @attribute\n\n(comment) @comment\n(string_literal) @string\n(c_string_literal) @string\n(byte_string_literal) @string\n(multiline_string_line) @string\n(char_literal) @character\n(integer_literal) @number\n(float_literal) @number.float\n(boolean_literal) @boolean\n(null_literal) @constant.builtin\n(label_none_literal) @constant.builtin\n(context_expression) @constant.builtin\n(source_location_expression) @constant.builtin\n(context_type) @type.builtin\n(self_type) @type.builtin\n(never_type) @type.builtin\n(self_expression) @variable.builtin\n\n; Give every identifier a baseline capture first. Context-specific captures below\n; must come later so clients that resolve overlapping captures by query order do\n; not paint functions, parameters, properties, and types as plain variables.\n(identifier) @variable\n(code_splice_identifier) @variable\n(non_hygienic_identifier) @variable\n(label) @label\n(lifetime) @label\n(lifetimes_directive (identifier) @label)\n(quoted_operator) @operator\n(operator) @operator\n(prefix_operator) @operator\n(for_pointer_binder) @operator\n(suffix_operator) @operator\n(range_operator) @operator\n(binding_operator) @operator\n(constant_pattern_operator) @operator\n(try_operator) @operator\n(postfix_expression [\".*\" \".&\"] @operator)\n(expression_statement [\".*\" \".&\"] @operator)\n(enum_variant \"-\" @operator)\n\n; Types\n(named_type [\n  (identifier)\n  (code_splice_identifier)\n] @type)\n(generic_type\n  name: [\n    (identifier)\n    (code_splice_identifier)\n  ] @type)\n(generic_type\n  member: [\n    (identifier)\n    (code_splice_identifier)\n  ] @type)\n(generic_type_variable\n  name: (identifier) @type)\n(type_constructor_pattern [\n  (identifier)\n  (code_splice_identifier)\n] @type)\n(generic_type_constructor_pattern\n  name: [\n    (identifier)\n    (code_splice_identifier)\n  ] @type)\n(instance_declaration\n  class: (identifier) @type)\n\n; Keep this list aligned with `parser_builtin_type_name` in ../glosso.\n(\n  [\n    (named_type (identifier) @type.builtin)\n    (generic_type name: (identifier) @type.builtin)\n    (type_constructor_pattern (identifier) @type.builtin)\n    (generic_type_constructor_pattern name: (identifier) @type.builtin)\n  ]\n  (#any-of? @type.builtin\n    \"ssize\" \"usize\" \"rune\" \"bool\"\n    \"string\" \"cstring\" \"string16\" \"cstring16\"\n    \"type\" \"void\" \"any\" \"label\"\n    \"Code\" \"Pattern\" \"Namespace\" \"Library\" \"Typeclass\" \"Macro\"\n    \"s8\" \"s16\" \"s32\" \"s64\" \"s128\"\n    \"u8\" \"u16\" \"u32\" \"u64\" \"u128\"\n    \"f16\" \"f32\" \"f64\" \"f80\" \"f128\"\n    \"c32\" \"c64\" \"c128\" \"c160\" \"c256\"))\n\n(named_declaration\n  name: (declaration_name [\n    (identifier)\n    (code_splice_identifier)\n  ] @type.definition)\n  [\n    (function_pointer_type_declaration)\n    (typeclass_declaration)\n    (distinct_type_declaration)\n    (struct_declaration)\n    (enum_flags_declaration)\n    (enum_declaration)\n    (union_declaration)\n  ])\n(nested_declaration\n  name: (declaration_name [\n    (identifier)\n    (code_splice_identifier)\n  ] @type.definition)\n  [\n    (function_pointer_type_declaration)\n    (struct_declaration)\n    (enum_declaration)\n    (union_declaration)\n  ])\n(typeclass_associated_type\n  name: (declaration_name [\n    (identifier)\n    (code_splice_identifier)\n  ] @type.definition))\n(instance_associated_type\n  name: (declaration_name [\n    (identifier)\n    (code_splice_identifier)\n  ] @type.definition))\n\n; Parameters\n(named_argument name: (identifier) @variable.parameter)\n(typeclass_parameter name: (identifier) @variable.parameter)\n(lambda_parameter name: (identifier) @variable.parameter)\n(on_drop_error_statement error: (identifier) @variable.parameter)\n(parameter\n  name: (binding_list [\n    (identifier)\n    (code_splice_identifier)\n    (non_hygienic_identifier)\n  ] @variable.parameter))\n(parameter\n  name: [\n    (identifier)\n    (code_splice_identifier)\n    (non_hygienic_identifier)\n  ] @variable.parameter)\n(comptime_parameter\n  name: (binding_list [\n    (identifier)\n    (code_splice_identifier)\n    (non_hygienic_identifier)\n  ] @variable.parameter))\n(fn_ptr_parameter name: (identifier) @variable.parameter)\n(function_type\n  (type_element name: (identifier) @variable.parameter))\n(structured_asm_input_operand name: (identifier) @variable.parameter)\n(structured_asm_output_operand name: (identifier) @variable.parameter)\n\n; Properties\n(struct_field name: (identifier) @property)\n(union_field name: (identifier) @property)\n(enum_variant name: (identifier) @constant)\n(struct_literal_field name: (identifier) @property)\n(struct_pattern_field name: (identifier) @property)\n(shorthand_member_expression field: (identifier) @property)\n(shorthand_member_pattern field: (identifier) @property)\n(postfix_expression field: (identifier) @property)\n(expression_statement field: (identifier) @property)\n(pattern_postfix_expression field: (identifier) @property)\n\n; Functions\n(named_declaration\n  name: (declaration_name [\n    (identifier)\n    (code_splice_identifier)\n    (quoted_operator)\n  ] @function)\n  (function_declaration))\n(nested_declaration\n  name: (declaration_name [\n    (identifier)\n    (code_splice_identifier)\n    (quoted_operator)\n  ] @function)\n  (function_declaration))\n(typeclass_method_signature\n  name: (declaration_name [\n    (identifier)\n    (code_splice_identifier)\n    (quoted_operator)\n  ] @function))\n(instance_method\n  name: (declaration_name [\n    (identifier)\n    (code_splice_identifier)\n    (quoted_operator)\n  ] @function))\n(inherent_method\n  name: (identifier) @function)\n(postfix_expression\n  function: [\n    (identifier)\n    (code_splice_identifier)\n    (non_hygienic_identifier)\n  ] @function.call)\n(postfix_expression\n  function: (postfix_expression\n    field: [\n      (identifier)\n      (code_splice_identifier)\n    ] @function.method.call))\n(expression_statement\n  field: [\n    (identifier)\n    (code_splice_identifier)\n  ] @function.method.call\n  . (argument_list))\n\n(library_modifier) @attribute\n(inline_modifier) @attribute\n(string_modifier) @attribute\n(partial_directive) @attribute\n(pattern_rest) @operator\n(matrix_type \"Matrix\" @type.builtin)\n(simd_type \"Simd\" @type.builtin)\n(variadic_constraint (identifier) @type)\n(minimal_method (identifier) @function)\n(asm_operand_direction) @keyword\n(structured_asm_constraint_kind) @constant.builtin\n(structured_asm_operand_flag) @attribute\n(structured_asm_clobber_kind) @constant.builtin\n(import_selector mode: _ @attribute)\n(load_modifier \"embed\" @attribute)\n(expand_directive mode: (identifier) @attribute)\n(insert_scope \"scope\" @attribute)\n(visibility_modifier \"unit\" @attribute)\n(operator_try_modifier \"try\" @attribute)\n(operator_try_modifier target: (identifier) @type)\n\n; Memory contracts use effect names and labels only within the directive.\n(memory_effect (identifier) @attribute)\n(memory_release_argument name: (identifier) @attribute)\n(memory_typed_releaser method: (identifier) @function)\n(memory_unknown_argument name: (identifier) @attribute)\n(memory_trusted_statement \"trusted\" @attribute)\n(memory_place . (identifier) @variable.parameter)\n(memory_place field: (identifier) @property)\n((memory_place . (identifier) @variable.builtin)\n  (#eq? @variable.builtin \"returned\"))\n(memory_qualified_name field: (identifier) @property)\n((memory_qualified_name . (identifier) @variable.builtin)\n  (#eq? @variable.builtin \"returned\"))\n(memory_overlay target: (memory_qualified_name (identifier) @function .))\n(memory_release_argument (memory_qualified_name (identifier) @function .))\n((memory_effect\n  kind: (identifier) @_memory_effect\n  (memory_qualified_name (identifier) @function .))\n  (#any-of? @_memory_effect \"released_by\" \"gives\" \"maybe_gives\"))\n";
// END GENERATED TREE-SITTER QUERY

const scene = document.querySelector("#scene");
const loading = document.querySelector("#loading");
const topbar = document.querySelector("#topbar");
const searchInput = document.querySelector("#search-input");
const themeToggle = document.querySelector("#theme-toggle");
const highlighterState = document.querySelector("#highlighter-state");
const nativeSidebar = document.querySelector("#native-sidebar");
const nativeSidebarTitle = document.querySelector("#native-sidebar-title");
const nativeSidebarFilter = document.querySelector("#native-sidebar-filter");
const nativeSidebarIndex = document.querySelector("#native-sidebar-index");
const nativeSidebarItems = document.querySelector("#native-sidebar-items");
const pageOutline = document.querySelector("#page-outline");
const menuToggle = document.querySelector("#menu-toggle");
const sidebarBackdrop = document.querySelector("#sidebar-backdrop");
const searchHelp = document.querySelector("#search-help");
const canvas = document.querySelector("#measure");
const context = canvas.getContext("2d");
const decoder = new TextDecoder("utf-8");
const encoder = new TextEncoder();
const fonts = [
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  '"Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
  '"Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  'Georgia, Cambria, "Times New Roman", serif',
];
const keywordSet = new Set([
  "acast", "break", "case", "cast", "continue", "defer", "distinct", "else", "enum", "enum_flags",
  "for", "if", "ifx", "instance", "noalias", "return", "struct", "typeclass", "union", "using",
  "where", "while",
]);
const builtinConstants = new Set(["context", "false", "null", "true"]);
const primitiveTypes = new Set([
  "any", "bool", "Code", "cstring", "cstring16", "c32", "c64", "c128", "c160", "c256",
  "f16", "f32", "f64", "f80", "f128", "ssize", "label", "Library", "Macro", "Matrix",
  "Namespace", "Pattern", "rune", "s8", "s16", "s32", "s64", "s128", "Simd", "string", "string16",
  "type", "Typeclass", "u8", "u16", "u32", "u64", "u128", "usize", "void",
]);

let instance;
let view;
let scratchAddress = 0;
let searchBridgeAddress = 0;
let pointerX = 0;
let pointerY = 0;
let pointerDown = false;
let nativePointerPress = null;
let pendingFrame = false;
let lastFrame = performance.now();
let parser;
let highlightQuery;
let highlighterMode = "loading";
let applyingHash = false;
let replaceBrowserRoute = true;
let sidebarScrollTop = 0;
let sidebarScrollMaximum = 0;
let lastSidebarSelection = "";
let nativeSidebarView = -1;
let nativeSidebarSelected = -2;
const nativeSidebarQueries = ["", ""];
const highlightCache = new Map();
const codeScrollPositions = new Map();
let pendingHeading = "";
let lastOutline = "";
let lastDocumentHash = "#/manual";
const isMobileLayout = () => document.documentElement.clientWidth < 860;

// Keep the language guide grouped the same way as the original manual. The
// values are section indices exported by the Glosso manual model.
const manualSidebarGroups = [
  { title: "Getting started", sections: [0, 1, 2, 3, 4, 5] },
  { title: "Lexical structure", sections: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
  { title: "Declarations and scope", sections: [16, 17, 18, 19, 20, 21] },
  { title: "Primitive types", sections: [22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36] },
  { title: "Structs, unions, and enums", sections: [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48] },
  { title: "Pointers and collections", sections: [49, 50, 51, 52, 53, 54, 55] },
  { title: "Functions and generics", sections: [56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67] },
  { title: "Typeclasses", sections: [68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82] },
  { title: "Operators", sections: [83, 84, 85, 86] },
  { title: "Control flow", sections: [87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104] },
  { title: "Compile-time programming", sections: [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115] },
  { title: "Memory and context", sections: [116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127] },
  { title: "Runtime behaviour", sections: [128, 129, 130] },
  { title: "Interop and low-level code", sections: [131, 132, 133, 134, 135, 136, 137] },
  { title: "Targets and build", sections: [138, 139, 140, 141] },
  { title: "Reference", sections: [142, 143, 144, 145] },
];

const align = (value, boundary) => (value + boundary - 1) & ~(boundary - 1);
const memoryView = () => {
  if (!view || view.buffer !== instance.exports.memory.buffer) view = new DataView(instance.exports.memory.buffer);
  return view;
};
const textAt = (address, length) => decoder.decode(new Uint8Array(instance.exports.memory.buffer, address, length));

function mappedColor(address) {
  const data = memoryView();
  let red = data.getFloat32(address, true);
  let green = data.getFloat32(address + 4, true);
  let blue = data.getFloat32(address + 8, true);
  const alpha = data.getFloat32(address + 12, true) / 255;
  if (document.documentElement.dataset.theme !== "dark") return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  const key = `${Math.round(red)},${Math.round(green)},${Math.round(blue)}`;
  const exact = {
    "244,240,232": [16, 20, 25],
    "255,253,248": [23, 28, 34],
    "23,26,31": [243, 240, 232],
    "109,107,102": [169, 170, 166],
    "216,209,197": [52, 59, 67],
    "36,73,216": [141, 168, 255],
    "23,50,158": [189, 202, 255],
    "233,104,45": [255, 137, 87],
    "17,23,34": [9, 12, 17],
    "238,233,223": [19, 24, 30],
    "244,241,234": [17, 24, 32],
    "66,65,62": [199, 199, 194],
    "130,144,166": [130, 144, 166],
    "216,224,237": [216, 224, 237],
    "41,51,69": [54, 64, 79],
    "169,166,159": [100, 105, 111],
    "248,245,238": [29, 36, 44],
  }[key];
  if (exact) [red, green, blue] = exact;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function cornerRadius(element, address) {
  const data = memoryView();
  element.style.borderRadius = [0, 4, 12, 8].map(offset => `${data.getFloat32(address + offset, true)}px`).join(" ");
}

function classFor(type, text) {
  const lower = type.toLowerCase();
  const arbitraryInteger = /^[su]([1-9][0-9]*)$/.exec(text);
  if (lower.includes("comment")) return "tok-comment";
  if (lower.includes("string") || /^"/.test(text)) return "tok-string";
  if (lower.includes("number") || lower.includes("integer") || lower.includes("float") || /^\d/.test(text)) return "tok-number";
  if (text.startsWith("#")) return "tok-directive";
  if (builtinConstants.has(text)) return "tok-constant";
  if (keywordSet.has(text)) return "tok-keyword";
  if (primitiveTypes.has(text)
      || (arbitraryInteger && Number(arbitraryInteger[1]) <= 65535)
      || /(?:type|struct|union|enum)/.test(lower)) return "tok-type";
  if (lower.includes("function") || lower.includes("procedure") || lower.includes("call")) return "tok-function";
  if (/^'[A-Za-z_]/.test(text) && !text.endsWith("'")) return "tok-label";
  if (lower.includes("operator") || /^[+\-*/<>!@%^&|~?.,:=]+$/.test(text)) return "tok-operator";
  if (lower.includes("field") || lower.includes("member")) return "tok-property";
  return "";
}

function classForCapture(name) {
  const capture = name.toLowerCase();
  if (capture.includes("comment")) return "tok-comment";
  if (capture.includes("string")) return "tok-string";
  if (capture.includes("character")) return "tok-character";
  if (capture.includes("number") || capture.includes("float")) return "tok-number";
  if (capture.includes("boolean") || capture.includes("constant")) return "tok-constant";
  if (capture.includes("attribute")) return "tok-directive";
  if (capture.includes("keyword")) return "tok-keyword";
  if (capture.includes("type")) return "tok-type";
  if (capture.includes("function") || capture.includes("method")) return "tok-function";
  if (capture.includes("parameter")) return "tok-parameter";
  if (capture.includes("property")) return "tok-property";
  if (capture.includes("label")) return "tok-label";
  if (capture.includes("operator")) return "tok-operator";
  return "";
}

function fallbackTokens(source) {
  const pattern = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|#(?:[A-Za-z_]\w*)|\b(?:\d+(?:_\d+)*(?:\.\d+(?:_\d+)*)?(?:[eE][+-]?\d+(?:_\d+)*)?|\d+#\w+)\b|\b[A-Za-z_]\w*\b|[^\s\w]+|\s+)/g;
  return [...source.matchAll(pattern)].map(match => ({ text: match[0], className: classFor("", match[0]) }));
}

function byteMap(source) {
  const map = [0];
  let byteOffset = 0;
  let stringOffset = 0;
  for (const character of source) {
    const bytes = encoder.encode(character).length;
    for (let count = 0; count < bytes; count += 1) map[byteOffset + count] = stringOffset;
    byteOffset += bytes;
    stringOffset += character.length;
    map[byteOffset] = stringOffset;
  }
  return map;
}

function highlight(source) {
  if (!parser || !highlightQuery) return fallbackTokens(source);
  const isIndentedStatement = /^\s+\S/.test(source);
  const prefix = isIndentedStatement ? "__highlight :: () {\n" : "";
  const parsedSource = isIndentedStatement ? `${prefix}${source}\n}` : source;
  const prefixBytes = encoder.encode(prefix).length;
  const sourceBytes = encoder.encode(source).length;
  const tree = parser.parse(parsedSource);
  if (!tree) return fallbackTokens(source);
  const offsets = byteMap(source);
  const ranges = highlightQuery.captures(tree.rootNode).map(capture => ({
    startByte: capture.node.startIndex - prefixBytes,
    endByte: capture.node.endIndex - prefixBytes,
    className: classForCapture(capture.name),
    priority: capture.patternIndex,
  })).filter(range => range.className && range.startByte >= 0 && range.endByte <= sourceBytes && range.endByte > range.startByte)
    .map(range => ({
      start: offsets[range.startByte] ?? range.startByte,
      end: offsets[range.endByte] ?? range.endByte,
      className: range.className,
      priority: range.priority,
    }));
  const boundaries = new Set([0, source.length]);
  for (const range of ranges) {
    boundaries.add(range.start);
    boundaries.add(range.end);
  }
  const points = [...boundaries].sort((left, right) => left - right);
  const tokens = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    if (end <= start) continue;
    const active = ranges
      .filter(range => range.start <= start && range.end >= end)
      .sort((left, right) => right.priority - left.priority || (left.end - left.start) - (right.end - right.start))[0];
    const className = active?.className ?? "";
    const text = source.slice(start, end);
    const previous = tokens[tokens.length - 1];
    if (previous?.className === className) previous.text += text;
    else tokens.push({ text, className });
  }
  tree.delete();
  const refined = tokens.flatMap(token => token.className ? [token] : fallbackTokens(token.text));
  return refined.length ? refined : fallbackTokens(source);
}

function renderReferenceText(element, source, scope, tokens = [{ text: source }], prose = false) {
  let tokenEnd = 0;
  const literals = tokens.flatMap(token => {
    const start = tokenEnd;
    tokenEnd += token.text.length;
    return /tok-(?:comment|string|character)/.test(token.className ?? "") ? [{ start, end: tokenEnd }] : [];
  });
  const links = scope ? referenceLinker.ranges(source, scope, prose)
    .filter(link => !literals.some(literal => link.start < literal.end && link.end > literal.start)) : [];
  let tokenIndex = 0;
  let tokenOffset = 0;
  let offset = 0;
  const appendUntil = (parent, end) => {
    while (offset < end) {
      const token = tokens[tokenIndex];
      const length = Math.min(end - offset, token.text.length - tokenOffset);
      const span = document.createElement("span");
      span.textContent = token.text.slice(tokenOffset, tokenOffset + length);
      if (token.className) span.className = token.className;
      parent.appendChild(span);
      offset += length;
      tokenOffset += length;
      if (tokenOffset === token.text.length) { tokenIndex += 1; tokenOffset = 0; }
    }
  };
  for (const link of links) {
    appendUntil(element, link.start);
    const anchor = document.createElement("a");
    anchor.className = "clay-reference-link";
    anchor.href = link.href;
    anchor.title = `Open documentation for ${link.name}`;
    appendUntil(anchor, link.end);
    element.appendChild(anchor);
  }
  appendUntil(element, source.length);
}

function renderHighlighted(element, source, scope) {
  let tokens = highlightCache.get(source);
  if (!tokens || tokens.mode !== highlighterMode) {
    tokens = { mode: highlighterMode, values: highlight(source) };
    highlightCache.set(source, tokens);
  }
  renderReferenceText(element, source, scope, tokens.values);
}

async function initializeHighlighter() {
  try {
    await Parser.init({ locateFile: () => new URL("./web-tree-sitter.wasm", import.meta.url).href });
    // The embedded query changes with the grammar. Revalidate the parser even
    // when a reload retains a fresh HTTP-cache entry for the previous Wasm.
    const grammarResponse = await fetch(new URL("./tree-sitter-glosso.wasm", import.meta.url), { cache: "no-cache" });
    if (!grammarResponse.ok) throw new Error(`Grammar request failed: ${grammarResponse.status}`);
    const language = await Language.load(new Uint8Array(await grammarResponse.arrayBuffer()));
    if (!GLOSSO_HIGHLIGHTS_QUERY) throw new Error("The embedded Tree-sitter query is empty; run `glosso first.glo -- tree-sitter`");
    highlightQuery = new Query(language, GLOSSO_HIGHLIGHTS_QUERY);
    parser = new Parser();
    parser.setLanguage(language);
    highlighterMode = "wasm";
    highlighterState.textContent = "Tree-sitter Wasm active";
    highlightCache.clear();
    scheduleRender();
  } catch (error) {
    highlighterMode = "fallback";
    highlighterState.textContent = "Lexical highlight fallback";
    console.warn("Glosso Tree-sitter Wasm could not start; using lexical highlighting.", error);
  }
}

function splitTopLevel(value, delimiter = ",") {
  const parts = [];
  let start = 0;
  let round = 0;
  let square = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") round += 1;
    else if (character === ")") round -= 1;
    else if (character === "[") square += 1;
    else if (character === "]") square -= 1;
    else if (character === delimiter && round === 0 && square === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

function outerParens(value) {
  if (!value.startsWith("(") || !value.endsWith(")")) return false;
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "(") depth += 1;
    else if (value[index] === ")" && --depth === 0) return index === value.length - 1;
  }
  return false;
}

function parseType(raw) {
  let value = raw.replace(/\s+/g, " ").trim();
  if (!value) return { name: "void", args: [] };
  if (value.startsWith("#soa ") || value.startsWith("#aos ")) {
    const [layout, ...rest] = value.split(" ");
    return { name: layout.toLowerCase(), args: [parseType(rest.join(" "))] };
  }
  if (value.startsWith("*")) {
    value = value.slice(1).trim();
    const qualifiers = value.match(/^(?:(?:const|volatile)\s+)+/)?.[0] ?? "";
    value = value.slice(qualifiers.length).trim();
    const shape = "*" + qualifiers.trim().split(/\s+/).filter(Boolean).sort().join(" ");
    return { name: shape, args: [parseType(value)] };
  }
  const array = value.match(/^(\[(?:\*|\.\.|[^\]]*)\])(.*)$/);
  if (array) {
    const element = array[2].trim();
    const qualifiers = element.match(/^(?:(?:const|volatile)\s+)+/)?.[0] ?? "";
    const shape = array[1].replace(/\s/g, "") + qualifiers.trim().split(/\s+/).filter(Boolean).sort().join(" ");
    return { name: shape, args: [parseType(element.slice(qualifiers.length))] };
  }
  if (outerParens(value)) {
    const parts = splitTopLevel(value.slice(1, -1));
    if (parts.length === 1) return parseType(parts[0]);
    return { name: "tuple", args: parts.map(parseType) };
  }
  const call = value.match(/^([#$\p{L}_][\p{L}\p{N}_.$#]*?)\s*\((.*)\)$/u);
  if (call && outerParens(`(${call[2]})`)) return { name: call[1], args: splitTopLevel(call[2]).map(parseType) };
  return { name: value.replace(/\s/g, ""), args: [] };
}

function arrowIndex(value) {
  let round = 0;
  let square = 0;
  for (let index = 0; index < value.length - 1; index += 1) {
    if (value[index] === "(") round += 1;
    else if (value[index] === ")") round -= 1;
    else if (value[index] === "[") square += 1;
    else if (value[index] === "]") square -= 1;
    else if (value.startsWith("->", index) && round === 0 && square === 0) return index;
  }
  return -1;
}

function parseSignature(value) {
  const arrow = arrowIndex(value);
  if (arrow < 0) return undefined;
  let left = value.slice(0, arrow).trim();
  const right = value.slice(arrow + 2).trim();
  if (!right) return undefined;
  if (outerParens(left)) left = left.slice(1, -1);
  return { inputs: left ? splitTopLevel(left).map(parseType) : [], output: parseType(right) };
}

const serializeType = node => node.args.length ? `${node.name}(${node.args.map(serializeType).join(",")})` : node.name;
const candidateVariable = name => {
  const clean = name.replace(/^\$/, "");
  return /^([A-Z]|[A-Z][A-Za-z0-9_]*T)$/.test(clean) || /^T[0-9]*$/.test(clean);
};
const queryWildcard = name => name === "_" || /^[a-z]$/.test(name);

function unify(query, candidate, bindings, queryBindings) {
  if (queryWildcard(query.name) && query.args.length === 0) {
    if (query.name === "_") return { matches: true, generics: 1 };
    const key = `?${query.name}`;
    const value = serializeType(candidate).toLowerCase();
    const bound = queryBindings.get(key);
    if (bound && bound !== value) return { matches: false, generics: 0 };
    queryBindings.set(key, value);
    return { matches: true, generics: 1 };
  }
  if (candidateVariable(candidate.name) && candidate.args.length === 0) {
    const key = candidate.name.replace(/^\$/, "");
    const value = serializeType(query).toLowerCase();
    const bound = bindings.get(key);
    if (bound && bound !== value) return { matches: false, generics: 0 };
    bindings.set(key, value);
    return { matches: true, generics: 1 };
  }
  if (query.name.toLowerCase() !== candidate.name.toLowerCase() || query.args.length !== candidate.args.length) {
    return { matches: false, generics: 0 };
  }
  let generics = 0;
  for (let index = 0; index < query.args.length; index += 1) {
    const result = unify(query.args[index], candidate.args[index], bindings, queryBindings);
    if (!result.matches) return result;
    generics += result.generics;
  }
  return { matches: true, generics };
}

function constraintsAllow(signature, bindings) {
  const where = signature.match(/\bwhere\s+(.+)$/)?.[1];
  if (!where) return true;
  const numeric = /^(?:ssize|usize|[su][0-9]+|f(?:16|32|64|80|128))$/i;
  const floating = /^f(?:16|32|64|80|128)$/i;
  const integer = /^(?:ssize|usize|[su][0-9]+)$/i;
  const strings = /^(?:string|cstring|string16|cstring16)$/i;
  for (const match of where.matchAll(/\b(Floating|Fractional|RealFloat|Num|BitArithmetic)\s*\(\s*\$?([A-Z][A-Za-z0-9_]*)/g)) {
    const actual = bindings.get(match[2]);
    if (!actual) continue;
    if (/^(?:Floating|Fractional|RealFloat)$/.test(match[1]) && !floating.test(actual)) return false;
    if (match[1] === "Num" && !numeric.test(actual)) return false;
    if (match[1] === "BitArithmetic" && !integer.test(actual)) return false;
  }
  for (const match of where.matchAll(/\b(Is_Bool|Is_Character|Is_Complex|Is_Float|Is_Integer|Is_Numeric|Is_Pointer|Is_Procedure|Is_Rune|Is_Simd|Is_String)\s*\(\s*\$?([A-Z][A-Za-z0-9_]*)/g)) {
    const actual = bindings.get(match[2]);
    if (!actual) continue;
    if (match[1] === "Is_Bool" && actual.toLowerCase() !== "bool") return false;
    if (match[1] === "Is_Character" && actual.toLowerCase() !== "rune") return false;
    if (match[1] === "Is_Complex" && !/^c(?:32|64|128|160|256)$/i.test(actual)) return false;
    if (match[1] === "Is_Float" && !floating.test(actual)) return false;
    if (match[1] === "Is_Integer" && !integer.test(actual)) return false;
    if (match[1] === "Is_Numeric" && !numeric.test(actual)) return false;
    if (match[1] === "Is_Pointer" && !/^(?:\*|\[\*\])/.test(actual)) return false;
    if (match[1] === "Is_Procedure" && !/(?:->|fn_ptr)/i.test(actual)) return false;
    if (match[1] === "Is_Rune" && actual.toLowerCase() !== "rune") return false;
    if (match[1] === "Is_Simd" && !/^Simd\(/i.test(actual)) return false;
    if (match[1] === "Is_String" && !strings.test(actual)) return false;
  }
  return true;
}

function signatureResults(query) {
  const parsedQuery = parseSignature(query);
  if (!parsedQuery) return [];
  const matches = [];
  for (let index = 0; index < referenceIndex.symbols.length; index += 1) {
    const symbol = referenceIndex.symbols[index];
    const searchable = symbol[2];
    if (!searchable || /#modify\b/.test(symbol[1])) continue;
    const candidate = parseSignature(searchable);
    if (!candidate || candidate.inputs.length !== parsedQuery.inputs.length) continue;
    const bindings = new Map();
    const queryBindings = new Map();
    let generics = 0;
    let valid = true;
    for (let position = 0; position < parsedQuery.inputs.length; position += 1) {
      const result = unify(parsedQuery.inputs[position], candidate.inputs[position], bindings, queryBindings);
      if (!result.matches) { valid = false; break; }
      generics += result.generics;
    }
    if (!valid) continue;
    const output = unify(parsedQuery.output, candidate.output, bindings, queryBindings);
    if (!output.matches || !constraintsAllow(symbol[1], bindings)) continue;
    generics += output.generics;
    const exact = searchable.replace(/\s/g, "").toLowerCase() === query.replace(/\s/g, "").toLowerCase();
    matches.push({ kind: 2, index, score: (exact ? 100 : 80) - generics + (symbol[5] === "function" ? 3 : 0) });
  }
  return matches;
}

function searchDocumentation(query) {
  const value = query.trim();
  if (!value) return [];
  let results;
  if (arrowIndex(value) >= 0) {
    results = signatureResults(value);
  } else {
    const needle = value.toLowerCase();
    results = [];
    referenceIndex.symbols.forEach((symbol, index) => {
      const name = symbol[0].toLowerCase();
      const signature = symbol[1].toLowerCase();
      const summary = symbol[3].toLowerCase();
      if (!name.includes(needle) && !signature.includes(needle) && !summary.includes(needle)) return;
      const score = name === needle ? 110 : name.startsWith(needle) ? 100 : name.includes(needle) ? 90 : signature.includes(needle) ? 65 : 50;
      results.push({ kind: 2, index, score });
    });
    referenceIndex.modules.forEach((module, index) => {
      const name = module[0].toLowerCase();
      const summary = module[1].toLowerCase();
      if (!name.includes(needle) && !summary.includes(needle)) return;
      results.push({ kind: 1, index, score: name === needle ? 108 : name.startsWith(needle) ? 98 : name.includes(needle) ? 86 : 45 });
    });
    referenceIndex.manual.forEach((section, index) => {
      const title = section[0].toLowerCase();
      const body = section[1].toLowerCase();
      if (!title.includes(needle) && !body.includes(needle)) return;
      results.push({ kind: 0, index, score: title === needle ? 106 : title.startsWith(needle) ? 96 : title.includes(needle) ? 84 : 40 });
    });
  }
  const title = result => result.kind === 0
    ? referenceIndex.manual[result.index][0]
    : result.kind === 1
      ? referenceIndex.modules[result.index][0]
      : referenceIndex.symbols[result.index][0];
  return results.sort((left, right) => right.score - left.score || title(left).localeCompare(title(right))).slice(0, 100);
}

function writeSearchResults(results) {
  const data = memoryView();
  results.forEach((result, index) => {
    data.setInt32(searchBridgeAddress + index * 8, result.kind, true);
    data.setInt32(searchBridgeAddress + index * 8 + 4, result.index, true);
  });
  instance.exports.glo_manual_set_search_results(searchBridgeAddress, results.length);
}

function initializeClay() {
  const memory = instance.exports.memory;
  const heapBase = Number(instance.exports.__heap_base.value);
  scratchAddress = align(heapBase, 16);
  searchBridgeAddress = scratchAddress + 256;
  const arenaAddress = scratchAddress + 4096;
  const dimensionsAddress = scratchAddress + 4112;
  const errorHandlerAddress = scratchAddress + 4128;
  const arenaMemoryAddress = align(scratchAddress + 8192, 64);
  const memorySize = instance.exports.Clay_MinMemorySize();
  const required = arenaMemoryAddress + memorySize;
  if (required > memory.buffer.byteLength) memory.grow(Math.ceil((required - memory.buffer.byteLength) / 65536));
  const data = memoryView();
  for (let offset = scratchAddress; offset < arenaMemoryAddress; offset += 4) data.setUint32(offset, 0, true);
  instance.exports.Clay_CreateArenaWithCapacityAndMemory(arenaAddress, memorySize, arenaMemoryAddress);
  data.setFloat32(dimensionsAddress, window.innerWidth, true);
  data.setFloat32(dimensionsAddress + 4, Math.max(320, window.innerHeight - topbar.offsetHeight), true);
  data.setUint32(errorHandlerAddress, 0, true);
  data.setUint32(errorHandlerAddress + 4, 0, true);
  instance.exports.Clay_Initialize(arenaAddress, dimensionsAddress, errorHandlerAddress);
  instance.exports.Clay_SetExternalScrollHandlingEnabled(1);
}

function commandElement(className = "", tagName = "div") {
  const element = document.createElement(tagName);
  element.className = `clay-command ${className}`;
  element.setAttribute("aria-hidden", "true");
  return element;
}

function markerAt(address) {
  if (!address) return "";
  try { return textAt(address, 13); } catch { return ""; }
}

function sourceUrl(label) {
  const value = label.replace(/\s*↗\s*$/, "").trim();
  const match = value.match(/^(.*):(\d+)$/);
  const path = match ? match[1] : value;
  const line = match ? `#L${match[2]}` : "";
  return `https://github.com/e0328eric/glosso/blob/master/${path}${line}`;
}

async function copyCodeSource(source) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(source);
      return true;
    } catch { /* Fall through for browsers that deny clipboard permission. */ }
  }
  const field = document.createElement("textarea");
  field.value = source;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.left = "-9999px";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  return copied;
}

function bindCodeCopyButton(button, source) {
  button.dataset.copyReady = "true";
  for (const eventName of ["pointerdown", "pointerup", "pointermove"]) {
    button.addEventListener(eventName, event => event.stopPropagation());
  }
  button.addEventListener("click", async event => {
    event.stopPropagation();
    try {
      if (!await copyCodeSource(source)) throw new Error("Copy failed");
      button.textContent = "Copied";
      button.setAttribute("aria-label", "Code copied");
    } catch {
      button.textContent = "Error ";
      button.setAttribute("aria-label", "Could not copy code");
    }
    window.setTimeout(() => {
      if (!button.isConnected) return;
      button.textContent = "Copy  ";
      button.setAttribute("aria-label", "Copy code");
    }, 1400);
  });
}

// Clay supplies the original string address for every measured word and
// rendered line, so inline code remains formatted across line boundaries.
function proseSegments(value, chars, baseChars) {
  let code = baseChars > 0 && chars >= baseChars
    && (textAt(baseChars, chars - baseChars).match(/`/g)?.length ?? 0) % 2 === 1;
  return value.split("`").map((text, index) => {
    if (index) code = !code;
    return { text, code };
  });
}

function renderProse(element, segments, scope) {
  for (const segment of segments) {
    const node = document.createElement(segment.code ? "code" : "span");
    renderReferenceText(node, segment.text, scope, undefined, !segment.code);
    element.appendChild(node);
  }
}

function nativeSidebarEntries(currentView) {
  if (currentView === 1) return referenceIndex.modules.map((module, index) => ({ index, label: module[0] }));
  return referenceIndex.manual.map((section, index) => ({ index, label: section[0] }));
}

function nativeSidebarButton(entry, selectedIndex) {
  const button = document.createElement("a");
  button.className = "native-sidebar-item";
  button.href = `#/${nativeSidebarView === 1 ? "std" : "manual"}/${entry.index}`;
  button.dataset.index = String(entry.index);
  button.textContent = entry.label;
  if (entry.index === selectedIndex) button.setAttribute("aria-current", "page");
  return button;
}

function populateNativeSidebar(currentView, selectedIndex, alignSelection = false) {
  const previousScrollTop = nativeSidebar.scrollTop;
  const query = nativeSidebarQueries[currentView]?.trim().toLocaleLowerCase() ?? "";
  const entries = nativeSidebarEntries(currentView).filter(entry => !query || entry.label.toLocaleLowerCase().includes(query));
  const fragment = document.createDocumentFragment();
  if (currentView === 0) {
    const entriesByIndex = new Map(entries.map(entry => [entry.index, entry]));
    for (const group of manualSidebarGroups) {
      const groupEntries = group.sections.map(index => entriesByIndex.get(index)).filter(Boolean);
      if (!groupEntries.length) continue;
      const section = document.createElement("section");
      section.className = "native-sidebar-group";
      const heading = document.createElement("h3");
      heading.className = "native-sidebar-group-title";
      heading.textContent = group.title;
      section.appendChild(heading);
      for (const entry of groupEntries) section.appendChild(nativeSidebarButton(entry, selectedIndex));
      fragment.appendChild(section);
    }
  } else {
    for (const entry of entries) fragment.appendChild(nativeSidebarButton(entry, selectedIndex));
  }
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "native-sidebar-empty";
    empty.textContent = "No matching entries.";
    fragment.appendChild(empty);
  }
  nativeSidebarItems.replaceChildren(fragment);
  nativeSidebar.scrollTop = previousScrollTop;

  if (alignSelection && !query && selectedIndex >= 0) {
    requestAnimationFrame(() => {
      const selected = nativeSidebarItems.querySelector(`[data-index="${selectedIndex}"]`);
      if (!selected) return;
      const sidebarBounds = nativeSidebar.getBoundingClientRect();
      const selectedBounds = selected.getBoundingClientRect();
      if (selectedBounds.top < sidebarBounds.top + 24 || selectedBounds.bottom > sidebarBounds.bottom - 16) {
        selected.scrollIntoView({ block: "center", behavior: "auto" });
      }
    });
  }
}

function syncNativeSidebar(currentView, selectedIndex) {
  // Keep documentation navigation available while searching.
  if (currentView === 2) {
    if (nativeSidebarView < 0) syncNativeSidebar(0, -1);
    return;
  }
  const viewChanged = nativeSidebarView !== currentView;
  const selectionChanged = nativeSidebarSelected !== selectedIndex;
  nativeSidebarView = currentView;
  nativeSidebarSelected = selectedIndex;
  nativeSidebarTitle.textContent = currentView === 1 ? "Modules" : "Chapters";
  nativeSidebarFilter.placeholder = currentView === 1 ? "Filter modules…" : "Filter chapters…";
  nativeSidebarFilter.setAttribute("aria-label", currentView === 1 ? "Filter modules" : "Filter chapters");
  nativeSidebarFilter.value = nativeSidebarQueries[currentView] ?? "";
  nativeSidebarIndex.textContent = currentView === 1 ? "All modules" : "All chapters";
  nativeSidebarIndex.href = currentView === 1 ? "#/std" : "#/manual";
  if (selectedIndex < 0) nativeSidebarIndex.setAttribute("aria-current", "page");
  else nativeSidebarIndex.removeAttribute("aria-current");
  const itemPage = currentView === 1 && (instance.exports.glo_manual_get_symbol() >= 0 || instance.exports.glo_manual_get_type() >= 0);
  if (viewChanged || itemPage) nativeSidebar.scrollTop = 0;
  populateNativeSidebar(currentView, selectedIndex, selectionChanged && !viewChanged && !itemPage);
}

function documentRoute() {
  const currentView = instance.exports.glo_manual_get_view();
  if (currentView === 1) {
    const module = instance.exports.glo_manual_get_module();
    const symbol = instance.exports.glo_manual_get_symbol();
    const type = instance.exports.glo_manual_get_type();
    return `#/std${module >= 0 ? `/${module}` : ""}${symbol >= 0 ? `/item/${symbol}` : type >= 0 ? `/type/${type}` : ""}`;
  }
  if (currentView === 2) return `#/search${searchInput.value ? `?q=${encodeURIComponent(searchInput.value)}` : ""}`;
  const section = instance.exports.glo_manual_get_section();
  return `#/manual${section >= 0 ? `/${section}` : ""}`;
}

function handleDocumentLink(event) {
  if (!instance || event.defaultPrevented || event.button !== 0 ||
      event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const href = event.target.closest("a[href]")?.getAttribute("href");
  if (!href?.startsWith("#/")) return;
  event.preventDefault();
  // Apply the route before a pointer-up render can write the old Wasm route
  // back to history. Modified clicks still use the anchor's native href.
  if (href !== location.hash) history.pushState(null, "", href);
  applyHash(); // The current permalink also reopens a folded method.
}

function syncOutline(headings) {
  const route = documentRoute();
  const signature = JSON.stringify([route, headings.map(heading => [heading.id, heading.label, heading.href])]);
  if (signature === lastOutline) return;
  lastOutline = signature;
  pageOutline.hidden = !headings.length || instance.exports.glo_manual_get_view() === 2;
  const title = document.createElement("h3");
  title.textContent = "Sections";
  const links = headings.map(heading => {
    const link = document.createElement("a");
    link.href = heading.href ?? `${route}?heading=${encodeURIComponent(heading.id)}`;
    if (heading.href) {
      link.className = "outline-item";
    }
    link.textContent = heading.label;
    return link;
  });
  pageOutline.replaceChildren(title, ...links);
}

function setSidebarOpen(open, restoreFocus = false) {
  document.documentElement.classList.toggle("mobile-layout", isMobileLayout());
  document.body.classList.toggle("sidebar-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  nativeSidebar.inert = isMobileLayout() && !open;
  if (open) nativeSidebar.querySelector("[aria-current], a")?.focus();
  else if (restoreFocus) menuToggle.focus();
}

function renderCommands(arrayAddress) {
  const data = memoryView();
  const length = data.getInt32(arrayAddress + 4, true);
  const commands = data.getUint32(arrayAddress + 8, true);
  const fragment = document.createDocumentFragment();
  const stack = [{ parent: fragment, x: 0, y: 0, clip: null }];
  const codeCopyButtons = [];
  const codeSources = [];
  const codeViewports = [];
  const tableViewports = [];
  const headingGroups = new Map();
  let referenceScope = instance.exports.glo_manual_get_view() === 1
    ? referenceLinker.context(instance.exports.glo_manual_get_module(),
      Math.max(instance.exports.glo_manual_get_symbol(), instance.exports.glo_manual_get_type()))
    : referenceLinker.context();
  for (const viewport of scene.querySelectorAll(".clay-scroll-region")) {
    codeScrollPositions.set(viewport.dataset.id, viewport.scrollLeft);
  }
  let maximumY = Math.max(320, window.innerHeight - topbar.offsetHeight);
  sidebarScrollMaximum = 0;
  for (let index = 0; index < length; index += 1) {
    const command = commands + index * 72;
    const x = data.getFloat32(command, true);
    const y = data.getFloat32(command + 4, true);
    const width = data.getFloat32(command + 8, true);
    const height = data.getFloat32(command + 12, true);
    const type = data.getUint8(command + 70);
    if (type === 5) {
      const current = stack[stack.length - 1];
      const clip = document.createElement("div");
      clip.className = "clay-clip";
      clip.style.left = `${Math.round(x - current.x)}px`;
      if (stack.length === 1) {
        clip.classList.add("clay-sidebar");
        clip.style.position = "sticky";
        clip.style.top = `${topbar.offsetHeight}px`;
      } else {
        clip.style.top = `${Math.round(y - current.y)}px`;
      }
      clip.style.width = `${Math.max(0, Math.round(width))}px`;
      clip.style.height = `${Math.max(0, Math.round(height))}px`;
      current.parent.appendChild(clip);
      stack.push({ parent: clip, x, y, clip: { element: clip, height, contentBottom: height } });
      if (stack.length === 2) maximumY = Math.max(maximumY, y + height + 28);
      continue;
    }
    if (type === 6) {
      if (stack.length <= 1) continue;
      const current = stack.pop();
      const scrollMaximum = Math.max(0, current.clip.contentBottom - current.clip.height);
      sidebarScrollMaximum = Math.max(sidebarScrollMaximum, scrollMaximum);
      sidebarScrollTop = Math.min(sidebarScrollTop, sidebarScrollMaximum);
      const scrollbar = document.createElement("div");
      scrollbar.className = "clay-scrollbar";
      const spacer = document.createElement("div");
      spacer.style.height = `${Math.max(current.clip.height + 1, current.clip.contentBottom)}px`;
      scrollbar.appendChild(spacer);
      scrollbar.scrollTop = sidebarScrollTop;
      scrollbar.addEventListener("scroll", () => {
        const next = Math.min(scrollbar.scrollTop, sidebarScrollMaximum);
        if (Math.abs(next - sidebarScrollTop) < .5) return;
        sidebarScrollTop = next;
        scheduleRender();
      }, { passive: true });
      current.clip.element.appendChild(scrollbar);
      if (scrollMaximum > 0) {
        const track = document.createElement("div");
        track.className = "clay-scrollbar-visual";
        const thumb = document.createElement("div");
        thumb.className = "clay-scrollbar-thumb";
        const thumbHeight = Math.max(38, current.clip.height * current.clip.height / current.clip.contentBottom);
        const thumbTravel = Math.max(0, current.clip.height - thumbHeight);
        thumb.style.height = `${thumbHeight}px`;
        thumb.style.top = `${scrollMaximum > 0 ? sidebarScrollTop / scrollMaximum * thumbTravel : 0}px`;
        track.appendChild(thumb);
        current.clip.element.appendChild(track);
      }
      continue;
    }
    if (![1, 2, 3].includes(type)) continue;
    const current = stack[stack.length - 1];
    const userData = data.getUint32(command + 60, true);
    const marker = markerAt(userData);
    const isSourceLink = type === 3 && marker.startsWith("source-link");
    const isSymbolAnchor = type === 3 && (marker.startsWith("symbol-anchor") || marker.startsWith("anchor-item:"));
    const item = type === 3 && (marker.startsWith("item:") || marker.startsWith("anchor-item:"))
      ? /^(?:anchor-)?item:(\d+):([01]);/.exec(textAt(userData, 48)) : null;
    const fold = type === 3 && marker.startsWith("fold:")
      ? /^fold:(\d+):([01]):([01]);/.exec(textAt(userData, 48)) : null;
    const isCodeCopy = type === 3 && marker.startsWith("code-copy");
    const isCodeGlosso = type === 3 && marker.startsWith("code-glosso");
    const isGlossoSource = type === 3 && marker.startsWith("glosso-source") || isCodeGlosso;
    const isCodeSource = isCodeGlosso || type === 3 && marker.startsWith("code-source");
    const isHeading = type === 3 && (marker.startsWith("doc-heading") || marker.startsWith("page-title") || fold?.[3] === "1");
    const isPageTitle = isHeading && marker.startsWith("page-title");
    const route = type === 3 && marker.startsWith("route:")
      ? /^route:([01]):(-?\d+);/.exec(textAt(userData, 32)) : null;
    const isCodeViewport = type === 1 && marker.startsWith("code-viewport");
    const isTableViewport = type === 1 && marker.startsWith("table-scroll");
    const isAction = type === 3 && (marker.startsWith("action") || marker.startsWith("disabled"));
    const element = commandElement(
      `${type === 3 ? "clay-text" : ""}${isSourceLink ? " clay-source-link" : ""}${isCodeCopy ? " clay-code-copy" : ""}${isSymbolAnchor ? " clay-symbol-anchor" : ""}`,
      isSourceLink || route || item ? "a" : isCodeCopy || isAction || fold && !isHeading ? "button" : isHeading ? (isPageTitle ? "h1" : "h2") : "div",
    );
    element.style.left = `${Math.round(x - current.x)}px`;
    const scrollAdjustment = stack.length > 1 ? sidebarScrollTop : 0;
    element.style.top = `${Math.round(y - current.y - scrollAdjustment)}px`;
    element.style.width = `${Math.max(0, Math.round(width))}px`;
    element.style.height = `${Math.max(0, Math.round(height))}px`;
    element.style.zIndex = String(data.getInt16(command + 68, true));
    if (stack.length === 1) maximumY = Math.max(maximumY, y + height + 28);
    else current.clip.contentBottom = Math.max(current.clip.contentBottom, y - current.y + height);
    if (type === 1) {
      element.style.background = mappedColor(command + 16);
      cornerRadius(element, command + 32);
      if (isCodeViewport || isTableViewport) {
        element.classList.add("clay-scroll-region", isCodeViewport ? "clay-code-body" : "clay-table");
        element.dataset.id = String(data.getUint32(command + 64, true));
        element.removeAttribute("aria-hidden");
        element.setAttribute("role", "region");
        element.setAttribute("aria-label", isCodeViewport ? "Code example" : "Scrollable documentation table");
        element.tabIndex = 0;
        if (isCodeViewport) codeViewports.push({ element, x, y, height });
        else {
          const pageRight = Math.min(document.documentElement.clientWidth, 1300) - (document.documentElement.clientWidth >= 860 ? 32 : 16);
          element.style.width = `${Math.max(0, Math.min(width, pageRight - x))}px`;
          tableViewports.push({ element, x, y, height });
        }
      }
    } else if (type === 2) {
      const borderColor = mappedColor(command + 16);
      const widths = [48, 50, 52, 54].map(offset => data.getUint16(command + offset, true));
      element.style.borderLeft = `${widths[0]}px solid ${borderColor}`;
      element.style.borderRight = `${widths[1]}px solid ${borderColor}`;
      element.style.borderTop = `${widths[2]}px solid ${borderColor}`;
      element.style.borderBottom = `${widths[3]}px solid ${borderColor}`;
      cornerRadius(element, command + 32);
    } else {
      const textLength = data.getInt32(command + 16, true);
      const chars = data.getUint32(command + 20, true);
      const fontId = data.getUint16(command + 44, true);
      const fontSize = data.getUint16(command + 46, true);
      const letterSpacing = data.getUint16(command + 48, true);
      const lineHeight = data.getUint16(command + 50, true);
      const value = textAt(chars, textLength);
      element.removeAttribute("aria-hidden");
      if (isHeading) {
        const key = data.getUint32(command + 24, true);
        const group = headingGroups.get(key);
        if (group) {
          group.label += ` ${value}`;
          element.setAttribute("aria-hidden", "true");
        } else headingGroups.set(key, { element, label: fold ? value.replace(/^[▾▸]\s*/, "") : value, pageTitle: isPageTitle });
        element.classList.add("clay-heading");
      }
      if (route) {
        element.classList.add("clay-route-link");
        element.href = `#/${route[1] === "1" ? "std" : "manual"}${Number(route[2]) >= 0 ? `/${route[2]}` : ""}`;
      }
      if (item) {
        const symbol = referenceIndex.symbols[Number(item[1])];
        referenceScope = referenceLinker.context(symbol[4], Number(item[1]));
        element.classList.add("clay-route-link");
        element.href = `#/std/${symbol[4]}/${item[2] === "1" ? "type" : "item"}/${item[1]}`;
        if (symbol[5] === "method" && fontSize === 18) {
          const key = `item:${item[1]}`;
          const group = headingGroups.get(key);
          if (group) group.label += ` ${value}`;
          else headingGroups.set(key, { element, label: value, href: element.getAttribute("href") });
        }
      }
      if (fontId === 5 || fontId === 4) element.classList.add("clay-prose");
      const linkScope = !isSourceLink && !route && !item && !fold && !isHeading && !isAction && !isCodeCopy
        ? referenceScope : undefined;
      if (isGlossoSource) renderHighlighted(element, value, linkScope);
      else if (fontId === 5 || fontId === 4) renderProse(element, proseSegments(value, chars, data.getUint32(command + 24, true)), linkScope);
      else if (linkScope && tableViewports.some(viewport => y >= viewport.y && y + height <= viewport.y + viewport.height + 1 && x >= viewport.x))
        renderReferenceText(element, value, linkScope);
      else element.textContent = value;
      if (fold) {
        const control = isHeading ? document.createElement("button") : element;
        if (isHeading) {
          control.replaceChildren(...element.childNodes);
          element.appendChild(control);
        }
        control.classList.add("clay-fold");
        if (isHeading && element.getAttribute("aria-hidden") === "true") control.tabIndex = -1;
        control.type = "button";
        control.dataset.foldId = fold[1];
        control.setAttribute("aria-expanded", String(fold[2] === "1"));
        control.setAttribute("aria-label", `${fold[2] === "1" ? "Collapse" : "Expand"} ${value.replace(/^[▾▸]\s*/, "")}`);
        control.addEventListener("click", event => {
          event.stopPropagation();
          pointerDown = false;
          instance.exports.glo_manual_toggle_fold(Number(fold[1]));
          scheduleRender();
        });
      }
      if (isAction) {
        element.classList.add("clay-action");
        element.type = "button";
        element.disabled = marker.startsWith("disabled");
        element.dataset.actionId = String(data.getUint32(command + 64, true));
        element.addEventListener("click", event => {
          event.stopPropagation();
          pointerX = x + width / 2;
          pointerY = y + height / 2;
          pointerDown = true;
          renderFrame();
          pointerDown = false;
          renderFrame();
        });
      }
      if (isSourceLink) {
        element.href = sourceUrl(value);
        element.style.maxWidth = `${Math.max(0, document.documentElement.clientWidth - x - 16)}px`;
        element.style.textOverflow = "ellipsis";
        element.title = value;
        element.target = "_blank";
        element.rel = "noreferrer";
        element.removeAttribute("aria-hidden");
        element.setAttribute("aria-label", `Open ${value.replace(/\s*↗\s*$/, "")} on GitHub`);
      }
      if (isCodeCopy) {
        element.type = "button";
        element.removeAttribute("aria-hidden");
        element.setAttribute("aria-label", "Copy code");
        codeCopyButtons.push({ element, x, y });
      }
      if (isCodeSource) codeSources.push({ value, x, y, lineHeight: lineHeight || fontSize });
      element.style.color = mappedColor(command + 28);
      element.style.fontFamily = fonts[fontId] || fonts[0];
      element.style.fontSize = `${fontSize}px`;
      element.style.fontWeight = [1, 3, 4].includes(fontId) ? "700" : "400";
      element.style.letterSpacing = `${letterSpacing}px`;
      element.style.lineHeight = `${lineHeight || fontSize}px`;
    }
    const tableViewport = !isTableViewport && tableViewports.findLast(viewport => y >= viewport.y && y + height <= viewport.y + viewport.height + 1 && x >= viewport.x);
    const codeViewport = isCodeSource && codeViewports.findLast(viewport => y >= viewport.y && y < viewport.y + viewport.height);
    if (codeViewport) {
      element.style.left = `${Math.round(x - codeViewport.x)}px`;
      element.style.top = `${Math.round(y - codeViewport.y)}px`;
      codeViewport.element.appendChild(element);
    } else if (tableViewport) {
      element.style.left = `${Math.round(x - tableViewport.x)}px`;
      element.style.top = `${Math.round(y - tableViewport.y)}px`;
      tableViewport.element.appendChild(element);
    } else current.parent.appendChild(element);
  }
  const headings = [];
  const slugs = new Set();
  for (const heading of headingGroups.values()) {
    heading.element.setAttribute("aria-label", heading.label);
    if (heading.href) {
      headings.push({ label: heading.label, href: heading.href });
      continue;
    }
    const foldControl = heading.element.querySelector(".clay-fold");
    if (foldControl) foldControl.setAttribute("aria-label", `${foldControl.getAttribute("aria-expanded") === "true" ? "Collapse" : "Expand"} ${heading.label}`);
    if (heading.pageTitle) {
      const currentView = instance.exports.glo_manual_get_view();
      if (currentView === 1 && instance.exports.glo_manual_get_module() >= 0 &&
          instance.exports.glo_manual_get_symbol() < 0 && instance.exports.glo_manual_get_type() < 0)
        heading.label = referenceIndex.modules[instance.exports.glo_manual_get_module()][0];
      heading.element.setAttribute("aria-label", heading.label);
      document.title = `${heading.label} — Glosso`;
      continue;
    }
    const slug = heading.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
    let id = slug;
    for (let suffix = 2; slugs.has(id); suffix += 1) id = `${slug}-${suffix}`;
    slugs.add(id);
    heading.element.id = id;
    // The sidebar lists major sections; repeated parameter/field tables stay in the article.
    if (!["Parameters", "Fields", "Variants", "Flags"].includes(heading.label)) headings.push({ id, label: heading.label });
  }
  syncOutline(headings);
  for (let index = 0; index < codeCopyButtons.length; index += 1) {
    const button = codeCopyButtons[index];
    const nextY = codeCopyButtons[index + 1]?.y ?? Number.POSITIVE_INFINITY;
    const lines = codeSources
      .filter(source => source.y > button.y && source.y < nextY)
      .sort((left, right) => left.y - right.y || left.x - right.x);
    if (!lines.length) continue;
    let source = lines[0].value;
    for (let line = 1; line < lines.length; line += 1) {
      const previous = lines[line - 1];
      const breaks = Math.max(1, Math.round((lines[line].y - previous.y) / Math.max(1, lines[line].lineHeight)));
      source += `${"\n".repeat(breaks)}${lines[line].value}`;
    }
    bindCodeCopyButton(button.element, source);
  }
  const focused = scene.contains(document.activeElement) ? document.activeElement : null;
  const focusedLink = focused?.getAttribute("href");
  const focusedLinkOccurrence = focusedLink
    ? [...scene.querySelectorAll("a")].filter(link => link.getAttribute("href") === focusedLink).indexOf(focused) : -1;
  const focusedAction = focused?.dataset.actionId;
  const focusedFold = focused?.dataset.foldId;
  scene.replaceChildren(fragment);
  // Clay redraws on pointer movement. Preserve keyboard focus and code scrolling.
  if (focusedLink) [...scene.querySelectorAll("a")].filter(link => link.getAttribute("href") === focusedLink)[focusedLinkOccurrence]?.focus({ preventScroll: true });
  else if (focusedFold) scene.querySelector(`[data-fold-id="${focusedFold}"]`)?.focus({ preventScroll: true });
  else if (focusedAction) scene.querySelector(`[data-action-id="${focusedAction}"]`)?.focus({ preventScroll: true });
  else if (focused) scene.focus({ preventScroll: true });
  for (const viewport of [...codeViewports, ...tableViewports]) viewport.element.scrollLeft = codeScrollPositions.get(viewport.element.dataset.id) ?? 0;
  const activeScrollbar = scene.querySelector(".clay-scrollbar");
  if (activeScrollbar) activeScrollbar.scrollTop = sidebarScrollTop;
  scene.style.height = `${Math.ceil(maximumY)}px`;
  applyScrollRequest();
  if (pendingHeading) {
    document.getElementById(pendingHeading)?.scrollIntoView({ block: "start" });
    pendingHeading = "";
  }
}

// Navigation decided inside the Wasm frame — a search result, a module card,
// or an item link — cannot move the document itself, so the model records where the new
// article should start and the host applies it once the commands are in place.
function applyScrollRequest() {
  const request = instance.exports.glo_manual_get_scroll_request();
  if (!request) return;
  const anchor = request === 2 ? scene.querySelector(".clay-symbol-anchor") : null;
  const top = anchor
    ? anchor.getBoundingClientRect().top + window.scrollY - topbar.offsetHeight - 24
    : 0;
  window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
  instance.exports.glo_manual_clear_scroll_request();
}

function syncBrowserState() {
  const currentView = instance.exports.glo_manual_get_view();
  document.querySelectorAll("[data-view]").forEach(button => {
    if (Number(button.dataset.view) === currentView) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  const selectedIndex = currentView === 1
    ? instance.exports.glo_manual_get_module()
    : currentView === 0 ? instance.exports.glo_manual_get_section() : -1;
  const sidebarSelection = `${currentView}:${selectedIndex}:${instance.exports.glo_manual_get_symbol()}:${instance.exports.glo_manual_get_type()}`;
  if (sidebarSelection !== lastSidebarSelection) {
    lastSidebarSelection = sidebarSelection;
    syncNativeSidebar(currentView, selectedIndex);
  }
  if (applyingHash) return;
  const hash = documentRoute();
  const locationBase = location.hash.split("?")[0];
  if (location.hash !== hash && !(currentView !== 2 && locationBase === hash)) {
    const replace = replaceBrowserRoute || !location.hash || currentView === 2 && locationBase === "#/search";
    history[replace ? "replaceState" : "pushState"](null, "", hash);
  }
  replaceBrowserRoute = false;
  if (currentView !== 2) lastDocumentHash = location.hash;
}

function renderFrame(now = performance.now()) {
  pendingFrame = false;
  // Replacing a pressed native link/button cancels its browser click. A frame
  // already queued by hover, highlighting, or resize must wait for release.
  if (nativePointerPress) return;
  const delta = Math.min(.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  instance.exports.glo_main(
    scratchAddress,
    document.documentElement.clientWidth,
    Math.max(320, window.innerHeight - topbar.offsetHeight),
    pointerX,
    pointerY,
    pointerDown ? 1 : 0,
    delta,
  );
  renderCommands(scratchAddress);
  syncBrowserState();
}

function scheduleRender() {
  if (pendingFrame || !instance || nativePointerPress) return;
  pendingFrame = true;
  requestAnimationFrame(renderFrame);
}

function finishNativePointerPress() {
  if (!nativePointerPress) return;
  nativePointerPress = null;
  scheduleRender();
}

function deferNativePointerRelease(event) {
  const press = nativePointerPress;
  if (press?.pointerId !== event.pointerId) return;
  // A drag released outside the control may produce no click. Resume on the
  // next frame in that case, without ending a newer press with the same id.
  requestAnimationFrame(() => {
    if (nativePointerPress === press) finishNativePointerPress();
  });
}

function setView(nextView, focusSearch = false) {
  if (!instance) return;
  if (nextView === 2 && instance.exports.glo_manual_get_view() !== 2) lastDocumentHash = location.hash;
  instance.exports.glo_manual_set_view(nextView);
  if (nextView === 2) writeSearchResults(searchDocumentation(searchInput.value));
  window.scrollTo({ top: 0, behavior: "auto" });
  scheduleRender();
  setSidebarOpen(false);
  if (focusSearch) requestAnimationFrame(() => searchInput.focus());
}

function applyHash() {
  if (!instance) return;
  applyingHash = true;
  pointerDown = false;
  replaceBrowserRoute = true;
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, search = ""] = raw.split("?");
  const [route = "manual", id, section, item] = path.split("/");
  pendingHeading = new URLSearchParams(search).get("heading") ?? "";
  if (pendingHeading && `#/${path}` === documentRoute()) {
    applyingHash = false;
    setSidebarOpen(false);
    scheduleRender();
    return;
  }
  if (route === "std") {
    const module = id !== undefined && /^\d+$/.test(id) && Number(id) < referenceIndex.modules.length ? Number(id) : -1;
    instance.exports.glo_manual_select_module(module);
    const index = item !== undefined && /^\d+$/.test(item) ? Number(item) : -1;
    if (module >= 0 && referenceIndex.symbols[index]?.[4] === module) {
      if (section === "item") instance.exports.glo_manual_select_symbol(index);
      else if (section === "type") instance.exports.glo_manual_select_type(index);
    }
    // Old /declarations and /methods URLs resolve to the unified module index.
  }
  else if (route === "search") {
    const query = new URLSearchParams(search).get("q") ?? searchInput.value;
    searchInput.value = query;
    instance.exports.glo_manual_set_view(2);
    writeSearchResults(searchDocumentation(query));
  } else instance.exports.glo_manual_select_section(id !== undefined && Number.isInteger(Number(id)) && Number(id) >= 0 && Number(id) < referenceIndex.manual.length ? Number(id) : -1);
  applyingHash = false;
  setSidebarOpen(false);
  window.scrollTo({ top: 0, behavior: "auto" });
  scheduleRender();
}

function updatePointer(event) {
  const bounds = scene.getBoundingClientRect();
  pointerX = event.clientX - bounds.left;
  pointerY = event.clientY - bounds.top;
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const dark = theme === "dark";
  themeToggle.textContent = dark ? "☀" : "☾";
  themeToggle.title = dark ? "Use light mode" : "Use dark mode";
  themeToggle.setAttribute("aria-label", themeToggle.title);
  document.querySelector('meta[name="theme-color"]').content = dark ? "#171c22" : "#fffdf8";
  try { localStorage.setItem("glosso-theme", theme); } catch { /* Theme still applies without storage. */ }
  scheduleRender();
}

menuToggle.addEventListener("click", () => setSidebarOpen(!document.body.classList.contains("sidebar-open")));
sidebarBackdrop.addEventListener("click", () => setSidebarOpen(false, true));
setSidebarOpen(false);
document.querySelector("#help-toggle").addEventListener("click", () => searchHelp.showModal());
document.querySelector('.skip-link').addEventListener("click", event => {
  event.preventDefault();
  scene.focus();
  window.scrollTo({ top: 0, behavior: "auto" });
});
nativeSidebar.addEventListener("click", event => {
  if (event.target.closest("a")) {
    setSidebarOpen(false);
    if (event.target.closest('[data-view="2"]')) requestAnimationFrame(() => searchInput.focus());
  }
});
themeToggle.addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
searchInput.addEventListener("input", () => {
  if (!instance) return;
  if (instance.exports.glo_manual_get_view() !== 2) lastDocumentHash = location.hash;
  instance.exports.glo_manual_set_view(2);
  writeSearchResults(searchDocumentation(searchInput.value));
  scheduleRender();
});
nativeSidebarFilter.addEventListener("input", () => {
  if (nativeSidebarView < 0 || nativeSidebarView > 1) return;
  nativeSidebarQueries[nativeSidebarView] = nativeSidebarFilter.value;
  populateNativeSidebar(nativeSidebarView, nativeSidebarSelected);
});
window.addEventListener("keydown", event => {
  const editing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable;
  if (!searchHelp.open && ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" || event.key === "/" && !editing)) {
    event.preventDefault();
    setView(2, true);
  }
  if (event.key === "Escape" && !searchHelp.open) {
    if (document.body.classList.contains("sidebar-open")) setSidebarOpen(false, true);
    else if (instance?.exports.glo_manual_get_view() === 2) {
      searchInput.blur();
      location.hash = lastDocumentHash;
    }
  }
  if (event.key === "Tab" && isMobileLayout() && document.body.classList.contains("sidebar-open")) {
    const controls = [menuToggle, ...nativeSidebar.querySelectorAll('a, input, button')];
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
// Capture before code/table controls can stop propagation. Keep the DOM
// stable through the native click, including modified clicks and touch taps.
window.addEventListener("pointerdown", event => {
  if (scene.contains(event.target) && event.target.closest("a, button, input, textarea, select, .clay-scroll-region"))
    nativePointerPress = { pointerId: event.pointerId };
}, { capture: true });
window.addEventListener("pointerup", deferNativePointerRelease, { capture: true });
window.addEventListener("click", finishNativePointerPress, { capture: true });
window.addEventListener("pointercancel", finishNativePointerPress, { capture: true });
window.addEventListener("blur", finishNativePointerPress);
document.addEventListener("click", handleDocumentLink);
// Back/Forward updates the URL before hashchange. Apply its earlier popstate
// event so a queued redraw cannot push the previous Wasm route back to history.
window.addEventListener("popstate", applyHash);
window.addEventListener("hashchange", applyHash);
window.addEventListener("pointermove", event => {
  if (!scene.contains(event.target) || event.target.closest("a, button, .clay-scroll-region")) return;
  updatePointer(event);
  scheduleRender();
}, { passive: true });
window.addEventListener("pointerdown", event => {
  if (!scene.contains(event.target) || event.target.closest("a, button, .clay-scroll-region")) {
    pointerDown = false;
    return;
  }
  updatePointer(event);
  pointerDown = true;
  scheduleRender();
});
window.addEventListener("pointerup", event => {
  // A quick click can begin and end before the scheduled animation frame.
  // Clay must observe the pressed state to report a release to navigation.
  const nativeControl = event.target.closest("a, button, input, textarea, select");
  if (pointerDown && instance && !nativeControl) renderFrame();
  pointerDown = false;
  if (nativeSidebar.contains(event.target)) return;
  updatePointer(event);
  scheduleRender();
});
window.addEventListener("pointercancel", () => { pointerDown = false; scheduleRender(); });
window.addEventListener("resize", () => { setSidebarOpen(false); scheduleRender(); }, { passive: true });
window.addEventListener("wheel", event => {
  if (nativeSidebar.contains(event.target)) return;
  const bounds = scene.getBoundingClientRect();
  const localX = event.clientX - bounds.left;
  if (localX < 310 && sidebarScrollMaximum > 0) {
    const next = Math.max(0, Math.min(sidebarScrollMaximum, sidebarScrollTop + event.deltaY));
    if (next !== sidebarScrollTop) {
      sidebarScrollTop = next;
      event.preventDefault();
      scheduleRender();
    }
  }
}, { passive: false });

setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
initializeHighlighter();

const imports = {
  env: {
    abort() {
      throw new Error("The Glosso runtime aborted.");
    },
    write(file, address, length) {
      const output = textAt(address, length);
      if (file === 2) console.error(output);
      else console.log(output);
      return length;
    },
  },
  clay: {
    measureTextFunction(addressOfDimensions, textSlice, config) {
      const data = memoryView();
      const length = data.getUint32(textSlice, true);
      const chars = data.getUint32(textSlice + 4, true);
      const fontId = data.getUint16(config + 20, true);
      const fontSize = data.getUint16(config + 22, true);
      const letterSpacing = data.getUint16(config + 24, true);
      const value = textAt(chars, length);
      context.font = `${[1, 3, 4].includes(fontId) ? 700 : 400} ${fontSize}px ${fonts[fontId] || fonts[0]}`;
      const metrics = context.measureText(value);
      let measuredWidth = metrics.width;
      if (fontId === 5 || fontId === 4) {
        const baseChars = data.getUint32(textSlice + 8, true);
        measuredWidth = proseSegments(value, chars, baseChars).reduce((total, segment) => {
          context.font = segment.code
            ? `${[1, 3, 4].includes(fontId) ? 700 : 400} ${fontSize * .84}px ${fonts[2]}`
            : `${fontId === 4 ? 700 : 400} ${fontSize}px ${fonts[fontId]}`;
          return total + context.measureText(segment.text).width;
        }, 0);
      }
      const width = measuredWidth + Math.max(0, value.length - 1) * letterSpacing;
      const height = (metrics.fontBoundingBoxAscent || fontSize * .8) + (metrics.fontBoundingBoxDescent || fontSize * .2);
      data.setFloat32(addressOfDimensions, width, true);
      data.setFloat32(addressOfDimensions + 4, height, true);
    },
    queryScrollOffsetFunction(addressOfOffset) {
      const data = memoryView();
      data.setFloat32(addressOfOffset, 0, true);
      data.setFloat32(addressOfOffset + 4, -sidebarScrollTop, true);
    },
  },
};

try {
  const response = await fetch("manual.wasm");
  if (!response.ok) throw new Error(`Could not load manual.wasm (${response.status})`);
  const bytes = await response.arrayBuffer();
  ({ instance } = await WebAssembly.instantiate(bytes, imports));
  initializeClay();
  loading.hidden = true;
  applyHash();
  renderFrame();
} catch (error) {
  loading.hidden = true;
  const message = document.createElement("pre");
  message.id = "error";
  message.textContent = `The manual could not start.\n\n${error?.stack || error}`;
  scene.replaceChildren(message);
  console.error(error);
}
