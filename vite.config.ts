import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@flightsim/geography": new URL("./packages/geography/src/index.ts", import.meta.url).pathname,
      "@flightsim/terrain": new URL("./packages/terrain/src/index.ts", import.meta.url).pathname,
      "@flightsim/world-streaming": new URL("./packages/world-streaming/src/index.ts", import.meta.url).pathname,
      "@flightsim/shared-types": new URL("./packages/shared-types/src/index.ts", import.meta.url).pathname
    }
  },
  worker: { format: "es" },
  build: { target: "es2022", sourcemap: true },
  server: { host: "0.0.0.0", port: 5173, strictPort: true }
});