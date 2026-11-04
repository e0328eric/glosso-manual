// Check every example in the manual with a compiler:
// node scripts/test-examples.mjs [path/to/glosso] [chapter ...]
//
// Each `glosso` code block of src/sections_*.glo is compiled. A block that
// declares `main` is run, and its standard output must equal the "text" block
// that immediately follows it, unless that block is a transcript (it starts
// with "$ ") or a diagnostic (it starts with "//"). A block without `main` is
// compiled to an object file. A block whose first line is `// name.glo` is
// saved under that name, so later blocks of the same chapter can import it.
// Blocks listed in scripts/tests/manual-fragments.txt ("chapter:index") are
// deliberately incomplete; they are saved but not compiled.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const executableSuffix = process.platform === "win32" ? ".exe" : "";
const compiler = process.argv[2] ? resolve(process.argv[2]) : `glosso${executableSuffix}`;
const wanted = new Set(process.argv.slice(3));
const outputDirectory = join(root, "build", "example-tests");
const cacheDirectory = join(outputDirectory, "cache");
mkdirSync(cacheDirectory, { recursive: true });

const fragments = new Set(readFileSync(join(root, "scripts", "tests", "manual-fragments.txt"), "utf8")
  .split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith("#")));

// The chapters, in file order: { number, blocks: [{ index, language, text }] }.
const chapters = [];
for (const file of readdirSync(join(root, "src")).filter(name => /^sections_.*\.glo$/.test(name)).sort()) {
  const source = readFileSync(join(root, "src", file), "utf8").replace(/\r\n/g, "\n");
  const starts = [...source.matchAll(/^render_section_(\d+) :: \(\) \{$/gm)];
  starts.forEach((start, n) => {
    const body = source.slice(start.index, n + 1 < starts.length ? starts[n + 1].index : source.length);
    const blocks = [...body.matchAll(/code_block\(\s*(\d+),\s*"(\w+)",\s*#string\n((?:[ \t]*\\\\.*\n)+)/g)]
      .map(match => ({
        index: Number(match[1]),
        language: match[2],
        text: match[3].replace(/\n$/, "").split("\n").map(line => line.replace(/^[ \t]*\\\\/, "")).join("\n") + "\n",
      }));
    chapters.push({ number: start[1], blocks });
  });
}

function run(executable, args, cwd) {
  return new Promise(resolvePromise => {
    const child = spawn(executable, args, { cwd, env: process.env });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", chunk => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", chunk => { stderr += chunk; });
    const timer = setTimeout(() => child.kill("SIGKILL"), 120_000);
    child.on("error", error => { clearTimeout(timer); resolvePromise({ status: -1, stdout, stderr: String(error) }); });
    child.on("close", (status, signal) => { clearTimeout(timer); resolvePromise({ status, signal, stdout, stderr }); });
  });
}

// Blocks of one chapter run in order, because later blocks may import files
// saved by earlier ones; chapters run in parallel.
async function checkChapter(chapter) {
  const failures = [];
  let checked = 0;
  const directory = join(outputDirectory, `s${chapter.number}`);
  mkdirSync(directory, { recursive: true });
  for (const [position, block] of chapter.blocks.entries()) {
    if (block.language !== "glosso") continue;
    const key = `${chapter.number}:${block.index}`;
    const named = block.text.split("\n", 1)[0].match(/^\/\/ (\S+\.glo)\s*$/);
    const name = named ? named[1] : `s${chapter.number}_${block.index}.glo`;
    const path = join(directory, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, block.text);
    if (fragments.has(key)) continue;
    checked += 1;
    const hasMain = /^main ::/m.test(block.text);
    const output = path.replace(/\.glo$/, hasMain ? `.out${executableSuffix}` : ".o");
    const args = ["compile", "--color", "never", "--cache-dir", cacheDirectory];
    if (!hasMain) args.push("--no-main", "--backend", "object");
    const compiled = await run(compiler, [...args, path, "-o", output], directory);
    if (compiled.status !== 0) {
      const errors = compiled.stderr.split("\n").filter(line => /^(error|note|help)/.test(line)).join("\n    ");
      failures.push(`${key} does not compile\n    ${errors || compiled.stderr.trim()}`);
      continue;
    }
    if (!hasMain) continue;
    const next = chapter.blocks[position + 1];
    const expected = next && next.language === "text" && next.index === block.index + 1 ? next.text : null;
    const result = await run(output, [], directory);
    if (expected === null || expected.startsWith("$ ") || expected.startsWith("//")) continue;
    const actual = result.stdout.replace(/\r\n/g, "\n");
    if (actual !== expected) failures.push(`${key} prints\n${actual}--- instead of\n${expected}---`);
  }
  return { checked, failures };
}

const selected = chapters.filter(chapter => wanted.size === 0 || wanted.has(chapter.number));
assert.ok(selected.length > 0, "no chapters selected");
const results = new Array(selected.length);
let next = 0;
async function worker() {
  while (next < selected.length) {
    const position = next++;
    results[position] = await checkChapter(selected[position]);
  }
}
await Promise.all(Array.from({ length: Math.max(1, Math.min(8, availableParallelism() >> 1)) }, worker));

const failures = results.flatMap(result => result.failures);
const checked = results.reduce((sum, result) => sum + result.checked, 0);
for (const failure of failures) console.error(failure);
assert.equal(failures.length, 0, `${failures.length} of ${checked} examples failed`);
console.log(`Example checks passed: ${checked} examples in ${selected.length} chapters compile, and every program prints the output shown after it.`);
