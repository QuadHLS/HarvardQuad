import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

// Polling helps Docker / network drives / WSL; on a normal Mac it wastes CPU and can make HMR feel broken.
const usePolling = process.env.VITE_USE_POLLING === "1"

export default defineConfig({
  root: __dirname,
  publicDir: path.join(__dirname, "public"),
  plugins: [tailwindcss(), react()],
  resolve: {
    extensions: [".mjs", ".js", ".jsx", ".ts", ".tsx", ".json"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "esnext",
    outDir: "dist",
  },
  server: {
    port: 3000,
    host: "localhost",
    // Avoid xdg-open / browser launch on CI, Vercel, and headless environments
    open: !(process.env.CI || process.env.VERCEL),
    watch: usePolling ? { usePolling: true, interval: 300 } : undefined,
  },
})
