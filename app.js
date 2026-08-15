import { Language, Parser, Query } from "./web-tree-sitter.js";
import { referenceIndex } from "./reference-index.js";

// BEGIN GENERATED TREE-SITTER QUERY
const GLOSSO_HIGHLIGHTS_QUERY = "[\r\n  \"if\"\r\n  \"ifx\"\r\n  \"else\"\r\n  \"while\"\r\n  \"for\"\r\n  \"return\"\r\n  \"break\"\r\n  \"continue\"\r\n  \"struct\"\r\n  \"union\"\r\n  \"enum\"\r\n  \"enum_flags\"\r\n  \"using\"\r\n  \"noalias\"\r\n  \"defer\"\r\n  \"where\"\r\n  \"cast\"\r\n  \"acast\"\r\n  \"typeclass\"\r\n  \"instance\"\r\n  \"distinct\"\r\n] @keyword\r\n\r\n[\r\n  \"#comptime\"\r\n  \"#lazy\"\r\n  \"#import\"\r\n  \"#load\"\r\n  \"#private_section\"\r\n  \"#thread_local\"\r\n  \"#library\"\r\n  \"#fn_ptr\"\r\n  \"#as\"\r\n  \"#empty\"\r\n  \"#raw\"\r\n  \"#aos\"\r\n  \"#soa\"\r\n  \"#operator\"\r\n  \"#precedence\"\r\n  \"#modify\"\r\n  \"#expand\"\r\n  \"#magic\"\r\n  \"#foreign\"\r\n  \"#memory\"\r\n  \"#c_call\"\r\n  \"#packed\"\r\n  \"#no_context\"\r\n  \"#dump\"\r\n  \"#fallback\"\r\n  \"#must\"\r\n  \"#noreturn\"\r\n  \"#returns_twice\"\r\n  \"#inline\"\r\n  \"#bytes\"\r\n  \"#asm\"\r\n  \"#push_context\"\r\n  \"#push_allocator\"\r\n  \"#if\"\r\n  \"#insert\"\r\n  \"#compile_error\"\r\n  \"#pattern\"\r\n  \"#try\"\r\n  \"#minimal\"\r\n  \"#falling\"\r\n  \"#meaningful\"\r\n  \"#code\"\r\n  \"#string\"\r\n  \"#simd\"\r\n  \"#enable\"\r\n  \"#disable\"\r\n  \"#derive\"\r\n  \"#assert\"\r\n] @attribute\r\n\r\n(from_directive) @attribute\r\n(comptime_modifier) @attribute\r\n\r\n(comment) @comment\r\n(string_literal) @string\r\n(multiline_string_line) @string\r\n(char_literal) @character\r\n(integer_literal) @number\r\n(float_literal) @number.float\r\n(boolean_literal) @boolean\r\n(null_literal) @constant.builtin\r\n(label_none_literal) @constant.builtin\r\n(context_expression) @constant.builtin\r\n(context_type) @type.builtin\r\n\r\n; Give every identifier a baseline capture first. Context-specific captures below\r\n; must come later so clients that resolve overlapping captures by query order do\r\n; not paint functions, parameters, properties, and types as plain variables.\r\n(identifier) @variable\r\n(code_splice_identifier) @variable\r\n(non_hygienic_identifier) @variable\r\n(label) @label\r\n(quoted_operator) @operator\r\n(operator) @operator\r\n(prefix_operator) @operator\r\n(suffix_operator) @operator\r\n(range_operator) @operator\r\n(binding_operator) @operator\r\n(constant_pattern_operator) @operator\r\n(try_operator) @operator\r\n\r\n; Types\r\n(named_type [\r\n  (identifier)\r\n  (code_splice_identifier)\r\n] @type)\r\n(generic_type\r\n  name: [\r\n    (identifier)\r\n    (code_splice_identifier)\r\n  ] @type)\r\n(generic_type\r\n  member: [\r\n    (identifier)\r\n    (code_splice_identifier)\r\n  ] @type)\r\n(generic_type_variable\r\n  name: (identifier) @type)\r\n(type_constructor_pattern [\r\n  (identifier)\r\n  (code_splice_identifier)\r\n] @type)\r\n(generic_type_constructor_pattern\r\n  name: [\r\n    (identifier)\r\n    (code_splice_identifier)\r\n  ] @type)\r\n(instance_declaration\r\n  class: (identifier) @type)\r\n\r\n(named_declaration\r\n  name: (declaration_name [\r\n    (identifier)\r\n    (code_splice_identifier)\r\n  ] @type.definition)\r\n  [\r\n    (function_pointer_type_declaration)\r\n    (typeclass_declaration)\r\n    (distinct_type_declaration)\r\n    (struct_declaration)\r\n    (enum_flags_declaration)\r\n    (enum_declaration)\r\n    (union_declaration)\r\n  ])\r\n(nested_declaration\r\n  name: (declaration_name [\r\n    (identifier)\r\n    (code_splice_identifier)\r\n  ] @type.definition)\r\n  [\r\n    (struct_declaration)\r\n    (enum_declaration)\r\n    (union_declaration)\r\n  ])\r\n(typeclass_associated_type\r\n  name: (declaration_name [\r\n    (identifier)\r\n    (code_splice_identifier)\r\n  ] @type.definition))\r\n(instance_associated_type\r\n  name: (declaration_name [\r\n    (identifier)\r\n    (code_splice_identifier)\r\n  ] @type.definition))\r\n\r\n; Parameters\r\n(named_argument name: (identifier) @variable.parameter)\r\n(typeclass_parameter name: (identifier) @variable.parameter)\r\n(lambda_parameter name: (identifier) @variable.parameter)\r\n(parameter\r\n  name: (binding_list [\r\n    (identifier)\r\n    (code_splice_identifier)\r\n    (non_hygienic_identifier)\r\n  ] @variable.parameter))\r\n(parameter\r\n  name: [\r\n    (identifier)\r\n    (code_splice_identifier)\r\n    (non_hygienic_identifier)\r\n  ] @variable.parameter)\r\n(comptime_parameter\r\n  name: (binding_list [\r\n    (identifier)\r\n    (code_splice_identifier)\r\n    (non_hygienic_identifier)\r\n  ] @variable.parameter))\r\n(fn_ptr_parameter name: (identifier) @variable.parameter)\r\n(function_type\r\n  (type_element name: (identifier) @variable.parameter))\r\n(structured_asm_input_operand name: (identifier) @variable.parameter)\r\n(structured_asm_output_operand name: (identifier) @variable.parameter)\r\n\r\n; Properties\r\n(struct_field name: (identifier) @property)\r\n(union_field name: (identifier) @property)\r\n(enum_variant name: (identifier) @constant)\r\n(struct_literal_field name: (identifier) @property)\r\n(struct_pattern_field name: (identifier) @property)\r\n(shorthand_member_expression field: (identifier) @property)\r\n(shorthand_member_pattern field: (identifier) @property)\r\n(postfix_expression field: (identifier) @property)\r\n(pattern_postfix_expression field: (identifier) @property)\r\n\r\n; Functions\r\n(named_declaration\r\n  name: (declaration_name [\r\n    (identifier)\r\n    (code_splice_identifier)\r\n    (quoted_operator)\r\n  ] @function)\r\n  (function_declaration))\r\n(nested_declaration\r\n  name: (declaration_name [\r\n    (identifier)\r\n    (code_splice_identifier)\r\n    (quoted_operator)\r\n  ] @function)\r\n  (function_declaration))\r\n(typeclass_method_signature\r\n  name: (declaration_name [\r\n    (identifier)\r\n    (code_splice_identifier)\r\n    (quoted_operator)\r\n  ] @function))\r\n(instance_method\r\n  name: (declaration_name [\r\n    (identifier)\r\n    (code_splice_identifier)\r\n    (quoted_operator)\r\n  ] @function))\r\n(postfix_expression\r\n  function: [\r\n    (identifier)\r\n    (code_splice_identifier)\r\n    (non_hygienic_identifier)\r\n  ] @function.call)\r\n(postfix_expression\r\n  function: (postfix_expression\r\n    field: [\r\n      (identifier)\r\n      (code_splice_identifier)\r\n    ] @function.method.call))\r\n(memory_argument_reference\r\n  function: (identifier) @function.call)\r\n\r\n(library_modifier) @attribute\r\n(inline_modifier) @attribute\r\n(string_modifier) @attribute\r\n(partial_directive) @attribute\r\n(pattern_rest) @operator\r\n(matrix_type \"Matrix\" @type.builtin)\r\n(simd_type \"Simd\" @type.builtin)\r\n(variadic_constraint (identifier) @type)\r\n(minimal_method (identifier) @function)\r\n(memory_simple_effect) @attribute\r\n(memory_parameter_effect_kind) @attribute\r\n(memory_borrow_place_effect \"returns_borrow\" @attribute)\r\n(memory_release_effect \"released_by\" @attribute)\r\n(memory_resource_effect [\"resource\" \"released_by\"] @attribute)\r\n(asm_operand_direction) @keyword\r\n(structured_asm_constraint_kind) @constant.builtin\r\n(structured_asm_operand_flag) @attribute\r\n(structured_asm_clobber_kind) @constant.builtin\r\n(import_selector mode: _ @attribute)\r\n(expand_directive mode: (identifier) @attribute)\r\n(distinct_derive_directive mode: _ @attribute)\r\n";
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
const canvas = document.querySelector("#measure");
const context = canvas.getContext("2d");
const decoder = new TextDecoder("utf-8");
const encoder = new TextEncoder();
const fonts = [
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  '"Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
  '"Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
  'Georgia, Cambria, "Times New Roman", serif',
];
const keywordSet = new Set([
  "acast", "break", "case", "cast", "continue", "defer", "do", "else", "enum", "enum_flags",
  "fallthrough", "for", "if", "import", "in", "instance", "match", "noalias", "return", "struct",
  "switch", "typeclass", "union", "using", "where", "while",
]);
const primitiveTypes = new Set([
  "any", "bool", "Code", "cstring", "cstring16", "f16", "f32", "f64", "f80", "f128", "int",
  "label", "s8", "s16", "s32", "s64", "s128", "string", "string16", "type", "u8", "u16",
  "u32", "u64", "u128", "uint", "void",
]);

