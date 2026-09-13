import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      port: 5175,
      strictPort: true,
      watch: {
        usePolling: true,
        interval: 250,
      },
      hmr: { overlay: true },
      proxy: {
        "/api": {
          target: env.MIRA_API_PROXY_TARGET || "https://129-159-232-38.sslip.io",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});

