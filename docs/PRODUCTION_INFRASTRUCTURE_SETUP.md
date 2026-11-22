# GigBee V1.4 — Production Infrastructure & Hosting
_22 November 2026. Execution status is recorded honestly; this is not approval to expose user data publicly._

## Architecture

- Public website and protected client workspace: Vercel / Next.js 16, Node.js 22.
- Mobile: Expo / React Native; production APK/AAB requires EAS or a correct Android native build.
- Backend: only dedicated Supabase project `difltkijsmqcnrycjolz`.
- Same Supabase PostgreSQL, Auth, Storage, Realtime and Edge Functions for mobile and web; no Express server.
- Payments/payouts remain DISABLED. Payment Links ≠ escrow.

## Current confirmed status

- Verified local web and mobile Supabase project ref: `difltkijsmqcnrycjolz`. Public key present, not displayed.
- Anonymous read-only API access: 12 checks passed; no private rows anonymously exposed.
- Five SQL migration files exist. V1.4 migration is NOT applied remotely.
- Supabase management access is BLOCKED: the currently connected account and Windows CLI only list SiteFlow + SiteFlow Staging. Never use either.
- **Vercel hosting is configured** under the authorized account: project `gigbee-web` (`prj_adoudf8TNTAFu58iAJaR42h0PLzZ`), Root Directory `apps/web`, framework Next.js, Node 22, and public GigBee URL/publishable key configured for Preview and Production.
- First Vercel deploy automatically became a production deployment at `https://gigbee-web.vercel.app`, with a successful remote build and health check (HTTP 200 before protection). **The project is deliberately private**: Vercel Authentication `ssoProtection.deploymentType=all`, unauthenticated requests redirect (302), and temporary automation bypasses were revoked (0 remain). No public launch approved.
- GitHub CLI authentication was expired; no repository has been pushed from this workspace. Vercel deployment was from a clean local source copy rather than GitHub.
- Local code has passed source checks, web build and Expo Doctor. New /api/health endpoint should return HTTP 200 only when Supabase public reads succeed.

## Vercel hosting settings

The following hosting steps have been configured on Vercel. The remaining requirements follow:

1. **Completed:** created and linked the separate `gigbee-web` project; no SiteFlow Vercel projects were present in the selected account.
2. **Completed:** deployed the clean GigBee monorepo with project **Root Directory** `apps/web`.
3. **Completed:** configured **Framework: Next.js**, **Node.js 22**, output default.
4. Use the detected npm workspace install with the root lockfile. On a clean workspace prefer `npm ci`. Do not package `node_modules`.
5. Enable **Include source files outside of Root Directory in Build Step** so `packages/shared` resolves, as required by Vercel's monorepo build configuration.
6. **Completed:** defined both below for **Preview** and **Production** build environments. Get the publishable key from the **GigBee** Supabase dashboard; never paste a secret/service-role key:
   - `NEXT_PUBLIC_SUPABASE_URL=https://difltkijsmqcnrycjolz.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<GigBee publishable key>`
7. **Partially completed:** Vercel automatically assigned the first deployment to Production. The remote build passed and `/api/health` returned 200. Vercel Authentication now protects ALL deployments; an unauthenticated request returns 302. A separate authenticated preview and three-account marketplace flow are still required before public release.
8. Bind a verified custom HTTPS domain only after tests. Update Supabase Auth Site URL and URL allowlist for `https://<actual-domain>/reset-password`, `https://<actual-domain>/**`, and the actual approved Expo mobile deep link(s). Don't invent a domain.
9. Verify domain DNS, TLS, redirects, email confirmation/password recovery and account deletion links.
10. Only promote preview to production after the migration, RLS, legal and signing gates are satisfied.

Vercel documentation: https://vercel.com/docs/monorepos and https://vercel.com/docs/cli/deploying-from-cli .

## Safe GigBee database migration procedure

1. Obtain authorized GigBee project management access. Check the project ref first.
2. Take a current verified backup / determine applicable backup and PITR capabilities.
3. Compare existing remote migration history to the four source migrations. **Do not replay the composite `supabase/schema.sql` on an existing database.**
4. Inspect existing course publication records, lesson/quiz integrity, push-device duplicates, RLS policies, Storage policy names and existing grants. Resolve drift before migration.
5. Apply `20261122002647_course_integrity_and_push_registration.sql` in GigBee **staging** only. Test staff, creator, learner, freelancer, client and unauthenticated roles.
6. Once verified and backed up, deploy ONLY that migration on the authorized GigBee project using its migration workflow. Check advisors and verify installed triggers/functions/permissions.
7. Deploy the matching V1.4 frontend/mobile together; the Creator Studio RPC depends on migration 5.
8. Re-run the anonymous and authenticated policy matrix. Never use SiteFlow as staging for GigBee.

Approved CLI inspection only, once the correct project is linked:

```powershell
npx supabase projects list
npx supabase link --project-ref difltkijsmqcnrycjolz
npx supabase migration list --remote
npx supabase db push --dry-run
```

**Do not run `supabase db push` until the migration dry-run is reviewed and backups + staging validation pass.**

## Auth / mail / runtime

- Enable and test email confirmation, sensible OTP duration, secure reset redirects and account recovery.
- Configure verified custom SMTP, rate limits, RLS and Supabase Security/Performance Advisors.
- Validate that authenticated client A cannot access B's private projects, application records, private messages or uploads.
- Test account deletion intake and backup/retention policies; publish operator contact, Privacy Policy and Terms only after legitimate owner/legal review.
- Notifications need server dispatcher credentials, Expo push setup and deliver-notifications deployment; keep notification sending disabled until verified.
- Money movement, KYC, refunds, payout and tax/legal setup require separately approved merchant infrastructure.

## Web diagnostics

```powershell
cd 'E:\GigBee_V1_4_Audit\GigBee-Starter'
npm ci
npm run verify
npm run accountcheck
npm run auditcheck
npm run doctor
npm run anoncheck
npm audit --omit=dev --audit-level=moderate
npm run start -w @gigbee/web -- -p 3104
# From another terminal:
Invoke-WebRequest http://localhost:3104/api/health
```

The health endpoint is a public read-only check, not a substitute for authenticated sign-in and row-level policy tests.

## Launch status

**NOT APPROVED FOR PUBLIC LAUNCH:** Hosting is deployed but **locked with Vercel Authentication**. Remote migration history, V1.4 migration execution, authenticated E2E testing, legal review and native Android signing remain outstanding. Do not disable All Deployments protection until those checks pass.
