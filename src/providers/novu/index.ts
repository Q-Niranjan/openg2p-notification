import { Novu } from "@novu/js";
import type {
  Notification,
  NotificationConnection,
  NotificationFilter,
  NotificationListOptions,
  NotificationListResult,
  NotificationPerson,
} from "../../core/types";
import type { NotificationService } from "../../core/service";
import {throwIfError } from "../../utils";
import type {
  NovuListQuery,
  NovuNotification,
  NovuPayload,
  NovuPayloadAction,
  NovuPayloadNotification,
  NovuPerson,
} from "./types";

function toPerson(value: unknown): NotificationPerson | undefined {
  if (!value || typeof value !== "object") return undefined;

  const person = value as NovuPerson;
  const id = person.id ?? person.subscriberId;
  if (!id && !person.firstName && !person.lastName && !person.avatar) {
    return undefined;
  }

  return {
    id: id ?? "",
    firstName: person.firstName,
    lastName: person.lastName,
    avatar: person.avatar,
  };
}

function asPayloadNotification(value: unknown): NovuPayloadNotification | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as NovuPayloadNotification;
  if (item.title == null && item.message == null && item.iconUrl == null) return undefined;
  return item;
}

function asPayloadAction(value: unknown): NovuPayloadAction | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as NovuPayloadAction;
  if (item.label == null && item.url == null) return undefined;
  return item;
}

function resolveActionLabel(label?: string): string | undefined {
  if (!label) return undefined;
  const normalized = label.trim().toLowerCase();
  if (normalized === "primary" || normalized === "secondary") return undefined;
  return label.trim();
}

/**
 * Parses `_title:...`, `_message:...`, and `_icon_url:...`
 * markers from Novu body templates.
 */
function parseBodyFields(raw: string): {
  title?: string;
  message?: string;
  iconUrl?: string;
} {
  const text = raw.trim();

  if (!text) return {};

  const titleMatch = text.match(
    /^_title:\s*(.*?)$/im
  );

  const messageMatch = text.match(
    /^_message:\s*(.*?)$/im
  );

  const iconMatch = text.match(
    /^_icon_url:\s*(.*?)$/im
  );

  return {
    title: titleMatch?.[1]?.trim() || undefined,
    message: messageMatch?.[1]?.trim() || undefined,
    iconUrl: iconMatch?.[1]?.trim() || undefined,
  };
}

export function toNotification(n: NovuNotification): Notification {
  const data = (n.data ?? {}) as NovuPayload & Record<string, unknown>;
  const payloadNotification = asPayloadNotification(data.notification);
  const payloadAction = asPayloadAction(data.action);
  const rawBody = n.body ?? "";
  const bodyFields = parseBodyFields(rawBody);

  const actor =
    toPerson(data.actor) ??
    toPerson(n.actor) ??
    toPerson(data.sender);
  const subscriber = toPerson(data.subscriber) ?? toPerson(n.to);

  return {
    id: n.id,
    type: n.workflow?.identifier ?? n.channelType ?? "in_app",
    title: bodyFields.title ??
      payloadNotification?.title ?? n.subject ?? "",
    body: bodyFields.message ?? payloadNotification?.message ?? rawBody,
    data,
    createdAt: n.createdAt,
    read: n.isRead,
    archived: n.isArchived,
    url:
      payloadAction?.url ??
      n.redirect?.url ??
      n.primaryAction?.redirect?.url,
    actionLabel: resolveActionLabel(
      payloadAction?.label ?? n.primaryAction?.label
    ),
    actor,
    subscriber,
    iconUrl: bodyFields.iconUrl ?? payloadNotification?.iconUrl,
    avatarUrl: subscriber?.avatar ?? actor?.avatar ?? n.avatar,
  };
}

