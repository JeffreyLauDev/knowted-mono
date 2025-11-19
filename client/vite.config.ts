import react from "@vitejs/plugin-react-swc";
import { componentTagger } from "lovable-tagger";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

// Get the directory where this config file is located
// This ensures it works in both local and CI environments
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Use absolute path resolution - works in monorepo regardless of working directory
const srcPath = path.resolve(__dirname, 'src');

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8080,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: [
      {
        find: /^@\/(.*)$/,
        replacement: path.resolve(srcPath, '$1'),
      },
    ],
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
}));
