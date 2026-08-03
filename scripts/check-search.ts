import { stdInstances, stdSymbols } from "../src/generated/docs";
import { findSignatureMatches } from "../src/lib/signature";

const typeclasses = stdSymbols.filter((symbol) => symbol.kind === "typeclass");
if (!typeclasses.length) throw new Error("Standard-library documentation contains no typeclasses");
const misclassifiedTypeclasses = stdSymbols.filter(
  (symbol) => symbol.kind === "type" && /::\s*typeclass\b/.test(symbol.signature),
);
if (misclassifiedTypeclasses.length) {
  throw new Error(`Typeclasses classified as ordinary types: ${misclassifiedTypeclasses.map((symbol) => symbol.name).join(", ")}`);
}
console.log(`Typeclass documentation ready: ${typeclasses.length} typeclasses.`);

const partialEq = typeclasses.find((symbol) => symbol.name === "PartialEq");
if (partialEq?.typeclass?.minimal !== "'==' | '!='") {
  throw new Error("PartialEq minimal complete implementation was not extracted");
}
if (partialEq.typeclass.members.filter((member) => member.kind === "method").length !== 2) {
  throw new Error("PartialEq methods were not attached to its typeclass documentation");
}
const add = typeclasses.find((symbol) => symbol.name === "Add");
if (!add?.typeclass?.members.some((member) => member.kind === "associated-type" && member.name === "Output")) {
  throw new Error("Add.Output associated type was not attached to its typeclass documentation");
}
const eq = typeclasses.find((symbol) => symbol.name === "Eq");
if (!eq || eq.typeclass?.members.length) {
  throw new Error("Empty marker typeclass Eq incorrectly inherited instance members");
}
if (!stdInstances.some((instance) => instance.typeclass === "Eq" && instance.negative)) {
  throw new Error("Negative Eq instances were not indexed");
}
if (!stdInstances.some((instance) => instance.typeclass === "PartialEq")) {
  throw new Error("PartialEq instances were not indexed");
}
console.log(`Typeclass instance index ready: ${stdInstances.length} instances.`);

const documentedFunctions = stdSymbols.filter((symbol) => symbol.kind === "function" || symbol.kind === "method");
const undocumentedFunction = documentedFunctions.find((symbol) => !symbol.function);
if (undocumentedFunction) {
  throw new Error(`Function metadata missing for ${undocumentedFunction.module}.${undocumentedFunction.name}`);
}
const utf16FromString = documentedFunctions.find(
  (symbol) => symbol.module === "Strings/Utf16" && symbol.name === "cstring16_from_string",
);
if (!utf16FromString?.function || utf16FromString.function.returnType !== "cstring16") {
  throw new Error("cstring16_from_string return type was not extracted");
}
if (utf16FromString.function.parameters.map((parameter) => `${parameter.name}:${parameter.type}`).join(",") !== "text:string,allocator:Allocator") {
  throw new Error("cstring16_from_string parameters were not extracted");
}
if (utf16FromString.function.parameters[1]?.defaultValue !== "context.allocator") {
  throw new Error("cstring16_from_string default parameter value was not extracted");
}
const utf16MemoryEffects = utf16FromString.function.memoryContracts.map((contract) => contract.effect);
for (const effect of ["returns_fresh", "released_by", "reads", "noescape"]) {
  if (!utf16MemoryEffects.includes(effect)) throw new Error(`cstring16_from_string memory contract is missing ${effect}`);
}
const variadicFormat = documentedFunctions.find((symbol) => symbol.module === "Format" && symbol.name === "format");
if (!variadicFormat?.function?.parameters.some((parameter) => parameter.modifiers.includes("variadic"))) {
  throw new Error("Variadic function parameters were not classified");
}
console.log(`Structured function documentation ready: ${documentedFunctions.length} functions and methods.`);

const cases = ["(int, int) -> int", "(string, s32) -> string", "() -> f64", "(a, a) -> a"];
for (const query of cases) {
  const matches = findSignatureMatches(query, stdSymbols);
  if (!matches.length) throw new Error(`Signature smoke test returned no results for ${query}`);
  console.log(`${query}: ${matches.slice(0, 3).map((match) => `${match.symbol.module}.${match.symbol.name}`).join(", ")}`);
}
