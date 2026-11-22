# GigBee V1.1 — Windows installation & upgrade

Use PowerShell. GigBee is an npm-workspaces project; install from the `GigBee-Starter` **root**, not `apps/mobile`.

## A. Fresh source installation

1. Extract `GigBee_V1_1_Integrated_Source.zip` to a folder you control, e.g. `D:\Projects\GigBee-V1.1\GigBee-Starter`.
2. Open PowerShell in that `GigBee-Starter` root.
3. Use Node 22 LTS or another Expo SDK 58-supported Node version; check with `node -v`.
4. Run:

```powershell
npm install
npm run preflight
npm run sourcecheck
npm run typecheck
cd apps\mobile
npx expo install --check
npx expo-doctor
cd ..\..
npm run web:build
```

`npm run typecheck` must complete for both mobile and web. `expo-doctor` must report all checks passed. A script success is not evidence that Supabase is connected.

## B. Upgrade an existing GigBee V1.0 working folder

1. Download and **extract** `GigBee_V1_1_Upgrade_Patch.zip` to a folder you can find. Do not run the script before extracting the ZIP.
2. Open PowerShell at the extracted patch folder and run:

```powershell
powershell -ExecutionPolicy Bypass -File ".\Apply-GigBee-V1_1.ps1" -ProjectRoot "D:\New folder\GigBee_V1_Integrated_Project\GigBee-Starter"
```

The installer backs up any files it overwrites. It does not touch `.env`, `.env.local`, `node_modules`, or your existing npm lockfile. The `npm install` command below refreshes the lockfile for new dependencies.

3. From the **existing GigBee-Starter root**, run:

```powershell
npm install
npm run preflight
npm run sourcecheck
npm run typecheck
cd apps\mobile
npx expo install --check
npx expo-doctor
npx expo start --clear
```

If Expo Router's typed route generation previously crashed, this patch keeps `typedRoutes` disabled. Do not enable it until a verified SDK 58 Expo Router update is tested locally.

## C. Supabase connection

- Create a dedicated **GigBee** Supabase project. Never apply GigBee SQL to existing SiteFlow projects.
- For a **new empty GigBee** project: run `supabase/schema.sql` in SQL Editor once (or use proper migration deployment).
- For an **existing GigBee V1 database** with migrations 001/002 already applied: execute only the new ordered migration files `202611190003_notifications_finance_audit.sql` and `202611190004_account_rights.sql` after reviewing a backup. **Do not rerun `schema.sql`** on a live V1 database.
- Configure `.env` files using the `apps/mobile/.env.example` and `apps/web/.env.example` samples. Put the dedicated project URL and **publishable** key only in frontend variables; never expose service-role/secret keys.
- `npm run mobile` starts Expo, `npm run web` starts Next.js. They share the same Supabase project.

## D. Push notifications (not automatic on fresh install)

1. Run EAS project initialization for GigBee and place its true EAS `projectId` under `expo.extra.eas.projectId` (do **not** invent a UUID).
2. Configure Android FCM and iOS APNs credentials for a development/production build, as appropriate.
3. Apply migration 003 and create a development build. On a real device, opt in via Profile → Notification preferences.
4. Deploy `deliver-notifications`; set `GIGBEE_DISPATCH_SECRET` to a random 32+ character secret, optionally `RESEND_API_KEY`, `GIGBEE_EMAIL_FROM` to a verified sender. Set these ONLY in Supabase secrets.
5. Schedule an HTTPS POST to the deployed function with the correct `X-GigBee-Dispatch-Key` header via a secure scheduled worker (e.g., Supabase Cron + Vault). Restrict cron/secret access. Avoid embedding the secret in frontend source.
6. Verify a project update produces a queued delivery and an Expo ticket or email-provider response. Monitor failures; implement push receipt reconciliation before full production rollout.

The worker cannot run safely without the secrets. Existing in-app notifications work without these outbound services.

## E. Payments and deletion

- Real payments are **off by default**. A Razorpay Payment Link is **not** escrow and **not** a freelancer payout. The payment activity page is read-only.
- No official tax invoices, paid-course checkout, refunds automation or settlement workflow are claimed.
- Account deletion requests are submitted in-app or through `/delete-account`. Staff must process actual deletion with legal and transaction retention review; simply changing request status does not remove data.

## F. If commands fail

- `npm install` errors: share the exact `ERESOLVE` output, do not use `--force`.
- `expo-doctor` errors: run `npx expo install --check`; SDK 58-compatible versions matter more than independently bumping each library to an unrelated major version.
- `npm run typecheck` errors: share the first error plus path. Avoid deleting `tsconfig.json`.
- Metro errors: run `npx expo start --clear` after dependency/config changes.
- Supabase errors: ensure the schema exists and both frontends use the **same** project URL and publishable key.
