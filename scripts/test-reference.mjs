// Run after gen-reference builds the extractor, or pass its executable path:
// node scripts/test-reference.mjs [path/to/generate-reference-source]
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const executable = process.argv[2]
  ? resolve(process.argv[2])
  : join(root, "build", `generate-reference-source${process.platform === "win32" ? ".exe" : ""}`);
const output = join(root, "build", "reference-test-source.json");
mkdirSync(dirname(output), { recursive: true });
const extraction = spawnSync(executable, [
  join(root, "scripts", "tests", "reference-fixture"), output,
], { cwd: root, encoding: "utf8" });
assert.ifError(extraction.error);
assert.equal(extraction.status, 0, `${extraction.stdout}\n${extraction.stderr}`);

const { modules, instances } = JSON.parse(readFileSync(output, "utf8"));
assert.deepEqual(modules.map(module => module.name), ["Fixture", "Source_Location", "Try"],
  "every source file is its own module");
const fixture = modules.find(module => module.name === "Fixture");
assert.ok(fixture);
const symbols = new Map(fixture.symbols.map(symbol => [symbol.name, symbol]));
assert.equal(symbols.size, 27, "include public declarations, excluding private and unit declarations");
assert.equal(fixture.source_path, "std/Fixture.glo");
assert.equal(fixture.summary, "Source-only fixture: tests the reference scanner, not Glosso type checking.");
// Fixture imports Source_Location.glo; the imported declarations stay in their own module.
for (const name of ["Source_Location", "HERE", "diagnostic"])
  assert(!symbols.has(name), `Imported declaration grouped under its importer: ${name}`);
for (const name of [
  "_private_helper", "__Private_Type", "_Private_Class", "hidden_method", "section_private",
  "unmarked_private", "unit_private", "unit_grouped", "hidden_nested",
  "Box.reveal", "Box.adjust", "Box.conceal", "Box.unit_method",
]) assert(!symbols.has(name), `Private or unit declaration leaked: ${name}`);
assert.equal(symbols.get("grouped").summary, "A public function inside a visibility group.");
assert.equal(symbols.get("grouped").display_signature, "grouped :: ()");
assert.ok(symbols.has("after_nested"), "nested private groups must restore public visibility");
for (const name of ["Box.make", "Box.get", "Box.copy_from", "Box.set", "Box.peek"]) {
  assert.equal(symbols.get(name).kind, "method");
  assert.equal(symbols.get(name).owner_typeclass, "");
}
assert.equal(symbols.get("Box.get").display_signature, "Box.get :: (#self) -> ssize");
assert.equal(symbols.get("Box.get").summary, "Reads a box through its receiver.");
assert.equal(symbols.get("Box.make").display_signature, 'Box.make :: (value: ssize, label: str = "#Self_Type") -> Box');
assert.equal(symbols.get("Box.make").summary, "Constructs a box without a receiver.");
assert.equal(symbols.get("Box.make").function_info.return_type, "Box");
assert.equal(symbols.get("Box.copy_from").function_info.return_type, "Fs_Error!Box");
assert.equal(symbols.get("Box.copy_from").function_info.parameters[1].value_type, "*const Box");
assert.equal(symbols.get("Box.copy_from").searchable_signature, "(*Box, *const Box) -> Fs_Error!Box");
assert.equal(symbols.get("Box.set").display_signature, "Box.set :: (*#self, value: ssize)");
assert.equal(symbols.get("Box.peek").function_info.parameters[0].value_type, "*const Box");
assert.deepEqual(symbols.get("Box.set").function_info.parameters[0], {
  name: "#self", value_type: "*Box", default_value: "", modifiers: ["receiver"], constraints: [],
});
assert.deepEqual(symbols.get("Box").type_info.fields.map(field => field.name), ["value", "exposed"]);
assert.equal(symbols.get("$T.inspect").kind, "method");
assert.equal(symbols.get("$T.inspect").function_info.return_type, "str");
assert.deepEqual(symbols.get("$T.inspect").function_info.where_clauses, ["Show(T)"]);
assert.deepEqual(symbols.get("$T.inspect").function_info.parameters[0].constraints, ["Show(T)"]);
assert.equal(symbols.get("abort").function_info.return_type, "#Never");
assert.equal(symbols.get("abort").searchable_signature, "() -> #Never");
assert.equal(symbols.get("GROUPED").kind, "constant");
assert.equal(symbols.get("GROUPED_SIMPLE").kind, "constant");
assert.equal(symbols.get("Signed").type_info.variants[0].value, "-1");
assert.equal(symbols.get("C_TEXT").signature, 'C_TEXT :: c"// { ; }"');
assert.equal(symbols.get("BYTE_TEXT").signature, 'BYTE_TEXT :: b"\\xFF; // }"');
assert.deepEqual(symbols.get("literal_defaults").function_info.parameters.map(parameter => [
  parameter.value_type, parameter.default_value,
]), [
  ["cstr", 'c"// { ; }"'], ["[2]u8", 'b"\\xFF;"'],
]);
assert.equal(symbols.get("literal_defaults").function_info.return_type, "*const u8");

