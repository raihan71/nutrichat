import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import vitePluginBundleObfuscator from "vite-plugin-bundle-obfuscator";

const minimizeObfuscatorConfig = {
  autoExcludeNodeModules: true,
  threadPool: true,
};

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [vitePluginBundleObfuscator(minimizeObfuscatorConfig)],
    resolve: {
      tsconfigPaths: true,
    },
    build: {
      ssr: true,
      sourcemap: false,
      minify: true,
    },
  },
});
