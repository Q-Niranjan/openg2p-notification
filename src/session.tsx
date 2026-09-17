"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { NotificationFactory } from "./core/factory";
import type { NotificationService } from "./core/service";
import type { Notification, NotificationFilter } from "./core/types";
import type { NotificationCopy, NotificationInboxProps } from "./components/types";
import { errorMessage, mergeCopy } from "./utils";
import "./providers";

const PAGE_SIZE = 20;

export interface InboxSessionValue {
  notifications: Notification[];
  unreadCount: number;
  readCount: number;
  archivedCount: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  copy: NotificationCopy;
  filter: NotificationFilter;
  setFilter: (filter: NotificationFilter) => void;
  selectedIds: string[];
  allSelected: boolean;
  toggleSelected: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (ids: string[]) => Promise<void>;
  archive: (ids: string[]) => Promise<void>;
  unarchive: (ids: string[]) => Promise<void>;
  openNotification: (notification: Notification) => Promise<void>;
}

const InboxSessionContext = createContext<InboxSessionValue | null>(null);

export function useInboxSession(): InboxSessionValue {
  const ctx = useContext(InboxSessionContext);
  if (!ctx) {
    throw new Error(
      "[@openg2p/notification] Bell must be rendered inside Inbox."
    );
  }
  return ctx;
}

function connectionKey(config: {
  subscriberId?: string;
  applicationIdentifier?: string;
  subscriberHash?: string;
  backendUrl?: string;
  socketUrl?: string;
  contextHash?: string;
}): string {
  return [
    config.subscriberId ?? "",
    config.applicationIdentifier ?? "",
    config.subscriberHash ?? "",
    config.backendUrl ?? "",
    config.socketUrl ?? "",
    config.contextHash ?? "",
  ].join("|");
}

