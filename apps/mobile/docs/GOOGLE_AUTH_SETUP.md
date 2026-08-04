# Google OAuth Setup — HUDJEE Practice Daily

Browser-based flow: `supabase.auth.signInWithOAuth` opens Google's account
chooser in a Chrome Custom Tab, Google redirects back into the app, and the app
exchanges the returned code for a Supabase session.

Because Google talks to **Supabase's** server rather than to the app directly,
you only need a single **Web application** OAuth client. There is no Android
client, no SHA-1 fingerprint, and no `google-services.json` for this flow. That
changes if you later move to native Google Sign-In.

---

## 1. Google Cloud Console

1. Go to <https://console.cloud.google.com> and create a project (e.g. `hudjee`).
2. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: `HUDJEE`, plus your support and developer email
   - Scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`
   - While the app is in **Testing**, only accounts listed under *Test users*
     can sign in. Add your own Gmail here or logins will fail with
     `access_blocked`. Publish the app before your beta.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `HUDJEE Supabase`
   - Authorised redirect URI — exactly one, pointing at Supabase:

     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```

     Find `<your-project-ref>` in Supabase under *Project Settings → API*, it is
     the subdomain of your project URL.
4. Copy the **Client ID** and **Client secret**.

---

## 2. Supabase Dashboard

1. **Authentication → Providers → Google**
   - Toggle **Enable Sign in with Google**
   - Paste the Client ID and Client secret from step 1.4
   - Save
2. **Authentication → URL Configuration → Redirect URLs** — add both:

   | URL | Used by |
   |---|---|
   | `hudjee://auth/callback` | Dev builds and the Play Store release |
   | `exp://*/--/auth/callback` | Expo Go |

   The Expo Go redirect contains your machine's LAN IP
   (`exp://192.168.1.7:8081/--/auth/callback`), which changes whenever you switch
   networks. Supabase accepts `*` wildcards, so the entry above saves you
   re-adding it every time.

   **Delete the `exp://` wildcard entry before you ship to production.** It is a
   development convenience and widens what can receive an auth redirect.

---

## 3. App config

Create `apps/mobile/.env` from the template:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Fill in from *Supabase → Project Settings → API*:

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Use the **anon / public** key, never `service_role`. `EXPO_PUBLIC_` variables are
inlined into the JS bundle and readable by anyone who unpacks the APK.

Then restart Metro with a cleared cache — env values are baked in at bundle
time, so a plain reload will not pick them up:

```bash
cd apps/mobile
npx expo start -c
```

---

## 4. Database: create a profile row on first login

Google sign-in creates a row in `auth.users`, but the app reads from `profiles`.
Without this trigger the student signs in successfully and then hits missing-row
errors everywhere. Run once in the Supabase SQL editor:

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, created_at)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

`profiles.username` is `unique not null`, so two students whose Google names
collide will fail the insert. Worth adding a uniquifying suffix before beta.

---

## 5. Files involved

| File | Role |
|---|---|
| `src/lib/googleAuth.ts` | Opens the browser, parses the redirect, creates the session |
| `src/lib/supabase.ts` | Client config — PKCE flow, AsyncStorage persistence |
| `src/screens/AuthScreen.tsx` | The single Google-only sign-in screen |
| `src/navigation/AuthNavigator.tsx` | Onboarding splash → AuthScreen |
| `app.json` | `"scheme": "hudjee"` — required for the redirect to reach the app |

Sign-in state is not navigated manually. `AppNavigator` subscribes to
`supabase.auth.onAuthStateChange` and swaps the auth stack for the main tabs once
a session exists.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `requested path is invalid` after picking an account | The redirect URL is not in Supabase's allowlist. Compare it against the exact string Metro prints. |
| `redirect_uri_mismatch` on Google's page | The Google Cloud redirect URI does not exactly match `https://<ref>.supabase.co/auth/v1/callback`. |
| `access_blocked` / "app not verified" | Consent screen is in Testing and your account is not a listed test user. |
| Browser closes, app returns to sign-in screen | Env vars missing or stale — restart with `npx expo start -c`. |
| `Unsupported provider` | Google is not enabled under Authentication → Providers. |
