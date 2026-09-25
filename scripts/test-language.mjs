// Check documented language behavior with the installed compiler:
// node scripts/test-language.mjs [path/to/glosso]
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const executableSuffix = process.platform === "win32" ? ".exe" : "";
const compiler = process.argv[2]
  ? resolve(process.argv[2])
  : `glosso${executableSuffix}`;
const fixtures = join(root, "scripts", "tests", "language-fixture");
const outputDirectory = join(root, "build", "language-tests");
const cacheDirectory = join(outputDirectory, "cache");
mkdirSync(cacheDirectory, { recursive: true });

function run(executable, args) {
  const result = spawnSync(executable, args, {
    cwd: root, encoding: "utf8", timeout: 120_000,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null, `${executable} terminated: ${result.stderr}`);
  return result;
}

function compile(name, backend = "llvm") {
  const output = join(outputDirectory,
    `${name}${backend === "llvm" ? executableSuffix : ".o"}`);
  const result = run(compiler, [
    "--color", "never", "--cache-dir", cacheDirectory,
    "--backend", backend, "-O0", "-o", output,
    join(fixtures, `${name}.glo`),
  ]);
  return { ...result, output };
}

function compileAndRun(name) {
  const compiled = compile(name);
  assert.equal(compiled.status, 0, `${name}: ${compiled.stdout}\n${compiled.stderr}`);
  const result = run(compiled.output, []);
  assert.equal(result.status, 0, `${name}: ${result.stdout}\n${result.stderr}`);
  return result.stdout.replace(/\r\n/g, "\n");
}

assert.equal(compileAndRun("operators"), [
  "left 13", "right 17", "prefix -7", "suffix 12", "assign 65",
  "loaded 68", "",
].join("\n"));

assert.equal(compileAndRun("try_operator"), "try operator passed\n");
assert.equal(compileAndRun("array_reserve"), "array reserve passed\n");
assert.equal(compileAndRun("current_language"), "current language passed\n");

for (const [name, diagnostic] of [
  ["try_missing_witness", "a quoted try operator call requires a leading boundary type and one operand"],
  ["try_missing_conversion", "no overload '?' accepts these arguments"],
  ["try_missing_boundary", "requires a Try-returning function or an enclosing #try block"],
  ["try_invalid_token", "with the boundary result in Break"],
  ["empty_parameter_order", "#empty parameters must appear before runtime parameters"],
]) {
  const rejected = compile(name, "object");
  assert.notEqual(rejected.status, 0, `${name}: invalid source compiled successfully`);
  const diagnostics = `${rejected.stdout}\n${rejected.stderr}`;
  assert.ok(diagnostics.includes(diagnostic), `${name}: missing ${diagnostic}:\n${diagnostics}`);
}

const locationSource = readFileSync(join(fixtures, "source_locations.glo"), "utf8");
const locationLines = locationSource.split(/\r?\n/);
function sourcePosition(lineMarker) {
  const index = locationLines.findIndex(line => line.includes(lineMarker));
  assert.notEqual(index, -1, `missing source location marker ${lineMarker}`);
  const directiveColumn = locationLines[index].indexOf("#source_location");
  assert.notEqual(directiveColumn, -1);
  // Glosso columns count Unicode scalars, not UTF-8 bytes or display cells.
  const column = Array.from(locationLines[index].slice(0, directiveColumn)).length + 1;
  return `${index + 1}:${column}`;
}
const locationOutput = compileAndRun("source_locations").split("\n");
assert.equal(locationOutput[0], `default ${sourcePosition("capture ::")}`);
assert.equal(locationOutput[1], `explicit ${sourcePosition("explicit_location :=")}`);
assert.equal(locationOutput[2].replaceAll("\\", "/"),
  `filename ${join(fixtures, "source_locations.glo").replaceAll("\\", "/")}`);
assert.equal(locationOutput[3], "text 한");
assert.equal(locationOutput[4], "");
assert.equal(locationOutput.length, 5);

const rejected = compile("removed_precedence", "object");
assert.notEqual(rejected.status, 0, "removed #precedence directives compiled successfully");
const diagnostics = `${rejected.stdout}\n${rejected.stderr}`;
assert.equal((diagnostics.match(/error: unexpected token 'precedence'/g) ?? []).length, 3,
  `expected rejection of left, right and assign #precedence directives:\n${diagnostics}`);

for (const name of ["removed_noreturn", "removed_private_section", "private_declaration"]) {
  const rejected = compile(name, "object");
  assert.notEqual(rejected.status, 0, `${name}: obsolete syntax or private access compiled successfully`);
  assert.match(`${rejected.stdout}\n${rejected.stderr}`, /error:/, `${name}: missing diagnostic`);
}

console.log("Language checks passed: visibility, inherent methods, receiver helpers, automatic Drop and cleanup errors, operators, Try, arrays, source locations, and rejected obsolete or invalid syntax.");
