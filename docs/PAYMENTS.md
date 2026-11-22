# GigBee payments integration — disabled until merchant approval

## Current model

`supabase/functions/create-payment-link` can request an exact-price Razorpay Payment Link for a client's project after validating a Supabase session and project ownership. A separate `razorpay-webhook` verifies the provider's SHA256 HMAC signature and attempts to update database payment status idempotently. This code does not move money to a freelancer, reserve funds, or split settlements.

## To prepare (not to activate without compliance review)

1. Obtain a verified and eligible provider merchant account and confirm the provider supports your intended freelance marketplace use and payment flows.
2. Review GST, applicable TDS, platform fee/refund/legal obligations, terms of service, data retention, chargeback procedure and KYC requirements with qualified advisers.
3. Configure **Supabase Edge Function secrets**, never `EXPO_PUBLIC_*` or `NEXT_PUBLIC_*`: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`; Supabase server environment supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy `create-payment-link` with authenticated requests and `razorpay-webhook` as a public callback requiring a valid HMAC signature. Set Razorpay's provider callback endpoint and only the needed event subscriptions.
5. Initially keep `GIGBEE_PAYMENTS_ENABLED` absent or `false`. Enable it only after testing with test credentials, fraud and replay checks, reconciliation, refunds, rate limiting and production approvals.

**IMPORTANT:** The included integration is a **Payment Link** model. It does not provide escrow, milestone release to freelancers, automatic payouts, guaranteed protection, tax handling, refunds UX or split settlements. The full commercial marketplace requires more work than attaching a payment gateway key. Do not represent a 'captured' status as proof of payout.
