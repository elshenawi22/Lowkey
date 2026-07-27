import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Target modern browsers — smaller output, no legacy polyfills
    target: "es2020",

    // Raise chunk warning limit — admin tabs are intentionally large
    chunkSizeWarningLimit: 800,

    rollupOptions: {
      output: {
        // Manual chunks — keep admin code split from storefront
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "react-vendor";
          }
          if (id.includes("/admin/") || id.includes("AdminPage")) {
            return "admin";
          }
          if (id.includes("/pages/")) {
            return "pages";
          }
        },
      },
    },

    // Minify with esbuild (default) — fastest + smallest for production
    minify: "esbuild",

    // Source maps only in production for error tracking (comment out if not needed)
    sourcemap: false,

    // Assets smaller than 4KB are inlined — avoids extra HTTP round trips
    assetsInlineLimit: 4096,

    // CSS code-splitting: each chunk gets its own CSS
    cssCodeSplit: true,
  },

  // Optimise deps pre-bundling — tell Vite which libs to pre-bundle
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
});
