> **Hosting deployment status (22 November 2026):** The Next.js website is deployed at `https://gigbee-web.vercel.app` under the dedicated `gigbee-web` Vercel project, with **Vercel Authentication protecting all URLs**. The first deployment was automatically designated Production by Vercel, but it is a private, unapproved prelaunch build. The new V1.4 Supabase migration remains **unapplied** because this session lacks management access to the dedicated GigBee project. Do not disable deployment protection until authenticated end-to-end and compliance gates pass. See `docs/PRODUCTION_INFRASTRUCTURE_SETUP.md`.

> **V1.4 full source audit (22 November 2026):** Reviewed Expo screens, Next.js routes, Supabase roles/RLS, state transitions, notification/payment functions, data validation and privacy. Improved project chat history, course/quiz integrity, service request tracking, notification safety, moderation permissions and discovery pagination. Validation: TypeScript, Next build, Expo Doctor, Android JS export, anonymous backend smoke, 23 website routes, source regression tests, SQL parsing and dependency audit. **The new V1.4 migration is NOT applied; signed Android and authenticated end-to-end tests remain pending.** See `docs/V1_4_COMPREHENSIVE_AUDIT.md`.

> **V1.3 release candidate (21 November 2026):** Improved live job discovery and pagination on mobile and web, added web client job closing and stronger budget validation. Fresh npm installation, TypeScript, Expo Doctor, Next.js build and Android JavaScript export were verified on a connected Windows PC. **Android native signing and real two-account Supabase tests are still required.** See `docs/V1_3_RELEASE.md`.

> **V1.2 source release (20 November 2026):** Added authenticated account settings for the mobile app and Next.js site, consistent password/recovery flows, scoped session sign-out, profile privacy and notification-consent hardening. See `docs/V1_2_RELEASE.md` and `docs/V1_2_ACCOUNT_QA.md`. Your existing GigBee migrations are unchanged. Live payments remain disabled. Runtime/typecheck/native builds have not been independently verified.

# GigBee V1.4 — Integrated Marketplace, Learning & Verified Work

**Production infrastructure setup:** [Deployment runbook and current blockers](docs/PRODUCTION_INFRASTRUCTURE_SETUP.md). **Latest release:** [V1.4 comprehensive audit](docs/V1_4_COMPREHENSIVE_AUDIT.md). This is a validated closed-beta source, not a certified public production deployment.

**Learn. Work. Grow.**  GigBee is a mobile-first freelance marketplace and learning platform for India. This repository includes an Expo/React Native mobile application, a Next.js public site with an authenticated workspace and protected moderation area, and one shared Supabase backend. **No independent Node/Express API server.**

## What is included

| Capability | App | Website | Backend |
|---|---|---|---|
| Account registration, login, password reset | Yes | Yes | Supabase Auth |
| Roles: freelancer, client, learner, creator | Yes | Yes | `user_roles` + RLS |
| Profiles, public directory, portfolio | Yes | Yes | RLS + Storage |
| Job posting, discovery, free applications | Yes | Yes | jobs + applications |
| Applicant review, hiring, project creation | Yes | Yes | transactional RPC |
| Private project chat and deliverables | Yes | Yes | RLS + Realtime + Storage |
| Client approval, revisions, project reviews | Yes | Yes | server-side RPCs |
| Work certificates and public code verification | Yes | Yes | restricted issuer + lookup RPC |
| Free courses, lessons, quizzes, course records | Yes | Yes | creator-owned content + graded RPC |
| Fixed-price service listings and service requests | Yes | Yes | package/request RPCs |
| Save jobs, alerts, ranking and reporting | Yes | Partial | RLS-backed data |
| Admin moderation | — | `/admin` | private staff + RLS |
| Razorpay payment link adapter | Payment action | Payment action | Edge Function + signed webhook (DISABLED by default) |

The UI is functional source code and uses **real Supabase records, not seeded fake accounts, clients, gigs, earnings or reviews**. Real merchant payments, escrow, freelancer payout, commission settlement, KYC, paid course sales, taxes, legal compliance, email/push dispatch and production operations require further approved integrations. The certificate wording documents client-confirmed completion, **not** payment verification or accreditation.

### Development and validation status

