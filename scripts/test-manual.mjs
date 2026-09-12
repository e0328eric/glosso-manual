// Run after `glosso first.glo -- build`. No packages or browser are required.
// Approximate text metrics exercise the Wasm/Clay ABI, not browser typography.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { Language, Parser, Query } from "../vendor/web-tree-sitter/web-tree-sitter.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFileSync(join(root, path));
for (const [source, staged] of [
  ["app.js", "dist/app.js"],
  ["reference-index.js", "dist/reference-index.js"],
  ["tree-sitter/highlights.scm", "dist/highlights.scm"],
  ["tree-sitter/tree-sitter-glosso.wasm", "dist/tree-sitter-glosso.wasm"],
]) assert(read(source).equals(read(staged)), `${staged} is stale; rebuild the manual`);

const { referenceIndex } = await import(
  `data:text/javascript;base64,${read("dist/reference-index.js").toString("base64")}`);
const decoder = new TextDecoder("utf-8", { fatal: true });
let instance;
const memoryView = () => new DataView(instance.exports.memory.buffer);
const textAt = (address, length) => {
  assert(length >= 0 && address + length <= instance.exports.memory.buffer.byteLength);
  return decoder.decode(new Uint8Array(instance.exports.memory.buffer, address, length));
};
({ instance } = await WebAssembly.instantiate(read("dist/manual.wasm"), {
  env: {
    abort() { throw new Error("The Glosso runtime aborted"); },
    write(file, address, length) {
      const text = textAt(address, length);
      assert.notEqual(file, 2, `Runtime diagnostic: ${text}`);
      return length;
    },
  },
  clay: {
    measureTextFunction(dimensions, textSlice, config) {
      const view = memoryView();
      const text = textAt(view.getUint32(textSlice + 4, true), view.getUint32(textSlice, true));
      const fontSize = view.getUint16(config + 22, true);
      const spacing = view.getUint16(config + 24, true);
      const count = [...text].length;
      view.setFloat32(dimensions, count * fontSize * 0.56 + Math.max(0, count - 1) * spacing, true);
      view.setFloat32(dimensions + 4, fontSize, true);
    },
    queryScrollOffsetFunction(offset) {
      memoryView().setFloat32(offset, 0, true);
      memoryView().setFloat32(offset + 4, 0, true);
    },
  },
}));

// Execute the real browser initialization, so this catches drift in its ABI
// offsets too. The test context supplies only its documented runtime inputs.
const app = read("app.js").toString("utf8");
const embeddedQuery = app.match(/const GLOSSO_HIGHLIGHTS_QUERY = ("(?:\\.|[^"\\])*");/);
assert(embeddedQuery, "Embedded highlight query was not found");
const querySource = read("tree-sitter/highlights.scm").toString("utf8");
assert.equal(JSON.parse(embeddedQuery[1]).replaceAll("\r\n", "\n"), querySource.replaceAll("\r\n", "\n"));
assert(!querySource.includes('"#precedence"'), "Removed directives must not be highlighted as valid syntax");
await Parser.init({ locateFile: () => join(root, "vendor/web-tree-sitter/web-tree-sitter.wasm") });
const language = await Language.load(read("tree-sitter/tree-sitter-glosso.wasm"));
const parser = new Parser();
parser.setLanguage(language);
const tree = parser.parse(`
#load,embed "fragment.glo";
where_am_i :: () -> Source_Location { return #source_location; }
inspect :: (path: $P, site: Source_Location = #source_location)
    #memory{reads(path), noescape(path)} where AsView(P, Path_View) {}
open :: (path: $P, flags: Open_Flags = .None) -> Fs_Error!File
    #memory{returns_fresh(returned.Ok),
            released_by(place: returned.Ok, by: close), escapes(path)}
    where AsView(P, Path_View) {}
`);
assert(!tree.rootNode.hasError, "Current language syntax did not parse in Tree-sitter");
const query = new Query(language, querySource);
assert.equal(query.captures(tree.rootNode).filter(capture =>
  capture.node.text === "#source_location" && capture.name === "constant.builtin").length, 2);
