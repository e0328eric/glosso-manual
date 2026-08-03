<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { highlight, type HighlightToken } from "../lib/highlight";

const props = withDefaults(
  defineProps<{
    code: string;
    language?: string;
    compact?: boolean;
  }>(),
  { language: "glosso", compact: false },
);

const tokens = ref<HighlightToken[]>([{ text: props.code, className: "" }]);
const copied = ref(false);
const isGlosso = computed(() => props.language === "glosso" || props.language === "glo");

watch(
  () => props.code,
  async (code) => {
    tokens.value = isGlosso.value ? await highlight(code) : [{ text: code, className: "" }];
  },
  { immediate: true },
);

async function copyCode(): Promise<void> {
  await navigator.clipboard.writeText(props.code);
  copied.value = true;
  window.setTimeout(() => (copied.value = false), 1300);
}
</script>

<template>
  <div class="code-frame" :class="{ 'code-frame--compact': compact }">
    <div class="code-toolbar">
      <span>{{ language }}</span>
      <button type="button" class="code-copy" :aria-label="copied ? 'Copied' : 'Copy code'" @click="copyCode">
        {{ copied ? "Copied" : "Copy" }}
      </button>
    </div>
    <pre><code><span v-for="(token, index) in tokens" :key="index" :class="token.className">{{ token.text }}</span></code></pre>
  </div>
</template>
