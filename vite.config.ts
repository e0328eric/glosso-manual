import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

const repository = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "glosso";
const pagesBase = repository.endsWith(".github.io") ? "/" : `/${repository}/`;

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === "true" ? pagesBase : "/",
  plugins: [vue(), tailwindcss()],
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
