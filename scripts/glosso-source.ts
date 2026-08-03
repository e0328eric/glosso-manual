import { existsSync } from "node:fs";
import { resolve } from "node:path";

function isGlossoSourceRoot(path: string): boolean {
  return existsSync(resolve(path, "src", "lexer.rs")) &&
    existsSync(resolve(path, "src", "parser.rs")) &&
    existsSync(resolve(path, "docs", "glosso-manual.typ")) &&
    existsSync(resolve(path, "std"));
}

export function findGlossoSourceRoot(manualDir: string): string | undefined {
  const configured = process.env.GLOSSO_SOURCE_ROOT?.trim();
  const candidates = [
    configured ? resolve(manualDir, configured) : undefined,
    resolve(manualDir, "..", "glosso"),
    resolve(manualDir, ".."),
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find(isGlossoSourceRoot);
}
