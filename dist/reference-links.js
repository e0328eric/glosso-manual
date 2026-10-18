// Resolve documentation references against the same index used by search and
// item routes. An ambiguous name must never silently open an unrelated API.
export function createReferenceLinker(index) {
  const names = new Map();
  const methods = new Map();
  const modulePaths = index.modules.map(module => module[0].split("/"));
  const canonical = name => name.replace(/(?<=[\p{L}\p{N}_])\([^()]*\)/gu, "");
  const add = (map, name, entry) => {
    if (!map.has(name)) map.set(name, []);
    map.get(name).push(entry);
  };
  index.symbols.forEach((symbol, position) => {
    const [name, , , , module, kind] = symbol;
    const entry = { name: canonical(name), module, kind, href: `#/std/${module}/item/${position}` };
    add(names, entry.name, entry);
    if (kind === "method") add(methods, name.slice(name.lastIndexOf(".") + 1), entry);
  });

  const chapter = title => {
    const section = index.manual.findIndex(entry => entry[0] === title);
    return section < 0 ? undefined : { name: title, kind: "type", href: `#/manual/${section}` };
  };
  const primitives = new Map();
  for (const [title, types] of [
    ["The Primitive Types", ["any", "void", "label", "Code", "Pattern", "Namespace", "Library", "Typeclass", "Macro"]],
    ["Integers", ["ssize", "usize", "rune"]],
    ["Floating Point", ["f16", "f32", "f64", "f80", "f128"]],
    ["Complex Numbers", ["c32", "c64", "c128", "c160", "c256"]],
    ["Booleans and Truthiness", ["bool"]],
    ["Built-in Strings", ["string", "cstring", "string16", "cstring16"]],
    ["SIMD Vectors and Matrices", ["Simd", "Matrix"]],
    ["Types as Values", ["type"]],
  ]) for (const type of types) primitives.set(type, chapter(title));
  const integers = chapter("Integers");

  function context(module = -1, symbolIndex = -1) {
    const symbol = index.symbols[symbolIndex];
    const name = canonical(symbol?.[0] ?? "");
    const owner = symbol?.[5] === "method" ? name.slice(0, name.lastIndexOf("."))
      : ["type", "typeclass"].includes(symbol?.[5]) ? name : "";
    // Parameter names and generic variables are local bindings, even when a
    // public function happens to have the same spelling.
    const bindings = new Set([...(symbol?.[1] ?? "").matchAll(/\b([\p{L}_][\p{L}\p{N}_]*)\s*:(?!:)|\$([\p{L}_][\p{L}\p{N}_]*)/gu)]
      .map(match => match[1] ?? match[2]));
    return { module: symbol?.[4] ?? module, owner, bindings };
  }

  function closest(entries = [], scope) {
    let best;
    let bestScore = -1;
    let ambiguous = false;
    for (const entry of entries) {
      const left = modulePaths[scope.module] ?? [];
      const right = modulePaths[entry.module];
      let score = 0;
      while (score < left.length && score < right.length && left[score] === right[score]) score += 1;
      if (entry.module === scope.module) score = Number.MAX_SAFE_INTEGER;
      if (score > bestScore) {
        best = entry;
        bestScore = score;
        ambiguous = false;
      } else if (score === bestScore && (best.module !== entry.module || best.name !== entry.name)) {
        ambiguous = true;
      }
    }
    return ambiguous ? undefined : best;
  }

  function resolve(name, scope) {
    if (scope.bindings.has(name.split(".")[0])) return undefined;
    if (scope.owner && !name.includes(".")) {
      const owned = names.get(`${scope.owner}.${name}`);
      if (owned) return closest(owned, scope);
    }
    const exact = names.get(name);
    if (exact) return closest(exact, scope);
    if (primitives.has(name)) return primitives.get(name);
    if (/^[su][1-9][0-9]*$/.test(name) && Number(name.slice(1)) <= 65535) return integers;
    // A bare receiver method is meaningful only in the local API family.
    // For example, a File field named `valid` is not an Image.valid call.
    return closest(methods.get(name)?.filter(entry => entry.module === scope.module ||
      modulePaths[scope.module]?.length > 1 && modulePaths[scope.module][0] === modulePaths[entry.module][0]), scope);
  }

  function ranges(source, scope = context(), prose = false) {
    const links = [];
    // Consume strings and comments as whole tokens so their contents cannot
    // become links, including while the syntax highlighter is still loading.
    const pattern = /\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*|(?:[bc])?"(?:\\.|[^"\\])*(?:"|$)|\\\\[^\n]*|(?<![\p{L}\p{N}_$#.'`])[\p{L}_][\p{L}\p{N}_]*(?:\.[\p{L}_][\p{L}\p{N}_]*)*/gu;
    for (const match of source.matchAll(pattern)) {
      let name = match[0];
      if (!/^[\p{L}_]/u.test(name) || name.includes('"')) continue;
      if (prose && !/[A-Z_.]/.test(name)) continue;
      if (!prose && /^\s*:/.test(source.slice(match.index + name.length))) continue;
      let target = resolve(name, scope);
      // Enum variants and fields have no separate item page. Link their
      // declared type, while keeping the member suffix as ordinary text.
      while (!target && name.includes(".")) {
        name = name.slice(0, name.lastIndexOf("."));
        const owner = resolve(name, scope);
        if (owner?.kind === "type" || owner?.kind === "typeclass") target = owner;
      }
      if (target) links.push({ start: match.index, end: match.index + name.length, ...target });
    }
    return links;
  }
  return { context, ranges };
}