for (const effect of ["returns_fresh", "released_by", "escapes"])
  assert(query.captures(tree.rootNode).some(capture =>
    capture.node.text === effect && capture.name === "attribute"), `Unhighlighted contract: ${effect}`);

for (const [mode, parameters, level] of [
  ["left", "a: T, b: T", ", 18"],
  ["right", "a: T, b: T", ", 14"],
  ["assign", "a: T, b: T", ", 0"],
  ["prefix", "a: T", ""],
  ["suffix", "a: T", ""],
]) {
  const source = `Custom :: typeclass (T: type) {
    '<>' :: (${parameters}) -> T #operator(${mode}${level});
  }`;
  const current = parser.parse(source);
  assert(!current.rootNode.hasError, `#operator(${mode}${level}) did not parse`);
  assert(query.captures(current.rootNode).some(capture =>
    capture.node.text === "#operator" && capture.name === "attribute"));
  current.delete();
  const removed = parser.parse(source.replace("#operator", "#precedence"));
  assert(removed.rootNode.hasError, `Removed #precedence(${mode}${level}) still parses`);
  removed.delete();
}
query.delete();
tree.delete();
parser.delete();

const initialization = app.match(/function initializeClay\(\) \{[\s\S]*?\r?\n\}\r?\n/);
assert(initialization, "Browser Clay initialization was not found");
const host = {
  instance, memoryView,
  align: (value, boundary) => Math.ceil(value / boundary) * boundary,
  window: { innerWidth: 1280, innerHeight: 800 }, topbar: { offsetHeight: 64 },
  scratchAddress: 0, searchBridgeAddress: 0,
};
runInNewContext(`${initialization[0]}\ninitializeClay();`, host);

let frames = 0;
function render(width) {
  instance.exports.glo_main(host.scratchAddress, width, 736, -1, -1, 0, 1 / 60);
  const view = memoryView();
  const count = view.getInt32(host.scratchAddress + 4, true);
  const commands = view.getUint32(host.scratchAddress + 8, true);
  assert(count > 0 && count < 100000, `Invalid render-command count: ${count}`);
  assert(commands + count * 72 <= instance.exports.memory.buffer.byteLength);
  const text = [];
  for (let index = 0; index < count; index += 1) {
    const command = commands + index * 72;
    for (const offset of [0, 4, 8, 12])
      assert(Number.isFinite(view.getFloat32(command + offset, true)), "Non-finite layout bounds");
    if (view.getUint8(command + 70) === 3)
      text.push(textAt(view.getUint32(command + 20, true), view.getInt32(command + 16, true)));
  }
  frames += 1;
  return text.join(" ");
}

for (const width of [390, 1280]) {
  for (let index = 0; index < referenceIndex.manual.length; index += 1) {
    instance.exports.glo_manual_select_section(index);
    assert.equal(instance.exports.glo_manual_get_section(), index);
    assert(render(width).length > 0, `Empty chapter ${index} at ${width}px`);
  }
  for (let index = -1; index < referenceIndex.modules.length; index += 1) {
    instance.exports.glo_manual_select_module(index);
    assert.equal(instance.exports.glo_manual_get_module(), index);
    const text = render(width);
    if (index >= 0 && referenceIndex.modules[index][0] === "File_System/File") {
      assert.match(text, /AsView\(P, Path_View\)/);
      for (const effect of ["returns_fresh", "released_by", "escapes"])
        assert(text.includes(effect), `Missing open contract ${effect}`);
    }
  }
  const view = memoryView();
  view.setInt32(host.searchBridgeAddress, 0, true);
  view.setInt32(host.searchBridgeAddress + 4, 0, true);
  instance.exports.glo_manual_set_search_results(host.searchBridgeAddress, 1);
  instance.exports.glo_manual_set_view(2);
  assert(render(width).includes("Hello World"), "Search result bridge failed");
}
console.log(`Manual smoke checks passed: ${referenceIndex.manual.length} chapters, ` +
  `${referenceIndex.modules.length} modules, search, Tree-sitter, and ${frames} narrow/wide Wasm frames.`);
