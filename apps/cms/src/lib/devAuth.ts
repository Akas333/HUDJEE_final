/**
 * Local-only escape hatch that unlocks the CMS without signing in.
 *
 * The CMS gates on `profiles.role` being employee/admin/superadmin, and a fresh
 * project has no staff rows at all — so every account, including a valid one,
 * lands on "Access Denied" and the bank cannot be seeded. This lets authoring
 * work before the first staff profile exists.
 *
 * Two independent conditions, because this bypasses the *only* thing standing
 * between the open internet and a service-role Supabase key:
 *
 *   - the opt-in env var, so it is off unless somebody deliberately set it, and
 *   - `NODE_ENV`, which Next fixes to 'production' in `next build`. That makes
 *     the flag inert in a deployed build even if the variable leaks into the
 *     deploy environment, which is the mistake actually worth defending against.
 *
 * Read through this module rather than checking the env var directly, so the
 * client gate and the API gate can never drift apart.
 */
export const DEV_NO_AUTH =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_CMS_DEV_NO_AUTH === 'true';

/** Stand-in identity shown in the UI while the bypass is on. */
export const DEV_PROFILE = {
  id: 'dev-local',
  username: 'Local Dev',
  role: 'superadmin',
} as const;
