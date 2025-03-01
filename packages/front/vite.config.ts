import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import viteRawPlugin from "vite-raw-plugin";

const myPlugin = () => ({
  name: "configure-server",
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (
        req.originalUrl.includes("whl") ||
        req.originalUrl.includes("openblas") ||
        req.originalUrl.includes("pyodide") ||
        req.originalUrl.includes("example.py")
      ) {
        res.setHeader("Cache-Control", "max-age=3600");
        res.setHeader("content-type", "application/wasm");
      }
      next();
    });
  },
});

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ["@rollup/browser", "pyodide"],
  },
  // build: {
  //   outDir: "dist",
  //   assetsDir: "assets",
  // },
  base: "/stellar-perso/",
  plugins: [
    myPlugin(),
    react(),
    viteRawPlugin({
      fileRegex: /\.py$/,
    }),
  ],
});
