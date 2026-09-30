// AntheticPlus Studios — Vite config.
//
// This used to delegate to `@lovable.dev/vite-tanstack-config`, a wrapper
// package hosted by Lovable that bundled TanStack devtools, the Start/Router
// plugins, Tailwind, tsconfig-paths, a Nitro build (Cloudflare preset), env
// injection and Lovable-sandbox-only behavior (port/host detection for their
// preview iframes). None of that sandbox detection makes sense once this app
// is deployed independently, so it's dropped here rather than ported.
//
// IMPORTANT: this file was rewritten without the ability to run `bun run
// build` / `bun run dev` in this environment (no network access to install
// node_modules). Run both locally before deploying and fix anything that
// doesn't match the exact plugin API for the pinned versions in package.json.
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// Nitro deployment target. Override with NITRO_PRESET, e.g. "node-server"
// (self-hosted / Docker), "vercel", "netlify", "cloudflare-module". Defaults
// to a plain Node server so `bun run build` produces something you can run
// with `node .output/server/index.mjs` anywhere, with no platform lock-in.
const NITRO_PRESET = process.env["NITRO_PRESET"] || "vercel";

export default defineConfig({
  server: {
    port: Number(process.env["PORT"]) || 3000,
  },
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our
      // SSR error wrapper) — unchanged from the previous config.
      server: { entry: "server" },
      target: NITRO_PRESET,
    }),
    viteReact(),
  ],
});
