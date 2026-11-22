# GigBee security boundaries

- Every public Supabase table has Row Level Security. Verify RLS is enabled when applying schema; a DB migration has not been run against a live project during source generation.
- Mobile and website clients may contain only public publishable API keys. Keep service-role and merchant secrets in Edge Functions only.
- Client role is self-activated and not an admin role. A separate private staff table and server-verified `is_gigbee_staff` authorization gate protect moderation.
- User-editable metadata must never determine staff, payment or certificate authority.
- Project status, reviewed deliverables, certificates, grades and notifications are written through restricted RPCs or trusted provider callbacks, not client-updatable table permissions.
- Private project attachments are scoped to owner and participant access; public avatars are only in a dedicated public bucket. Media content and file type validation need production hardening.
- Credential holders may keep identity private; public verification requires a specific random credential code, not enumeration.
- Course creators can edit only their own course data; answer keys are kept in a non-exposed private schema and not returned in the public quiz response.
- Realtime project chat is restricted by participant-based read policies; maintain tested database policies whenever introducing new tables.
- Reviews reflect platform-recorded client-approved work, not independent payment confirmation. Fake-job collusion, chargeback fraud and ranking manipulation need operational mitigation before public launch.
- The webhook checks HMAC but still requires integration testing and production replay/reconciliation planning; never use it without provider test mode and security review.
