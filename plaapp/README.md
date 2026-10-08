# PLA mobile app

The Expo app is the native shell for the ProLeague Africa web client. It hosts
the web app in a WebView and bridges authenticated sessions to native push
notifications and the PLA Socket.IO namespaces.

## Local setup

1. Install packages with `npm install`.
2. Copy `.env.example` to `.env` and set the frontend, Strapi API, and device
   socket URLs. Defaults use ports `3011` (frontend), `1377` (backend API), and
   `3015` (PLA sockets) on the Android emulator host `10.0.2.2`. Use the
   computer's LAN IP for a physical device and `localhost` for an iOS simulator.
3. Start the Next frontend and Strapi backend using the project run instructions.
4. Start the PLA socket service from `../sockets` with `npm start`.
5. Start Expo with `npx expo start` and open the app in an Android/iOS
   development build.

The website sends the current user's ID and JWT to the native bridge only after
login. The socket service independently validates that JWT against Strapi; it
does not trust a client-supplied user ID. Push-token registration additionally
requires an EAS project ID and the platform's push credentials. Set
`EXPO_PUBLIC_EAS_PROJECT_ID` before testing push delivery.

## Native services

- `src/services/BackgroundService.ts` initializes push notifications, registers
  the push token against the signed-in user's Strapi profile, and connects the
  device socket. It disconnects both services on logout or app teardown.
- `src/services/DeviceSocketService.ts` authenticates with the user's JWT,
  registers device information, and relays PLA notification, wallet, match, and
  tournament events to the WebView.
- `src/services/NotificationService.ts` handles permissions, Expo push tokens,
  foreground notifications, and notification taps.
- `src/services/PermissionManager.ts` exposes notification permission status and
  requests to the WebView bridge.

The app entry point is `index.ts`, which registers `App.tsx`; native screens and
services are kept outside a router-managed `app/` directory.

## Validation

Run `npx tsc --noEmit`, `npm run lint`, and `npx expo export --platform android`
to type-check, lint, and create an Android production JavaScript bundle.
