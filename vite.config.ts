import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Tailwind v4 runs through @tailwindcss/vite; no PostCSS config is needed.
const base = process.env.VITE_BASE || "/";
const hmrClientPort = Number(process.env.VITE_HMR_CLIENT_PORT || 5173);

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      cn: fileURLToPath(new URL("./src/lib/safebite-utils.ts", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    hmr: hmrClientPort === 5173 ? undefined : { clientPort: hmrClientPort },
    allowedHosts: true,
  },
});
