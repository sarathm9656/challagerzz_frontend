import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    server: {
      host: true,
      allowedHosts: [
        ""
      ],
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "https://challagerzz-backend.onrender.com",
          changeOrigin: true,
        }
      }
    },

    preview: {
      host: true,
      allowedHosts: [
        ""
      ],
      port: 4173,
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "https://challagerzz-backend.onrender.com",
          changeOrigin: true,
        }
      }
    }
  };
});
