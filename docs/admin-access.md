# Admin Access Configuration

The `/admin/*` and `/api/admin/*` routes are protected with three layers:

1. **Vercel Authentication** at the network/edge layer (production only)
2. **App-level admin layout gate** via `app/admin/layout.tsx` `requireAdminFromCookies()` / `requireAdmin()` on API routes
3. **RLS policies** at the database layer via `is_user_admin(auth.uid())` (and related admin checks)

## Vercel Authentication setup (production)

Configured in Vercel dashboard, not in code. Required before launch.

### Steps

1. Vercel dashboard → `ruehl-web` project → Settings → Deployment Protection
2. Section: "Vercel Authentication"
3. Toggle ON for "Production Deployments"
4. Configure access:

   - Authorized: Owner, Member, Developer roles on the team
   - For external admins: Configure SSO or add as Vercel team members

5. Path-specific protection (Vercel Pro feature):

   - Settings → Deployment Protection → Path Configuration
   - Add protected path: `/admin`
   - Add protected path: `/api/admin`
   - Leave all other paths public

### Local development

Vercel Authentication only enforces in production. Local dev (`npm run dev`) remains unrestricted — admin pages are reachable at `localhost:3000/admin/login`. The app-level layout gate still applies locally for any user not flagged as admin in the database.

### Verification (post-deploy)

After applying in Vercel dashboard:

- Visiting `ruehl.app/admin` from a non-team-member browser shows Vercel's authentication challenge, not the admin login page.
- Authorized team members see the SSO/login challenge, then proceed to `/admin/login` normally.
- Public routes (`ruehl.app/`, `/profile/*`, `/post/*`) remain unprotected.
- `ruehl.app/api/admin/*` returns 401 from non-authenticated clients (and 403 from authenticated non-admins where applicable).

### What if Vercel Authentication is not configured?

The app-level layout gate (`app/admin/layout.tsx`) and RLS policies will still prevent unauthorized access to admin functionality. However, admin URLs will be discoverable to anyone scanning the site, which is not ideal. Vercel Authentication closes this gap.
