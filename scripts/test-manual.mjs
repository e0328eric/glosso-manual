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
  ["index.html", "dist/index.html"],
  ["app.js", "dist/app.js"],
  ["reference-index.js", "dist/reference-index.js"],
  ["reference-links.js", "dist/reference-links.js"],
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
  assert(length >= 0 && address + length <= instance.exports.memory.buffer.byteLength,
    `Invalid text slice at ${address}, length ${length}, chapter ${instance.exports.glo_manual_get_section()}`);
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
const signatureHost = { referenceIndex };
runInNewContext(app.slice(app.indexOf("function splitTopLevel("),
  app.indexOf("function searchDocumentation(")) +
  "; this.findSignatures = signatureResults; this.typeKey = value => serializeType(parseType(value));",
  signatureHost);
assert.equal(signatureHost.typeKey("**const s64"), signatureHost.typeKey("* *const s64"));
assert.notEqual(signatureHost.typeKey("*const *s64"), signatureHost.typeKey("**const s64"));
for (const shape of ["*", "[*]", "[]"])
  assert.notEqual(signatureHost.typeKey(`${shape}const s64`), signatureHost.typeKey(`${shape}s64`));
const signatureNames = query => signatureHost.findSignatures(query)
  .map(result => referenceIndex.symbols[result.index][0]);
