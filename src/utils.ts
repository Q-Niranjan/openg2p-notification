import type { NotificationPerson } from "./core/types";
import type { NotificationCopy } from "./components/types";

export const DEFAULT_COPY: NotificationCopy = {
  notifications: "Notifications",
  empty: "You're all caught up",
  loading: "Loading notifications…",
  error: "Couldn't load notifications",
  retry: "Retry",
  loadMore: "Load more",
  markAsRead: "Mark as read",
  markAllAsRead: "Mark all as read",
  archive: "Archive",
  unarchive: "Remove from archive",
  selectAll: "Select all",
  justNow: "Just now",
  filterAll: "All",
  filterUnread: "Unread",
  filterRead: "Read",
  filterArchived: "Archived",
  selected: "selected",
  viewDetails: "View details",
  showMore: "Show more",
  showLess: "Show less",
};

export function mergeCopy(
  localization?: Partial<NotificationCopy> | Record<string, string>
): NotificationCopy {
  return { ...DEFAULT_COPY, ...localization };
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (
    typeof error === "object" &&
    error &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

export function throwIfError(error: unknown, action: string): void {
  if (!error) return;
  throw new Error(
    `[@openg2p/notification] ${errorMessage(error, `Failed to ${action}`)}`
  );
}

export function formatRelativeTime(iso: string, justNow: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (mins < 1) return justNow;
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export function formatPersonName(
  person?: Pick<NotificationPerson, "firstName" | "lastName">
): string {
  return [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();
}



export function notificationConfigFromEnv(
  env: Record<string, string | undefined> = {}
) {
  const provider = env.NOTIFICATION_PROVIDER;
  if (!provider) {
    throw new Error(
      "[@openg2p/notification] NOTIFICATION_PROVIDER is required"
    );
  }

  return {
    provider,
    applicationIdentifier: env.NOTIFICATION_APPLICATION_IDENTIFIER,
    backendUrl: env.NOTIFICATION_BACKEND_URL,
    socketUrl: env.NOTIFICATION_WEBSOCKET_URL,
  };
}
