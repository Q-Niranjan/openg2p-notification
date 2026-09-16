import type { NotificationConfig } from "../core/types";

export type NotificationCopy = {
  notifications: string;
  empty: string;
  loading: string;
  error: string;
  retry: string;
  loadMore: string;
  markAsRead: string;
  markAllAsRead: string;
  archive: string;
  unarchive: string;
  selectAll: string;
  justNow: string;
  filterAll: string;
  filterUnread: string;
  filterRead: string;
  filterArchived: string;
  selected: string;
  viewDetails: string;
  showMore: string;
  showLess: string;
};

export interface NotificationInboxProps {
  config: NotificationConfig;
  open?: boolean;
  localization?: Partial<NotificationCopy> | Record<string, string>;
  children?: import("react").ReactNode;
}

export interface NotificationBellProps {
  className?: string;
}
