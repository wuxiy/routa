"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaces, useCodebases, type WorkspaceData } from "@/client/hooks/use-workspaces";
import { desktopAwareFetch } from "@/client/utils/diagnostics";
import { DesktopAppShell } from "@/client/components/desktop-app-shell";
import { WorkspaceSwitcher } from "@/client/components/workspace-switcher";
import { WorkspaceSettingsTab } from "../workspace-settings-tab";
import { useTranslation } from "@/i18n";

function getDefaultWorktreeRoot(workspaceId: string): string {
  if (typeof window === "undefined") return "";
  const home = process.env.HOME ?? "";
  if (!home) return "";
  return `${home}/.routa/workspace/${workspaceId}`;
}

interface WorkspaceSettingsPageClientProps {
  workspaceId: string;
}

export function WorkspaceSettingsPageClient({ workspaceId }: WorkspaceSettingsPageClientProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const workspacesHook = useWorkspaces();
  const { codebases, fetchCodebases } = useCodebases(workspaceId);

  const effectiveWorkspaceId =
    workspaceId === "__placeholder__" && typeof window !== "undefined"
      ? (window.location.pathname.match(/^\/workspace\/([^/]+)/)?.[1] ?? workspaceId)
      : workspaceId;

  const [worktreeRootDraft, setWorktreeRootDraft] = useState("");
  const [worktreeRootState, setWorktreeRootState] = useState<{
    saving: boolean;
    message: string | null;
    error: string | null;
  }>({ saving: false, message: null, error: null });

  const defaultWorktreeRootHint = typeof window !== "undefined"
    ? getDefaultWorktreeRoot(effectiveWorkspaceId)
    : "";

  const workspace = workspacesHook.workspaces.find((w) => w.id === effectiveWorkspaceId);
  const activeWorkspaceTitle = workspace?.title ?? effectiveWorkspaceId;

  useEffect(() => {
    if (!workspace) return;
    const currentRoot = workspace.metadata?.worktreeRoot ?? "";
    setWorktreeRootDraft(currentRoot);
  }, [workspace]);

  const displayedWorktreeRoot = worktreeRootDraft.trim() || defaultWorktreeRootHint;

  const handleSaveWorktreeRoot = useCallback(async () => {
    setWorktreeRootState({ saving: true, message: null, error: null });
    try {
      const res = await desktopAwareFetch(`/api/workspaces/${effectiveWorkspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: { worktreeRoot: worktreeRootDraft } }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? t.errors.saveFailed);
      }
      setWorktreeRootState({ saving: false, message: t.workspace.worktreeRootSaved, error: null });
      await workspacesHook.fetchWorkspaces();
    } catch (err) {
      setWorktreeRootState({
        saving: false,
        message: null,
        error: err instanceof Error ? err.message : t.errors.saveFailed,
      });
    }
  }, [effectiveWorkspaceId, worktreeRootDraft, workspacesHook, t]);

  const handleWorkspaceSelect = useCallback((nextWorkspaceId: string) => {
    router.push(`/workspace/${nextWorkspaceId}/kanban`);
  }, [router]);

  const handleWorkspaceCreate = useCallback(async (title: string) => {
    const result = await workspacesHook.createWorkspace(title);
    if (result) {
      router.push(`/workspace/${result.id}/kanban`);
    }
  }, [router, workspacesHook]);

  const handleWorkspaceRename = useCallback(async (id: string, title: string): Promise<boolean> => {
    return workspacesHook.renameWorkspace(id, title);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspacesHook.renameWorkspace]);

  const handleWorkspaceDeleted = useCallback((remaining: WorkspaceData[]) => {
    if (remaining.length > 0) {
      router.push(`/workspace/${remaining[0].id}/kanban`);
    } else {
      router.push("/");
    }
  }, [router]);

  return (
    <DesktopAppShell
      workspaceId={effectiveWorkspaceId}
      workspaceTitle={activeWorkspaceTitle}
      workspaceSwitcher={(
        <WorkspaceSwitcher
          workspaces={workspacesHook.workspaces}
          activeWorkspaceId={effectiveWorkspaceId}
          activeWorkspaceTitle={activeWorkspaceTitle}
          onSelect={handleWorkspaceSelect}
          onCreate={handleWorkspaceCreate}
          onRename={handleWorkspaceRename}
          loading={workspacesHook.loading}
          compact
          desktop
        />
      )}
    >
      <div className="h-full overflow-y-auto p-6">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {t.workspace.settings}
        </h1>
        <WorkspaceSettingsTab
          workspaceId={effectiveWorkspaceId}
          codebases={codebases.map((cb) => ({
            id: cb.id,
            label: cb.label,
            repoPath: cb.repoPath,
            isDefault: cb.isDefault,
          }))}
          fetchCodebases={fetchCodebases}
          worktreeRootDraft={worktreeRootDraft}
          setWorktreeRootDraft={setWorktreeRootDraft}
          worktreeRootState={worktreeRootState}
          displayedWorktreeRoot={displayedWorktreeRoot}
          defaultWorktreeRootHint={defaultWorktreeRootHint}
          onSaveWorktreeRoot={handleSaveWorktreeRoot}
          workspaces={workspacesHook.workspaces}
          activeWorkspaceId={effectiveWorkspaceId}
          onDeleteWorkspace={workspacesHook.deleteWorkspace}
          onWorkspaceDeleted={handleWorkspaceDeleted}
        />
      </div>
    </DesktopAppShell>
  );
}
