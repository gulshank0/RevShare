---
name: revshare-development
description: "Build and change the RevShare YouTube revenue-sharing platform. Use for Next.js App Router, TypeScript, Prisma, authentication, KYC, Stripe payments, YouTube integrations, marketplace, trading, wallet, payout, or DEX escrow work."
argument-hint: "Describe the feature, route, model, or financial flow to change"
user-invocable: true
disable-model-invocation: false
---

# RevShare Development

Use this skill for changes that affect the RevShare application or its financial domain.

## Before editing

1. Read the relevant section of [README.md](../../../README.md).
2. Read [docs/dex-escrow-system.md](../../../docs/dex-escrow-system.md) for escrow, claims, distributions, and audit behavior.
3. Read [docs/legal-framework.md](../../../docs/legal-framework.md) for KYC, privacy, investment, and compliance implications.
4. Inspect the related route, service, component, and Prisma models before choosing an implementation.
5. Check the working tree and preserve unrelated user changes.

## Implementation procedure

1. Identify whether the change is a client component, server route, shared service, schema change, or documentation change.
2. Reuse existing auth, Prisma, UI, and response helpers rather than creating parallel patterns.
3. Validate untrusted input at the API boundary before database, Stripe, YouTube, or wallet operations.
4. For financial state transitions, use a Prisma transaction, enforce authorization and eligibility, preserve idempotency, and write the required ledger/audit records.
5. Keep money calculations consistent with the existing schema and documented platform fee rules. Avoid changing fee percentages, ownership snapshots, claim expiry, or investment limits without updating domain documentation.
6. For Stripe webhooks, verify the signature and make event handling safe to retry.
7. Keep secrets server-only and avoid logging credentials, access tokens, payment details, or raw KYC data.
8. Update directly related documentation and user-facing error states when behavior changes.

## Validation procedure

1. Run `npm run lint`.
2. Run `npm run build` for route, configuration, dependency, or server/client-boundary changes.
3. If the Prisma schema changed, run `npm run db:generate` and follow the repository's database migration workflow.
4. Review the final diff for accidental secrets, authorization gaps, duplicate processing, and changes outside the requested scope.

## Useful areas

- API routes: `app/api/**/route.ts`
- Auth and shared services: `lib/auth.ts`, `lib/services/**`
- Data model: `prisma/schema.prisma`
- Reusable UI: `components/**`
- Escrow UI and logic: `components/dex/**`, `lib/services/dex-escrow.ts`, `app/api/dex/**`
- Existing domain references: `../../../docs/`
