<script setup lang="ts">
import type { StdTypeInfo } from "../types";

defineProps<{ details: StdTypeInfo }>();
</script>

<template>
  <section class="mt-5">
    <template v-if="details.kind === 'struct'">
      <div class="flex items-center justify-between gap-3">
        <h4 class="font-serif text-lg font-bold">Fields</h4>
        <span class="badge">{{ details.fields.length }}</span>
      </div>
      <div v-if="details.fields.length" class="mt-3 overflow-x-auto">
        <table class="reference-table">
          <thead><tr><th>Field</th><th>Type</th><th>Details</th></tr></thead>
          <tbody>
            <tr v-for="(field, index) in details.fields" :key="`${field.name}-${index}`">
              <td><code>{{ field.name }}</code></td>
              <td><code>{{ field.type }}</code></td>
              <td>
                <div v-if="field.modifiers.length" class="flex flex-wrap gap-1.5">
                  <span v-for="modifier in field.modifiers" :key="modifier" class="badge">{{ modifier }}</span>
                </div>
                <span v-if="field.defaultValue" class="mt-1 block text-xs text-muted">
                  Default: <code>{{ field.defaultValue }}</code>
                </span>
                <span v-if="!field.modifiers.length && !field.defaultValue" class="text-muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="mt-3 border-l border-line py-2 pl-3 text-sm text-muted">No fields.</p>
    </template>

    <template v-else-if="details.kind === 'union'">
      <div class="flex items-center justify-between gap-3">
        <h4 class="font-serif text-lg font-bold">Variants</h4>
        <span class="badge">{{ details.variants.length }}</span>
      </div>
      <div v-if="details.variants.length" class="mt-3 overflow-x-auto">
        <table class="reference-table">
          <thead><tr><th>Variant</th><th>Payload type</th></tr></thead>
          <tbody>
            <tr v-for="(variant, index) in details.variants" :key="`${variant.name}-${index}`">
              <td><code>{{ variant.name }}</code></td>
              <td><code>{{ variant.type }}</code></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="mt-3 border-l border-line py-2 pl-3 text-sm text-muted">No variants.</p>
    </template>

    <template v-else>
      <div class="flex items-center justify-between gap-3">
        <h4 class="font-serif text-lg font-bold">Variants</h4>
        <div class="flex items-center gap-2">
          <span v-if="details.flags" class="badge">flags</span>
          <span class="badge">{{ details.variants.length }}</span>
        </div>
      </div>
      <div v-if="details.variants.length" class="mt-3 overflow-x-auto">
        <table class="reference-table">
          <thead><tr><th>Variant</th><th>Declared value</th></tr></thead>
          <tbody>
            <tr v-for="(variant, index) in details.variants" :key="`${variant.name}-${index}`">
              <td><code>{{ variant.name }}</code></td>
              <td><code v-if="variant.value">{{ variant.value }}</code><span v-else class="text-muted">automatic</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="mt-3 border-l border-line py-2 pl-3 text-sm text-muted">No variants.</p>
    </template>
  </section>
</template>