export function InboxSessionProvider({
  config,
  open: openProp,
  localization,
  children,
}: NotificationInboxProps & { children: ReactNode }) {
  const merged = {
    subscriberId: config.subscriberId,
    applicationIdentifier: config.applicationIdentifier,
    subscriberHash: config.subscriberHash,
    backendUrl: config.backendUrl,
    socketUrl: config.socketUrl,
    context: config.context,
    contextHash: config.contextHash,
  };

  const clientKey = connectionKey(merged);
  const mergedRef = useRef(merged);
  mergedRef.current = merged;
  const [client, setClient] = useState<NotificationService | null>(null);
  const copy = useMemo(() => mergeCopy(localization), [localization]);

  const [notifications, setNotifications] = useState<Notification[]>(
    []
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [readCount, setReadCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilterState] = useState<NotificationFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const unreadCountRef = useRef(0);
  unreadCountRef.current = unreadCount;

  const controlled = openProp !== undefined;
  const open = controlled ? Boolean(openProp) : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setUncontrolledOpen(next);
    },
    [controlled]
  );

  const toggle = useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

  const setFilter = useCallback((next: NotificationFilter) => {
    setFilterState(next);
    setSelectedIds([]);
  }, []);

  const refreshCounts = useCallback(async () => {
    if (!client) return;
    const [unread, read, archived] = await Promise.all([
      client.unreadCount(),
      client.readCount(),
      client.archivedCount(),
    ]);
    setUnreadCount(unread);
    setReadCount(read);
    setArchivedCount(archived);
  }, [client]);

  const refresh = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      const [list] = await Promise.all([
        client.list({ limit: PAGE_SIZE, filter }),
        refreshCounts(),
      ]);
      setNotifications(list.notifications);
      setHasMore(list.hasMore);
      setSelectedIds((ids) =>
        ids.filter((id) => list.notifications.some((item) => item.id === id))
      );
    } catch (err) {
      setError(errorMessage(err, copy.error));
    } finally {
      setLoading(false);
    }
  }, [client, copy.error, filter, refreshCounts]);

  const loadMore = useCallback(async () => {
    if (!client || !hasMore || loadingMore) return;
    const after =
      filter === "all"
        ? [...notifications].reverse().find((item) => !item.archived)?.id
        : notifications[notifications.length - 1]?.id;
    const archivedAfter =
      filter === "all"
        ? [...notifications].reverse().find((item) => item.archived)?.id
        : undefined;
    if (!after && !archivedAfter) return;
    setLoadingMore(true);
    try {
      const list = await client.list({
        limit: PAGE_SIZE,
        after,
        archivedAfter,
        filter,
      });
      setNotifications((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const next = [
          ...prev,
          ...list.notifications.filter((item) => !seen.has(item.id)),
        ];
        if (filter !== "all") return next;
        return next.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
      setHasMore(list.hasMore);
    } catch (err) {
      setError(errorMessage(err, copy.error));
    } finally {
      setLoadingMore(false);
    }
  }, [client, copy.error, filter, hasMore, loadingMore, notifications]);

  const runOnIds = useCallback(
    async (
      ids: string[],
      action: (id: string) => Promise<void>,
      update: (prev: Notification[]) => Notification[]
    ) => {
      if (!client || ids.length === 0) return;
      setNotifications(update);
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      try {
        await Promise.all(ids.map(action));
        await refreshCounts();
      } catch (err) {
        setError(errorMessage(err, copy.error));
        await refresh();
      }
    },
    [client, copy.error, refresh, refreshCounts]
  );

  const markRead = useCallback(
    async (ids: string[]) => {
      if (!client) return;
      await runOnIds(ids, (id) => client.markRead(id), (prev) =>
        filter === "unread"
          ? prev.filter((item) => !ids.includes(item.id))
          : prev.map((item) =>
              ids.includes(item.id) ? { ...item, read: true } : item
            )
      );
    },
    [client, filter, runOnIds]
  );

  const archive = useCallback(
    async (ids: string[]) => {
      if (!client) return;
      await runOnIds(ids, (id) => client.archive(id), (prev) =>
        filter === "all"
          ? prev.map((item) =>
              ids.includes(item.id) ? { ...item, archived: true } : item
            )
          : prev.filter((item) => !ids.includes(item.id))
      );
    },
    [client, filter, runOnIds]
  );

  const unarchive = useCallback(
    async (ids: string[]) => {
      if (!client) return;
      await runOnIds(ids, (id) => client.unarchive(id), (prev) =>
        filter === "archived"
          ? prev.filter((item) => !ids.includes(item.id))
          : prev.map((item) =>
              ids.includes(item.id) ? { ...item, archived: false } : item
            )
      );
    },
    [client, filter, runOnIds]
  );

  const openNotification = useCallback(
    async (notification: Notification) => {
      if (!notification.read) await markRead([notification.id]);
      if (notification.url && typeof window !== "undefined") {
        window.location.assign(notification.url);
      }
    },
    [markRead]
  );

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(notifications.map((item) => item.id));
  }, [notifications]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const allSelected =
    notifications.length > 0 && selectedIds.length === notifications.length;

  useEffect(() => {
    const next = NotificationFactory.create(config.provider, mergedRef.current);
    setClient(next);
    return () => {
      next.disconnect();
    };
  }, [config.provider, clientKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!client) return;

    const mergeLatest = async (): Promise<number> => {
      try {
        const listFilter = filter === "all" ? "unread" : filter;
        const list = await client.list({ limit: PAGE_SIZE, filter: listFilter });
        let added = 0;
        setNotifications((prev) => {
          const incomingById = new Map(
            list.notifications.map((item) => [item.id, item])
          );
          const prevIds = new Set(prev.map((item) => item.id));
          const newItems = list.notifications.filter(
            (item) => item.id && !prevIds.has(item.id)
          );
          added = newItems.length;
          if (newItems.length === 0 && incomingById.size === 0) return prev;
          const updated = prev.map((item) => incomingById.get(item.id) ?? item);
          const next = [...newItems, ...updated];
          if (filter !== "all") return next;
          return next.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        if (filter !== "all") setHasMore(list.hasMore);
        return added;
      } catch {
        return 0;
      }
    };

    const offReceived = client.onReceived((notification) => {
      if (filter === "archived" || filter === "read") return;
      setNotifications((prev) => {
        if (!notification.id || prev.some((item) => item.id === notification.id)) {
          return prev;
        }
        return [notification, ...prev];
      });
    });
    let cancelled = false;
    let retryTimer: ReturnType<typeof window.setTimeout> | undefined;
    const offCount = client.onUnreadCount((count) => {
      const increased = count > unreadCountRef.current;
      setUnreadCount(count);
      void Promise.all([
        client.readCount().then(setReadCount),
        client.archivedCount().then(setArchivedCount),
      ]).catch(() => undefined);

      if (!increased || filter === "archived" || filter === "read") return;

      void mergeLatest().then((added) => {
        if (cancelled || added > 0) return;
        retryTimer = window.setTimeout(() => {
          if (!cancelled) void mergeLatest();
        }, 300);
      });
    });
    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      offReceived();
      offCount();
    };
  }, [client, filter]);

  const value = useMemo<InboxSessionValue>(
    () => ({
      notifications,
      unreadCount,
      readCount,
      archivedCount,
      loading,
      loadingMore,
      hasMore,
      error,
      copy,
      filter,
      setFilter,
      selectedIds,
      allSelected,
      toggleSelected,
      selectAll,
      clearSelection,
      open,
      setOpen,
      toggle,
      refresh,
      loadMore,
      markRead,
      archive,
      unarchive,
      openNotification,
    }),
    [
      allSelected,
      archive,
      unarchive,
      clearSelection,
      copy,
      error,
      filter,
      hasMore,
      loadMore,
      loading,
      loadingMore,
      markRead,
      notifications,
      open,
      openNotification,
      refresh,
      selectAll,
      selectedIds,
      setFilter,
      setOpen,
      toggle,
      toggleSelected,
      unreadCount,
      readCount,
      archivedCount,
    ]
  );

  return (
    <InboxSessionContext.Provider value={value}>
      {children}
    </InboxSessionContext.Provider>
  );
}
