import { defineConfig, loadEnv } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import generateFile from "vite-plugin-generate-file";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const basePath = env.VITE_BASE_PUBLIC_PATH || "/";
  return {
    plugins: [
      cloudflare(),
      generateFile({
        type: "raw",
        output: "./_redirects",
        data: `${basePath}* /:splat 200`,
      }),
    ],
    base: basePath,
  };
});
