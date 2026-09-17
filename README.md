# @openg2p/notification

In-app notification inbox for OpenG2P frontends.

Host apps render `Inbox` and pass a connection config. The package talks to the notification provider through an adapter, so application UI never imports Novu (or any other vendor SDK) directly.

Novu is the built-in provider. Other providers can be registered on `NotificationFactory`.

## Features

- Bell with unread badge and dropdown inbox
- All / Unread / Archived filters
- Mark as read, mark all as read, archive, unarchive
- Live updates over the provider WebSocket
- Pagination (20 per page)
- Localization overrides
- Headless `useInboxSession` hook for a custom UI

## Architecture

```text
Host app
   │
   ▼
Inbox / Bell / useInboxSession
   │
   ▼
NotificationFactory.create(provider, connection)
   │
   ▼
NotificationService adapter  (Novu today)
   │
   ▼
Provider SDK + API / WebSocket
```

The browser connects to the provider. OpenG2P backends do not proxy inbox REST or WebSocket traffic.

| Layer | Role |
|---|---|
| `Inbox` | Bell, panel, and session wiring |
| `NotificationFactory` | Looks up a provider by name |
| `NotificationService` | Provider-neutral inbox contract |
| `NovuNotificationService` | Novu adapter (`@novu/js`) |

## Env config

```ts
import { Inbox, notificationConfigFromEnv } from "@openg2p/notification";

<Inbox
  config={{
    ...notificationConfigFromEnv(process.env),
    subscriberId: user.preferred_username,
  }}
/>
```

| Variable | Maps to |
|---|---|
| `NOTIFICATION_PROVIDER` | `provider` (required, e.g. `novu`) |
| `NOTIFICATION_APPLICATION_IDENTIFIER` | `applicationIdentifier` |
| `NOTIFICATION_BACKEND_URL` | `backendUrl` |
| `NOTIFICATION_WEBSOCKET_URL` | `socketUrl` |

`subscriberId` is the current user and is not read from env. Do not render `Inbox` until `provider`, `applicationIdentifier`, and `subscriberId` are all set.

## Usage

```tsx
"use client";

import { Inbox } from "@openg2p/notification";

<Inbox
  config={{
    provider: "novu",
    subscriberId,
    applicationIdentifier,
    backendUrl,
    socketUrl,
  }}
  localization={{
    notifications: t("notifications"),
    empty: t("no_notifications"),
  }}
/>
```

Peer dependencies: `react` and `react-dom`. The inbox uses Tailwind utility classes, so the host app must generate them (for Next.js, add `transpilePackages: ["@openg2p/notification"]`).

To swap providers later, implement `NotificationService` and call `NotificationFactory.register("name", Implementation)`.

## License

MPL-2.0
