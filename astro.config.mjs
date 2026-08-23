import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Placeholder — update once a real domain (or the GitHub Pages URL) is chosen.
  site: "https://merkleye.dev",
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
});
