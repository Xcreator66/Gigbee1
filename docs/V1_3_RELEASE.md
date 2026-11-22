# GigBee V1.3 — Release candidate (21 November 2026)

**Product:** Expo / React Native Android & iOS source + Next.js website + one dedicated Supabase backend.
**Status:** Compiled source release candidate; NOT certified for public launch or commercial payments.

## Shipped changes since V1.2

- Mobile Explore now queries genuine Supabase jobs in pages of 20, with server-side category filtering, debounced title/description search, deterministic ordering and count.
- Mobile Explore surfaces missing configuration, database errors and connectivity failures with an explicit retry action instead of falsely presenting a blank marketplace.
- Website Jobs now paginates 24 jobs per page, preserving category/budget/search/sort filters between pages.
- Website client dashboard can close its own open job to new applications, with a confirmation and server-enforced ownership constraint.
- Website posting validates integer INR budgets within the database's 100–10,000,000 range.
- Existing approved GigBee branding, single Supabase backend, roles, collaboration, certificates, notification preferences and gated payment logic remain unchanged.
- No schema migrations, production credentials, staff assignments or payment settings were changed in this V1.3 source pass.

## Verification run on the connected Windows PC

- Fresh `npm ci` succeeded (549 packages).
- Preflight, source import checks, account integration checks (17/17), TypeScript for mobile and web, Expo Doctor (20/20), Next.js production build, and Android Metro export passed.
- Native Android prebuild generated the Android project.
- Live anonymous Supabase audit `npm run anoncheck` passed 12/12 checks on the known dedicated GigBee project, covering public reads, private-record denials and non-enumerable certificate lookup. This did NOT sign in as any account or write to the database.
- Android Gradle compilation / signing status must be recorded separately; a Gradle 9.4.1 download timeout was observed on the build PC.
- Automated source checks do NOT validate Supabase RLS, phone runtime, email delivery, payment settlement or real two-account marketplace activity.

## Critical release gates

1. Verify the dedicated GigBee project reference, schema migrations (4 preserved migrations), buckets, functions, provider credentials, and user access policies. Never deploy to SiteFlow.
2. Test Account A (client) and Account B (freelancer): signup, email verification, post job, apply, hire, message, upload, revision, approval, reviews and credential verification.
3. Test RLS with Account C attempting unauthorized access to projects, attachments, applications, private profiles, admin, certificates and payment tables.
4. Verify account recovery, push/email opt-in, profile visibility, notification delivery, deletion-intake process and moderated reports/disputes.
5. Publish reviewed Privacy Policy, Terms, operator/support contact details and app data safety disclosures, with appropriate Indian legal and payment compliance checks.
6. For Google Play, use a release keystore / Play App Signing and increment the versionCode; an unsigned or debug-signed AAB is NOT a store-ready release.
7. Keep `GIGBEE_PAYMENTS_ENABLED` disabled until merchant/provider onboarding, refunds, settlements, KYC/tax and financial reconciliation are independently tested and approved.

## Run / verify

At the repository root: `npm ci`, `npm run verify`, `npm run accountcheck`, `npm run doctor`.
From `apps/mobile`: `npx expo export --platform android`.
Use Expo development build / emulator for actual interaction tests; a successful JavaScript export does not prove that native code executes.

**Deployment policy:** Release V1.3 as a closed beta only until every critical gate above is completed.
