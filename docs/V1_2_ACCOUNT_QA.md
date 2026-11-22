# GigBee V1.2 — Account & Release QA Script

Run in a dedicated staging project or with test users; never use the production service-role key in a frontend.

## Local checks

```powershell
cd GigBee-Starter
npm install
npm run preflight
npm run sourcecheck
npm run accountcheck
npm run typecheck
npm run web:build
cd apps/mobile
npx expo-doctor
npx expo export --platform android --output-dir dist-qa
```

Do not run `npm install` separately inside `apps/mobile` to avoid duplicate React versions. Keep Expo SDK-aligned dependency versions.

## Auth + account acceptance

- Create two real test accounts, verify emails, sign into mobile and web. Confirm one identity and role set per user.
- On mobile Profile, open Account settings. On website Dashboard → Account settings. Confirm both show the same verified email and visibility state.
- Enter an invalid email and confirm an error appears without changing the Auth email. Request a valid new email and complete all provider-required email confirmation steps. Check login with new email only after confirmation.
- Test weak, mismatched and valid 12+ character passwords. Check success and re-login; handle required reauthentication responses without claiming success.
- Make the profile public without a username (must be rejected). Add a valid username, enable public profile, check public URL, then hide it. Existing participant records should not be lost.
- Opt in to email on the web and push on Android; changing email should not unset push. Confirm disabling push blocks outbound queue delivery. Confirm in-app notifications remain visible.
- Sign out from mobile on one device: only that session should be removed; registered push for the signed-out device should be disabled, while other devices retain their own settings.
- Sign out everywhere using Account settings: all refresh sessions should be invalidated and push registrations disabled. Check session expiry behavior on other devices (JWTs may survive until expiry).
- Submit deletion request; confirm one request, staff-visible review, correct status and no false immediate-deletion claim. Actual deletion is an independent operational procedure.

## Marketplace + production gates

- Client posts job → freelancer submits proposal → client hires → both chat → freelancer delivers → client requests a revision → freelancer redelivers → client approves → genuine review/certificate verifies.
- Creator activates role, publishes a free course, adds lessons, assesses a learner, and verifies a certificate. Verify no paid-course charge is created.
- Test attachment permissions, cross-account RLS, blocked impersonation, orphaned files, moderation actions, stale sessions and network retries.
- Test Android device permissions, screen reader, keyboard/scroll navigation, orientation, slow/offline networks, loading and empty states.
- Validate all email redirects, push credentials, dispatcher retries, provider receipts and release signing before claiming production readiness.
