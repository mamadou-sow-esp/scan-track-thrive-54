import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "node:path";

// Static SPA build for Capacitor (iOS / Android).
// Produces a fully client-side bundle in `www/` with `index.html` as entry,
// independent of the SSR/Cloudflare Worker setup used by `vite.config.ts`.
export default defineConfig({
  plugins: [
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "src/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "www",
    emptyOutDir: true,
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
