# PLA real-time service

The Socket.IO service exposes `/main-sockets` for the browser client and
`/device-sockets` for the native app. Both namespaces validate the supplied PLA
JWT by requesting `/users/me` from Strapi before joining a user room.

## Configuration

Copy `.env.example` to `.env`, set the Strapi API URL, origins, and a long random
`SOCKET_INTERNAL_TOKEN`. Set the same internal token and
`SOCKET_SERVER_URL=http://localhost:3015` in `backend/.env`. Keep the internal
token server-side; it must never be sent to the browser or mobile client.

## Run and check

- `npm install`
- `npm run check`
- `npm start`

`GET /health` is a non-sensitive liveness check. Backend event publication uses
`POST /events/publish`, authenticated with the internal token; only allowlisted
PLA notification, wallet, match, and leaderboard events can be published.
