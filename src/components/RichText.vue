<script setup lang="ts">
defineProps<{ text: string }>();

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(value: string): string {
  const escaped = escape(value);
  return escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
}
</script>

<template>
  <!-- The source is repository-owned prose; `inline` escapes it before adding code spans. -->
  <span v-html="inline(text)" />
</template>
