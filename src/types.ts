export type BlockKind = "paragraph" | "code" | "list" | "heading" | "note" | "table";

export interface DocBlock {
  kind: BlockKind;
  text?: string;
  language?: string;
  items?: string[];
  columns?: string[];
  rows?: string[][];
}

export interface ManualSection {
  id: string;
  title: string;
  blocks: DocBlock[];
}

export interface DirectiveDoc {
  name: string;
  site: string;
  syntax: string;
  summary: string;
  details?: string[];
}

export interface StdSymbol {
  id: string;
  name: string;
  module: string;
  kind: "function" | "method" | "typeclass" | "type" | "constant";
  signature: string;
  searchableSignature: string;
  summary: string;
  sourcePath: string;
  sourceLine: number;
  ownerTypeclass?: string;
  hasDefault?: boolean;
  typeclass?: StdTypeclassInfo;
  function?: StdFunctionInfo;
}

export interface StdParameter {
  name: string;
  type: string;
  defaultValue?: string;
  modifiers: string[];
}

export interface StdMemoryContract {
  effect: string;
  arguments: string[];
}

export interface StdFunctionInfo {
  parameters: StdParameter[];
  returnType: string;
  memoryContracts: StdMemoryContract[];
}

export interface StdTypeclassMember {
  id: string;
  name: string;
  kind: "method" | "associated-type";
  signature: string;
  summary: string;
  sourcePath: string;
  sourceLine: number;
  hasDefault: boolean;
  function?: StdFunctionInfo;
}

export interface StdTypeclassInfo {
  minimal: string;
  minimalExplicit: boolean;
  members: StdTypeclassMember[];
}

export interface StdInstance {
  id: string;
  typeclass: string;
  head: string;
  module: string;
  signature: string;
  summary: string;
  sourcePath: string;
  sourceLine: number;
  negative: boolean;
}

export interface StdModule {
  id: string;
  name: string;
  summary: string;
  sourcePath: string;
  symbols: StdSymbol[];
  instances: StdInstance[];
}
