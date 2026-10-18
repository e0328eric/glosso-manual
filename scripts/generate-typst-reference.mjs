// Refresh the printable reference from the same sources as the website:
//   node scripts/generate-typst-reference.mjs
//   node scripts/generate-typst-reference.mjs --check
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "docs/reference-manual.json");
const fingerprint = createHash("sha256");
const kinds = new Set([
  "paragraph", "subheading", "bullet", "note", "table_header", "table_row", "code_block",
]);
const counts = Object.fromEntries([...kinds].map(kind => [kind, 0]));

function read(path, hash = true) {
  const source = readFileSync(resolve(root, path), "utf8").replace(/\r\n/g, "\n");
  if (hash) fingerprint.update(`${path}\0${source}\0`);
  return source;
}

function literal(value, where) {
  // The ordinary literals in the manual use the JSON-compatible subset of
  // Glosso escapes. Reject anything else instead of silently changing examples.
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${where}: unsupported string literal ${value}`, { cause: error });
  }
}

function parseSections(path, titles) {
  const lines = read(path).split("\n");
  const sections = [];
  let section;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    const where = `${path}:${i + 1}`;
    const start = /^render_section_(\d+) :: \(\) \{$/.exec(line);
    if (start) {
      const id = Number(start[1]);
      assert.ok(titles.has(id), `${where}: section has no catalog title`);
      section = { id, title: titles.get(id), source: path, blocks: [] };
      sections.push(section);
      continue;
    }
    if (!section || !line || line === "}" || line.startsWith("//")) continue;
    const call = /^(\w+)\(\d+, (.*)$/.exec(line);
    assert.ok(call && kinds.has(call[1]), `${where}: unrecognized content: ${line}`);
    const kind = call[1];
    let argument = call[2];
    let language;
    if (kind === "code_block") {
      const code = /^("(?:[^"\\]|\\.)*"), (.*)$/.exec(argument);
      assert.ok(code, `${where}: missing code language`);
      language = literal(code[1], where);
      argument = code[2];
    }
    let text;
    if (argument.endsWith(");")) {
      text = literal(argument.slice(0, -2), where);
    } else {
      assert.match(argument, /^#string(?:,oneline)?$/, `${where}: unsupported block flags`);
      const parts = [];
      let closed = false;
      while (++i < lines.length) {
        if (lines[i].trim() === ");") {
          closed = true;
          break;
        }
        const part = /^\s*\\\\(.*)$/.exec(lines[i]);
        assert.ok(part, `${path}:${i + 1}: expected a #string continuation`);
        parts.push(part[1]);
      }
      assert.ok(closed, `${where}: unterminated #string block`);
      text = parts.join(argument.endsWith(",oneline") ? " " : "\n");
    }
    assert.equal(typeof text, "string", `${where}: expected text`);
    counts[kind] += 1;
    const block = { kind, text };
    if (language !== undefined) block.language = language;
    section.blocks.push(block);
  }
  return sections;
}

function collectTables(section) {
  const blocks = [];
  let table;
  for (const block of section.blocks) {
    if (block.kind === "table_header") {
      table = { kind: "table", headers: block.text.split("   —   "), rows: [] };
      blocks.push(table);
    } else if (block.kind === "table_row") {
      const cells = block.text.split("   |   ");
      // Later additions sometimes form a separate row after intervening prose.
      // The website renders those as headerless tables; retain their position.
      if (!table) {
        table = { kind: "table", headers: [], rows: [] };
        blocks.push(table);
      }
      const columns = table.headers.length || table.rows[0]?.length || cells.length;
      assert.equal(cells.length, columns,
        `${section.source}: section ${section.id}: table column mismatch: ${block.text}`);
      table.rows.push(cells);
    } else {
      table = undefined;
      blocks.push(block);
    }
  }
  // A header without rows is also visible content in the original manual.
  return { ...section, blocks };
}

assert.ok(process.argv.slice(2).every(arg => arg === "--check"), "only --check is supported");
const main = read("main.glo");
const catalog = read("src/section_catalog.glo");
const count = Number(/SECTION_COUNT :: (\d+);/.exec(catalog)?.[1]);
assert.ok(count > 0, "catalog has no SECTION_COUNT");
const titles = new Map([...catalog.matchAll(/case (\d+); return ("(?:[^"\\]|\\.)*");/g)]
  .map(([, id, title]) => [Number(id), literal(title, "section catalog")]));
assert.equal(titles.size, count, "catalog title count differs from SECTION_COUNT");
const paths = [...main.matchAll(/^#load,embed "(src\/sections_[^"]+\.glo)";/gm)]
  .map(([, path]) => path);
assert.ok(paths.length > 0, "main.glo loads no manual chapters");
assert.equal(new Set(paths).size, paths.length, "main.glo loads a chapter twice");
const sections = paths.flatMap(path => parseSections(path, titles))
  .sort((a, b) => a.id - b.id).map(collectTables);
assert.equal(sections.length, count, "rendered section count differs from the catalog");
sections.forEach((section, index) => {
  assert.equal(section.id, index, "missing or duplicate section");
  assert.ok(section.blocks.length > 0, `section ${index} is empty`);
});

// Preserve the website's grouping without maintaining another chapter list.
const groupSource = /const manualSidebarGroups = \[([\s\S]*?)\n\];/
  .exec(read("app.js", false))?.[1];
assert.ok(groupSource, "app.js has no manualSidebarGroups");
fingerprint.update(`manualSidebarGroups\0${groupSource}\0`);
const groups = [...groupSource.matchAll(/\{ title: ("(?:[^"\\]|\\.)*"), sections: \[([\d, ]+)\] \}/g)]
  .map(([, title, ids]) => ({ title: literal(title, "sidebar"), sections: JSON.parse(`[${ids}]`) }));
assert.deepEqual(groups.flatMap(group => group.sections), sections.map(section => section.id),
  "sidebar groups must contain every section once, in catalog order");

const result = `${JSON.stringify({
  generatedBy: "scripts/generate-typst-reference.mjs",
  sourceHash: fingerprint.digest("hex"),
  counts,
  groups,
  sections,
}, null, 2)}\n`;
if (process.argv.includes("--check")) {
  assert.ok(readFileSync(output, "utf8") === result,
    "Typst reference is stale; run node scripts/generate-typst-reference.mjs");
  console.log(`Typst reference is current: ${sections.length} sections in ${groups.length} groups.`);
} else {
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, result);
  console.log(`Wrote docs/reference-manual.json: ${sections.length} sections, ` +
    `${counts.code_block} code blocks, ${counts.table_header} tables.`);
}