const open = symbols.get("open");
assert.equal(open.display_signature,
  "open :: (path: $P, access: File_Access = File_Access.Read, " +
  "disposition: Open_Disposition = Open_Disposition.Open_Existing, " +
  "permissions: File_Permissions = File_Permissions.Default_File, " +
  "flags: Open_Flags = .None) -> Fs_Error!File");
assert.equal(open.function_info.parameters.length, 5);
assert.deepEqual(open.function_info.parameters[0].constraints, ["AsView(P, Path_View)"]);
assert.deepEqual(open.function_info.parameters.slice(1).map(parameter => parameter.default_value), [
  "File_Access.Read", "Open_Disposition.Open_Existing", "File_Permissions.Default_File", ".None",
]);
// The transport carries no fields for the removed #memory contracts.
assert.deepEqual(Object.keys(open.function_info), ["parameters", "return_type", "where_clauses"]);

const flags = symbols.get("Open_Flags").type_info;
assert.equal(flags.kind, "enum_flags");
assert.deepEqual(flags.variants.map(variant => [variant.name, variant.value]), [
  ["None", "0"], ["Append", "1"], ["Sync", "32"], ["Temporary", "16#40"],
]);

const lazy = symbols.get("lazy").function_info.parameters;
assert.deepEqual(lazy.slice(0, 2).map(parameter => parameter.name), ["value", "other"]);
assert.deepEqual(lazy.slice(0, 2).map(parameter => parameter.modifiers), [
  ["lazy", "comptime"], ["comptime", "lazy"],
]);
assert.equal(lazy[2].name, "size");
assert.equal(lazy[2].value_type, "");
assert.equal(lazy[2].default_value, "42");
assert.equal(lazy[3].value_type, "[]const str");
assert.equal(lazy[3].default_value, ".[]");

// A trailing where clause becomes parameter constraints, not signature text,
// and an ordinary comment inside a documentation block does not end it.
const viewText = symbols.get("view_text");
assert.equal(viewText.display_signature, "view_text :: (path: $P) -> str");
assert.deepEqual(viewText.function_info.where_clauses, ["AsView(P, Path_View)"]);
assert.deepEqual(viewText.function_info.parameters[0].constraints, ["AsView(P, Path_View)"]);
assert.equal(viewText.summary,
  "A borrowed path view whose constraint is written after the return type. " +
  "The constraint stays out of the display signature.");

const callback = symbols.get("Callback");
assert.equal(callback.kind, "type");
assert.equal(callback.type_info.kind, "function-pointer");
assert.equal(callback.display_signature, "Callback :: #fn_ptr(path: cstr, data: ?*void) -> s32 #c_call");
assert.equal(callback.searchable_signature, "(cstr, ?*void) -> s32");
assert.equal(callback.summary, "A callback keeps its calling-convention directive.");

const malloc = symbols.get("c_malloc");
assert.equal(malloc.display_signature, 'c_malloc :: (size: usize) -> ?*void #foreign "c" "malloc"');
assert.equal(malloc.function_info.return_type, "?*void");
assert.equal(malloc.summary, "A foreign declaration keeps its directive after a nullable return type.");


// Specialization code belongs to the signature, before the actual body.
assert.equal(symbols.get("widen").display_signature,
  "widen :: (value: $T) -> T #specialize");
assert.equal(symbols.get("widen").function_info.return_type, "T");
assert.equal(symbols.get("widen").summary, "Rebinds a type before compiling the body.");
assert.equal(symbols.get("integer_only").display_signature,
  "integer_only :: (value: $T) -> T #specialize Is_Integer(T)");
assert.equal(symbols.get("read_foo").display_signature,
  "read_foo :: (value: $T) -> s64 #specialize #meaningful { T,,foo; }");
assert.equal(symbols.get("read_foo").function_info.return_type, "s64");
for (const name of ["Specialized_Box", "Field_Box"])
  assert.deepEqual(symbols.get(name).type_info.fields.map(field => [field.name, field.value_type]),
    [["value", "$T"]], `${name} confused a specialization condition with the struct body`);

