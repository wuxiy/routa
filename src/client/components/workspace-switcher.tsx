"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkspaceData } from "../hooks/use-workspaces";
import { useTranslation } from "@/i18n";
import { normalizeWorkspaceQueryId } from "../utils/workspace-id";
import { Check, ChevronDown, Folder, Pencil, Plus, Search, X } from "lucide-react";

const DESKTOP_LAST_WORKSPACE_ID_STORAGE_KEY = "routa.desktop.last-workspace-id";

function hasWorkspaceStorageAccess(): boolean {
  return (
    typeof window !== "undefined"
    && window.localStorage != null
    && typeof window.localStorage.getItem === "function"
    && typeof window.localStorage.setItem === "function"
  );
}

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceData[];
  activeWorkspaceId: string | null;
  activeWorkspaceTitle?: string;
  onSelect: (workspaceId: string) => void;
  onCreate?: (title: string) => Promise<void> | void;
  onRename?: (id: string, title: string) => Promise<boolean>;
  loading?: boolean;
  compact?: boolean;
  /** Use desktop/VS Code style theme */
  desktop?: boolean;
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  activeWorkspaceTitle,
  onSelect,
  onCreate,
  onRename,
  loading,
  compact,
  desktop,
}: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const active = workspaces.find((w) => w.id === activeWorkspaceId);
  const visibleTitle = active?.title ?? activeWorkspaceTitle;

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setCreating(false);
    setSearchQuery("");
    setRenamingId(null);
    setRenamingTitle("");
    setRenameError(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [closeDropdown, open]);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDropdown();
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [closeDropdown, open]);

  useEffect(() => {
    if (!hasWorkspaceStorageAccess()) {
      return;
    }
    const normalizedWorkspaceId = normalizeWorkspaceQueryId(activeWorkspaceId);
    try {
      if (normalizedWorkspaceId) {
        window.localStorage.setItem(DESKTOP_LAST_WORKSPACE_ID_STORAGE_KEY, normalizedWorkspaceId);
      } else {
        window.localStorage.removeItem(DESKTOP_LAST_WORKSPACE_ID_STORAGE_KEY);
      }
    } catch {
      // localStorage may throw in restricted environments (quota, blocked storage)
    }
  }, [activeWorkspaceId]);

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title || !onCreate) return;
    await onCreate(title);
    setNewTitle("");
    closeDropdown();
  };

  const handleRename = async (id: string) => {
    const title = renamingTitle.trim();
    if (!title || !onRename) return;
    setRenameError(null);
    const ok = await onRename(id, title);
    if (ok) {
      setRenamingId(null);
      setRenamingTitle("");
    } else {
      setRenameError(t.workspace.renameFailed);
    }
  };

  const startRenaming = (id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenamingTitle(currentTitle);
    setRenameError(null);
  };

  const cancelRenaming = () => {
    setRenamingId(null);
    setRenamingTitle("");
    setRenameError(null);
  };

  const filteredWorkspaces = searchQuery
    ? workspaces.filter((ws) => ws.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : workspaces;

  const isDesktopTheme = desktop || compact;
  const triggerCls = isDesktopTheme
    ? "flex items-center gap-1.5 rounded-md border border-desktop-border bg-desktop-bg-secondary px-2.5 py-1 text-[11px] text-desktop-text-primary transition-all hover:bg-desktop-bg-active/80"
    : "inline-flex w-full max-w-[220px] items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left text-sm text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-[#1e2130] dark:text-slate-300 dark:hover:bg-slate-800";
  const triggerIconSize = isDesktopTheme ? "w-3 h-3" : "w-3.5 h-3.5";
  const chevronCls = isDesktopTheme
    ? `w-2.5 h-2.5 text-desktop-text-secondary transition-transform ${open ? "rotate-180" : ""}`
    : `w-3 h-3 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`;

  const dropdownBg = isDesktopTheme
    ? "bg-desktop-bg-secondary border-desktop-border text-desktop-text-primary"
    : "bg-white dark:bg-[#1e2130] border-slate-200 dark:border-slate-700";
  const panelText = isDesktopTheme ? "text-desktop-text-primary" : "text-slate-700 dark:text-slate-300";
  const activeItemCls = isDesktopTheme
    ? "bg-desktop-bg-active text-desktop-accent"
    : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300";
  const listItemBase = isDesktopTheme
    ? "flex items-center gap-2 w-full px-2.5 py-1.5 text-[11px] rounded-md"
    : "flex items-center gap-2 text-left w-full px-2.5 py-2 text-xs";
  const footerBorder = isDesktopTheme ? "border-desktop-border" : "border-slate-100 dark:border-slate-800";
  const footerText = isDesktopTheme ? "text-desktop-text-secondary" : "text-slate-400";
  const rowIcon = isDesktopTheme ? "w-3 h-3" : "w-3.5 h-3.5";
  const rowActiveIcon = isDesktopTheme ? "w-3 h-3 text-desktop-accent" : "w-3 h-3 text-blue-500";
  const footerBtn = isDesktopTheme
    ? "rounded bg-desktop-bg-secondary px-2 py-1.5 text-[11px] text-desktop-accent hover:bg-desktop-bg-active/80"
    : "rounded border border-blue-200/70 bg-blue-50 px-2 py-1.5 text-xs text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-900/20 dark:text-blue-300";
  const createInputCls = isDesktopTheme
    ? "h-7 border border-desktop-border bg-desktop-bg-primary px-2 text-[11px] text-desktop-text-primary placeholder:text-desktop-text-secondary focus:border-desktop-accent"
    : "h-7 border border-slate-300 bg-white px-2 text-xs text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-500";
  const createBtnCls = isDesktopTheme
    ? "rounded bg-desktop-accent px-2 py-1 text-[11px] font-medium text-desktop-accent-text hover:bg-desktop-accent-strong"
    : "rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700";
  const searchInputCls = isDesktopTheme
    ? "border-desktop-border text-[11px] bg-desktop-bg-primary text-desktop-text-primary placeholder:text-desktop-text-secondary focus:border-desktop-accent"
    : "border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

  return (
    <div className="relative" ref={dropdownRef} data-testid="desktop-workspace-switcher">
      <button
        type="button"
        onClick={() => {
          if (open) {
            closeDropdown();
            return;
          }
          setOpen(true);
        }}
        className={triggerCls}
        title={visibleTitle ?? t.workspace.selectWorkspace}
      >
        <Folder className={triggerIconSize} strokeWidth={2} />
        <span className="min-w-0 flex-1 truncate">
          {loading ? "..." : (visibleTitle ?? t.workspace.select)}
        </span>
        <ChevronDown className={chevronCls} strokeWidth={2} />
      </button>

      {open && (
        <div
          className={`absolute top-full left-0 z-50 mt-1 min-w-[14rem] max-w-[18rem] border shadow-xl ${dropdownBg} rounded-lg ${footerBorder}`}
        >
          <div className="border-b border-current/20 p-1.5">
            <div className="flex items-center gap-1.5 rounded-md border border-current/20 px-2 py-1">
              <Search className={isDesktopTheme ? "w-3 h-3" : "w-3.5 h-3.5"} strokeWidth={2} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchQuery("");
                  }
                }}
                aria-label={t.common.search}
                placeholder={t.common.search}
                className={`h-7 w-full rounded border bg-transparent outline-none ${searchInputCls} placeholder:truncate`}
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto px-1 py-1">
            {filteredWorkspaces.length === 0 && (
              <div className={`px-3 py-2 text-center text-[11px] ${footerText}`}>
                {t.workspace.noWorkspacesYet}
              </div>
            )}
            {filteredWorkspaces.map((ws) => (
              <div key={ws.id} className="group relative">
                {renamingId === ws.id ? (
                  <div className={`${listItemBase} gap-1`}>
                    <input
                      type="text"
                      value={renamingTitle}
                      onChange={(e) => {
                        setRenamingTitle(e.target.value);
                        setRenameError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleRename(ws.id);
                        if (e.key === "Escape") cancelRenaming();
                      }}
                      placeholder={t.workspace.workspaceName}
                      className={`flex-1 rounded border px-2 py-0.5 outline-none ${createInputCls}`}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleRename(ws.id);
                      }}
                      disabled={!renamingTitle.trim()}
                      className="shrink-0 rounded p-0.5 text-desktop-accent hover:bg-desktop-bg-active/80 disabled:opacity-40"
                      title={t.common.confirm}
                    >
                      <Check className="w-3 h-3" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelRenaming();
                      }}
                      className="shrink-0 rounded p-0.5 text-desktop-text-secondary hover:bg-desktop-bg-active/80"
                      title={t.common.cancel}
                    >
                      <X className="w-3 h-3" strokeWidth={2} />
                    </button>
                    {renameError && (
                      <span className="absolute -bottom-4 left-2 text-[10px] text-rose-500 whitespace-nowrap">
                        {renameError}
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(ws.id);
                        closeDropdown();
                      }}
                      className={`${listItemBase} ${
                        ws.id === activeWorkspaceId
                          ? activeItemCls
                          : `${panelText} hover:bg-current/10`
                      }`}
                    >
                      <Folder className={rowIcon} strokeWidth={2} />
                      <span className="min-w-0 flex-1 truncate">{ws.title}</span>
                      {ws.id === activeWorkspaceId ? (
                        <Check className={rowActiveIcon} fill="currentColor" />
                      ) : null}
                    </button>
                    {onRename && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRenaming(ws.id, ws.title);
                        }}
                        className={`absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                          isDesktopTheme
                            ? "text-desktop-text-secondary hover:text-desktop-accent hover:bg-desktop-bg-active/80"
                            : "text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        }`}
                        title={t.workspace.renameWorkspace}
                      >
                        <Pencil className={isDesktopTheme ? "w-2.5 h-2.5" : "w-3 h-3"} strokeWidth={2} />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          <div className={`border-t ${footerBorder} p-1.5`}>
            {creating ? (
              <div className="flex items-center gap-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setCreating(false);
                  }}
                  placeholder={t.workspace.workspaceName}
                  className={`flex-1 rounded border ${createInputCls} focus:outline-none`}
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  className={createBtnCls}
                >
                  {t.common.create}
                </button>
              </div>
            ) : onCreate && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className={`w-full rounded flex items-center justify-center gap-1.5 ${footerBtn}`}
              >
                <Plus className={rowIcon} strokeWidth={2} />
                {t.workspace.newWorkspace}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