assert(signatureNames("(*const String_Builder) -> string").includes("String_Builder.to_string"));
assert(!signatureNames("(*String_Builder) -> string").includes("String_Builder.to_string"));
assert(signatureNames("(*String_Builder) -> []u8").includes("String_Builder.to_bytes"));
assert(!signatureNames("(*String_Builder) -> []const u8").includes("String_Builder.to_bytes"));
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
Aligned :: struct #align(32) { value: s32; }
Packed :: struct #packed #align(2) { value: s32; }
libc :: #library "c";
copy_c :: (value: [*]const u8) -> ?[*]u8 #foreign libc "strdup" #fresh_result;
raw_transfer :: (slot: *$T) -> T #unchecked_transfer { return __value_move(slot); }
Counter ::: #public {
    make :: () -> #Self_Type { return .{ .value = 0, .cached = 0 }; }
    read :: (#self) -> s64 { return #self.value; }
    increment :: (*#self) { #self.value += 1; }
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
#memory { reads(source), noescape(source), returns_borrow(source) }
view :: (source: []const u8) -> []const u8 { return source; }
#public #memory { returns_borrow(input), noescape(input) }
View :: #fn_ptr(input: []const u8) -> []const u8;
#memory view { reads(arg(0)), returns_borrow(arg(0)) };
#memory { returns_fresh, released_by(place: returned, by: (?*void).mem_free, instance: allocator) }
allocate :: (allocator: Allocator) -> ?*void #foreign "c" "allocate";
trusted :: (pointer: *u8) {
    #memory trusted("foreign API") { use(pointer); }
    use(pointer) #memory { reads(pointer), noescape(pointer) };
}
where_am_i :: () -> Source_Location { return #source_location; }
inspect :: (path: $P, site: Source_Location = #source_location)
 where AsView(P, Path_View) {}
open :: (path: $P, flags: Open_Flags = .None) -> Fs_Error!File

    where AsView(P, Path_View) {}
`);
assert(!tree.rootNode.hasError, "Current language syntax did not parse in Tree-sitter");
for (const source of [
  'Signed :: enum s8 { Negative :: -1; Zero; }',
  'types :: () { Slice :: []const s64; Fixed :: [2]s64; Many :: [*]const u8; Dynamic :: [..]u8; }',
  'main :: () { n := .(.(1, 2), 3); value := n.0.1; }',
  'main :: () { b := Box(f64).{ .value = 1.5 }; }',
  'Rune :: #char "\\u{1f642}";',
  'main :: () { value: s64 = 7; p := &value; q := value.&; *p += 1; q.* += 1; pp := &p; answer := **pp; }',
  'f :: (writable: *s64, readonly: *const s64, nested: **const s64, bytes: []const u8) {}',
]) {
  const current = parser.parse(source);
  assert(!current.rootNode.hasError, "Current syntax did not parse: " + source);
  current.delete();
}
for (const source of [
  'f :: (value: *mut s64) {}',
]) {
  const removed = parser.parse(source);
  assert(removed.rootNode.hasError, "Removed syntax still parses: " + source);
  removed.delete();
}
const query = new Query(language, querySource);
for (const source of [
  'm: Matrix(s64, 2, 3) = #matrix .[1, 2, 3; 4, 5, 6];',
  'main :: () { m := cast(Matrix(s64, 2, 3))#matrix .[1, 2, 3,; 4, 5, 6,;]; }',
  'make :: () -> Matrix(s64, 3, 1) { return #matrix .[1; 2; 3]; }',
  'main :: () { empty: Matrix(s64, 0, 3) = #matrix .[]; }',
  'main :: () { values: [2]Matrix(s64, 1, 2) = .[#matrix .[1, 2], #matrix .[3, 4]]; }',
]) {
  const matrix = parser.parse(source);
  assert(!matrix.rootNode.hasError, `Matrix literal did not parse: ${source}`);
  assert(matrix.rootNode.descendantsOfType("matrix_literal").length > 0);
  assert(query.captures(matrix.rootNode).some(capture =>
    capture.node.text === "#matrix" && capture.name === "attribute"));
  matrix.delete();
}
for (const source of [
  'm: Matrix(s64, 1, 1) = #matrix 1;',
  'm: Matrix(s64, 2, 1) = #matrix .[1;; 2];',
  'values: [2]s64 = .[1; 2];',
]) {
  const invalid = parser.parse(source);
  assert(invalid.rootNode.hasError, `Invalid matrix/array syntax parsed: ${source}`);
  invalid.delete();
}
const prefixedLiterals = parser.parse(String.raw`main :: () {
  terminated := c"hello\0tail";
  bytes := b"é\xFF\u{41}";
}`);
assert(!prefixedLiterals.rootNode.hasError, "C-string and byte-array literals did not parse");
assert.equal(prefixedLiterals.rootNode.descendantsOfType("c_string_literal").length, 1);
assert.equal(prefixedLiterals.rootNode.descendantsOfType("byte_string_literal").length, 1);
for (const literal of prefixedLiterals.rootNode.descendantsOfType(["c_string_literal", "byte_string_literal"]))
  assert(query.captures(prefixedLiterals.rootNode).some(capture =>
    capture.node.id === literal.id && capture.name === "string"));
prefixedLiterals.delete();
assert.equal(query.captures(tree.rootNode).filter(capture =>
  capture.node.text === "#source_location" && capture.name === "constant.builtin").length, 2);
for (const directive of ["#public", "#private", "#on_drop_error", "#memory"])
  assert(query.captures(tree.rootNode).some(capture =>
    capture.node.text === directive && capture.name === "attribute"));
assert(query.captures(tree.rootNode).some(capture =>
  capture.node.text === "returns_borrow" && capture.name === "attribute"));
assert(query.captures(tree.rootNode).some(capture =>
  capture.node.text === "trusted" && capture.name === "attribute"));
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
        sourceAddress: view.getUint32(command + 24, true),
        x: view.getFloat32(command, true), y: view.getFloat32(command + 4, true),
        width: view.getFloat32(command + 8, true), height: view.getFloat32(command + 12, true),
        fontSize: view.getUint16(command + 46, true),
        anchor: marker !== 0 && ["symbol-anchor", "anchor-item:"].some(prefix => textAt(marker, prefix.length) === prefix),
        marker: marker !== 0 ? new TextDecoder().decode(new Uint8Array(instance.exports.memory.buffer, marker, 48)) : "",
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
  const grouped = new Map();
  for (const run of textRuns) {
    const group = grouped.get(run.sourceAddress);
    if (group) group.value += ` ${run.value}`;
    else grouped.set(run.sourceAddress, { ...run });
  }
  const target = [...grouped.values()].find(run => run.value === label && predicate(run));
  assert(target, `Could not find clickable text ${label}`);
  const point = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  instance.exports.glo_manual_clear_scroll_request(); // The browser consumes this after every render.
  render(width, { ...point, down: 1 });
  return render(width, point);
}

function moduleIndex(name) {
  const index = referenceIndex.modules.findIndex(module => module[0] === name);
  assert(index >= 0, `Missing reference module ${name}`);
  return index;
}

const metaModule = moduleIndex("Meta/Utilities");
const typeQuery = referenceIndex.symbols.find(symbol => symbol[4] === metaModule && symbol[0] === "type_of");
assert(typeQuery, "Missing free type_of function in the reference");
assert.equal(typeQuery[5], "function");
assert.equal(typeQuery[1], '#memory { noescape(val) }\ntype_of :: (val: $T) -> type #magic "type_of"');
assert(!referenceIndex.symbols.some(symbol => symbol[0].endsWith(".type_of")),
  "Removed type_of receiver method remains in the reference");

moduleIndex("Strings");
const stringMemory = moduleIndex("Strings/Memory");
const stringFree = referenceIndex.symbols.find(symbol => symbol[4] === stringMemory && symbol[0] === "string.free");
assert(stringFree, "Missing owned-string cleanup from Strings/Memory");
assert.equal(stringFree[5], "method");
assert(referenceIndex.symbols.some(symbol => symbol[4] === stringMemory && symbol[0] === "string.into_temporary"),
  "Missing arena ownership transfer from Strings/Memory");
for (const name of ["Workspace.create", "String_Builder.new", "String_Builder.writef",
  "Compiler_Borrow_Check", "Path.from_string", "matrix_array_type", "matrix_from_array", "matrix_to_array"])
  assert(referenceIndex.symbols.some(symbol => symbol[0] === name), `Missing current API ${name}`);
for (const location of ["home", "cache", "config", "config_local", "data", "data_local",
  "executable", "preference", "runtime", "state", "audio", "desktop", "document",
  "download", "font", "picture", "public", "template", "video"]) {
  assert(referenceIndex.symbols.some(symbol => symbol[0] === `get_${location}_dir`),
    `Missing directory query get_${location}_dir`);
  assert(!referenceIndex.symbols.some(symbol => symbol[0] === `${location}_dir`),
    `Obsolete directory query ${location}_dir`);
}
for (const name of ["Workspace.create_workspace", "String_Builder.source_new", "Path.path_from_string"])
  assert(!referenceIndex.symbols.some(symbol => symbol[0] === name), `Obsolete API ${name}`);

const commandModule = moduleIndex("Process/Command");
for (const name of ["run_command", "run_shell_command", "Command_Output"])
  assert(referenceIndex.symbols.some(symbol => symbol[4] === commandModule && symbol[0] === name),
    `${name} must be documented under its public Process/Command import`);
assert(!referenceIndex.modules.some(module => module[0] === "Process/Run"),
  "Embedded command implementation must not appear as a standalone import");
const compilerModule = moduleIndex("Compiler");
assert(referenceIndex.symbols.some(symbol => symbol[4] === compilerModule && symbol[0] === "run_build_command"));
assert(!referenceIndex.symbols.some(symbol => symbol[4] === compilerModule && symbol[0] === "run_command"));
assert(!referenceIndex.symbols.some(symbol => symbol[0] === "run_command_line"));

assert(!referenceIndex.symbols.some(symbol => ["string.cat", "string.repeat"].includes(symbol[0])),
  "Removed allocating-string methods remain in the reference");

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

for (const width of [390, 1280]) {
  instance.exports.glo_manual_select_section(-1);
  assert.equal(instance.exports.glo_manual_get_section(), -1);
  let indexText = render(width);
  assert(indexText.includes("Language manual") && indexText.includes("Chapters"), "Language manual index is missing");
  const lastChapter = referenceIndex.manual.length - 1;
  assert(indexText.includes(referenceIndex.manual[lastChapter][0]), "Manual index omitted the final chapter");
  clickText(width, referenceIndex.manual[0][0]);
  assert.equal(instance.exports.glo_manual_get_section(), 0, "Manual index did not open its chapter");
  instance.exports.glo_manual_set_view(0);
  assert.equal(instance.exports.glo_manual_get_section(), -1, "Manual navigation should return to its index");
  instance.exports.glo_manual_select_module(-1);
  render(width);
  const lastModule = referenceIndex.modules.length - 1;
  clickText(width, referenceIndex.modules[lastModule][0]);
  assert.equal(instance.exports.glo_manual_get_module(), lastModule, "Library index omitted modules beyond the old page limit");
  for (let index = 0; index < referenceIndex.manual.length; index += 1) {
    instance.exports.glo_manual_select_section(index);
    assert.equal(instance.exports.glo_manual_get_section(), index);
    const text = render(width);
    assert(text.length > 0, `Empty chapter ${index} at ${width}px`);
    assert(!text.includes(".type_of()"), `Removed type_of method in chapter ${index}`);
    assert(!text.includes('#magic "str_concat"'), `Removed string intrinsic in chapter ${index}`);
    if (index === 123) assert(text.includes("--borrow-check=error") && text.includes("returns_borrow") && text.includes("Byte_Reader"), "Memory contracts chapter is stale");
    if (index === 117) assert(text.includes("new(T)") && text.includes("delete(pointer)"), "Typed object allocation is missing");
    if (index === 49) assert(text.includes("*const T") && text.includes("omit the qualifier for writable access"), "Pointer qualifiers are stale");
    if (index === 127) assert(text.includes("strict module cannot overlay") && text.includes("unknown(reason:"), "Strict memory rules are missing");
    if (index === 27) assert(text.includes("Strings/Memory"), "Owned-string cleanup imports are stale");
    if (index === 105) assert(text.includes("GLOSSO_COMPTIME_STEP_LIMIT"), "Compile-time execution budget is stale");
    if (index === 142) assert(text.includes("These six directories"), "Namespace-only directory list is stale");
    if (index === 29) assert(text.includes("never evaluated"), "Type-query semantics are stale");
    if (index === 38) assert(text.includes("#align(N)"), "Alignment chapter is stale");
    if (index === 56) assert(text.includes("lexical block"), "Local-declaration scope is stale");
    if (index === 20) assert(text.includes("#public(unit)"), "Visibility chapter is stale");
    if (index === 55) assert(text.includes("#self"), "Receiver-method chapter is stale");
    if (index === 55) assert(text.includes("p.field") || text.includes("`p.x`"), "Pointer-field shorthand is missing");
    if (index === 78) assert(text.includes("{1:x}") && text.includes("writef") &&
      text.includes("Explicit indices do not advance"), "Brace formatting rules are stale");
    if (index === 121) assert(text.includes("repeated transfers are unchecked") &&
      !text.includes("compiler rejects later use"), "Unchecked move behavior is stale");
    if (index === 126) assert(text.includes("discards close errors"), "File cleanup behavior is stale");
  }
  for (let index = -1; index < referenceIndex.modules.length; index += 1) {
    instance.exports.glo_manual_select_module(index);
    assert.equal(instance.exports.glo_manual_get_module(), index);
    const text = render(width);
    if (index >= 0 && referenceIndex.modules[index][0] === "File_System/File") {
      assert(textRuns.some(run => run.value === "read_file" && run.marker.startsWith("item:")));
      assert(!text.includes("#MEMORY CONTRACTS"), "Module index still contains full documentation cards");
    }
  }
  // Each item now has its own page, so exercise every documentation body,
  // including all receiver and typeclass method targets at both widths.
  for (let index = 0; index < referenceIndex.symbols.length; index += 1) {
    instance.exports.glo_manual_select_symbol(index);
    render(width);
    assert.equal(instance.exports.glo_manual_get_symbol(), index);
    assert(textRuns.some(run => run.marker.startsWith("page-title")), `Missing item page ${index}`);
    if (referenceIndex.symbols[index][5] === "method") {
      assert(textRuns.some(run => run.anchor), `Missing method anchor ${index}: ${referenceIndex.symbols[index][0]}`);
      assert.equal(instance.exports.glo_manual_get_scroll_request(), 2, "A new route lost its scroll request before rendering");
    }
    instance.exports.glo_manual_clear_scroll_request();
  }
  const view = memoryView();
  view.setInt32(host.searchBridgeAddress, 0, true);
  view.setInt32(host.searchBridgeAddress + 4, 0, true);
  instance.exports.glo_manual_set_search_results(host.searchBridgeAddress, 1);
  instance.exports.glo_manual_set_view(2);
  assert(render(width).includes("Hello World"), "Search result bridge failed");

  // Module indexes show linked items, with no declaration/method tabs or pagination.
  const arrayModule = moduleIndex("Prelude/Array");
  instance.exports.glo_manual_select_module(arrayModule);
  let text = render(width);
  assert(textRuns.some(run => run.value === "[..]$T" && run.marker.startsWith("item:")));
  assert(!textRuns.some(run => ["Declarations", "Methods", "Next page"].includes(run.value)));
  text = clickText(width, "▾ Types");
  assert(!textRuns.some(run => run.value === "[..]$T"));
  assert.equal(instance.exports.glo_manual_get_scroll_request(), 0, "Folding should keep the reading position");
  text = clickText(width, "▸ Types");
  text = clickText(width, "[..]$T");
  assert(instance.exports.glo_manual_get_type() >= 0, "Receiver link did not open its type page");
  assert(textRuns.some(run => run.value === "[..]$T.push"));
  assert(!text.includes("#MEMORY CONTRACTS"), "Method bodies should initially fold");
  text = clickText(width, "▾ Methods and associated functions");
  assert(!textRuns.some(run => run.value === "[..]$T.push"));
  text = clickText(width, "▸ Methods and associated functions");
  assert(textRuns.some(run => run.value === "[..]$T.push"));
  text = clickText(width, "▸ Documentation");
  assert(text.includes("#MEMORY CONTRACTS"), "Method body did not expand");
  text = clickText(width, "▾ Documentation");
  assert(!text.includes("#MEMORY CONTRACTS"), "Method body did not collapse");

  // Free functions open dedicated documents. A cross-module type link collects
  // its receiver methods and constructors on the same documentation page.
  const fileModule = moduleIndex("File_System/File");
  instance.exports.glo_manual_select_module(fileModule);
  text = clickText(width, "read_file");
  assert.equal(instance.exports.glo_manual_get_symbol(), symbolIndex(fileModule, "read_file"));
  assert(text.includes("#MEMORY CONTRACTS"));
  assert(!textRuns.some(run => run.value === "write_file"));
  instance.exports.glo_manual_select_module(fileModule);
  text = clickText(width, "File");
  assert.equal(instance.exports.glo_manual_get_symbol(), symbolIndex(moduleIndex("File_System/Types"), "File"));
  assert(textRuns.some(run => run.value === "File.open" && run.marker.startsWith("item:")));
  assert(textRuns.some(run => run.value === "File.read"));
  text = clickText(width, "▾ Description");
  assert(textRuns.some(run => run.value === "Fields"), "Description folding hid a different section");
  assert(!text.includes("An open file handle."));
  text = openSymbolSearch(width, fileModule, "File.open");
  assert(textRuns.some(run => run.value === "File" && run.fontSize === 26));
  assert(textRuns.some(run => run.value === "File.open" && run.anchor));
  assert(text.includes("#MEMORY CONTRACTS"));

  // The entire module index is present, including items beyond the old page
  // limit. Class operations stay on the class's page.
  const math = moduleIndex("Math/Core");
  instance.exports.glo_manual_select_module(math);
  text = render(width);
  const mathNames = referenceIndex.symbols.filter(symbol => symbol[4] === math && symbol[5] !== "method").map(symbol => symbol[0]);
  for (const name of mathNames) assert(textRuns.some(run => run.value === name && run.marker.startsWith("item:")), `Missing linked item ${name}`);
  assert(!textRuns.some(run => run.value === "sin"));
  assert(!text.includes("Next page"));
  text = clickText(width, "Floating");
  assert(textRuns.some(run => run.value === "sin"));
  assert(text.includes("Implementations"));

  text = openSymbolSearch(width, stringMemory, "string.free");
  assert.equal(instance.exports.glo_manual_get_module(), stringMemory);
  assert(textRuns.some(run => run.value === "string.free" && run.anchor));

  // Contract rows are rendered for free functions, receiver methods, callback
  // types and nested class operations, rather than only copied into signatures.
  text = openSymbolSearch(width, metaModule, "type_of");
  assert(text.includes("#MEMORY CONTRACTS"));
  assert(textRuns.some(run => run.value === "noescape"));
  assert(textRuns.some(run => run.value === "val"));
  text = openSymbolSearch(width, moduleIndex("String_Builder"), "String_Builder.to_string");
  assert(textRuns.some(run => run.value === "returns_borrow"));
  assert(textRuns.some(run => run.value === "#self"));
  text = openSymbolSearch(width, moduleIndex("String_Builder"), "String_Builder.clone");
  assert(textRuns.some(run => run.value === "released_by"));
  assert(textRuns.some(run => run.value === "string.free"));
  assert(text.includes("*const String_Builder"));
  text = openSymbolSearch(width, moduleIndex("Context"), "mem_alloc");
  assert(textRuns.some(run => run.value === "(?*void).mem_free"));
  text = openSymbolSearch(width, moduleIndex("Memory/Object"), "new");
  assert(textRuns.some(run => run.value === "returns_fresh"));
  assert(textRuns.some(run => run.value === "delete"));
  text = openSymbolSearch(width, moduleIndex("Context"), "Allocator_Proc");
  assert(textRuns.some(run => run.value === "maybe_kills"));
  assert(textRuns.some(run => run.value === "unknown"));
  text = openSymbolSearch(width, moduleIndex("Io/Core"), "read");
  assert(textRuns.some(run => run.value === "read" && run.anchor));
  assert(textRuns.some(run => run.value === "writes"));
  assert(textRuns.some(run => run.value === "reader, destination"));
  text = openSymbolSearch(width, moduleIndex("Gui/Native"), "gui_scene_end");
  assert(text.includes("Written empty contract (#memory {})."));
  text = openSymbolSearch(width, moduleIndex("Prelude/Drop"), "drop");
  assert(text.includes("No written #memory contract"));

  // Late methods and class operations open directly, without page selection.
  const utf8 = moduleIndex("Strings/Utf8");
  text = openSymbolSearch(width, utf8, "u8.char_to_string");
  assert.equal(instance.exports.glo_manual_get_module(), utf8);
  assert(textRuns.some(run => run.value === "u8.char_to_string" && run.anchor));
  assert(text.includes("#MEMORY CONTRACTS"));
  assert(!text.includes("Next page"));
  text = openSymbolSearch(width, math, "sin");
  assert.equal(instance.exports.glo_manual_get_module(), math);
  assert(textRuns.some(run => run.value === "Floating" && run.fontSize === 26));
  assert(textRuns.some(run => run.value === "sin" && run.anchor));

  // Run the actual browser router against the Wasm state. Refreshes and
  // history navigation use the same paths as native item links.
  const router = {
    instance, referenceIndex, location: { hash: `#/std/${fileModule}/item/${symbolIndex(fileModule, "File.open")}` },
    URLSearchParams, applyingHash: false, replaceBrowserRoute: false, pendingHeading: "",
    setSidebarOpen() {}, scheduleRender() {}, window: { scrollTo() {} }, searchInput: { value: "" },
  };
  const routing = app.slice(app.indexOf("function applyHash()"), app.indexOf("function updatePointer("));
  const routeFunction = app.slice(app.indexOf("function documentRoute()"), app.indexOf("function syncOutline("));
  runInNewContext(routeFunction + routing + "applyHash(); this.route = documentRoute();", router);
  assert.equal(router.route, router.location.hash);
  assert(render(width).includes("#MEMORY CONTRACTS"));
  for (const suffix of ["", "/methods", "/declarations", "/item/999999", "/item/-1", "/item/1.5", "/item/0"]) {
    router.location.hash = `#/std/${fileModule}${suffix}`;
    runInNewContext("applyHash(); this.route = documentRoute();", router);
    assert.equal(router.route, `#/std/${fileModule}`, "Invalid or legacy item route did not fall back to the module");
    assert.equal(instance.exports.glo_manual_get_symbol(), -1);
  }
  for (const id of ["garbage", "-2", "0.5", "999999"]) {
    router.location.hash = `#/std/${id}`;
    runInNewContext("applyHash(); this.route = documentRoute();", router);
    assert.equal(router.route, "#/std");
  }
  const receiver = symbolIndex(arrayModule, "[..]$T.push");
  router.location.hash = `#/std/${arrayModule}/type/${receiver}`;
  runInNewContext("applyHash(); this.route = documentRoute();", router);
  assert.equal(router.route, router.location.hash);
  assert(render(width).includes("[..]$T.push"));
  const targetRoute = `#/std/${fileModule}/item/${symbolIndex(fileModule, "read_file")}`;
  router.history = { pushState(_state, _title, hash) { router.location.hash = hash; } };
  router.event = {
    button: 0, defaultPrevented: false,
    target: { closest: () => ({ getAttribute: () => targetRoute }) },
    preventDefault() { router.event.defaultPrevented = true; },
  };
  const clickRouting = app.slice(app.indexOf("function handleDocumentLink("), app.indexOf("function syncOutline("));
  runInNewContext(clickRouting + "handleDocumentLink(event);", router);
  assert.equal(instance.exports.glo_manual_get_symbol(), symbolIndex(fileModule, "read_file"),
    "A native click must update Wasm before the next pointer-up render");
  assert.equal(router.location.hash, targetRoute);
  router.event.defaultPrevented = false;
  router.event.ctrlKey = true;
  router.location.hash = "#/std";
  runInNewContext("handleDocumentLink(event);", router);
  assert.equal(router.location.hash, "#/std", "Modified clicks must retain native new-tab behavior");
  assert.equal(router.event.defaultPrevented, false);

}
console.log(`Manual smoke checks passed: ${referenceIndex.manual.length} chapters, ` +
  `${referenceIndex.modules.length} modules, ${referenceIndex.symbols.length} item pages, routing, folding and search, Tree-sitter, and ${frames} narrow/wide Wasm frames.`);
