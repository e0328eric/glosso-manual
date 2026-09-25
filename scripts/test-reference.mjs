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
assert.equal(modules.length, 3);
const fixture = modules.find(module => module.name === "Fixture");
assert.ok(fixture);
const symbols = new Map(fixture.symbols.map(symbol => [symbol.name, symbol]));
assert.equal(symbols.size, 12, "default-private declarations, unit declarations, and private groups must be excluded");
assert.equal(symbols.get("grouped").summary, "A public function inside a visibility group.");
assert.ok(symbols.has("after_nested"), "nested private groups must restore public visibility");
for (const name of ["Box.make", "Box.get", "Box.set"]) {
  assert.equal(symbols.get(name).kind, "method");
  assert.equal(symbols.get(name).owner_typeclass, "");
}
assert.equal(symbols.get("Box.get").display_signature, "Box.get :: (#self) -> ssize");
assert.equal(symbols.get("Box.set").display_signature, "Box.set :: (*#self, value: ssize)");
assert.deepEqual(symbols.get("Box.set").function_info.parameters[0], {
  name: "#self", value_type: "*Box", default_value: "", modifiers: ["receiver"], constraints: [],
});
assert.deepEqual(symbols.get("Box").type_info.fields.map(field => field.name), ["value", "exposed"]);

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
assert.deepEqual(open.function_info.memory_contracts, [
  { effect: "returns_fresh", arguments: ["returned.Ok"] },
  { effect: "released_by", arguments: ["place: returned.Ok", "by: close"] },
  { effect: "escapes", arguments: ["path"] },
]);

const flags = symbols.get("Open_Flags").type_info;
assert.equal(flags.kind, "enum_flags");
assert.deepEqual(flags.variants.map(variant => [variant.name, variant.value]), [
  ["None", "0"], ["Append", "1"], ["Sync", "32"], ["Default", "Append | Sync"],
]);

const lazy = symbols.get("lazy").function_info.parameters;
assert.deepEqual(lazy.slice(0, 2).map(parameter => parameter.name), ["value", "other"]);
assert.deepEqual(lazy.slice(0, 2).map(parameter => parameter.modifiers), [
  ["lazy", "comptime"], ["comptime", "lazy"],
]);
assert.equal(lazy[2].name, "size");
assert.equal(lazy[2].value_type, "");
assert.equal(lazy[2].default_value, "42");
assert.equal(lazy[3].value_type, "[]string");
assert.equal(lazy[3].default_value, ".[]");

for (const [name, effects] of [
  ["legacy", ["returns_borrow", "noescape"]],
  ["bare", ["returns_borrow"]],
  ["Callback", ["reads", "noescape"]],
]) {
  const symbol = symbols.get(name);
  assert.deepEqual(symbol.function_info.memory_contracts.map(contract => contract.effect), effects);
  assert.deepEqual(symbol.function_info.parameters[0].constraints, ["AsView(P, Path_View)"]);
  assert.doesNotMatch(symbol.display_signature, /#memory|\bwhere\b/);
}
assert.equal(symbols.get("Callback").type_info.kind, "function-pointer");
assert.equal(symbols.get("Callback").display_signature, "Callback :: #fn_ptr(path: $P) -> string");

const locationModule = modules.find(module => module.name === "Source_Location");
assert.ok(locationModule);
const locations = new Map(locationModule.symbols.map(symbol => [symbol.name, symbol]));
assert.equal(locations.size, 3, "instance implementations must not become public functions");
assert.equal(locations.get("Source_Location").type_info.kind, "struct");
assert.deepEqual(locations.get("Source_Location").type_info.fields.map(field => [field.name, field.value_type]), [
  ["filename", "string"], ["line", "ssize"], ["column", "ssize"],
]);
assert.equal(locations.get("HERE").kind, "constant");
assert.equal(locations.get("HERE").signature, "HERE :: #source_location");

const diagnostic = locations.get("diagnostic");
assert.equal(diagnostic.display_signature,
  "diagnostic :: (message: string, location: Source_Location = #source_location, " +
  "line := #source_location.line, fallback: Source_Location = " +
  ".{ .filename = \"generated.glo\", .line = 1, .column = 1 }) -> string");
assert.deepEqual(diagnostic.function_info.parameters.map(parameter => [parameter.name, parameter.value_type, parameter.default_value]), [
  ["message", "string", ""],
  ["location", "Source_Location", "#source_location"],
  ["line", "", "#source_location.line"],
  ["fallback", "Source_Location", ".{ .filename = \"generated.glo\", .line = 1, .column = 1 }"],
]);
assert.deepEqual(diagnostic.function_info.memory_contracts, [
  { effect: "returns_fresh", arguments: [] },
  { effect: "reads", arguments: ["message", "location"] },
  { effect: "noescape", arguments: ["message", "location"] },
]);
assert.doesNotMatch(diagnostic.display_signature, /#memory|\bwhere\b/);
assert.equal(instances.length, 1);
assert.equal(instances[0].class_name, "Show");
assert.equal(instances[0].head, "Source_Location");
assert.equal(instances[0].module, "Source_Location");

const tryModule = modules.find(module => module.name === "Try");
assert.ok(tryModule);
const trySymbols = new Map(tryModule.symbols.map(symbol => [symbol.name, symbol]));
assert.equal(trySymbols.size, 5);
const propagation = trySymbols.get("?");
assert.equal(propagation.kind, "method");
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
assert.equal(trySymbols.get("Try").class_info.minimal, "from_output, from_residual, branch");
assert.deepEqual(trySymbols.get("Try").class_info.members.map(member => member.name), [
  "Output", "Residual", "from_output", "from_residual", "branch", "?",
]);

console.log("Reference extraction checks passed: visibility groups, inherent methods, defaults, constraints, memory forms, typed flags, function pointers, source locations, and try(Target) operators.");
