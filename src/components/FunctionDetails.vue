<script setup lang="ts">
import type { StdFunctionInfo } from "../types";

defineProps<{ details: StdFunctionInfo }>();
</script>

<template>
  <div class="mt-5 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(14rem,1fr)]">
    <section class="min-w-0">
      <div class="flex items-center justify-between gap-3">
        <h4 class="font-serif text-lg font-bold">Parameters</h4>
        <span class="badge">{{ details.parameters.length }}</span>
      </div>
      <div v-if="details.parameters.length" class="mt-3 overflow-x-auto">
        <table class="reference-table">
          <thead>
            <tr><th>Parameter</th><th>Type</th><th>Details</th></tr>
          </thead>
          <tbody>
            <tr v-for="(parameter, index) in details.parameters" :key="`${parameter.name}-${index}`">
              <td><code>{{ parameter.name }}</code></td>
              <td><code>{{ parameter.type }}</code></td>
              <td>
                <div v-if="parameter.modifiers.length" class="flex flex-wrap gap-1.5">
                  <span v-for="modifier in parameter.modifiers" :key="modifier" class="badge">{{ modifier }}</span>
                </div>
                <span v-if="parameter.defaultValue" class="mt-1 block text-xs text-muted">
                  Default: <code>{{ parameter.defaultValue }}</code>
                </span>
                <span v-if="!parameter.modifiers.length && !parameter.defaultValue" class="text-muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="mt-3 border-l border-line py-2 pl-3 text-sm text-muted">No parameters.</p>
    </section>

    <div class="min-w-0 space-y-6">
      <section>
        <p class="sidebar-title">Return type</p>
        <p class="symbol-signature mt-2">{{ details.returnType }}</p>
      </section>

      <section>
        <div class="flex items-center justify-between gap-3">
          <p class="sidebar-title">#memory contracts</p>
          <span v-if="details.memoryContracts.length" class="badge">{{ details.memoryContracts.length }}</span>
        </div>
        <div v-if="details.memoryContracts.length" class="mt-3 overflow-x-auto">
          <table class="reference-table">
            <thead><tr><th>Effect</th><th>Targets / values</th></tr></thead>
            <tbody>
              <tr v-for="(contract, index) in details.memoryContracts" :key="`${contract.effect}-${index}`">
                <td><code>{{ contract.effect }}</code></td>
                <td>
                  <code v-if="contract.arguments.length">{{ contract.arguments.join(', ') }}</code>
                  <span v-else class="text-muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="mt-3 border-l border-line py-2 pl-3 text-sm text-muted">No <code class="font-mono">#memory</code> contract declared.</p>
      </section>
    </div>
  </div>
</template>
