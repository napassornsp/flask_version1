import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"), // enables "@/..." imports
    },
  },
  server: {
    host: "localhost",
    port: 8080,
    strictPort: true,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 8080,
    },
    proxy: {
      // All API calls go through Vite and are forwarded to Flask
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
