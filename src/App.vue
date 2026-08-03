<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import CodeBlock from "./components/CodeBlock.vue";
import FunctionDetails from "./components/FunctionDetails.vue";
import RichText from "./components/RichText.vue";
import TypeDetails from "./components/TypeDetails.vue";
import {
  directives,
  grammarGroups,
  keywords,
  manualSections,
  metadata,
  stdInstances,
  stdModules,
  stdSymbols,
} from "./generated/docs";
import { highlighterState } from "./lib/highlight";
import { findSignatureMatches, isSignatureQuery } from "./lib/signature";
import type { ManualSection, StdInstance, StdModule, StdSymbol, StdTypeclassMember } from "./types";

type ViewName = "manual" | "std" | "search";
type ThemeName = "light" | "dark";
type ManualNavItem = { id: string; title: string };
type ManualGroup = { title: string; sections: ManualSection[] };
type SearchResult = {
  id: string;
  title: string;
  meta: string;
  excerpt: string;
  signature?: string;
  score: number;
  symbol?: StdSymbol;
  target: () => void;
};

const view = ref<ViewName>("manual");
const itemId = ref("");
const navFilter = ref("");
const query = ref("");
const moduleSymbolFilter = ref("");
const pendingSymbolId = ref("");
const theme = ref<ThemeName>(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
const globalSearch = ref<HTMLInputElement>();
const signatureInput = ref<HTMLInputElement>();
const heroCode = `#import "Io";

main :: () {
    answer := fold(1..=10, 0, |sum, n| sum + n);
    print("answer: %\\n", answer);
}`;

const featuredSections = [
  "hello-world-and-program-entry",
  "values-constants-and-variables",
  "function-declarations",
  "generic-functions",
  "memory-contracts-and-temporal-checking",
  "compile-time-constants-with-comptime",
];

const manualGroupDefinitions = [
  {
    title: "Getting started",
    ids: [
      "hello-world-and-program-entry",
      "using-the-compiler",
      "source-files-imports-and-loads",
      "top-level-declarations-and-thread-local-storage",
      "visibility-and-private-sections",
    ],
  },
  {
    title: "Language basics",
    ids: [
      "comments",
      "identifiers-and-names",
      "integer-literals",
      "floating-point-literals",
      "string-literals",
      "character-literals",
      "label-and-undefined-literals",
      "values-constants-and-variables",
      "assignment-and-update-assignment",
      "primitive-types",
      "booleans",
      "numeric-operations",
      "built-in-strings",
    ],
  },
  {
    title: "Types and expressions",
    ids: [
      "type-syntax-and-type-values",
      "tuple-types-and-values",
      "aggregate-and-collection-literals",
      "member-access-calls-and-argument-expansion",
      "casts-and-contextual-conversion",
      "simd-and-matrix-values",
    ],
  },
  {
    title: "Collections and pointers",
    ids: [
      "fixed-arrays",
      "array-views",
      "dynamic-arrays",
      "ranges-and-slices",
      "structure-of-arrays-and-array-of-structs",
      "single-pointers",
      "many-pointers",
      "pointers-and-null",
    ],
  },
  {
    title: "Structs, unions, and enums",
    ids: [
      "struct-declarations",
      "embedded-fields-with-using",
      "empty-and-conversion-fields",
      "tagged-union-construction",
      "tagged-union-switching",
      "raw-unions",
      "enums",
      "flag-enums",
    ],
  },
  {
    title: "Functions and abstraction",
    ids: [
      "function-declarations",
      "default-and-named-parameters",
      "noalias-pointer-parameters",
      "variadic-parameters",
      "function-pointers",
      "lambdas",
      "generic-functions",
      "function-and-aggregate-directives",
      "constraints-with-where",
      "meaningful",
      "typeclasses",
      "default-methods-and-negative-instances",
      "higher-kinded-typeclasses-and-derive",
      "try-expressions-and-propagation",
    ],
  },
  {
    title: "Operators",
    ids: [
      "operator-declarations",
      "assignment-operators",
      "operator-coherence",
      "indexing-and-slicing-operators",
    ],
  },
  {
    title: "Control flow",
    ids: [
      "statements-semicolons-and-nested-declarations",
      "blocks-and-scope",
      "if-statements",
      "switch-cases",
      "static-if",
      "while",
      "inline-loop-expansion",
      "for",
      "labels-goto-and-jump-helpers",
      "pattern",
    ],
  },
  {
    title: "Compile-time programming",
    ids: [
      "compile-time-constants-with-comptime",
      "code-values-with-code",
      "expand-procedures-and-insert",
      "reflection",
    ],
  },
  {
    title: "Memory and context",
    ids: [
      "context-values",
      "temporary-allocation",
      "debug-allocation",
      "memory-contracts-and-temporal-checking",
      "unique-operations-and-coherence",
    ],
  },
  {
    title: "Compiler and build",
    ids: [
      "compilation-pipeline-and-prelude",
      "compiler-cache-and-generated-sources",
      "diagnostics",
      "target-gated-code",
      "build-time-compilation-helpers",
    ],
  },
  {
    title: "Interop and low-level code",
    ids: [
      "c-libraries-and-foreign-functions",
      "c-calling-convention",
      "c-varargs",
      "inline-assembly-and-bytes",
      "lua-5-5-source-integration",
    ],
  },
  {
    title: "Style",
    ids: ["style-guidelines-for-glosso-code"],
  },
] as const;

const manualSectionById = new Map(manualSections.map((section) => [section.id, section]));
const categorizedSectionIds = new Set<string>(manualGroupDefinitions.flatMap((group) => [...group.ids]));
const manualGroups: ManualGroup[] = manualGroupDefinitions.map((group) => ({
  title: group.title,
  sections: group.ids.map((id) => manualSectionById.get(id)).filter((section): section is ManualSection => Boolean(section)),
}));
const uncategorizedSections = manualSections.filter((section) => !categorizedSectionIds.has(section.id));
if (uncategorizedSections.length) manualGroups.push({ title: "Additional topics", sections: uncategorizedSections });

const manualReferenceItems: ManualNavItem[] = [
  { id: "grammar", title: "Complete grammar" },
  { id: "keywords", title: "Keywords" },
  { id: "directives", title: "Directives" },
];
const manualNavigation: ManualNavItem[] = [
  ...manualGroups.flatMap((group) => group.sections.map(({ id, title }) => ({ id, title }))),
  ...manualReferenceItems,
];
const featuredManualSections = featuredSections
  .map((id) => manualSectionById.get(id))
  .filter((section): section is ManualSection => Boolean(section));

const selectedSection = computed<ManualSection | undefined>(() =>
  manualSections.find((section) => section.id === itemId.value),
);
const selectedModule = computed<StdModule | undefined>(() =>
  stdModules.find((module) => module.id === itemId.value),
);
const isReference = computed(() => ["grammar", "keywords", "directives"].includes(itemId.value));

const filteredManualGroups = computed(() => {
  const needle = navFilter.value.trim().toLowerCase();
  if (!needle) return manualGroups;
  return manualGroups
    .map((group) => ({
      ...group,
      sections: group.sections.filter((section) => section.title.toLowerCase().includes(needle)),
    }))
    .filter((group) => group.sections.length);
});
const filteredManualReferences = computed(() => {
  const needle = navFilter.value.trim().toLowerCase();
  return needle
    ? manualReferenceItems.filter((item) => item.title.toLowerCase().includes(needle))
    : manualReferenceItems;
});
const currentManualNavigationIndex = computed(() =>
  manualNavigation.findIndex((item) => item.id === itemId.value),
);
const previousManualItem = computed(() =>
  currentManualNavigationIndex.value > 0
    ? manualNavigation[currentManualNavigationIndex.value - 1]
    : undefined,
);
const nextManualItem = computed(() => {
  const index = currentManualNavigationIndex.value;
  return index >= 0 && index < manualNavigation.length - 1 ? manualNavigation[index + 1] : undefined;
});

const filteredModules = computed(() => {
  const needle = navFilter.value.trim().toLowerCase();
  return needle
    ? stdModules.filter(
        (module) =>
          module.name.toLowerCase().includes(needle) || module.summary.toLowerCase().includes(needle),
      )
    : stdModules;
});

function matchesModuleFilter(
  value: Pick<StdSymbol, "name" | "signature" | "summary"> | StdTypeclassMember,
  needle: string,
): boolean {
  return value.name.toLowerCase().includes(needle) ||
    value.signature.toLowerCase().includes(needle) ||
    value.summary.toLowerCase().includes(needle);
}

const selectedSymbols = computed(() => {
  const symbols = selectedModule.value?.symbols ?? [];
  const needle = moduleSymbolFilter.value.trim().toLowerCase();
  if (!needle) return symbols;
  return symbols.filter((symbol) => matchesModuleFilter(symbol, needle));
});

const instancesByTypeclass = new Map<string, StdInstance[]>();
for (const instance of stdInstances) {
  const instances = instancesByTypeclass.get(instance.typeclass) ?? [];
  instances.push(instance);
  instancesByTypeclass.set(instance.typeclass, instances);
}
for (const instances of instancesByTypeclass.values()) {
  instances.sort((left, right) =>
    left.head.localeCompare(right.head) || left.module.localeCompare(right.module) || left.sourceLine - right.sourceLine,
  );
}

function instancesFor(typeclass: StdSymbol): StdInstance[] {
  return instancesByTypeclass.get(typeclass.name) ?? [];
}

function typeclassMembers(typeclass: StdSymbol, kind: StdTypeclassMember["kind"]): StdTypeclassMember[] {
  return typeclass.typeclass?.members.filter((member) => member.kind === kind) ?? [];
}

const selectedTypeclasses = computed(() => {
  const typeclasses = selectedModule.value?.symbols.filter((symbol) => symbol.kind === "typeclass") ?? [];
  const needle = moduleSymbolFilter.value.trim().toLowerCase();
  if (!needle) return typeclasses;
  return typeclasses.filter((typeclass) =>
    matchesModuleFilter(typeclass, needle) ||
    typeclass.typeclass?.members.some((member) => matchesModuleFilter(member, needle)) ||
    instancesFor(typeclass).some((instance) =>
      instance.signature.toLowerCase().includes(needle) ||
      instance.module.toLowerCase().includes(needle) ||
      instance.summary.toLowerCase().includes(needle)
    ),
  );
});

function compareGroupedSymbols(kind: StdSymbol["kind"], left: StdSymbol, right: StdSymbol): number {
  if (kind === "function" || kind === "constant") {
    const privacyOrder = Number(left.name.startsWith("__")) - Number(right.name.startsWith("__"));
    if (privacyOrder) return privacyOrder;
  }
  return left.name.localeCompare(right.name);
}

const selectedSymbolGroups = computed(() => [
  {
    kind: "type" as const,
    title: "Types",
    symbols: selectedSymbols.value
      .filter((symbol) => symbol.kind === "type")
      .toSorted((left, right) => compareGroupedSymbols("type", left, right)),
  },
  {
    kind: "typeclass" as const,
    title: "Typeclasses",
    symbols: selectedTypeclasses.value.toSorted((left, right) => left.name.localeCompare(right.name)),
  },
  {
    kind: "constant" as const,
    title: "Constants",
    symbols: selectedSymbols.value
      .filter((symbol) => symbol.kind === "constant")
      .toSorted((left, right) => compareGroupedSymbols("constant", left, right)),
  },
  {
    kind: "function" as const,
    title: "Functions",
    symbols: selectedSymbols.value
      .filter((symbol) => symbol.kind === "function")
      .toSorted((left, right) => compareGroupedSymbols("function", left, right)),
  },
].filter((group) => group.symbols.length));

const signatureMatches = computed(() =>
  isSignatureQuery(query.value) ? findSignatureMatches(query.value, stdSymbols) : [],
);

const searchResults = computed<SearchResult[]>(() => {
  const value = query.value.trim();
  if (!value) return [];
  if (isSignatureQuery(value)) {
    return signatureMatches.value.slice(0, 100).map(({ symbol, score, reason }) => ({
      id: symbol.id,
      title: symbol.name,
      meta: `${reason} · ${symbol.module}`,
      excerpt: symbol.summary || `${symbol.kind} declared in ${symbol.sourcePath}`,
      signature: symbol.searchableSignature,
      score,
      symbol,
      target: () => openSymbol(symbol),
    }));
  }

  const needle = value.toLowerCase();
  const results: SearchResult[] = [];
  for (const symbol of stdSymbols) {
    const name = symbol.name.toLowerCase();
    const signature = symbol.signature.toLowerCase();
    const summary = symbol.summary.toLowerCase();
    if (!name.includes(needle) && !signature.includes(needle) && !summary.includes(needle)) continue;
    const score = name === needle ? 100 : name.startsWith(needle) ? 90 : name.includes(needle) ? 80 : 50;
    results.push({
      id: symbol.id,
      title: symbol.name,
      meta: `${symbol.kind} · ${symbol.module}`,
      excerpt: symbol.summary || `Declared in ${symbol.sourcePath}`,
      signature: symbol.searchableSignature || symbol.signature,
      score,
      symbol,
      target: () => openSymbol(symbol),
    });
  }
  for (const section of manualSections) {
    const body = section.blocks
      .map((block) => [block.text, block.items?.join(" "), block.columns?.join(" "), block.rows?.flat().join(" ")].filter(Boolean).join(" "))
      .join(" ");
    if (!section.title.toLowerCase().includes(needle) && !body.toLowerCase().includes(needle)) continue;
    results.push({
      id: section.id,
      title: section.title,
      meta: "Language manual",
      excerpt: body.slice(0, 190),
      score: section.title.toLowerCase().includes(needle) ? 70 : 35,
      target: () => navigate("manual", section.id),
    });
  }
  for (const directive of directives) {
    if (!`${directive.name} ${directive.summary} ${directive.site} ${directive.details?.join(" ") ?? ""}`.toLowerCase().includes(needle)) continue;
    results.push({
      id: directive.name,
      title: directive.name,
      meta: `Directive · ${directive.site}`,
      excerpt: directive.summary,
      signature: directive.syntax,
      score: directive.name.toLowerCase() === needle ? 100 : 75,
      target: () => navigate("manual", "directives"),
    });
  }
  return results.sort((left, right) => right.score - left.score || left.title.localeCompare(right.title)).slice(0, 100);
});

const githubBase = "https://github.com/e0328eric/glosso/blob/master";
const highlighterLabel = computed(() => {
  if (highlighterState.value === "wasm") return "Tree-sitter WASM active";
  if (highlighterState.value === "fallback") return "Lexical fallback";
  return "Loading syntax engine";
});

function parseHash(): void {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const [path, search = ""] = hash.split("?");
  const [nextView, ...parts] = path.split("/").filter(Boolean);
  view.value = nextView === "std" || nextView === "search" ? nextView : "manual";
  itemId.value = decodeURIComponent(parts.join("/"));
  if (view.value === "search") query.value = new URLSearchParams(search).get("q") ?? query.value;
  navFilter.value = "";
  moduleSymbolFilter.value = "";
  window.scrollTo({ top: 0, behavior: "auto" });
  if (pendingSymbolId.value) {
    const symbolId = pendingSymbolId.value;
    pendingSymbolId.value = "";
    nextTick(() => document.getElementById(symbolId)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }
}

function navigate(nextView: ViewName, id = ""): void {
  const target = `/${nextView}${id ? `/${encodeURIComponent(id)}` : ""}`;
  if (window.location.hash === `#${target}`) parseHash();
  else window.location.hash = target;
}

function openSearch(value = ""): void {
  if (value) query.value = value;
  navigate("search");
  nextTick(() => signatureInput.value?.focus());
}

function setTheme(nextTheme: ThemeName): void {
  theme.value = nextTheme;
  document.documentElement.dataset.theme = nextTheme;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute(
    "content",
    nextTheme === "dark" ? "#101419" : "#f4f0e8",
  );
  try {
    localStorage.setItem("glosso-theme", nextTheme);
  } catch {
    // The selected theme still applies when storage is unavailable.
  }
}

function toggleTheme(): void {
  setTheme(theme.value === "dark" ? "light" : "dark");
}

function openSymbol(symbol: StdSymbol): void {
  const module = stdModules.find((candidate) => candidate.name === symbol.module);
  if (!module) return;
  pendingSymbolId.value = symbol.id;
  navigate("std", module.id);
}

function sourceUrl(source: { sourcePath: string; sourceLine: number }): string {
  return `${githubBase}/${source.sourcePath}#L${source.sourceLine}`;
}

function scrollToStdGroup(kind: StdSymbol["kind"]): void {
  document.getElementById(`std-group-${kind}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function onGlobalInput(event: Event): void {
  query.value = (event.target as HTMLInputElement).value;
}

function onGlobalKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openSearch();
  } else if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
    event.preventDefault();
    openSearch();
  }
}

onMounted(() => {
  if (!window.location.hash) window.location.hash = "/manual";
  parseHash();
  window.addEventListener("hashchange", parseHash);
  window.addEventListener("keydown", onGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("hashchange", parseHash);
  window.removeEventListener("keydown", onGlobalKeydown);
});
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <div class="topbar-inner">
        <button class="brand-mark" type="button" aria-label="Glosso manual home" @click="navigate('manual')">g.</button>
        <button class="brand-name" type="button" @click="navigate('manual')">Glosso</button>
        <nav class="topnav" aria-label="Primary">
          <button class="topnav-button" :class="{ 'is-active': view === 'manual' }" @click="navigate('manual')">Manual</button>
          <button class="topnav-button" :class="{ 'is-active': view === 'std' }" @click="navigate('std')">Standard library</button>
          <button class="topnav-button" :class="{ 'is-active': view === 'search' }" @click="openSearch()">Search</button>
        </nav>
        <button
          class="theme-toggle"
          type="button"
          :aria-label="theme === 'dark' ? 'Use light mode' : 'Use dark mode'"
          :title="theme === 'dark' ? 'Use light mode' : 'Use dark mode'"
          @click="toggleTheme"
        >
          <span aria-hidden="true">{{ theme === 'dark' ? '☀' : '☾' }}</span>
        </button>
        <label class="global-search">
          <span aria-hidden="true">⌕</span>
          <input
            ref="globalSearch"
            aria-label="Search Glosso documentation"
            placeholder="Name or (int, int) -> int"
            @focus="openSearch()"
            @input="onGlobalInput"
          />
          <span class="keycap">⌘K</span>
        </label>
      </div>
    </header>

    <div class="layout" :class="{ 'layout--search': view === 'search' }">
      <aside v-if="view !== 'search'" class="sidebar">
        <div class="sidebar-inner">
          <p class="sidebar-title">{{ view === 'manual' ? 'Language guide' : 'Modules' }}</p>
          <input
            v-model="navFilter"
            class="mb-4 h-9 w-full border border-line bg-sheet px-3 text-xs outline-none focus:border-cobalt"
            :placeholder="view === 'manual' ? 'Filter chapters…' : 'Filter modules…'"
            :aria-label="view === 'manual' ? 'Filter manual chapters' : 'Filter standard library modules'"
          />
          <nav v-if="view === 'manual'" class="side-list" aria-label="Manual chapters">
            <button class="side-link" :class="{ 'is-active': !itemId }" @click="navigate('manual')">Manual home</button>
            <div v-for="group in filteredManualGroups" :key="group.title" class="contents md:mb-5 md:block">
              <p class="sidebar-title mt-5 hidden md:block">{{ group.title }}</p>
              <button
                v-for="section in group.sections"
                :key="section.id"
                class="side-link"
                :class="{ 'is-active': itemId === section.id }"
                @click="navigate('manual', section.id)"
              >
                {{ section.title }}
              </button>
            </div>
            <div v-if="filteredManualReferences.length" class="contents md:mt-6 md:block md:border-t md:border-line md:pt-5">
              <p class="sidebar-title hidden md:block">Reference</p>
              <button
                v-for="reference in filteredManualReferences"
                :key="reference.id"
                class="side-link"
                :class="{ 'is-active': itemId === reference.id }"
                @click="navigate('manual', reference.id)"
              >
                {{ reference.title }}
              </button>
            </div>
          </nav>
          <nav v-else class="side-list" aria-label="Standard library modules">
            <button class="side-link" :class="{ 'is-active': !itemId }" @click="navigate('std')">Library index</button>
            <button
              v-for="module in filteredModules"
              :key="module.id"
              class="side-link"
              :class="{ 'is-active': itemId === module.id }"
              @click="navigate('std', module.id)"
            >
              {{ module.name }}
            </button>
          </nav>
        </div>
      </aside>

      <main class="content">
        <template v-if="view === 'manual' && !itemId">
          <p class="eyebrow">Compiler-aligned reference · 2026 edition</p>
          <h1 class="display-title">The Glosso language, from first token to foreign call.</h1>
          <p class="lede">
            One searchable manual for syntax, semantics, memory contracts, compile-time programming,
            and the public standard library—generated against the repository you are reading.
          </p>
          <div class="metric-grid" aria-label="Documentation coverage">
            <div class="metric"><p class="metric-value">{{ keywords.length }}</p><p class="metric-label">Reserved keywords</p></div>
            <div class="metric"><p class="metric-value">{{ directives.length }}</p><p class="metric-label">Directives</p></div>
            <div class="metric"><p class="metric-value">{{ metadata.moduleCount }}</p><p class="metric-label">Modules</p></div>
            <div class="metric"><p class="metric-value">{{ metadata.symbolCount }}</p><p class="metric-label">Public symbols</p></div>
          </div>

          <CodeBlock :code="heroCode" />

          <div class="flex flex-wrap items-center gap-2">
            <span class="badge badge-blue">{{ highlighterLabel }}</span>
            <span class="badge">Source: {{ metadata.sourceManual }}</span>
            <span class="badge">TypeScript 7</span>
          </div>

          <div class="chapter-grid">
            <button
              v-for="(section, index) in featuredManualSections"
              :key="section.id"
              class="chapter-card"
              @click="navigate('manual', section.id)"
            >
              <span class="chapter-number">0{{ index + 1 }}</span>
              <h3>{{ section.title }}</h3>
              <p>{{ section.blocks.find((block) => block.kind === 'paragraph')?.text?.slice(0, 120) }}…</p>
            </button>
          </div>
        </template>

        <template v-else-if="view === 'manual' && itemId === 'grammar'">
          <div class="section-head">
            <div><p class="eyebrow">Language reference</p><h1 class="page-title">Complete grammar</h1></div>
            <span class="badge">{{ grammarGroups.length }} grammar groups</span>
          </div>
          <p class="lede">Extended BNF for the compiler’s lexical, declaration, type, expression, statement, aggregate, and temporal-memory surfaces. Operator precedence is dynamic because Glosso programs can declare operators.</p>
          <section v-for="group in grammarGroups" :key="group.title" class="mt-10">
            <h2 class="doc-subheading">{{ group.title }}</h2>
            <CodeBlock :code="group.grammar" language="ebnf" />
          </section>
        </template>

        <template v-else-if="view === 'manual' && itemId === 'keywords'">
          <div class="section-head">
            <div><p class="eyebrow">Lexical reference</p><h1 class="page-title">Reserved keywords</h1></div>
            <span class="badge">Read from src/lexer.rs</span>
          </div>
          <p class="lede">These words are emitted as dedicated tokens by the current lexer. Names such as <code class="font-mono text-cobalt">typeclass</code>, <code class="font-mono text-cobalt">instance</code>, <code class="font-mono text-cobalt">true</code>, <code class="font-mono text-cobalt">false</code>, and <code class="font-mono text-cobalt">null</code> are contextual names rather than reserved lexical keywords.</p>
          <div class="mt-9 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
            <code v-for="keyword in keywords" :key="keyword" class="bg-sheet p-4 font-mono text-sm font-bold text-cobalt-dark">{{ keyword }}</code>
          </div>
        </template>

        <template v-else-if="view === 'manual' && itemId === 'directives'">
          <div class="section-head">
            <div><p class="eyebrow">Parser reference</p><h1 class="page-title">Directives</h1></div>
            <span class="badge">{{ directives.length }} forms</span>
          </div>
          <p class="lede">Every current source directive, including type, declaration, expression, statement, field, parameter, control-flow, and memory-contract attachment sites.</p>
          <div class="mt-9 overflow-x-auto">
            <table class="reference-table">
              <thead><tr><th>Directive</th><th>Attachment</th><th>Syntax and purpose</th></tr></thead>
              <tbody>
                <tr v-for="directive in directives" :key="directive.name">
                  <td><code class="font-bold">{{ directive.name }}</code></td>
                  <td class="text-muted">{{ directive.site }}</td>
                  <td>
                    <code>{{ directive.syntax }}</code>
                    <p class="mt-1 text-muted">{{ directive.summary }}</p>
                    <ul v-if="directive.details?.length" class="mt-3 space-y-1 text-muted">
                      <li v-for="detail in directive.details" :key="detail">— {{ detail }}</li>
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <template v-else-if="view === 'manual' && selectedSection">
          <div class="section-head">
            <div><p class="eyebrow">Language manual</p><h1 class="page-title">{{ selectedSection.title }}</h1></div>
            <span class="badge">Compiler-aligned</span>
          </div>
          <article class="doc-prose">
            <template v-for="(block, index) in selectedSection.blocks" :key="index">
              <p v-if="block.kind === 'paragraph' && block.text"><RichText :text="block.text" /></p>
              <h2 v-else-if="block.kind === 'heading'" class="doc-subheading"><RichText :text="block.text ?? ''" /></h2>
              <ul v-else-if="block.kind === 'list'">
                <li v-for="item in block.items" :key="item"><RichText :text="item" /></li>
              </ul>
              <div v-else-if="block.kind === 'table'" class="my-7 overflow-x-auto">
                <table class="reference-table">
                  <thead>
                    <tr><th v-for="column in block.columns" :key="column">{{ column }}</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, rowIndex) in block.rows" :key="rowIndex">
                      <td v-for="(cell, cellIndex) in row" :key="cellIndex"><RichText :text="cell" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <CodeBlock v-else-if="block.kind === 'code'" :code="block.text ?? ''" :language="block.language" />
            </template>
          </article>
        </template>

        <template v-else-if="view === 'std' && !selectedModule">
          <div class="section-head">
            <div><p class="eyebrow">Standard library</p><h1 class="page-title">Public modules</h1></div>
            <span class="badge">{{ metadata.sourceFileCount }} source files</span>
          </div>
          <p class="lede">The index is generated from public declarations before each module’s private section. Open a module to browse types, typeclasses, constants, functions, and typeclass methods with direct source links.</p>
          <div class="module-grid mt-10">
            <button v-for="module in filteredModules" :key="module.id" class="module-card" @click="navigate('std', module.id)">
              <div class="flex items-start justify-between gap-3"><h3>{{ module.name }}</h3><span class="badge">{{ module.symbols.length }}</span></div>
              <p>{{ module.summary }}</p>
            </button>
          </div>
        </template>

        <template v-else-if="view === 'std' && selectedModule">
          <div class="section-head">
            <div><p class="eyebrow">Standard library module</p><h1 class="page-title">{{ selectedModule.name }}</h1></div>
            <a class="source-link" :href="`${githubBase}/${selectedModule.sourcePath}`" target="_blank" rel="noreferrer">View source ↗</a>
          </div>
          <p class="lede">{{ selectedModule.summary }}</p>
          <nav v-if="selectedSymbolGroups.length" class="mt-8 border-y border-line py-4" aria-label="Module contents">
            <span class="sidebar-title mr-4">On this page</span>
            <button
              v-for="group in selectedSymbolGroups"
              :key="`jump-${group.kind}`"
              class="source-link mr-4"
              type="button"
              @click="scrollToStdGroup(group.kind)"
            >
              {{ group.title }} ({{ group.symbols.length }})
            </button>
          </nav>
          <label class="mt-8 block">
            <span class="sidebar-title block">Filter {{ selectedModule.symbols.length }} declarations</span>
            <input v-model="moduleSymbolFilter" class="h-11 w-full border border-line bg-paper px-4 font-mono text-sm outline-none focus:border-cobalt" placeholder="Typeclass, function, type, or signature…" />
          </label>
          <div class="mt-8">
            <section v-for="group in selectedSymbolGroups" :id="`std-group-${group.kind}`" :key="group.kind" class="mt-12 scroll-mt-24 first:mt-0">
              <div class="flex items-end justify-between gap-4 border-b-2 border-ink pb-3">
                <h2 class="font-serif text-2xl font-bold">{{ group.title }}</h2>
                <span class="badge">{{ group.symbols.length }}</span>
              </div>
              <article v-for="symbol in group.symbols" :id="symbol.id" :key="symbol.id" class="symbol-card scroll-mt-24">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="flex items-center gap-3"><h3 class="symbol-name">{{ symbol.name }}</h3><span class="badge">{{ symbol.kind }}</span></div>
                  <a class="source-link" :href="sourceUrl(symbol)" target="_blank" rel="noreferrer">{{ symbol.sourcePath }}:{{ symbol.sourceLine }} ↗</a>
                </div>
                <p class="symbol-signature">{{ symbol.signature }}</p>
                <p v-if="symbol.summary" class="mt-3 text-sm leading-6 text-muted">{{ symbol.summary }}</p>
                <TypeDetails v-if="symbol.kind === 'type' && symbol.typeInfo" :details="symbol.typeInfo" />
                <FunctionDetails v-if="symbol.kind === 'function' && symbol.function" :details="symbol.function" />

                <template v-if="symbol.kind === 'typeclass' && symbol.typeclass">
                  <section class="mt-6 border-l-2 border-coral pl-4">
                    <p class="sidebar-title">Minimal complete implementation</p>
                    <p class="symbol-signature mt-2">
                      {{ symbol.typeclass.minimal || 'No methods are required.' }}
                    </p>
                    <p class="mt-2 text-sm leading-6 text-muted">
                      <template v-if="symbol.typeclass.minimalExplicit">
                        This is declared by <code class="font-mono">#minimal</code>. A comma requires both sides; a vertical bar permits either side.
                      </template>
                      <template v-else>
                        This is implicit: every method without a default implementation must be supplied by an instance.
                      </template>
                    </p>
                  </section>

                  <section v-if="typeclassMembers(symbol, 'associated-type').length" class="mt-6 border-l border-line pl-4">
                    <div class="flex items-center justify-between gap-3">
                      <h4 class="font-serif text-lg font-bold">Associated types</h4>
                      <span class="badge">{{ typeclassMembers(symbol, 'associated-type').length }}</span>
                    </div>
                    <article
                      v-for="member in typeclassMembers(symbol, 'associated-type')"
                      :id="member.id"
                      :key="member.id"
                      class="mt-4 border-t border-line pt-4 scroll-mt-24"
                    >
                      <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="flex items-center gap-3"><h5 class="symbol-name">{{ member.name }}</h5><span class="badge">required</span></div>
                        <a class="source-link" :href="sourceUrl(member)" target="_blank" rel="noreferrer">{{ member.sourcePath }}:{{ member.sourceLine }} ↗</a>
                      </div>
                      <p class="symbol-signature">{{ member.signature }}</p>
                      <p v-if="member.summary" class="mt-3 text-sm leading-6 text-muted">{{ member.summary }}</p>
                    </article>
                  </section>

                  <section v-if="typeclassMembers(symbol, 'method').length" class="mt-6 border-l border-line pl-4">
                    <div class="flex items-center justify-between gap-3">
                      <h4 class="font-serif text-lg font-bold">Methods</h4>
                      <span class="badge">{{ typeclassMembers(symbol, 'method').length }}</span>
                    </div>
                    <article
                      v-for="member in typeclassMembers(symbol, 'method')"
                      :id="member.id"
                      :key="member.id"
                      class="mt-4 border-t border-line pt-4 scroll-mt-24"
                    >
                      <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="flex items-center gap-3"><h5 class="symbol-name">{{ member.name }}</h5><span class="badge">{{ member.hasDefault ? 'default' : 'required' }}</span></div>
                        <a class="source-link" :href="sourceUrl(member)" target="_blank" rel="noreferrer">{{ member.sourcePath }}:{{ member.sourceLine }} ↗</a>
                      </div>
                      <p class="symbol-signature">{{ member.signature }}</p>
                      <p v-if="member.summary" class="mt-3 text-sm leading-6 text-muted">{{ member.summary }}</p>
                      <FunctionDetails v-if="member.function" :details="member.function" />
                    </article>
                  </section>

                  <details v-if="instancesFor(symbol).length" class="mt-6 border-l border-line pl-4">
                    <summary class="source-link cursor-pointer py-2">Instances ({{ instancesFor(symbol).length }})</summary>
                    <article
                      v-for="instance in instancesFor(symbol)"
                      :id="instance.id"
                      :key="instance.id"
                      class="border-t border-line py-4 scroll-mt-24"
                    >
                      <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="flex items-center gap-3"><span class="font-mono text-sm font-bold text-ink">{{ instance.head }}</span><span v-if="instance.negative" class="badge">negative</span></div>
                        <a class="source-link" :href="sourceUrl(instance)" target="_blank" rel="noreferrer">{{ instance.module }} · {{ instance.sourcePath }}:{{ instance.sourceLine }} ↗</a>
                      </div>
                      <p class="symbol-signature">{{ instance.signature }}</p>
                      <p v-if="instance.summary" class="mt-3 text-sm leading-6 text-muted">{{ instance.summary }}</p>
                    </article>
                  </details>
                  <p v-else class="mt-6 border-l border-line py-2 pl-4 text-sm text-muted">No standard-library instances are declared.</p>
                </template>
              </article>
            </section>
          </div>
          <div v-if="!selectedSymbolGroups.length" class="empty-state mt-6">No declarations match this module filter.</div>
        </template>

        <template v-else-if="view === 'search'">
          <div class="search-hero">
            <p class="eyebrow">Type-directed documentation search</p>
            <h1 class="font-serif text-3xl font-bold tracking-tight sm:text-5xl">Ask by name. Or ask by shape.</h1>
            <p class="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">Search the whole language reference, or enter a function signature. Candidate generic types unify consistently, so <code class="font-mono">(int, int) -> int</code> finds both concrete and compatible generic functions.</p>
            <input
              ref="signatureInput"
              v-model="query"
              class="signature-input"
              aria-label="Documentation and signature search"
              placeholder="(int, int) -> int"
              spellcheck="false"
              autocomplete="off"
            />
            <div class="mt-4 flex flex-wrap gap-2">
              <button v-for="example in ['(int, int) -> int', '(string, s32) -> string', '() -> f64', '(a, a) -> a']" :key="example" class="example-chip" @click="query = example">{{ example }}</button>
            </div>
          </div>

          <div class="mt-10 flex items-end justify-between border-b-2 border-ink pb-3">
            <div><p class="sidebar-title mb-1">Results</p><h2 class="font-serif text-2xl font-bold">{{ query ? `${searchResults.length} matches` : 'Ready when you are' }}</h2></div>
            <span v-if="isSignatureQuery(query)" class="badge badge-blue">Signature mode</span>
          </div>
          <div v-if="query && searchResults.length">
            <button v-for="result in searchResults" :key="result.id" class="result-card block w-full text-left" @click="result.target">
              <div class="flex flex-wrap items-start justify-between gap-3"><h3 class="symbol-name">{{ result.title }}</h3><span class="badge">{{ result.meta }}</span></div>
              <p v-if="result.signature" class="symbol-signature">{{ result.signature }}</p>
              <p class="mt-3 text-sm leading-6 text-muted">{{ result.excerpt }}</p>
            </button>
          </div>
          <div v-else-if="query" class="empty-state mt-6">
            No match yet. Try a broader name, replace a query type with <code class="font-mono">a</code>, or check the directive spelling.
          </div>
          <div v-else class="mt-10 grid gap-px border border-line bg-line sm:grid-cols-3">
            <div class="bg-sheet p-5"><p class="eyebrow">01 · Names</p><h3 class="font-serif text-xl font-bold">Find declarations</h3><p class="mt-2 text-sm leading-6 text-muted">Search functions, types, modules, directives, and manual prose.</p></div>
            <div class="bg-sheet p-5"><p class="eyebrow">02 · Types</p><h3 class="font-serif text-xl font-bold">Unify signatures</h3><p class="mt-2 text-sm leading-6 text-muted">Generic candidates bind consistently across arguments and results.</p></div>
            <div class="bg-sheet p-5"><p class="eyebrow">03 · Source</p><h3 class="font-serif text-xl font-bold">Jump to truth</h3><p class="mt-2 text-sm leading-6 text-muted">Every library result links back to its exact Glosso source line.</p></div>
          </div>
        </template>

        <nav
          v-if="view === 'manual' && itemId && (previousManualItem || nextManualItem)"
          class="mt-14 grid gap-px border border-line bg-line sm:grid-cols-2"
          aria-label="Manual chapter navigation"
        >
          <button
            v-if="previousManualItem"
            class="bg-paper p-5 text-left transition hover:bg-sheet"
            @click="navigate('manual', previousManualItem.id)"
          >
            <span class="sidebar-title mb-2 block">Previous</span>
            <span class="font-serif text-lg font-bold">← {{ previousManualItem.title }}</span>
          </button>
          <div v-else class="hidden bg-sheet sm:block" aria-hidden="true"></div>
          <button
            v-if="nextManualItem"
            class="bg-paper p-5 text-right transition hover:bg-sheet"
            @click="navigate('manual', nextManualItem.id)"
          >
            <span class="sidebar-title mb-2 block">Next</span>
            <span class="font-serif text-lg font-bold">{{ nextManualItem.title }} →</span>
          </button>
        </nav>
      </main>

      <aside v-if="view !== 'search'" class="rail">
        <p class="sidebar-title">Reference status</p>
        <div class="space-y-3 text-xs leading-5 text-muted">
          <p><span class="block font-semibold text-ink">Generated snapshot</span>{{ new Date(metadata.generatedAt).toLocaleDateString() }}</p>
          <p><span class="block font-semibold text-ink">Syntax highlighting</span>{{ highlighterLabel }}</p>
          <p><span class="block font-semibold text-ink">Search corpus</span>{{ metadata.symbolCount }} symbols</p>
        </div>
        <div class="rule"></div>
        <button class="w-full border-2 border-ink bg-tangerine px-4 py-3 text-sm font-bold shadow-[3px_3px_0_#171a1f] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none" @click="openSearch('(int, int) -> int')">
          Try signature search
        </button>
      </aside>
    </div>

    <nav class="mobile-nav" aria-label="Mobile navigation">
      <button :class="{ 'is-active': view === 'manual' }" @click="navigate('manual')">Manual</button>
      <button :class="{ 'is-active': view === 'std' }" @click="navigate('std')">Standard library</button>
      <button :class="{ 'is-active': view === 'search' }" @click="openSearch()">Search</button>
    </nav>
  </div>
</template>
