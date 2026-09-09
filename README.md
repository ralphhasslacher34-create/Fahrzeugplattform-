# MOBIMORY Research Service 1.0.6.2

Cloudflare Worker for MOBIMORY online travel research.

The production Worker name is `mobimory-research`.

Required existing Cloudflare secrets:
- `OPENAI_API_KEY`
- `MOBIMORY_TOKEN`

Existing dashboard variables are intentionally preserved by `keep_vars: true`, especially:
- `ALLOWED_ORIGINS`
- `OPENAI_MODEL`

Production deploy command: `npx wrangler deploy`
