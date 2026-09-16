"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  AlertCircle,
  Bell as BellIcon,
  Check,
  ChevronDown,
  Inbox as InboxIcon,
  Loader2,
} from "lucide-react";
import { InboxSessionProvider, useInboxSession } from "../session";
import type { Notification, NotificationFilter } from "../core/types";
import type { NotificationBellProps, NotificationInboxProps } from "./types";
import { formatPersonName, formatRelativeTime } from "../utils";

const MESSAGE_COLLAPSE_AT = 140;

export function Bell({ className = "" }: NotificationBellProps) {
  const { unreadCount, open, toggle, copy } = useInboxSession();
  const hasUnread = unreadCount > 0;
  const label = hasUnread
    ? `${copy.notifications}, ${unreadCount} unread`
    : copy.notifications;
  const badge = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <button
      type="button"
      className={`relative inline-flex h-10 w-10 items-center justify-center text-neutral-600 transition-colors duration-150 hover:text-black focus-visible:outline-none ${className}`.trim()}
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={toggle}
    >
      <BellIcon size={19} strokeWidth={1.8} aria-hidden="true" />
      {hasUnread ? (
        <span
          className="absolute right-1 top-1 flex min-w-[17px] h-[17px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold leading-none tabular-nums text-white ring-2 ring-white"
          aria-hidden="true"
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export const NotificationBell = Bell;

function Avatar({
  url,
  name,
  accented,
}: {
  url?: string;
  name?: string;
  accented?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        width={38}
        height={38}
        className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-black/[0.06] sm:h-[38px] sm:w-[38px]"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-[38px] sm:w-[38px] ${
        accented ? "bg-indigo-50 text-indigo-500" : "bg-neutral-100 text-neutral-400"
      }`}
      aria-hidden="true"
      title={name}
    >
      <InboxIcon size={16} strokeWidth={1.8} />
    </span>
  );
}

function FilterTabs() {
  const { filter, setFilter, copy, unreadCount, readCount, archivedCount } =
    useInboxSession();
  const allCount = unreadCount + readCount + archivedCount;

  const options: Array<{ value: NotificationFilter; label: string; count: number }> = [
    { value: "all", label: copy.filterAll, count: allCount },
    { value: "unread", label: copy.filterUnread, count: unreadCount },
    { value: "archived", label: copy.filterArchived, count: archivedCount },
  ];

  return (
    <div
      className="mx-4 mb-3.5 grid grid-cols-3 gap-1 rounded-full bg-neutral-100 p-1 sm:mx-5 sm:mb-4"
      role="tablist"
    >
      {options.map((option) => {
        const selected = filter === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => setFilter(option.value)}
            className={`flex min-w-0 items-center justify-center gap-2 rounded-full px-2 py-1.5 text-[12.5px] font-medium transition-all duration-150 sm:px-3 sm:py-[7px] sm:text-[13px] ${
              selected
                ? "bg-white text-black shadow-[0_1px_3px_rgba(15,23,42,0.12)]"
                : "text-neutral-500 hover:text-black"
            }`}
          >
            <span className="truncate">{option.label}</span>
            <span
              className={`shrink-0 text-[12px] tabular-nums ${
                selected ? "text-indigo-500" : "text-neutral-400"
              }`}
            >
              {option.count > 99 ? "99+" : option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ExpandableMessage({
  text,
  showMore,
  showLess,
}: {
  text: string;
  showMore: string;
  showLess: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = text.length > MESSAGE_COLLAPSE_AT;

  return (
    <div className="mt-1">
      <p
        className={`m-0 text-[13px] leading-[1.55] text-neutral-500 sm:text-[13.5px] ${
          canCollapse && !expanded ? "line-clamp-2" : ""
        }`}
      >
        {text}
      </p>
      {canCollapse ? (
        <button
          type="button"
          className="mt-1 inline-flex items-center gap-0.5 text-[12.5px] font-medium text-neutral-400 hover:text-black"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
        >
          {expanded ? showLess : showMore}
          <ChevronDown
            size={13}
            strokeWidth={2.2}
            className={`transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      ) : null}
    </div>
  );
}