const fixtureLines = readFileSync(join(root, "scripts/tests/reference-fixture/Fixture.glo"), "utf8").split(/\r?\n/);
const fixtureLine = text => fixtureLines.findIndex(line => line.includes(text)) + 1;
assert.equal(open.source_line, fixtureLine("#public open ::"));
assert.equal(symbols.get("Box.peek").source_line, fixtureLine("peek ::"));
assert.equal(malloc.source_line, fixtureLine("#public c_malloc ::"));

const locationModule = modules.find(module => module.name === "Source_Location");
assert.ok(locationModule);
const locations = new Map(locationModule.symbols.map(symbol => [symbol.name, symbol]));
assert.equal(locations.size, 3, "instance implementations must not become public functions");
assert.equal(locations.get("Source_Location").source_path, "std/Source_Location.glo");
assert.equal(locations.get("Source_Location").type_info.kind, "struct");
assert.deepEqual(locations.get("Source_Location").type_info.fields.map(field => [field.name, field.value_type]), [
  ["filename", "str"], ["line", "ssize"], ["column", "ssize"],
]);
assert.equal(locations.get("HERE").kind, "constant");
assert.equal(locations.get("HERE").signature, "HERE :: #source_location");

const diagnostic = locations.get("diagnostic");
assert.equal(diagnostic.display_signature,
  "diagnostic :: (message: str, location: Source_Location = #source_location, " +
  "line := #source_location.line, fallback: Source_Location = " +
  ".{ .filename = \"generated.glo\", .line = 1, .column = 1 }) -> str");
assert.deepEqual(diagnostic.function_info.parameters.map(parameter => [parameter.name, parameter.value_type, parameter.default_value]), [
  ["message", "str", ""],
  ["location", "Source_Location", "#source_location"],
  ["line", "", "#source_location.line"],
  ["fallback", "Source_Location", ".{ .filename = \"generated.glo\", .line = 1, .column = 1 }"],
]);
assert.doesNotMatch(diagnostic.display_signature, /\bwhere\b/);

assert.equal(instances.length, 1);
assert.equal(instances[0].class_name, "Show");
assert.equal(instances[0].head, "Source_Location");
assert.equal(instances[0].module, "Source_Location");
assert.equal(instances[0].summary, "Renders filename:line:column for editor diagnostics.");

const tryModule = modules.find(module => module.name === "Try");
assert.ok(tryModule);
const trySymbols = new Map(tryModule.symbols.map(symbol => [symbol.name, symbol]));
assert.equal(trySymbols.size, 5);
const propagation = trySymbols.get("?");
assert.equal(propagation.kind, "method");
assert.equal(propagation.summary, "Propagates with the current boundary witness.");
assert.equal(propagation.owner_typeclass, "Try");
assert.equal(propagation.has_default, true);
assert.equal(propagation.display_signature,
  "'?' :: (#empty: $Target, value: Carrier) -> Try_Branch(Output, Target) #operator(suffix, try(Target))");
assert.equal(propagation.searchable_signature, "(Carrier) -> Try_Branch(Output, Target)");
assert.deepEqual(propagation.function_info.parameters.map(parameter => [parameter.name, parameter.value_type, parameter.modifiers]), [
  ["#empty", "$Target", ["empty type witness"]], ["value", "Carrier", []],
]);
assert.deepEqual(propagation.function_info.parameters[0].constraints, [
  "Try(Target)",
  "(Try(Carrier).Residual == Try(Target).Residual || Propagate(Try(Carrier).Residual, Try(Target).Residual))",
]);
const nestedPropagation = trySymbols.get("Try").class_info.members.find(member => member.name === "?");
assert.equal(nestedPropagation.display_signature, propagation.display_signature);
assert.equal(nestedPropagation.has_default, true);
assert.deepEqual(nestedPropagation.function_info, propagation.function_info);
assert.equal(trySymbols.get("Try").class_info.minimal, "from_output, from_residual, branch");
assert.deepEqual(trySymbols.get("Try").class_info.members.map(member => member.name), [
  "Output", "Residual", "from_output", "from_residual", "branch", "?",
]);

console.log("Reference extraction checks passed: one module per source file, documentation across interleaved notes, visibility groups and unit visibility, C-string and byte-array literals, inherent methods, defaults, constraints, read-only and writable pointers, typed flags, function pointers, foreign declarations, source locations, and try(Target) operators.");
