# DOMYX AI

A responsive AI workspace built with Next.js, React and TypeScript.

## Features

- Responsive chat workspace
- Conversation history saved in the current browser
- Custom agents with per-agent instructions
- Explore shortcuts and workspace settings
- Server-side OpenAI Responses API integration
- Basic per-instance request throttling and input limits

## Local development

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Only configure an API key if an account owner has approved the service and any associated billing.
5. Run `npm run dev`.

## Vercel setup

Live AI is intentionally disabled until a parent or workspace owner configures a private server environment variable:

- Key: `OPENAI_API_KEY`
- Environment: Production (and Preview/Development only if desired)
- Type: Encrypted
- Value: the key from the workspace owner's provider account

Optionally set `OPENAI_MODEL` to a model enabled for that account. If omitted, the server uses `gpt-4.1-mini`.

After adding or changing environment variables, redeploy the project. Never commit secrets, paste them into chat, or add them to client-side code. API usage can incur charges. A parent or workspace owner should approve and manage any billing.

## Production hardening

The included in-memory rate limiter is a basic safeguard, not a complete multi-instance abuse-prevention system. Before opening a paid API key to the public, add user authentication and a shared rate limiter, plus monitoring and spending limits. Chat history and custom agents currently live in browser local storage and are not synced between devices.
