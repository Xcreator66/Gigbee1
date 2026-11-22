# GigBee V1.0 — Build status & limitations

**Package type:** source-code integration release. **State:** complete intended code pass, not a proven production deployment. The first complete source candidate is ready for user-side installation, configuration and bug fixing; no Play Store APK/AAB or live URL is included.

## Delivered in source

- **Account**: Supabase email/password auth, reset request/web reset page, session handling, four activatable roles, profile visibility and public usernames.
- **Freelance marketplace**: category browsing, filters, free job applications, daily spam caps, job closure, client applicant review, hiring, project record, status transitions, fixed-price services and service requests.
- **Collaboration**: project messaging, protected attachment storage, deliverable submission, revisions, client accept/reject, disputes, completed-job reviews, basic app notifications and reports.
- **Skills and trust**: portfolio entries, free lessons, creator studio, graded assessments with private answer key, course and client-approved work records, public one-code certificate verification and derived rankings.
- **Website**: responsive marketing pages with previously approved GigBee illustrations, discovery directories, logged-in workspace, project room, course pages, services, rankings and restricted `/admin`.
- **Infrastructure**: one Supabase Auth/Postgres/RLS/Storage/Realtime/Functions stack, two migration files and a composite SQL bootstrapping script, client env samples, payment link function/webhook disabled without merchant setup.

## Partially delivered / provider gated

| Area | Current implementation | Not yet provided / not verified |
|---|---|---|
| Auth | Email + password, recovery request | Real email deliverability, phone OTP, OAuth, full identity checks |
| Projects | Client approved work, revisions and dispute records | Signed legal contracts, milestone escrow, automated dispute adjudication |
| Payments | Server-controlled payment link adapter + signed webhook, DISABLED | Approved merchant account, funds holding, payouts, refunds workflow, commissions, invoices, GST/TDS, cash movement audit |
| Learning | Free course publishing, lessons, quizzes, course records | Paid-course checkout, teacher revenue settlement, professional accreditation |
| Notifications | In-app records and project Realtime chat | Push and outbound email delivery |
| Governance | Staff/RLS and reports, dispute status | Staff training, support team, moderation queue SLAs, rigorous audit and fraud testing |
| Discovery | Basic category/job search and ranking by completed work | Production recommendation engine, search infrastructure, spam quality model |
| Release | Expo source, Next.js source | Signed Android AAB, hosted URL, actual CI/CD, uptime monitoring |

Do not use the payment integration as a representation of escrow or guarantee that freelancers will be paid; Razorpay Payment Links are not the same as regulated marketplace settlement.

## Validation actually performed

- Source AST syntax validation of app and website TypeScript/TSX.
- JSON and source-package structure checks, ZIP integrity checks.
- Dependency pin in mobile package updated to address known `expo-router`/`expo-constants` mismatch.

**Not performed:** npm dependency resolution, TS typecheck against installed libraries, Expo Doctor, Android device build, Next.js production bundle, SQL execution on a live GigBee Supabase project, payment gateway onboarding or live charge tests. Those require network credentials/environment access and should be completed before launch.

## Definition of 'ready to launch'

Both clients build; Supabase migrations apply cleanly; two-user project lifecycle passes; RLS abuse tests pass; email works; provider-based payment and settlement compliance are verified; privacy/legal documentation is approved; admin moderation works; accessibility and Android testing are completed. None of those should be assumed from a source ZIP alone.
