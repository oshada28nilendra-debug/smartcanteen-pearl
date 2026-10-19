# PEARL demo deployment

Use Vercel for the React frontend and Railway for the long-running Node/Socket.IO backend, as already described in this repository. Deploy branch `feat/pearl-first-release`; merging is not required to test it.

## Demo scope

Mobile operation and demo payments were confirmed by the owner. Real payments remain unverified. Google/Microsoft sign-in and password recovery are not implemented. Use test accounts and a separate Atlas database such as `pearl_demo`; do not use a real canteen's production orders.

The built-in simulated payment flow requires `ENABLE_DEMO_PAYMENTS=true` and `NODE_ENV` other than `production`. For this separate demo use `NODE_ENV=staging`: development error stacks and relaxed development rate limits stay off. Production must continue to use `NODE_ENV=production` with demo payments disabled. PayHere sandbox is a separate integration, not the built-in simulated payment flow.

## Backend first — Railway

1. Import the GitHub repo. Select branch `feat/pearl-first-release` and service root `smartcanteen-backend`.
2. Start command: `npm start`. Railway supplies the listening port. Use a supported Node LTS release compatible with the lockfile.
3. Add variables from the backend `.env.example` in Railway's Variables screen. Do not commit actual values. Set `MONGO_URI` to the Atlas connection string with `/pearl_demo` and `authSource=admin` where required. Atlas must allow the backend's outbound connection; use the host's available egress configuration to select the narrowest practical IP access rule.
4. Generate two independent signing secrets locally with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`; put one in `JWT_SECRET`, one in `JWT_REFRESH_SECRET`. Do not paste them into chat.
5. Use `NODE_ENV=staging`, `ENABLE_DEMO_PAYMENTS=true`, and `PAYHERE_SANDBOX=true`. Leave PayHere merchant credentials unset for simulated payments, so the real gateway initiation remains unavailable.
6. Generate a public HTTPS domain. Health check path: `/api/health`. Verify a successful response and MongoDB connection in the logs.

## Frontend — Vercel

1. Import the same repo. Select root `smartcanteen-frontend/smartcanteen-frontend`, framework Create React App, build `npm run build`, output `build`, and the release branch above.
2. Set `REACT_APP_API_URL=https://YOUR-BACKEND-DOMAIN/api` in the target deployment environment. This is public configuration and is bundled at build time. Redeploy after changing it.
3. Deploy. The committed `vercel.json` serves React routes correctly when refreshing `/login` or `/student/home`.
4. Set the Railway backend's `CLIENT_URL` to the exact stable frontend HTTPS origin, with no trailing slash. Redeploy the backend. This origin configures both API and Socket.IO CORS. A new preview hostname needs a matching origin; do not enable wildcard CORS with credentials.

## Hosted checks

- Open `/api/health`, then the landing page, login and register pages; refresh each route directly.
- Create separate demo student/vendor accounts and publish a shop and food.
- Complete a simulated order, update it from the vendor account, check notifications, and verify pickup.
- Repeat on a phone using mobile data rather than the laptop hotspot.
- Verify authorization and stock/cancellation cases before calling the release complete.
- Confirm rate limiting works behind the hosting proxy. If Railway's forwarded-header behavior triggers Express rate-limit validation, configure trust for the observed proxy topology; do not blindly trust arbitrary forwarded headers.
- Verify live payments are unavailable. Do not switch on real merchant credentials until the payment flow and callbacks have been separately validated.

## Repository review

A targeted scan of 33 locally available commits found no matches for credential-bearing MongoDB URIs, common GitHub tokens, AWS access-key IDs, or private-key headers. This is not an exhaustive secret audit. The tracked frontend `.env` and `.env.production` contain public configuration/build flags. Updated ignore rules prevent new local env variants from being accidentally added; they do not untrack existing files or erase history.

References: https://docs.railway.com/deployments/monorepo and https://vercel.com/docs/frameworks/frontend/create-react-app