function NotificationRow({ notification }: { notification: Notification }) {
  const { copy, filter, openNotification, markRead, archive, unarchive } =
    useInboxSession();
  const isUnread = !notification.read;
  const isArchived = Boolean(notification.archived);
  const person = notification.subscriber ?? notification.actor;
  const personName = formatPersonName(person);
  const iconUrl = notification.iconUrl ?? person?.avatar ?? notification.avatarUrl;
  const heading = notification.title || personName;
  const showUnarchive = filter === "archived" || isArchived;
  const showMarkRead = !showUnarchive && isUnread;
  const showArchive = !showUnarchive;
  const highlight = isUnread && !isArchived;

  return (
    <div
      className={`group relative flex items-start gap-2.5 py-3 pl-3 pr-3 transition-colors duration-150 sm:gap-3 sm:py-3.5 sm:pl-4 sm:pr-4 ${
        highlight ? "bg-indigo-50/40 hover:bg-indigo-50/70" : "hover:bg-neutral-50"
      }`}
      role="listitem"
    >
      {highlight ? (
        <span
          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-indigo-500"
          aria-hidden="true"
        />
      ) : null}

      <Avatar url={iconUrl} name={personName || heading} accented={highlight} />

      <div className="min-w-0 flex-1">
        <button
          type="button"
          className="w-full text-left"
          onClick={() => void openNotification(notification)}
        >
          <div className="flex items-start gap-2 sm:gap-3">
            {heading ? (
              <span
                className={`min-w-0 flex-1 text-[14px] leading-snug sm:text-[14.5px] ${
                  isUnread ? "font-semibold text-black" : "font-medium text-neutral-800"
                }`}
              >
                {heading}
              </span>
            ) : (
              <span className="min-w-0 flex-1" />
            )}
            {notification.createdAt ? (
              <span className="shrink-0 pt-0.5 text-[11px] leading-none text-neutral-400 sm:text-[11.5px]">
                {formatRelativeTime(notification.createdAt, copy.justNow)}
              </span>
            ) : null}
          </div>
        </button>

        {notification.body ? (
          <ExpandableMessage
            text={notification.body}
            showMore={copy.showMore}
            showLess={copy.showLess}
          />
        ) : null}

        {notification.url ? (
          <button
            type="button"
            className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-medium text-indigo-600 hover:text-indigo-700"
            onClick={() => void openNotification(notification)}
          >
            {copy.viewDetails}
            <ArrowRight
              size={13}
              strokeWidth={2.2}
              className="transition-transform duration-150 group-hover:translate-x-0.5"
            />
          </button>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-center justify-start gap-0.5 pt-0.5">
        {showMarkRead ? (
          <button
            type="button"
            title={copy.markAsRead}
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-300 transition-colors duration-150 hover:bg-indigo-100 hover:text-indigo-600"
            onClick={(e) => {
              e.stopPropagation();
              void markRead([notification.id]);
            }}
          >
            <Check size={15} strokeWidth={2.2} />
          </button>
        ) : null}
        {showArchive ? (
          <button
            type="button"
            title={copy.archive}
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-300 transition-colors duration-150 hover:bg-neutral-100 hover:text-black"
            onClick={(e) => {
              e.stopPropagation();
              void archive([notification.id]);
            }}
          >
            <Archive size={15} strokeWidth={1.8} />
          </button>
        ) : null}
        {showUnarchive ? (
          <button
            type="button"
            title={copy.unarchive}
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-300 transition-colors duration-150 hover:bg-neutral-100 hover:text-black"
            onClick={(e) => {
              e.stopPropagation();
              void unarchive([notification.id]);
            }}
          >
            <ArchiveRestore size={15} strokeWidth={1.8} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function InboxPanel({ visible }: { visible: boolean }) {
  const {
    notifications,
    loading,
    loadingMore,
    hasMore,
    error,
    copy,
    filter,
    refresh,
    loadMore,
    markRead,
  } = useInboxSession();

  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

  return (
    <div
      className={`z-50 origin-top-right transition-all duration-150 ease-out max-sm:fixed max-sm:inset-x-2 max-sm:top-[4.75rem] max-sm:w-auto sm:absolute sm:right-0 sm:top-[calc(100%+10px)] sm:w-[min(420px,calc(100vw-16px))] ${
        visible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-1 scale-[0.98] opacity-0"
      }`}
      role="dialog"
      aria-label={copy.notifications}
    >
      <span
        className="pointer-events-none absolute -top-[5px] right-[15px] z-20 hidden h-2.5 w-2.5 rotate-45 rounded-[1.5px] border-l border-t border-black/[0.08] bg-white sm:block"
        aria-hidden="true"
      />
      <div className="flex max-h-[min(70dvh,calc(100dvh-5.5rem))] flex-col overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_20px_48px_-12px_rgba(15,23,42,0.22)] sm:max-h-none">
        <div className="bg-white pt-3 sm:pt-4">
          <div className="flex items-center justify-between gap-3 px-4 pb-3 sm:px-5 sm:pb-3.5">
            <h2 className="m-0 min-w-0 text-[16px] font-semibold tracking-tight text-black sm:text-[16.5px]">
              {copy.notifications}
            </h2>
            {filter !== "archived" && unreadIds.length > 0 ? (
              <button
                type="button"
                className="shrink-0 rounded-full px-2.5 py-1 text-[12.5px] font-medium text-neutral-400 transition-colors duration-150 hover:bg-neutral-100 hover:text-black"
                onClick={() => void markRead(unreadIds)}
              >
                {copy.markAllAsRead}
              </button>
            ) : null}
          </div>
          <FilterTabs />
        </div>

        <div className="relative min-h-0 flex-1 border-t border-neutral-100 sm:flex-none">
          <div
            className="h-full divide-y divide-neutral-100 overflow-y-auto pb-4 sm:h-auto sm:max-h-[min(420px,calc(100vh-160px))]"
            role="list"
            aria-busy={loading}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-2.5 py-14 text-center text-neutral-400">
                <Loader2 size={20} strokeWidth={2} className="animate-spin text-neutral-300" />
                <p className="m-0 text-[13.5px]">{copy.loading}</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-2.5 py-14 text-center">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <AlertCircle size={17} strokeWidth={1.9} />
                </span>
                <p className="m-0 text-[13.5px] text-neutral-500">{copy.error}</p>
                <button
                  type="button"
                  className="mt-1 rounded-full bg-neutral-900 px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-black"
                  onClick={() => void refresh()}
                >
                  {copy.retry}
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2.5 py-14 text-center">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-300">
                  <InboxIcon size={17} strokeWidth={1.7} />
                </span>
                <p className="m-0 text-[13.5px] text-neutral-400">{copy.empty}</p>
              </div>
            ) : (
              notifications.map((n) => <NotificationRow key={n.id} notification={n} />)
            )}
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-white to-transparent"
            aria-hidden="true"
          />
        </div>

        {hasMore && !loading ? (
          <div className="border-t border-neutral-100 py-2.5 text-center">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors duration-150 hover:bg-neutral-100 hover:text-black disabled:opacity-40"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? (
                <Loader2 size={13} strokeWidth={2.2} className="animate-spin" />
              ) : null}
              {copy.loadMore}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InboxShell({ children }: { children?: ReactNode }) {
  const { open, setOpen } = useInboxSession();
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const timeout = setTimeout(() => setMounted(false), 150);
    return () => clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);

  return (
    <div className="relative inline-flex overflow-visible" ref={rootRef}>
      {children ?? <Bell />}
      {mounted ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/20 sm:hidden"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <InboxPanel visible={visible} />
        </>
      ) : null}
    </div>
  );
}

export function Inbox(props: NotificationInboxProps) {
  const { children, ...sessionProps } = props;
  return (
    <InboxSessionProvider {...sessionProps}>
      <InboxShell>{children}</InboxShell>
    </InboxSessionProvider>
  );
}

export const NotificationInbox = Inbox;
