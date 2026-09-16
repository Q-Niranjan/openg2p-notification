import "./providers";

export * from "./core/types";
export * from "./core/service";
export * from "./core/factory";
export * from "./providers";
export type {
  NotificationCopy,
  NotificationInboxProps,
  NotificationBellProps,
} from "./components/types";

export type {
  NotificationService as INotificationService,
  NotificationService as NotificationClient,
} from "./core/service";

export { notificationConfigFromEnv } from "./utils";
export { useInboxSession } from "./session";
export { Inbox, NotificationInbox, Bell, NotificationBell } from "./components/Inbox";
