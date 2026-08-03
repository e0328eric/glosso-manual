import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Language, Parser } from "web-tree-sitter";

const manualDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
await Parser.init();
const language = await Language.load(resolve(manualDir, "tree-sitter-glosso.wasm"));
const parser = new Parser();
parser.setLanguage(language);
const tree = parser.parse('main :: () { return #char "g"; }');
if (!tree || tree.rootNode.hasError) {
  throw new Error("The bundled Glosso Tree-sitter WASM could not parse the smoke-test program.");
}
console.log(`Tree-sitter Glosso WASM ready (ABI ${language.abiVersion}, root ${tree.rootNode.type}).`);
tree.delete();
parser.delete();
