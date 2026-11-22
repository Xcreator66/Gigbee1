# GigBee V1.1 — Expo SDK 58 alignment, product workflows and operational hardening

**Date:** 2026-11-19  
**Scope:** Integrated Expo mobile app + Next.js public site with protected `/admin` + one Supabase backend. No independent Node/Express backend was added.

## Delivered in this source release

### Expo SDK 58 patch alignment
- Expo `58.0.26`, Expo Router `~58.0.32`, Linking `~58.0.17`, SQLite `~58.0.18`, Status Bar `~58.0.5`, Constants `~58.0.16`, React `19.3.0`, React Native `0.88.1`, React types `~19.3.0`.
- Added SDK 58-compatible `expo-notifications ~58.1.9`, `expo-device ~58.0.5`, and `expo-splash-screen ~58.0.14` dependencies.
- Removed deprecated `newArchEnabled`, legacy root `splash`, and TypeScript 6-deprecated `baseUrl` settings.
- Preserved a branded native splash with the `expo-splash-screen` config plugin.
- Set `experiments.typedRoutes=false` as a temporary compatibility mitigation for the reported `expo-router/internal/testing` launch crash, without removing Expo Router navigation.
- Applied previously reported tab-bar Ionicons color fix, type-safe certificate record, root npm workspace flag fix. Correct mobile `_layout.tsx` uses `../context/AuthContext`.

### Newly implemented screens and operational functionality
- **Mobile:** Opt-in notification settings, device token registration, user preferences, payment activity, account-deletion request screen, enhanced job cards using approved GigBee artwork.
- **Web:** Read-only payment activity dashboard, account-deletion request page, relevant links in workspace/footer, moderator audit and deletion-request queue.
- **Supabase migration 003:** Notification preferences and device tokens with ownership RLS, queued push/email deliveries, a service-role-only claim/finish API with retries, read-only participant payment activity RPC, moderation audit capture and staff-only audit API.
- **Supabase migration 004:** Authenticated account-deletion request intake and staff review states; no automatic deletion of legally retained records.
- **Edge Function:** `deliver-notifications` to send opted-in push through Expo and email through Resend with secret-key endpoint protection. Must be deployed and scheduled separately; not live by default.
- **Validation:** JSON/preflight, TypeScript/TSX syntax and relative-import scan against 76 source files. No fabricated listings, balances, certificates, push deliveries or payment events.

## NOT complete / still externally gated
- Live `npm install`, `npm run typecheck` against installed dependencies, `npx expo-doctor`, Next.js production build and real Android runtime test **have not been run in this container**. The app should not be treated as a passed production build until they succeed.
- Supabase migrations and RLS security tests **have not** been executed against a new live GigBee project. Do not apply against SiteFlow.
- Real push requires EAS project ID, Android FCM/iOS APNs credentials and development/production build. Expo Go push support may not match the release build.
- Outbound email requires a verified Resend sending domain/key and a scheduled, secret-protected worker. Queueing a message is not delivery.
- Expo push ticket acceptance is not delivery confirmation; Expo push receipt reconciliation should be implemented and tested for reliable production delivery.
- Marketplace settlement, regulated escrow, freelancer payouts, refunds, invoices, GST/TDS and paid course creator settlements remain **unfinished and disabled** pending provider/compliance requirements. Payment activity shows *statuses*, not account funds.
- Account deletion requests are real records. Actual secure deletion (Auth, Storage, records, retention exceptions) is a separate operational procedure.
- Identity verification/KYC, comprehensive fraud detection, contractual compliance, high-volume moderation, detailed accessibility QA, performance/load tests and Play Store release are not finished.

## Suggested first launch acceptance gates
1. Complete `npm install`, `npm run preflight`, `npm run sourcecheck`, `npm run typecheck`, `npx expo-doctor` (from `apps/mobile`), `npm run web:build`.
2. Apply migrations to the dedicated GigBee project and run Supabase advisors, RLS abuse tests and migration rollback/dry-run procedures.
3. Register two separate real accounts; exercise: client posts → freelancer applies → client hires → chat → deliver → request revision → approve → review → verify certificate.
4. Verify learner/creator course quiz and certificate; moderator reports/disputes/audit; notification opt-in and dispatch; account-deletion request.
5. Test Android on a physical device, network changes, permission rejection, slow networks, errors, sign-out, role permissions, and file uploads.
6. Enable live provider payments only after merchant verification, test-mode end-to-end reconciliation, and legally approved marketplace flow.
