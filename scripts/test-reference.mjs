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

const { modules } = JSON.parse(readFileSync(output, "utf8"));
assert.equal(modules.length, 1);
const symbols = new Map(modules[0].symbols.map(symbol => [symbol.name, symbol]));
assert.equal(symbols.size, 6);

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

console.log("Reference extraction checks passed: current open, defaults, constraints, memory forms, typed flags, lazy parameters, and function pointers.");
