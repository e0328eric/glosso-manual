// Check language behavior the manual relies on, beyond its own examples
// (scripts/test-examples.mjs), with the installed compiler:
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

function run(executable, args, environment = process.env) {
  const result = spawnSync(executable, args, {
    cwd: root, env: environment, encoding: "utf8", timeout: 120_000,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null, `${executable} terminated: ${result.stderr}`);
  return result;
}

function compile(name, backend = "llvm", environment = process.env, options = []) {
  const output = join(outputDirectory,
    `${name}${backend === "llvm" ? executableSuffix : ".o"}`);
  const result = run(compiler, [
    "compile", "--color", "never", "--cache-dir", cacheDirectory,
    "--backend", backend, "-O0", "-o", output, ...options,
    join(fixtures, `${name}.glo`),
  ], environment);
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
assert.equal(compileAndRun("current_std_api"), "current std APIs passed\n");
assert.equal(compileAndRun("current_commands"), "current command APIs passed\n");
assert.equal(compileAndRun("current_build_commands"), "current build command API passed\n");
assert.equal(compileAndRun("string_views"), "string views passed\n");
assert.equal(compileAndRun("current_syntax"), "current syntax passed\n");
assert.equal(compileAndRun("pointers_literals"), "pointers and literals passed\n");
assert.equal(compileAndRun("current_reflection"), "current reflection passed\n");
assert.equal(compileAndRun("current_matrix"), "matrix literals and conversions passed\n");
assert.equal(compileAndRun("current_comptime"), "current comptime passed\n");
assert.equal(compileAndRun("current_strings"), "current strings passed\n");
assert.equal(compileAndRun("current_format"), "brace formatting passed\n");
assert.equal(compileAndRun("current_pointer_fields"), "pointer fields passed\n");
assert.equal(compileAndRun("optional_values"), "optional values passed\n");

for (const [name, diagnostic] of [
  ["try_missing_witness", "a quoted try operator call requires a leading boundary type and one operand"],
  ["try_missing_conversion", "no overload '?' accepts these arguments"],
  ["try_missing_boundary", "requires a Try-returning function or an enclosing #try block"],
  ["try_invalid_token", "with the boundary result in Break"],
  ["empty_parameter_order", "#empty parameters must appear before runtime parameters"],
  ["removed_address_star", "operator '*' expects a typed pointer"],
  ["invalid_alignment", "#align expects a positive power of two"],
  ["invalid_const_overflow", "constant arithmetic overflow"],
  ["invalid_float_literal", "out of range for f16"],
  ["non_exhaustive_switch", "non-exhaustive switch"],
  ["removed_string_cat", "str has no field cat"],
  ["removed_string_repeat", "str has no field repeat"],
  ["runtime_string_add", "string concatenation with '+' requires constant strings"],
  ["readonly_write", "not assignable"],
  ["readonly_view_write", "not assignable"],
  ["readonly_pointer_field", "not assignable"],
  ["optional_pointer_field", "no union field x"],
  ["optional_some_value", "use `?x` for a present `?T`, not `.Some(x)`"],
  ["optional_none_value", "use `null` for an empty `?T`"],
  ["optional_some_pattern", "use `?p` to match a present `?T`, not `.Some(p)`"],
  ["optional_implicit_wrap", "got ssize, expected ?s64"],
  ["optional_spaced_question", "'?' with a space on both sides is ambiguous"],
  ["optional_prefix_operator", "operator '?' cannot be overloaded as a prefix operator"],
  ["format_unused_argument", "format argument 0 is not used"],
  ["format_index_range", "format argument index 2 is out of range for 2 arguments"],
  ["format_unmatched_brace", "unmatched '}' in format string"],
  ["format_old_placeholder", "format has fewer '{}' placeholders than arguments"],
  ["matrix_array_literal", "ordinary array literal .[...] cannot initialize Matrix(s64, 2, 3); use #matrix"],
  ["matrix_wrong_shape", "Matrix literal expects 2 row(s) and 3 column(s), got 1 row(s) and 6 column(s)"],
  ["matrix_ragged_rows", "#matrix literal row 2 has 2 column(s), expected 3"],
  ["matrix_missing_context", "#matrix literal requires a Matrix(T, Row, Col) context"],
  ["matrix_array_conversion", "constraint failed for matrix_from_array"],
]) {
  const rejected = compile(name, "object");
  assert.notEqual(rejected.status, 0, `${name}: invalid source compiled successfully`);
  const diagnostics = `${rejected.stdout}\n${rejected.stderr}`;
  assert.ok(diagnostics.includes(diagnostic), `${name}: missing ${diagnostic}:\n${diagnostics}`);
}

// Bound both evaluation engines so a broken compile-time loop cannot hang a build.
for (const name of ["comptime_step_limit", "constant_step_limit"]) {
  const rejected = compile(name, "object", { ...process.env, GLOSSO_COMPTIME_STEP_LIMIT: "64" });
  assert.notEqual(rejected.status, 0, `${name}: execution limit did not stop the loop`);
  assert.match(`${rejected.stdout}\n${rejected.stderr}`, /step limit|GLOSSO_COMPTIME_STEP_LIMIT/i);
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

for (const name of ["removed_noreturn", "removed_private_section", "private_declaration",
  "removed_mut",
  "removed_compiler_run_command", "removed_run_command_line",
  "removed_type_of_method", "local_function_escape"]) {
  const rejected = compile(name, "object");
  assert.notEqual(rejected.status, 0, `${name}: obsolete syntax or private access compiled successfully`);
  assert.match(`${rejected.stdout}\n${rejected.stderr}`, /error:/, `${name}: missing diagnostic`);
}

for (const [name, diagnostic] of [
  ["string_capacity", /capacity/],
]) {
  const rejected = compile(name, "object");
  assert.notEqual(rejected.status, 0, `${name}: invalid string-view use compiled successfully`);
  assert.match(`${rejected.stdout}\n${rejected.stderr}`, diagnostic);
}

console.log("Language checks passed: argument-vector commands, shell and compile-time build commands, matrix literals and fixed-array conversions, brace and indexed formatting, builder writef, pointer-field shorthand and qualifiers, optional values and their rejected variant spellings, explicit file and container cleanup, Strings umbrella, constant concatenation, rejected removed string methods, compile-time execution budgets, unevaluated type_of, local declarations, explicit alignment, compile-time builders and reflection, exhaustive switches and constant range checks, pointer expressions, C-string and byte-array literals, string views, visibility, inherent methods, current std APIs, operators, Try, arrays, source locations, and rejected obsolete or invalid syntax.");
