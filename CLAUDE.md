# HUDJEE Practice Daily

Adaptive JEE (Physics / Chemistry / Maths) practice platform. Students practice questions in
a mobile app; an IRT/CAT engine adapts difficulty; an internal CMS authors and reviews the
question bank. All state lives in one Supabase Postgres project.

## Monorepo layout

npm workspaces: `apps/*`, `services/*`, `workers/*`.

| Path | What it is | Stack |
| --- | --- | --- |
| `apps/mobile` | Student app — practice, tests, streaks/XP, social, arena | Expo SDK 57, React Native 0.86, React 19, Reanimated 4, zustand |
| `apps/cms` | Internal content CMS — authoring, review queue, reports, team/user admin | Next.js 16 (App Router, Turbopack), React 19, Tailwind 4, TipTap, KaTeX |
| `services/engine` | Adaptive engine — IRT scoring, CPS batch, dashboard aggregation, calibration jobs | FastAPI, numpy/scipy, catsim, girth |
| `workers/edge` | Cloudflare Worker (scaffold only — `wrangler.jsonc` still has placeholders) | Wrangler 3 |
| `supabase/` | Migrations + `config.toml` for the shared Postgres | Supabase CLI |
| `CAT4AI-master/`, `CAT4AI.zip` | Vendored reference material for the CAT/IRT work, not built | — |

## Supabase

Linked project: **Hudjee Practice daily** — ref `cvqzcpehxiapkkamhsbm` (ap-southeast-2).
`https://cvqzcpehxiapkkamhsbm.supabase.co`

Core tables (see `supabase/migrations/`):

- `profiles` — 1:1 with `auth.users` via an `on_auth_user_created` trigger. Holds cohort,
  subject strengths, level/XP, streak + streak shields, and `role`
  (`student` | `employee` | `admin` | `superadmin`).
- `questions` — the bank. LaTeX body/solution, JSONB `options`, seven formats
  (`mcq_single`…`matrix`), PYQ metadata, IRT params (`irt_difficulty`, `irt_discrimination`,
  `irt_guessing`), `published` flag. RLS exposes only `published = true` to students.
- `chapters` / `topics` — content taxonomy under each subject.
- `sessions` + `answer_events` — practice runs and per-answer telemetry (correctness, time, XP).
- `xp_events`, `badges`, `user_badges`, `challenges`, `friendships` — gamification and social.
- `cps_scores`, `user_concept_state` — the adaptive layer's per-user mastery state.
- `content_versions` — CMS revision history; `employee_stats` view backs the team dashboard.
- `question_reports` — student-filed problem reports; a trigger auto-unpublishes a question
  once it has 3 pending reports.

RLS is on everywhere. Table-level GRANTs to `anon`/`authenticated` are handled by
`20260802000000_grant_permissions.sql`, which also sets default privileges for future tables —
if a new table returns `42501 permission denied`, it needs a GRANT, not a policy.

## Environment

Env files are gitignored and must be created locally.

- `apps/cms/.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` (every `/api/*` route builds a service-role client),
  `GEMINI_API_KEY` (only `/api/evaluate-question` needs it).
- `apps/mobile/.env` — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
  `EXPO_PUBLIC_API_URL` (the FastAPI engine; falls back to `https://api.hudjee.com`).
- `services/engine/.env` — `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
  Note the engine reads `SUPABASE_SERVICE_KEY` for requests and `SUPABASE_SERVICE_ROLE_KEY`
  in the calibration job — set both.

## Commands

```bash
npm install                                  # workspace root, installs all JS apps
npm run dev  --workspace cms                 # CMS on :3000
npm run build --workspace cms                # includes tsc; type errors fail the build
npm start    --workspace mobile              # Expo dev server
cd apps/mobile && npx tsc --noEmit           # mobile typecheck

cd services/engine && .venv/bin/uvicorn app.main:app --reload   # engine on :8000
supabase migration list --linked             # local vs remote migration drift
supabase db push                             # apply pending migrations
```

The engine uses a local venv at `services/engine/.venv` (Python 3.14).

## Conventions worth knowing

- Both app-level `AGENTS.md` files exist for a reason: this Next.js (16) and this Expo (SDK 57)
  differ from older training data. Check `node_modules/next/dist/docs/` and
  `https://docs.expo.dev/versions/v57.0.0/` before writing framework code.
- `react-native-worklets` must stay at **0.10.3** in four places at once: the root
  `dependencies`, the root `overrides`, `apps/mobile/dependencies`, and the resolved entry in
  `package-lock.json`. Getting this wrong produces one of two startup failures:
  - Two copies installed (root vs `apps/mobile`) → red screen,
    `[Worklets] Mismatch between JavaScript code version and Worklets Babel plugin version`.
    Metro bundles the app's copy while the Babel plugin loads the root one. The lockfile can
    pin a stale root copy on its own — npm marks it `invalid` but will not fix it, so a
    `package.json` edit alone is not enough.
  - A single copy, but at **0.10.0** → native `SIGSEGV` in `libworklets.so` on the `mqt_v_js`
    thread the moment any reanimated component mounts. The app closes instantly with no red
    screen. **Do not "fix" this by trusting `expo/bundledNativeModules.json`** — it lists
    `0.10.0` for SDK 57, but the shipped Expo Go 57.0.3 binary is built against 0.10.3.
    Verified empirically on the emulator: 0.10.0 segfaults, 0.10.3 boots.
  - The root `dependencies` entry exists to force hoisting: Metro resolves worklets from
    `apps/mobile`, the Babel plugin resolves it from the root, and as a workspace-only dep npm
    nests it where the plugin cannot see it (`MODULE_NOT_FOUND`).
  - After touching any of them, run `npm ls react-native-worklets` — exactly one copy, nothing
    flagged `invalid` — and boot the app once, since neither typecheck nor `expo export`
    catches the native segfault.
- Root `overrides` also pins `react-native-svg` and `react-native-safe-area-context`; Expo Go
  crashes on version mismatch, so don't bump them casually.
  `apps/mobile/babel.config.js` must keep `react-native-reanimated/plugin` last.
- Question and solution bodies are LaTeX; the CMS renders with KaTeX (`remark-math` +
  `rehype-katex`) and the app with `MathText`.
- CMS reads go through the anon/publishable client in `src/lib/supabase.ts`; all writes and
  admin reads go through `/api/*` routes holding the service-role key. Keep that split.
