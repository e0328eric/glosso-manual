import assert from "node:assert/strict";
import { referenceIndex } from "../reference-index.js";
import { createReferenceLinker } from "../reference-links.js";

const linker = createReferenceLinker(referenceIndex);
const symbolIndex = name => {
  const index = referenceIndex.symbols.findIndex(symbol => symbol[0] === name);
  assert(index >= 0, `Missing fixture symbol ${name}`);
  return index;
};
const href = name => {
  const index = symbolIndex(name);
  return `#/std/${referenceIndex.symbols[index][4]}/item/${index}`;
};
const scope = linker.context(-1, symbolIndex("File.open"));
const links = (source, context = scope, prose = false) => linker.ranges(source, context, prose)
  .map(link => [source.slice(link.start, link.end), link.href]);

// The reported File.open page: signatures, return types, defaults, constraints,
// qualified releasers, and the unqualified methods in its documentation.
for (const name of ["File_Access", "Open_Disposition", "File_Permissions", "Open_Flags", "Fs_Error", "File", "Path_View", "AsView", "File.close"])
  assert.deepEqual(links(name), [[name, href(name)]]);
assert.deepEqual(links("Fs_Error!File"), [["Fs_Error", href("Fs_Error")], ["File", href("File")]]);
assert.deepEqual(links("Default: File_Access.Read"), [["File_Access", href("File_Access")]]);
assert.deepEqual(links("Constraint: AsView(P, Path_View)"), [["AsView", href("AsView")], ["Path_View", href("Path_View")]]);
assert.deepEqual(links("open(path, .Write, .Create_Always)"), [["open", href("File.open")]]);
assert.deepEqual(links("close"), [["close", href("File.close")]]);
assert.deepEqual(links("path access disposition permissions flags $P P .None unknown_name"), []);
assert.deepEqual(links("valid"), [], "A field must not link to an unrelated receiver method");
assert.deepEqual(links('"File File.close" // File_Access'), []);
assert.deepEqual(links('c"File" b"File" /* File.close */ File'), [["File", href("File")]]);
assert.deepEqual(links("File_Access: File"), [["File", href("File")]]);
assert.deepEqual(links("You can open a file and close it.", scope, true), []);
assert.deepEqual(links("Open_Flags members select behavior.", scope, true), [["Open_Flags", href("Open_Flags")]]);
assert.deepEqual(links("BTreeMap.insert"), [["BTreeMap.insert", href("BTreeMap($K, $V).insert")]]);
for (const name of ["bool", "string", "s64", "u8", "u24", "ssize", "void"])
  assert.match(links(name)[0]?.[1] ?? "", /^#\/manual\/\d+$/);
assert.deepEqual(links("u65536"), []);

// Same-module and nearest-module lookup must be deterministic; a tie across
// modules or different receiver types is not enough evidence to make a link.
const fixture = createReferenceLinker({
  modules: [["Fs/File"], ["Fs/Types"], ["Net/Types"], ["Other"]],
  manual: [],
  symbols: [
    ["Options", "", "", "", 1, "type"],
    ["Options", "", "", "", 2, "type"],
    ["File.close", "", "", "", 0, "method"],
    ["Directory.close", "", "", "", 0, "method"],
    ["File.open", "open :: (count: ssize, item: $T) -> Options", "", "", 0, "method"],
    ["count", "", "", "", 0, "function"],
    ["T", "", "", "", 0, "type"],
    ["lookup", "", "", "", 0, "function"],
    ["lookup", "", "", "", 0, "function"],
  ],
});
assert.equal(fixture.ranges("Options", fixture.context(0))[0].href, "#/std/1/item/0");
assert.equal(fixture.ranges("Options", fixture.context(2))[0].href, "#/std/2/item/1");
assert.equal(fixture.ranges("Options", fixture.context(3)).length, 0);
assert.equal(fixture.ranges("close", fixture.context(0)).length, 0);
assert.equal(fixture.ranges("close", fixture.context(0, 4))[0].href, "#/std/0/item/2");
assert.equal(fixture.ranges("count T", fixture.context(0, 4)).length, 0);
assert.equal(fixture.ranges("lookup", fixture.context(0))[0].href, "#/std/0/item/7");

// Every generated destination must be a real, reloadable item or chapter route.
for (let index = 0; index < referenceIndex.symbols.length; index += 1) {
  const symbol = referenceIndex.symbols[index];
  for (const text of [symbol[1], symbol[3]]) {
    for (const link of linker.ranges(text, linker.context(symbol[4], index))) {
      const item = /^#\/std\/(\d+)\/item\/(\d+)$/.exec(link.href);
      if (item) assert.equal(referenceIndex.symbols[Number(item[2])]?.[4], Number(item[1]));
      else assert(referenceIndex.manual[Number(link.href.split("/").at(-1))]);
    }
  }
}
console.log("Documentation reference links passed: API types, functions, constraints, defaults, primitives, local bindings, ambiguous names, and route validity.");
