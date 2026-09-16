export type NotificationFilter = "all" | "unread" | "read" | "archived";

export type NotificationPerson = {
  id: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt: string;
  read: boolean;
  archived?: boolean;
  url?: string;
  actionLabel?: string;
  avatarUrl?: string;
  iconUrl?: string;
  actor?: NotificationPerson;
  subscriber?: NotificationPerson;
};

export type NotificationConnection = {
  subscriberId: string;
  applicationIdentifier?: string;
  subscriberHash?: string;
  backendUrl?: string;
  socketUrl?: string;
  context?: Record<string, string | number | boolean>;
  contextHash?: string;
};

export type NotificationListOptions = {
  limit?: number;
  after?: string;
  archivedAfter?: string;
  filter?: NotificationFilter;
};

export type NotificationListResult = {
  notifications: Notification[];
  hasMore: boolean;
};

export type NotificationConfig = NotificationConnection & {
  provider: string;
};