- Source authored, TypeScript/TSX syntax parsed and JSON structure checked.
- Public GigBee API connectivity and anonymous RLS smoke checks passed against the dedicated GigBee project. **The new V1.4 SQL migration is NOT deployed.** Signed Android packages and authenticated end-to-end tests remain outstanding.
- Dependencies installed successfully on the authorized Windows PC; mobile and web TypeScript, Next.js production build, Expo Doctor, Android JavaScript export, browser render checks and dependency security audit passed. None of these tests establishes payment, device or full authenticated workflow readiness.
- This repo is an integrated development release, **not yet production certified**. See `docs/RELEASE_STATUS.md` for a full status matrix.

## Requirements

- Windows 10/11, macOS or Linux; Node.js **22.13+**, npm; internet access for npm.
- Existing Supabase project dedicated exclusively to GigBee: `difltkijsmqcnrycjolz`. **Do not apply GigBee SQL to SiteFlow or SiteFlow Staging.**
- Android phone with a compatible Expo Go (or Expo development build), or Android emulator.

## Windows quick setup (from the project root)

```powershell
node -v
npm -v
npm ci
# Existing apps/mobile/.env and apps/web/.env.local are already configured on the audited PC.
# On a new PC, copy examples only if local env files do not yet exist.
```

Use the dedicated **existing** GigBee project `difltkijsmqcnrycjolz` and its publishable URL/key. Do not create a replacement project or run `supabase/schema.sql` on that existing database. Inspect migration history, take a verified backup and test the V1.4 upgrade migration in dedicated staging first. Never place `sb_secret_*`, `service_role` or provider secrets in the mobile app or website. Current management credentials do not authorize this project; obtain access before deploying migrations.

Configure Supabase Auth email confirmation and URL allowlists. For web password recovery set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` if configured; for mobile, `EXPO_PUBLIC_SITE_URL=http://localhost:3000` is only useful if a reachable web reset URL is available to the phone. A deployed HTTPS website is preferable for email recovery redirects.

Start in separate PowerShell sessions:

```powershell
npm run web
# second window, from repo root
npm run mobile
```

Website: `http://localhost:3000`. Mobile: scan the Expo terminal QR with the SDK-compatible Expo Go or use a development build. The two clients connect directly to the same Supabase project. In `apps/mobile`, run `npx expo install --check` and `npx expo-doctor`; fix any remaining SDK/React mismatches without `--force` or `--legacy-peer-deps`.

### Previous GigBee installation error fixed

Earlier V0.6 accidentally pinned `expo-constants` to `58.0.13`, while its Router requested `^58.0.14`. This source declares `expo-constants ~58.0.16` and uses a single npm workspace root. If Expo reports that the `expo-router` plugin cannot be resolved, **first make sure `npm install` finished successfully from the repo root**. Do not remove `expo-router` from `app.json`.

## Project layout

```text
apps/
  mobile/          Expo Router tabs, auth, jobs, projects, chat, courses, services, certificates
  web/             Next.js public pages + /dashboard + /admin + verification pages
packages/shared/   Shared TypeScript models, categories, colors, currency formatting
supabase/
  schema.sql       Complete one-time setup for a NEW Supabase project
  migrations/      Four preserved migrations + V1.4 audit-hardening upgrade
  functions/       create-payment-link and razorpay-webhook (provider gated)
scripts/            Local preflight checks and Windows setup helper
docs/               Comprehensive audit, production runbook, test plan and security notes
```

## Optional merchant integration (NOT part of basic setup)

Never turn payments on for real customers without a supported merchant account, legal/tax consultation and testing. The included adapter creates Razorpay Payment Links; it is **not an escrow or payout service**. Follow `docs/PAYMENTS.md`. The feature flag `GIGBEE_PAYMENTS_ENABLED` defaults to absent/disabled. Never store provider credentials in Expo or public Next.js environment variables. Webhook `verify_jwt` is false *only* for the public provider callback; the handler independently verifies the HMAC signature.

## Admin activation

The protected `/admin` website route checks `public.is_gigbee_staff()` on the active user; database RLS controls reads and moderation updates. The Supabase project owner must explicitly add their own user UUID to `private.staff` through a privileged SQL Editor session. Do not assign admin through editable user profile metadata.

## Next validation step

After installing packages and configuring a new GigBee Supabase instance, follow `docs/TEST_PLAN.md` to walk through two distinct real accounts: sign up, create/open job, apply, hire, message, deliver, accept/revise, review, verify credentials, enroll in a free course and complete its quiz. Run `npm run typecheck` and `npm run web:build`. Sign-in/email and payment flows also require working external providers.
