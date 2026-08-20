import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/**
 * Turbopack infers the workspace root by walking up for a lockfile, and there is a
 * stray empty `package-lock.json` in `~/Documents/Projects` — one level above this
 * repo. Left to itself it picks that directory, which prefixes every module id with
 * `hudjee-practice-daily/…` and breaks the React Client Manifest lookup:
 *
 *   ⨯ Could not find the module "[project]/hudjee-practice-daily/apps/cms/src/app/page.tsx#default"
 *     in the React Client Manifest
 *
 * No client component resolves, nothing hydrates, and the app renders as a bare
 * black page. Pinning the root to the monorepo root fixes it for good, whether or
 * not that stray lockfile is ever cleaned up.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
