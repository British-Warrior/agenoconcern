import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { Notification } from "@indomitable-unity/shared";
import { useNotifications, useMarkRead, useMarkAllRead } from "../../hooks/useNotifications.js";

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unreadCount = notifications.filter((n) => n.readAt === null).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Escape key closes dropdown and returns focus to bell button
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        bellRef.current?.focus();
      }
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Focus first focusable element in panel when dropdown opens
  useEffect(() => {
    if (open && panelRef.current) {
      const timer = setTimeout(() => {
        const first = panelRef.current?.querySelector<HTMLElement>(
          "button, a[href], [tabindex]:not([tabindex='-1'])"
        );
        first?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  function handleItemClick(n: Notification) {
    if (!n.readAt) {
      markRead.mutate(n.id);
    }
    if (n.url) {
      setOpen(false);
      navigate(n.url);
    }
  }

  function handleMarkAllRead(e: React.MouseEvent) {
    e.stopPropagation();
    markAllRead.mutate();
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        ref={bellRef}
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-neutral-600 hover:text-primary-800 transition-colors rounded-md hover:bg-stone-100"
      >
        {/* Bell SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[1.1rem] h-[1.1rem] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-0.5 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-stone-200 z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <span className="font-semibold text-sm text-neutral-800">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                role="menuitem"
                onClick={handleMarkAllRead}
                className="text-xs text-primary-700 hover:text-primary-900 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <ul className="overflow-y-auto max-h-80 divide-y divide-stone-50">
            {notifications.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-neutral-400">
                No notifications yet
              </li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.id}
                  className={[
                    n.readAt === null ? "border-l-2 border-primary-600" : "border-l-2 border-transparent",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleItemClick(n)}
                    className={[
                      "w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors",
                      n.url ? "cursor-pointer" : "cursor-default",
                    ].join(" ")}
                  >
                    <p className="text-sm font-semibold text-neutral-800 truncate">{n.title}</p>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">{n.body}</p>
                    <p className="text-xs text-neutral-400 mt-1">{relativeTime(n.createdAt)}</p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
