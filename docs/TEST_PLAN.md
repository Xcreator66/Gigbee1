# GigBee V1.0 — First integration test plan

Run against a **fresh GigBee staging Supabase project** with two real test accounts. Do not use genuine customer or payment information during initial tests.

## 1. Install and compile

```powershell
npm install
npm run typecheck
npm run web:build
cd apps\mobile
npx expo install --check
npx expo-doctor
npx expo start --clear
```

Confirm all dependencies install cleanly without `--force` or `--legacy-peer-deps` and that the app opens on Android. Configure both `.env` files with the same project URL and publishable key.

## 2. Auth and roles

- Sign up Account A and Account B, confirm email if required, login and logout on both clients.
- Check automatic profile creation, default freelancer role, client role activation, creator and learner roles.
- Verify wrong credentials fail gracefully; password reset email links resolve to configured web domain.
- Confirm account A cannot update Account B's profile or role assignments.

## 3. Marketplace

- Client A publishes a fixed-price job (valid title, category, budget, detailed description).
- Freelancer B searches/browses the job on mobile and web and applies **without purchased credits**.
- Confirm applications are private to B and the hiring client; submitting twice is blocked.
- Confirm client A sees B's submitted proposal and profile, hires B, and the job closes.
- Verify unrelated users can't read a private closed job, project or proposal.

## 4. Project execution

- A and B can open project chat; a third account cannot read or send messages.
- B uploads a sample file and submits delivery; client A can access it.
- A requests revision, B resubmits, A approves. Check state and timestamps.
- Review and certificate creation must occur only after completed work. A cannot create a fake completion/certificate by changing a public database row.
- Check opened disputes and report forms can be seen by staff, and unrelated accounts cannot edit them.

## 5. Learning, talent and services

- Creator A publishes a free course, adds at least one lesson and a four-option quiz with hidden answer key.
- Learner B enrolls, marks lessons complete and passes quiz; course credential appears with verification code.
- B cannot query the quiz answer key. Anonymous users can verify a specific code but cannot enumerate all credentials.
- B adds portfolio entry and enables public profile; public web profile shows work samples and derived completed-work count.
- Freelancer B publishes a service. Client A requests it; B accepts; confirm fixed price remains the quoted amount if listing is edited later.

## 6. Payments — separate gated test

- Keep payments disabled until Razorpay merchant onboarding and review are complete.
- When enabled only in test mode, verify project-owner-only link creation, fixed INR amounts, signature validation, replay idempotency, cancellation and late-event behavior.
- Confirm invalid/mismatched payment callbacks and webhooks cannot mark a project captured.
- Test refunds, accounting records, settlement and Indian regulatory obligations independently before going live.

## 7. Accessibility and release

- Test desktop, 320px mobile, tablet, keyboard navigation, reduced motion and screen readers.
- Test Expo app on physical Android and iOS where applicable, file picker permissions, offline errors, session renewal and deep linking.
- Test user-reported content, security scans, moderator access and legal pages.
- Only after passing gates, use EAS to create signed builds and deploy Next.js through the chosen hosting provider.
