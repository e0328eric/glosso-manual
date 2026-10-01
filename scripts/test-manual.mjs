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
assert(referenceIndex.manual[0][1].includes("A Glosso program is one source file"),
  "Chapter search prose was overwritten when its text builder was reused");
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
// A click may press and release between animation frames. Navigation still
// needs both states, even if the browser coalesces the scheduled render.
const pointerRelease = app.match(/window\.addEventListener\("pointerup", event => \{([\s\S]*?)\r?\n\}\);/);
assert(pointerRelease, "Browser pointer release handler was not found");
const observedPointerStates = [];
const pointerHost = {
  pointerDown: true, instance: {}, event: { target: { closest: () => null } },
  nativeSidebar: { contains: () => false }, updatePointer() {},
  renderFrame() { observedPointerStates.push(pointerHost.pointerDown); },
  scheduleRender() { observedPointerStates.push(pointerHost.pointerDown); },
};
runInNewContext(`(() => { ${pointerRelease[1]} })()`, pointerHost);
assert.deepEqual(observedPointerStates, [true, false], "A fast click lost its pressed state");
observedPointerStates.length = 0;
pointerHost.pointerDown = true;
pointerHost.event.target.closest = () => ({});
runInNewContext(`(() => { ${pointerRelease[1]} })()`, pointerHost);
assert.deepEqual(observedPointerStates, [false], "A native link was replaced before its click");
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
#public Counter :: struct { value: s64; #private cached: s64; }
Counter ::: #public {
    make :: () -> #Self_Type { return .{ .value = 0, .cached = 0 }; }
    read :: (#self) -> s64 { return #self.value; }
    increment :: (*#self) { #self.*.value += 1; }
}
#public(unit) { shared :: () { value := Counter.make(); value.increment(); } }
Cleanup ::: instance Drop {
    Error :: #Never;
    drop :: (value: *#Self_Type) -> #Never!void { return .Ok; }
}
cleanup :: () {
    resource: Fallible;
    #on_drop_error(resource, error) { report_error(error); }
}
where_am_i :: () -> Source_Location { return #source_location; }
inspect :: (path: $P, site: Source_Location = #source_location)
    #memory{reads(path), noescape(path)} where AsView(P, Path_View) {}
open :: (path: $P, flags: Open_Flags = .None) -> Fs_Error!File
    #memory{returns_fresh(returned.Ok),
            released_by(place: returned.Ok, by: close), escapes(path)}
    where AsView(P, Path_View) {}
`);
assert(!tree.rootNode.hasError, "Current language syntax did not parse in Tree-sitter");
for (const source of [
  'Signed :: enum s8 { Negative :: -1; Zero; }',
  'types :: () { Slice :: []s64; Fixed :: [2]s64; Many :: [*]u8; Dynamic :: [..]u8; }',
  'main :: () { n := .(.(1, 2), 3); value := n.0.1; }',
  'main :: () { b := Box(f64).{ .value = 1.5 }; }',
  'Rune :: #char "\\u{1f642}";',
]) {
  const current = parser.parse(source);
  assert(!current.rootNode.hasError, "Current syntax did not parse: " + source);
  current.delete();
}
const query = new Query(language, querySource);
assert.equal(query.captures(tree.rootNode).filter(capture =>
  capture.node.text === "#source_location" && capture.name === "constant.builtin").length, 2);
for (const directive of ["#public", "#private", "#on_drop_error"])
  assert(query.captures(tree.rootNode).some(capture =>
    capture.node.text === directive && capture.name === "attribute"));
assert(query.captures(tree.rootNode).some(capture =>
  capture.node.text === "#Self_Type" && capture.name === "type.builtin"));
assert(query.captures(tree.rootNode).some(capture =>
  capture.node.text === "#Never" && capture.name === "type.builtin"));
for (const source of [
  "die :: () #noreturn { exit(1); }",
  'die :: () #noreturn #foreign "c" "abort";',
]) {
  const removed = parser.parse(source);
  assert(removed.rootNode.hasError, "Removed #noreturn still parses; use -> #Never");
  removed.delete();
}
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
// Try-aware operators receive the enclosing carrier through an erased witness.
// Cover both a typeclass signature and an ordinary custom suffix definition.
const tryOperators = parser.parse(`
Try :: typeclass (Carrier: type) {
  '?' :: (#empty: $Target, value: Carrier) -> Try_Branch(Output, Target)
      #operator(suffix, try(Target));
}
'!!' :: (#empty: $Boundary, value: Carrier) -> Try_Branch(Output, Boundary)
    #operator(suffix, try(Boundary)) { return .Continue(value); }
probe :: (value: Carrier) {
  propagated := value?;
  custom := value!!;
  explicit := '?'(Target, value);
  local := #try { value? };
  for i: 0..count lengths[order[i]] = 1;
  qualified := value math,,+ other;
}
`);
assert(!tryOperators.rootNode.hasError, "Try-aware operators or range loops did not parse");
const tryCaptures = query.captures(tryOperators.rootNode);
assert.equal(tryCaptures.filter(capture =>
  capture.node.text === "try" && capture.name === "attribute").length, 2);
for (const target of tryOperators.rootNode.descendantsOfType("operator_try_modifier")) {
  const identifier = target.childForFieldName("target");
  assert(tryCaptures.some(capture => capture.name === "type" &&
    capture.node.startIndex === identifier.startIndex && capture.node.endIndex === identifier.endIndex),
    `Unhighlighted try boundary: ${identifier.text}`);
}
for (const operator of ["?", "!!"])
  assert(tryCaptures.some(capture => capture.node.text === operator && capture.name === "operator"),
    `Unhighlighted suffix operator: ${operator}`);
const loop = tryOperators.rootNode.descendantsOfType("for_statement")[0];
assert.equal(loop.childForFieldName("value").text, "0..count");
assert.equal(loop.childForFieldName("body").type, "assignment_statement");
for (const modifier of ["prefix, try(Target)", "suffix, try($Target)", "suffix, unknown"]) {
  const invalid = parser.parse(`'?' :: (#empty: $Target, value: Carrier)
    -> Try_Branch(Output, Target) #operator(${modifier});`);
  assert(invalid.rootNode.hasError, `Invalid #operator(${modifier}) still parses`);
  invalid.delete();
}
tryOperators.delete();
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
let textRuns = [];
function render(width, { x = -1, y = -1, down = 0 } = {}) {
  instance.exports.glo_main(host.scratchAddress, width, 736, x, y, down, 1 / 60);
  const view = memoryView();
  const count = view.getInt32(host.scratchAddress + 4, true);
  const commands = view.getUint32(host.scratchAddress + 8, true);
  assert(count > 0 && count < 100000, `Invalid render-command count: ${count}`);
  assert(commands + count * 72 <= instance.exports.memory.buffer.byteLength);
  const text = [];
  textRuns = [];
  for (let index = 0; index < count; index += 1) {
    const command = commands + index * 72;
    for (const offset of [0, 4, 8, 12])
      assert(Number.isFinite(view.getFloat32(command + offset, true)), "Non-finite layout bounds");
    if (view.getUint8(command + 70) === 3) {
      const value = textAt(view.getUint32(command + 20, true), view.getInt32(command + 16, true));
      const marker = view.getUint32(command + 60, true);
      text.push(value);
      textRuns.push({
        value,
        x: view.getFloat32(command, true), y: view.getFloat32(command + 4, true),
        width: view.getFloat32(command + 8, true), height: view.getFloat32(command + 12, true),
        fontSize: view.getUint16(command + 46, true),
        anchor: marker !== 0 && textAt(marker, 13) === "symbol-anchor",
      });
    }
  }
  frames += 1;
  return text.join(" ");
}

// Exercise navigation through actual Clay hit testing, using text bounds from
// the rendered commands instead of duplicating element IDs or layout rules.
function clickText(width, label, predicate = () => true) {
  render(width);
  const target = textRuns.find(run => run.value === label && predicate(run));
  assert(target, `Could not find clickable text ${label}`);
  const point = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  render(width, { ...point, down: 1 });
  return render(width, point);
}

function moduleIndex(name) {
  const index = referenceIndex.modules.findIndex(module => module[0] === name);
  assert(index >= 0, `Missing reference module ${name}`);
  return index;
}

function symbolIndex(module, name) {
  const index = referenceIndex.symbols.findIndex(symbol => symbol[4] === module && symbol[0] === name);
  assert(index >= 0, `Missing reference symbol ${name}`);
  return index;
}

function openSymbolSearch(width, module, name) {
  const view = memoryView();
  view.setInt32(host.searchBridgeAddress, 2, true);
  view.setInt32(host.searchBridgeAddress + 4, symbolIndex(module, name), true);
  instance.exports.glo_manual_set_search_results(host.searchBridgeAddress, 1);
  instance.exports.glo_manual_set_view(2);
  return clickText(width, name, run => run.fontSize === 18);
}

function browseSection(width, module, methods, expectedNames) {
  instance.exports.glo_manual_select_module(module);
  instance.exports.glo_manual_set_reference_methods(methods ? 1 : 0);
  const expected = new Set(expectedNames);
  const found = [];
  const pages = Math.max(1, Math.ceil(expectedNames.length / 24));
  let text = render(width);
  for (let page = 1; page <= pages; page += 1) {
    const cards = textRuns.filter(run => run.fontSize === 18 && expected.has(run.value))
      .map(run => run.value);
    assert.equal(cards.length, Math.min(24, expectedNames.length - found.length),
      "A filtered page omitted cards or counted nested typeclass operations");
    found.push(...cards);
    if (pages > 1) assert(text.includes(`Page ${page} of ${pages}`));
    else assert(!text.includes("Next page"), "Hidden typeclass operations created a spurious page");
    if (page < pages) text = clickText(width, "Next page");
  }
  assert.deepEqual(found.toSorted(), expectedNames.toSorted(), "Pagination omitted or repeated declarations");
  return text;
}

for (const width of [390, 1280]) {
  for (let index = 0; index < referenceIndex.manual.length; index += 1) {
    instance.exports.glo_manual_select_section(index);
    assert.equal(instance.exports.glo_manual_get_section(), index);
    const text = render(width);
    assert(text.length > 0, `Empty chapter ${index} at ${width}px`);
    if (index === 20) assert(text.includes("#public(unit)"), "Visibility chapter is stale");
    if (index === 55) assert(text.includes("#self"), "Receiver-method chapter is stale");
  }
  for (let index = -1; index < referenceIndex.modules.length; index += 1) {
    instance.exports.glo_manual_select_module(index);
    assert.equal(instance.exports.glo_manual_get_module(), index);
    const text = render(width);
    if (index >= 0 && referenceIndex.modules[index][0] === "File_System/File") {
      assert.match(text, /AsView\(P, Path_View\)/);
      assert(textRuns.some(run => run.value === "read_file" && run.fontSize === 18));
    }
  }
  const view = memoryView();
  view.setInt32(host.searchBridgeAddress, 0, true);
  view.setInt32(host.searchBridgeAddress + 4, 0, true);
  instance.exports.glo_manual_set_search_results(host.searchBridgeAddress, 1);
  instance.exports.glo_manual_set_view(2);
  assert(render(width).includes("Hello World"), "Search result bridge failed");

  // A method-only module should open on its useful section immediately.
  instance.exports.glo_manual_select_module(moduleIndex("Prelude/Array"));
  assert.equal(instance.exports.glo_manual_get_reference_methods(), 1);
  let text = render(width);
  assert(text.includes("Declarations") && text.includes("Methods"), "Reference section selectors are missing");
  assert(textRuns.some(run => run.value === "[..]$T.add" && run.fontSize === 18));
  text = clickText(width, "Declarations", run => run.fontSize === 14);
  assert.equal(instance.exports.glo_manual_get_reference_methods(), 0);
  assert(text.includes("no public declarations in this section"));
  text = clickText(width, "Methods", run => run.fontSize === 14);
  assert.equal(instance.exports.glo_manual_get_reference_methods(), 1);
  assert(textRuns.some(run => run.value === "[..]$T.add" && run.fontSize === 18));
  assert.equal(instance.exports.glo_manual_get_scroll_request(), 1, "Section switch should scroll to the top");

  // Paths use free functions, while handles expose receiver methods and factories.
  instance.exports.glo_manual_select_module(moduleIndex("File_System/File"));
  assert.equal(instance.exports.glo_manual_get_reference_methods(), 0);
  text = render(width);
  assert(textRuns.some(run => run.value === "read_file" && run.fontSize === 18));
  text = clickText(width, "Methods", run => run.fontSize === 14);
  assert(textRuns.some(run => run.value === "File.open" && run.fontSize === 18));
  assert(!textRuns.some(run => run.value === "read_file" && run.fontSize === 18));
  for (const effect of ["returns_fresh", "released_by", "returns_borrow", "noescape"])
    assert(text.includes(effect), `Missing open contract ${effect}`);

  // A typeclass's operations stay inside its declaration, not in Methods.
  instance.exports.glo_manual_select_module(moduleIndex("Prelude/Drop"));
  assert.equal(instance.exports.glo_manual_get_reference_methods(), 0);
  text = render(width);
  assert(textRuns.some(run => run.value === "drop" && run.fontSize === 18));
  text = clickText(width, "Methods", run => run.fontSize === 14);
  assert(text.includes("no public inherent methods or associated functions"));
  assert(!textRuns.some(run => run.value === "drop" && run.fontSize === 18));

  // Math/Core mixes free functions, types, inherent methods, and nested
  // typeclass operations. Only visible cards consume pagination slots.
  const math = moduleIndex("Math/Core");
  const mathSymbols = referenceIndex.symbols.filter(symbol => symbol[4] === math);
  const declarations = mathSymbols.filter(symbol => symbol[5] !== "method").map(symbol => symbol[0]);
  const methods = mathSymbols.filter(symbol => symbol[5] === "method" && symbol[0].includes("."))
    .map(symbol => symbol[0]);
  browseSection(width, math, false, declarations);
  browseSection(width, math, true, methods);
  assert(!textRuns.some(run => run.value === "sin" && run.fontSize === 18));

  // Browse a real multi-page Methods section and confirm search can navigate
  // directly to a late method, while a typeclass operation targets its owner.
  const utf8 = moduleIndex("Strings/Utf8");
  const utf8Methods = referenceIndex.symbols.filter(symbol => symbol[4] === utf8 &&
    symbol[5] === "method" && symbol[0].includes(".")).map(symbol => symbol[0]);
  browseSection(width, utf8, true, utf8Methods);
  text = openSymbolSearch(width, utf8, "u8.char_to_string");
  assert.equal(instance.exports.glo_manual_get_module(), utf8);
  assert.equal(instance.exports.glo_manual_get_reference_methods(), 1);
  const targetPage = Math.floor(utf8Methods.indexOf("u8.char_to_string") / 24) + 1;
  assert(text.includes(`Page ${targetPage} of ${Math.ceil(utf8Methods.length / 24)}`));
  assert(textRuns.some(run => run.value === "u8.char_to_string" && run.anchor),
    "Method search did not anchor the selected method on its page");
  text = openSymbolSearch(width, math, "sin");
  assert.equal(instance.exports.glo_manual_get_module(), math);
  assert.equal(instance.exports.glo_manual_get_reference_methods(), 0);
  assert(textRuns.some(run => run.value === "Floating" && run.fontSize === 18));
  assert(textRuns.some(run => run.value === "sin" && run.anchor),
    "Typeclass-method search did not anchor its member inside the owning class");
}
console.log(`Manual smoke checks passed: ${referenceIndex.manual.length} chapters, ` +
  `${referenceIndex.modules.length} modules, Methods navigation and search, Tree-sitter, and ${frames} narrow/wide Wasm frames.`);
