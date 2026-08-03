import type { StdSymbol } from "../types";

type TypeNode = {
  name: string;
  args: TypeNode[];
};

type ParsedSignature = {
  inputs: TypeNode[];
  output: TypeNode;
};

export type SignatureMatch = {
  symbol: StdSymbol;
  score: number;
  reason: string;
};

function splitTopLevel(value: string, delimiter = ","): string[] {
  const parts: string[] = [];
  let start = 0;
  let round = 0;
  let square = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "(") round += 1;
    else if (char === ")") round -= 1;
    else if (char === "[") square += 1;
    else if (char === "]") square -= 1;
    else if (char === delimiter && round === 0 && square === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

function outerParens(value: string): boolean {
  if (!value.startsWith("(") || !value.endsWith(")")) return false;
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "(") depth += 1;
    else if (value[index] === ")" && --depth === 0) return index === value.length - 1;
  }
  return false;
}

function parseType(raw: string): TypeNode {
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
  if (call && outerParens(`(${call[2]})`)) {
    return { name: call[1], args: splitTopLevel(call[2]).map(parseType) };
  }
  return { name: value.replace(/\s/g, ""), args: [] };
}

function arrowIndex(value: string): number {
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

function parseSignature(value: string): ParsedSignature | undefined {
  const arrow = arrowIndex(value);
  if (arrow < 0) return undefined;
  let left = value.slice(0, arrow).trim();
  const right = value.slice(arrow + 2).trim();
  if (!right) return undefined;
  if (outerParens(left)) left = left.slice(1, -1);
  const inputs = left ? splitTopLevel(left).map(parseType) : [];
  return { inputs, output: parseType(right) };
}

function serialize(node: TypeNode): string {
  return node.args.length ? `${node.name}(${node.args.map(serialize).join(",")})` : node.name;
}

function candidateVariable(name: string): boolean {
  const clean = name.replace(/^\$/, "");
  return /^([A-Z]|[A-Z][A-Za-z0-9_]*T)$/.test(clean) || /^T[0-9]*$/.test(clean);
}

function queryWildcard(name: string): boolean {
  return name === "_" || /^[a-z]$/.test(name);
}

function unify(
  query: TypeNode,
  candidate: TypeNode,
  bindings: Map<string, string>,
  queryBindings: Map<string, string>,
): { matches: boolean; genericCount: number } {
  if (queryWildcard(query.name) && query.args.length === 0) {
    if (query.name === "_") return { matches: true, genericCount: 1 };
    const key = `?${query.name}`;
    const value = serialize(candidate).toLowerCase();
    const bound = queryBindings.get(key);
    if (bound && bound !== value) return { matches: false, genericCount: 0 };
    queryBindings.set(key, value);
    return { matches: true, genericCount: 1 };
  }
  if (candidateVariable(candidate.name) && candidate.args.length === 0) {
    const key = candidate.name.replace(/^\$/, "");
    const value = serialize(query).toLowerCase();
    const bound = bindings.get(key);
    if (bound && bound !== value) return { matches: false, genericCount: 0 };
    bindings.set(key, value);
    return { matches: true, genericCount: 1 };
  }
  if (query.name.toLowerCase() !== candidate.name.toLowerCase() || query.args.length !== candidate.args.length) {
    return { matches: false, genericCount: 0 };
  }
  let genericCount = 0;
  for (let index = 0; index < query.args.length; index += 1) {
    const result = unify(query.args[index], candidate.args[index], bindings, queryBindings);
    if (!result.matches) return result;
    genericCount += result.genericCount;
  }
  return { matches: true, genericCount };
}

function constraintsAllow(signature: string, bindings: Map<string, string>): boolean {
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

export function findSignatureMatches(query: string, symbols: StdSymbol[]): SignatureMatch[] {
  const parsedQuery = parseSignature(query);
  if (!parsedQuery) return [];
  const matches: SignatureMatch[] = [];
  for (const symbol of symbols) {
    if (!symbol.searchableSignature || /#modify\b/.test(symbol.signature)) continue;
    const candidate = parseSignature(symbol.searchableSignature);
    if (!candidate || candidate.inputs.length !== parsedQuery.inputs.length) continue;
    const bindings = new Map<string, string>();
    const queryBindings = new Map<string, string>();
    let generics = 0;
    let valid = true;
    for (let index = 0; index < parsedQuery.inputs.length; index += 1) {
      const result = unify(parsedQuery.inputs[index], candidate.inputs[index], bindings, queryBindings);
      if (!result.matches) {
        valid = false;
        break;
      }
      generics += result.genericCount;
    }
    if (!valid) continue;
    const output = unify(parsedQuery.output, candidate.output, bindings, queryBindings);
    if (!output.matches) continue;
    generics += output.genericCount;
    if (!constraintsAllow(symbol.signature, bindings)) continue;
    const exact = symbol.searchableSignature.replace(/\s/g, "").toLowerCase() === query.replace(/\s/g, "").toLowerCase();
    matches.push({
      symbol,
      score:
        (exact ? 100 : 80) -
        generics +
        (symbol.kind === "function" ? 3 : 0) -
        (symbol.name.startsWith("__") ? 20 : 0),
      reason: exact ? "Exact signature" : generics ? "Generic signature" : "Compatible signature",
    });
  }
  return matches.sort((left, right) => right.score - left.score || left.symbol.name.localeCompare(right.symbol.name));
}

export function isSignatureQuery(query: string): boolean {
  return arrowIndex(query) >= 0;
}
