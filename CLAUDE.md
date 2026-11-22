# RevShare Project Guidelines

## Project shape

- This is a Next.js 14 App Router application using TypeScript, React, Tailwind CSS, NextAuth, Prisma, PostgreSQL, Stripe, and YouTube APIs.
- Keep UI routes and server API handlers under `app/`; share server-side integrations and domain logic through `lib/`.
- Use the `@/*` path alias for imports from the repository root.
- Treat `docs/dex-escrow-system.md`, `docs/legal-framework.md`, and the Prisma schema as authoritative domain references.

## Implementation rules

- Preserve the existing route and component structure; prefer small, focused changes over broad rewrites.
- Authenticate protected API work with the existing NextAuth session helpers and enforce the relevant role/KYC checks at the server boundary.
- Validate all request input before database, payment, or external API calls. Return the repository's existing JSON/error response style and never expose secrets or sensitive KYC data.
- Use Prisma transactions for multi-record financial state changes. Keep investment, wallet, payout, escrow, and ledger updates atomic and auditable.
- Preserve ownership snapshots and audit records when changing escrow or distribution behavior. Do not silently alter fee, share, claim-expiry, or eligibility rules.
- Keep Stripe and webhook handlers idempotent; verify webhook signatures before processing events.
- Do not add credentials, `.env` values, OAuth tokens, payment data, or production personal data to source, logs, tests, or documentation.
- Prefer existing UI primitives and styling conventions. Keep client-only code limited to components that need browser state or APIs.

## Validation

- Run `npm run lint` for TypeScript/Next.js changes.
- Run `npm run build` when changing routes, configuration, dependencies, or server/client boundaries.
- After changing `prisma/schema.prisma`, run `npm run db:generate` and use the appropriate migration/database workflow; do not edit generated Prisma output.
- Update relevant documentation for changes to APIs, environment variables, financial rules, or user flows.

## References

- Setup, routes, flows, and known limitations: [README.md](./README.md)
- Escrow invariants and endpoints: [docs/dex-escrow-system.md](./docs/dex-escrow-system.md)
- Legal and compliance context: [docs/legal-framework.md](./docs/legal-framework.md)