function mergeByCreatedAt(lists: NovuNotification[][]): NovuNotification[] {
  const seen = new Set<string>();
  const merged: NovuNotification[] = [];

  for (const list of lists) {
    for (const item of list) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  }

  return merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function listQuery(filter: NotificationFilter = "all"): NovuListQuery {
  if (filter === "archived") return { archived: true };
  if (filter === "unread") return { archived: false, read: false };
  if (filter === "read") return { archived: false, read: true };
  return {};
}

function toNovuContext(
  context?: Record<string, string | number | boolean>
): Record<string, string> | undefined {
  if (!context) return undefined;
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, String(value)])
  );
}

export class NovuNotificationService implements NotificationService {
  private novu: Novu;

  constructor(connection: NotificationConnection) {
    if (!connection.subscriberId) {
      throw new Error(
        "[@openg2p/notification] Novu requires subscriberId."
      );
    }

    if (!connection.applicationIdentifier) {
      throw new Error(
        "[@openg2p/notification] Novu requires applicationIdentifier."
      );
    }

    this.novu = new Novu({
      applicationIdentifier: connection.applicationIdentifier,
      subscriber: connection.subscriberId,
      subscriberHash: connection.subscriberHash,
      apiUrl: connection.backendUrl,
      backendUrl: connection.backendUrl,
      socketUrl: connection.socketUrl,
      context: toNovuContext(connection.context),
      contextHash: connection.contextHash,
    });
  }

  async list(
    options: NotificationListOptions = {}
  ): Promise<NotificationListResult> {
    const limit = options.limit ?? 20;
    const filter = options.filter ?? "all";

    if (filter === "all") {
      const [active, archived] = await Promise.all([
        this.novu.notifications.list({
          limit,
          after: options.after,
          archived: false,
        }),
        this.novu.notifications.list({
          limit,
          after: options.archivedAfter,
          archived: true,
        }),
      ]);
      throwIfError(active.error, "list notifications");
      throwIfError(archived.error, "list archived notifications");
      return {
        notifications: mergeByCreatedAt([
          active.data?.notifications ?? [],
          archived.data?.notifications ?? [],
        ]).map(toNotification),
        hasMore: Boolean(active.data?.hasMore || archived.data?.hasMore),
      };
    }

    const { data, error } = await this.novu.notifications.list({
      limit,
      after: options.after,
      ...listQuery(filter),
    });
    throwIfError(error, "list notifications");
    return {
      notifications: (data?.notifications ?? []).map(toNotification),
      hasMore: Boolean(data?.hasMore),
    };
  }

  async unreadCount(): Promise<number> {
    const { data, error } = await this.novu.notifications.count({
      read: false,
      archived: false,
    });
    throwIfError(error, "load unread count");
    return data?.count ?? 0;
  }

  async readCount(): Promise<number> {
    const { data, error } = await this.novu.notifications.count({
      read: true,
      archived: false,
    });
    throwIfError(error, "load read count");
    return data?.count ?? 0;
  }

  async archivedCount(): Promise<number> {
    const { data, error } = await this.novu.notifications.count({
      archived: true,
    });
    throwIfError(error, "load archived count");
    return data?.count ?? 0;
  }

  async markRead(id: string): Promise<void> {
    const { error } = await this.novu.notifications.read({
      notificationId: id,
    });
    throwIfError(error, "mark as read");
  }

  async archive(id: string): Promise<void> {
    const { error } = await this.novu.notifications.archive({
      notificationId: id,
    });
    throwIfError(error, "archive notification");
  }

  async unarchive(id: string): Promise<void> {
    const { error } = await this.novu.notifications.unarchive({
      notificationId: id,
    });
    throwIfError(error, "unarchive notification");
  }

  onReceived(handler: (notification: Notification) => void): () => void {
    return this.novu.on("notifications.notification_received", ({ result }) => {
      handler(toNotification(result));
    });
  }

  onUnreadCount(handler: (count: number) => void): () => void {
    return this.novu.on("notifications.unread_count_changed", ({ result }) => {
      handler(result.total);
    });
  }

  disconnect(): void {
    void this.novu.socket.disconnect();
  }
}
