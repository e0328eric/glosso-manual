import { ref } from "vue";
import type { Node, Parser as TreeSitterParser } from "web-tree-sitter";
import { keywords } from "../generated/docs";

export type HighlightToken = { text: string; className: string };
export type HighlighterState = "loading" | "wasm" | "fallback";

export const highlighterState = ref<HighlighterState>("loading");

let parserPromise: Promise<TreeSitterParser> | undefined;
const keywordSet = new Set(keywords);
const primitiveTypes = new Set([
  "any",
  "bool",
  "Code",
  "cstring",
  "cstring16",
  "f16",
  "f32",
  "f64",
  "f80",
  "f128",
  "int",
  "label",
  "s8",
  "s16",
  "s32",
  "s64",
  "s128",
  "string",
  "string16",
  "type",
  "u8",
  "u16",
  "u32",
  "u64",
  "u128",
  "uint",
  "void",
]);

async function getParser(): Promise<TreeSitterParser> {
  parserPromise ??= (async () => {
    const { Language, Parser } = await import("web-tree-sitter");
    const base = import.meta.env.BASE_URL;
    await Parser.init({ locateFile: () => `${base}tree-sitter.wasm` });
    const language = await Language.load(`${base}tree-sitter-glosso.wasm`);
    const parser = new Parser();
    parser.setLanguage(language);
    highlighterState.value = "wasm";
    return parser;
  })().catch((error: unknown) => {
    highlighterState.value = "fallback";
    parserPromise = undefined;
    throw error;
  });
  return parserPromise;
}

function byteMap(source: string): number[] {
  const map: number[] = [0];
  let byteOffset = 0;
  let stringOffset = 0;
  for (const character of source) {
    const bytes = new TextEncoder().encode(character).length;
    for (let count = 0; count < bytes; count += 1) map[byteOffset + count] = stringOffset;
    byteOffset += bytes;
    stringOffset += character.length;
    map[byteOffset] = stringOffset;
  }
  return map;
}

function classFor(type: string, text: string): string {
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

function fallbackTokens(source: string): HighlightToken[] {
  const pattern = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|#(?:[A-Za-z_]\w*)|\b(?:\d+(?:_\d+)*(?:\.\d+(?:_\d+)*)?(?:[eE][+-]?\d+(?:_\d+)*)?|\d+#\w+)\b|\b[A-Za-z_]\w*\b|[^\s\w]+|\s+)/g;
  return [...source.matchAll(pattern)].map((match) => ({
    text: match[0],
    className: classFor("", match[0]),
  }));
}

function leaves(root: Node): Node[] {
  const result: Node[] = [];
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    if (node.childCount === 0) result.push(node);
    else {
      for (let index = node.childCount - 1; index >= 0; index -= 1) {
        const child = node.child(index);
        if (child) stack.push(child);
      }
    }
  }
  return result.sort((left, right) => left.startIndex - right.startIndex);
}

export async function highlight(source: string): Promise<HighlightToken[]> {
  try {
    const parser = await getParser();
    const tree = parser.parse(source);
    if (!tree) return fallbackTokens(source);
    const offsets = byteMap(source);
    const tokens: HighlightToken[] = [];
    let cursor = 0;
    for (const node of leaves(tree.rootNode)) {
      const start = offsets[node.startIndex] ?? node.startIndex;
      const end = offsets[node.endIndex] ?? node.endIndex;
      if (start > cursor) tokens.push({ text: source.slice(cursor, start), className: "" });
      if (end > start) {
        const text = source.slice(start, end);
        tokens.push({ text, className: classFor(node.type, text) });
        cursor = Math.max(cursor, end);
      }
    }
    if (cursor < source.length) tokens.push({ text: source.slice(cursor), className: "" });
    tree.delete();
    return tokens.length ? tokens : fallbackTokens(source);
  } catch {
    return fallbackTokens(source);
  }
}
