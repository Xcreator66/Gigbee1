# GigBee V1.2 — Account Control & Integration Pass

Date: 20 November 2026 · **Source-code release candidate, not a certified production build.**

## Changes included

- Mobile: a dedicated, branded Account Settings screen integrated under Profile → Your space.
- Website: a dedicated `/settings` workspace route, linked from Dashboard, mobile navigation and footer.
- Email-change request using signed-in Supabase Auth. New address becomes effective only after the applicable confirmation flow succeeds.
- Signed-in password update with confirmation and a 12-character minimum including a letter and a digit. Signup and web recovery forms now follow the same policy.
- Separate local sign-out and global sign-out actions. On mobile, local sign-out targets only the stored Expo push-token registration for that device; global sign-out also disables the user's push devices. Global sign-out revokes refresh sessions, not already-issued JWT access tokens.
- Profile privacy switch bound to the existing `profiles.is_public` field, requiring a username to become public.
- Notification email preferences edited without overwriting concurrent push consent. Push delivery remains provider- and dispatcher-gated.
- Deletion request, payment activity, profile editing, portfolio and message navigation remain accessible. A deletion request is NOT immediate physical deletion.
- Mobile Creator Studio now reports role activation errors instead of silently swallowing them.
- Added dependency-free account integration smoke checks (`npm run accountcheck`).
- No changes to original SQL migrations, roles, project data, secrets or payment infrastructure. The existing four migrations are preserved verbatim.

## Validation performed in the authoring environment

- `node scripts/preflight.mjs` — passed.
- `node scripts/account-smoke.mjs` — 17 structural checks passed.
- TypeScript AST syntax + relative-import scan against 78 TS/TSX source files — passed using available globally installed TypeScript 5.8 parser.
- Source archive integrity test — expected at packaging.
- `npm install` **could not complete** in the isolated build environment. Thus `tsc`, Expo Doctor, Next.js production build, native Android runtime and live end-to-end tests **have not passed**. The source is NOT release-certified.

## Explicitly remaining outside this release

1. On a network-connected build machine, run `npm install` at the `GigBee-Starter` root, then `npm run verify`, `npm run accountcheck`, `npm run doctor` and `npx expo export --platform android` inside `apps/mobile`.
2. Verify auth email delivery, both email-change confirmations, password changes and password recovery with the actual Auth redirect allowlist. Configure `EXPO_PUBLIC_SITE_URL` to the deployed web site URL.
3. Run the 2-account marketplace smoke scenario, storage/RLS abuse tests and physical-device testing; verify the website deployment.
4. Deploy the notification worker with approved secrets, valid EAS ID/FCM credentials and verified sender. Implement/monitor Expo push receipts.
5. Add actual payments, payouts, refunds and invoicing only after the planned merchant/settlement and compliance implementation. V1.2 does NOT enable or claim escrow or payouts.
6. Conduct moderation, accessibility, performance/security and account-deletion operational readiness reviews, then create signed APK/AAB and store assets.

**Backend note:** The owner reports that the GigBee Supabase backend and migrations are already applied. This source release does not reapply them or confirm their live status, as tool access to the database was denied.
