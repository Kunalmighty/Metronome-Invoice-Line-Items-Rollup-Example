# Caseware Verity Invoice Rollup Demo

This project contains two pieces:

- A Next.js app for showing how Caseware can roll Metronome invoice line items for `Verity Input Tokens`, `Verity Output Tokens`, `Verity Cached Input Tokens`, and `Verity Cached Output Tokens` into one customer-facing `Verity Usage` line item.
- The original sandbox setup script that creates the Verity demo data in Metronome.

The Next.js app shows two approaches:

- `GET /v1/customers/{customer_id}/invoices/{invoice_id}` for full invoice line-item rollups.
- `GET /v1/customers/{customer_id}/invoices/breakdowns` for time-windowed invoice breakdown rollups.

The browser never receives the Metronome bearer token. API calls are made by server-side Next.js route handlers under `app/api/metronome`.

## Run the Next.js App

```bash
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Build for Vercel:

```bash
npm run build
```

For Vercel and local development, set `METRONOME_BEARER_TOKEN` as an environment variable. Do not commit API tokens to this repository.

## Sandbox Setup Script

The setup script creates:

- Four AI usage billable metrics and products for `input_tokens`, `output_tokens`, `cached_input_tokens`, and `cached_output_tokens`.
- A dimensional Verity AI credit rate card starting June 1, 2026.
- Human-readable demo customers and contracts starting June 1, 2026.
- Contract-level commits and credits only.
- Seat-based subscriptions, including examples linked to recurring commits.
- Usage events from June 1 through June 7, 2026.

Run the setup script:

```bash
npm run setup:sandbox
```

Syntax check only:

```bash
npm run check
```
