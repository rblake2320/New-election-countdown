import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Main chunk budget: 400 KB. Heavy vendors load only with the routes that use them.
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Rollup's CJS interop helpers would otherwise land in "charts" and drag it into the entry.
          if (id.includes("commonjsHelpers")) return "react";
          if (!id.includes("node_modules")) return;
          // Small utilities shared by app code and recharts stay out of "charts".
          if (/[\/](clsx|tailwind-merge|class-variance-authority)[\/]/.test(id)) return "react";
          if (/[\/](recharts|d3-[\w-]+|victory-vendor)[\/]/.test(id)) return "charts";
          if (/[\/](react|react-dom|scheduler)[\/]/.test(id)) return "react";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("lucide-react")) return "icons";
        },
      },
    },
  },
});