let instance;
let view;
let scratchAddress = 0;
let searchBridgeAddress = 0;
let pointerX = 0;
let pointerY = 0;
let pointerDown = false;
let pendingFrame = false;
let lastFrame = performance.now();
let parser;
let highlightQuery;
let highlighterMode = "loading";
let applyingHash = false;
let sidebarScrollTop = 0;
let sidebarScrollMaximum = 0;
let lastSidebarSelection = "";
let nativeSidebarView = -1;
let nativeSidebarSelected = -2;
const nativeSidebarQueries = ["", ""];
const highlightCache = new Map();

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
  if (lower.includes("comment")) return "tok-comment";
  if (lower.includes("string") || /^"/.test(text)) return "tok-string";
  if (lower.includes("number") || lower.includes("integer") || lower.includes("float") || /^\d/.test(text)) return "tok-number";
  if (text.startsWith("#")) return "tok-directive";
  if (keywordSet.has(text)) return "tok-keyword";
  if (primitiveTypes.has(text) || /(?:type|struct|union|enum)/.test(lower)) return "tok-type";
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

function renderHighlighted(element, source) {
  let tokens = highlightCache.get(source);
  if (!tokens || tokens.mode !== highlighterMode) {
    tokens = { mode: highlighterMode, values: highlight(source) };
    highlightCache.set(source, tokens);
  }
  for (const token of tokens.values) {
    const span = document.createElement("span");
    span.textContent = token.text;
    if (token.className) span.className = token.className;
    element.appendChild(span);
  }
}

async function initializeHighlighter() {
  try {
    await Parser.init({ locateFile: () => new URL("./web-tree-sitter.wasm", import.meta.url).href });
    const language = await Language.load(new URL("./tree-sitter-glosso.wasm", import.meta.url).href);
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
    const stars = value.match(/^\*+/)?.[0] ?? "*";
    value = value.slice(stars.length).replace(/^(?:const|volatile)\s+/, "").trim();
    return { name: stars, args: [parseType(value)] };
  }
  const array = value.match(/^(\[(?:\*|\.\.|[^\]]*)\])(.*)$/);
  if (array) return { name: array[1].replace(/\s/g, ""), args: [parseType(array[2])] };
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
  const numeric = /^(?:int|uint|[su](?:8|16|32|64|128)|f(?:16|32|64|80|128))$/i;
  const floating = /^f(?:16|32|64|80|128)$/i;
  const integer = /^(?:int|uint|[su](?:8|16|32|64|128))$/i;
  const strings = /^(?:string|cstring|string16|cstring16)$/i;
  for (const match of where.matchAll(/\b(Floating|Fractional|RealFloat|Num|BitArithmetic)\s*\(\s*\$?([A-Z][A-Za-z0-9_]*)/g)) {
    const actual = bindings.get(match[2]);
    if (!actual) continue;
    if (/^(?:Floating|Fractional|RealFloat)$/.test(match[1]) && !floating.test(actual)) return false;
    if (match[1] === "Num" && !numeric.test(actual)) return false;
    if (match[1] === "BitArithmetic" && !integer.test(actual)) return false;
  }
  for (const match of where.matchAll(/\b(Is_Bool|Is_Complex|Is_Float|Is_Integer|Is_Numeric|Is_Pointer|Is_Procedure|Is_Simd|Is_String)\s*\(\s*\$?([A-Z][A-Za-z0-9_]*)/g)) {
    const actual = bindings.get(match[2]);
    if (!actual) continue;
    if (match[1] === "Is_Bool" && actual.toLowerCase() !== "bool") return false;
    if (match[1] === "Is_Complex" && !/^complex(?:32|64|128)?$/i.test(actual)) return false;
    if (match[1] === "Is_Float" && !floating.test(actual)) return false;
    if (match[1] === "Is_Integer" && !integer.test(actual)) return false;
    if (match[1] === "Is_Numeric" && !numeric.test(actual)) return false;
    if (match[1] === "Is_Pointer" && !/^(?:\*|\[\*\])/.test(actual)) return false;
    if (match[1] === "Is_Procedure" && !/(?:->|fn_ptr)/i.test(actual)) return false;
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

function nativeSidebarEntries(currentView) {
  if (currentView === 1) return referenceIndex.modules.map((module, index) => ({ index, label: module[0] }));
  return referenceIndex.manual.map((section, index) => ({ index, label: section[0] }));
}

function nativeSidebarButton(entry, selectedIndex) {
  const button = document.createElement("button");
  button.className = "native-sidebar-item";
  button.type = "button";
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
      if (selectedBounds.top < sidebarBounds.top + 138 || selectedBounds.bottom > sidebarBounds.bottom - 16) {
        selected.scrollIntoView({ block: "center", behavior: "auto" });
      }
    });
  }
}

function syncNativeSidebar(currentView, selectedIndex) {
  if (currentView === 2) {
    nativeSidebar.hidden = true;
    nativeSidebarView = currentView;
    nativeSidebarSelected = selectedIndex;
    return;
  }

  nativeSidebar.hidden = false;
  const viewChanged = nativeSidebarView !== currentView;
  const selectionChanged = nativeSidebarSelected !== selectedIndex;
  nativeSidebarView = currentView;
  nativeSidebarSelected = selectedIndex;
  nativeSidebarTitle.textContent = currentView === 1 ? "MODULES" : "CHAPTERS";
  nativeSidebarFilter.placeholder = currentView === 1 ? "Filter modules..." : "Filter chapters...";
  nativeSidebarFilter.value = nativeSidebarQueries[currentView] ?? "";
  nativeSidebarIndex.textContent = currentView === 1 ? "Library index" : "Manual index";
  nativeSidebarIndex.toggleAttribute("aria-current", currentView === 1 && selectedIndex < 0);
  if (viewChanged) nativeSidebar.scrollTop = 0;
  populateNativeSidebar(currentView, selectedIndex, selectionChanged && !viewChanged);
}

function renderCommands(arrayAddress) {
  const data = memoryView();
  const length = data.getInt32(arrayAddress + 4, true);
  const commands = data.getUint32(arrayAddress + 8, true);
  const fragment = document.createDocumentFragment();
  const stack = [{ parent: fragment, x: 0, y: 0, clip: null }];
  const codeCopyButtons = [];
  const codeSources = [];
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
    const isCodeCopy = type === 3 && marker.startsWith("code-copy");
    const isCodeGlosso = type === 3 && marker.startsWith("code-glosso");
    const isGlossoSource = type === 3 && marker.startsWith("glosso-source") || isCodeGlosso;
    const isCodeSource = isCodeGlosso || type === 3 && marker.startsWith("code-source");
    const element = commandElement(
      `${type === 3 ? "clay-text" : ""}${isSourceLink ? " clay-source-link" : ""}${isCodeCopy ? " clay-code-copy" : ""}`,
      isSourceLink ? "a" : isCodeCopy ? "button" : "div",
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
      if (isGlossoSource) renderHighlighted(element, value);
      else element.textContent = value;
      if (isSourceLink) {
        element.href = sourceUrl(value);
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
    current.parent.appendChild(element);
  }
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
  scene.replaceChildren(fragment);
  const activeScrollbar = scene.querySelector(".clay-scrollbar");
  if (activeScrollbar) activeScrollbar.scrollTop = sidebarScrollTop;
  scene.style.height = `${Math.ceil(maximumY)}px`;
}

function syncBrowserState() {
  const currentView = instance.exports.glo_manual_get_view();
  document.querySelectorAll("[data-view]").forEach(button => {
    if (button.classList.contains("nav-button")) button.toggleAttribute("aria-current", Number(button.dataset.view) === currentView);
  });
  const selectedIndex = currentView === 1
    ? instance.exports.glo_manual_get_module()
    : currentView === 0 ? instance.exports.glo_manual_get_section() : -1;
  const sidebarSelection = `${currentView}:${selectedIndex}`;
  if (sidebarSelection !== lastSidebarSelection) {
    lastSidebarSelection = sidebarSelection;
    syncNativeSidebar(currentView, selectedIndex);
  }
  if (applyingHash) return;
  let hash;
  if (currentView === 1) {
    const module = instance.exports.glo_manual_get_module();
    hash = `#/std${module >= 0 ? `/${module}` : ""}`;
  } else if (currentView === 2) {
    hash = `#/search${searchInput.value ? `?q=${encodeURIComponent(searchInput.value)}` : ""}`;
  } else {
    hash = `#/manual/${instance.exports.glo_manual_get_section()}`;
  }
  if (location.hash !== hash) history.replaceState(null, "", hash);
}

function renderFrame(now = performance.now()) {
  pendingFrame = false;
  const delta = Math.min(.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  instance.exports.glo_main(
    scratchAddress,
    window.innerWidth,
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
  if (pendingFrame || !instance) return;
  pendingFrame = true;
  requestAnimationFrame(renderFrame);
}

function setView(nextView, focusSearch = false) {
  if (!instance) return;
  instance.exports.glo_manual_set_view(nextView);
  if (nextView === 2) writeSearchResults(searchDocumentation(searchInput.value));
  window.scrollTo({ top: 0, behavior: "auto" });
  scheduleRender();
  if (focusSearch) requestAnimationFrame(() => searchInput.focus());
}

function applyHash() {
  if (!instance) return;
  applyingHash = true;
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, search = ""] = raw.split("?");
  const [route = "manual", id] = path.split("/");
  if (route === "std") instance.exports.glo_manual_select_module(id === undefined ? -1 : Number(id));
  else if (route === "search") {
    const query = new URLSearchParams(search).get("q") ?? searchInput.value;
    searchInput.value = query;
    instance.exports.glo_manual_set_view(2);
    writeSearchResults(searchDocumentation(query));
  } else instance.exports.glo_manual_select_section(Number.isFinite(Number(id)) ? Number(id) : 0);
  applyingHash = false;
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
  document.querySelector('meta[name="theme-color"]').content = dark ? "#11151c" : "#f6f5f1";
  try { localStorage.setItem("glosso-theme", theme); } catch { /* Theme still applies without storage. */ }
  scheduleRender();
}

document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => setView(Number(button.dataset.view), Number(button.dataset.view) === 2)));
themeToggle.addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
searchInput.addEventListener("focus", () => setView(2));
searchInput.addEventListener("input", () => {
  if (!instance) return;
  instance.exports.glo_manual_set_view(2);
  writeSearchResults(searchDocumentation(searchInput.value));
  scheduleRender();
});
nativeSidebarFilter.addEventListener("input", () => {
  if (nativeSidebarView < 0 || nativeSidebarView > 1) return;
  nativeSidebarQueries[nativeSidebarView] = nativeSidebarFilter.value;
  populateNativeSidebar(nativeSidebarView, nativeSidebarSelected);
});
nativeSidebarItems.addEventListener("click", event => {
  const button = event.target.closest(".native-sidebar-item");
  if (!button || !instance) return;
  const index = Number(button.dataset.index);
  if (nativeSidebarView === 1) instance.exports.glo_manual_select_module(index);
  else instance.exports.glo_manual_select_section(index);
  window.scrollTo({ top: 0, behavior: "auto" });
  scheduleRender();
});
nativeSidebarIndex.addEventListener("click", () => {
  if (!instance) return;
  if (nativeSidebarView === 1) instance.exports.glo_manual_select_module(-1);
  else instance.exports.glo_manual_select_section(0);
  window.scrollTo({ top: 0, behavior: "auto" });
  scheduleRender();
});
window.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" || event.key === "/" && !/^(INPUT|TEXTAREA)$/.test(event.target.tagName)) {
    event.preventDefault();
    setView(2, true);
  }
});
window.addEventListener("hashchange", applyHash);
window.addEventListener("pointermove", event => {
  if (nativeSidebar.contains(event.target)) return;
  updatePointer(event);
  scheduleRender();
}, { passive: true });
window.addEventListener("pointerdown", event => {
  if (nativeSidebar.contains(event.target)) {
    pointerDown = false;
    return;
  }
  updatePointer(event);
  pointerDown = true;
  scheduleRender();
});
window.addEventListener("pointerup", event => {
  pointerDown = false;
  if (nativeSidebar.contains(event.target)) return;
  updatePointer(event);
  scheduleRender();
});
window.addEventListener("pointercancel", () => { pointerDown = false; scheduleRender(); });
window.addEventListener("resize", scheduleRender, { passive: true });
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
      const width = metrics.width + Math.max(0, value.length - 1) * letterSpacing;
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
