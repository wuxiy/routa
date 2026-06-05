import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { desktopAwareFetchMock } = vi.hoisted(() => ({
  desktopAwareFetchMock: vi.fn(),
}));

vi.mock("../../utils/diagnostics", () => ({
  desktopAwareFetch: desktopAwareFetchMock,
}));

import { useCodebases, useWorkspaces } from "../use-workspaces";

function okJson(data: unknown) {
  return {
    ok: true,
    json: async () => data,
  } as Response;
}

describe("useWorkspaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads active workspaces on mount and toggles loading", async () => {
    desktopAwareFetchMock.mockResolvedValueOnce(okJson({
      workspaces: [
        { id: "ws-1", title: "Workspace One", status: "active", metadata: {}, createdAt: "", updatedAt: "" },
      ],
    }));

    const { result } = renderHook(() => useWorkspaces());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.workspaces).toHaveLength(1);
    });

    expect(desktopAwareFetchMock).toHaveBeenCalledWith("/api/workspaces?status=active");
  });

  it("creates and archives workspaces then refreshes the list", async () => {
    desktopAwareFetchMock
      .mockResolvedValueOnce(okJson({ workspaces: [] }))
      .mockResolvedValueOnce(okJson({
        workspace: { id: "ws-1", title: "Workspace One", status: "active", metadata: {}, createdAt: "", updatedAt: "" },
      }))
      .mockResolvedValueOnce(okJson({
        workspaces: [
          { id: "ws-1", title: "Workspace One", status: "active", metadata: {}, createdAt: "", updatedAt: "" },
        ],
      }))
      .mockResolvedValueOnce(okJson({ success: true }))
      .mockResolvedValueOnce(okJson({ workspaces: [] }));

    const { result } = renderHook(() => useWorkspaces());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      const workspace = await result.current.createWorkspace("Workspace One");
      expect(workspace?.id).toBe("ws-1");
    });

    expect(result.current.workspaces).toEqual([
      { id: "ws-1", title: "Workspace One", status: "active", metadata: {}, createdAt: "", updatedAt: "" },
    ]);

    await act(async () => {
      await result.current.archiveWorkspace("ws-1");
    });

    expect(result.current.workspaces).toEqual([]);
    expect(desktopAwareFetchMock).toHaveBeenCalledWith("/api/workspaces", expect.objectContaining({
      method: "POST",
    }));
    expect(desktopAwareFetchMock).toHaveBeenCalledWith("/api/workspaces/ws-1/archive", expect.objectContaining({
      method: "POST",
    }));
  });

  it("renames a workspace via PATCH and refreshes list", async () => {
    desktopAwareFetchMock
      .mockResolvedValueOnce(okJson({
        workspaces: [
          { id: "ws-1", title: "Old Name", status: "active", metadata: {}, createdAt: "", updatedAt: "" },
        ],
      }))
      .mockResolvedValueOnce(okJson({ success: true }))
      .mockResolvedValueOnce(okJson({
        workspaces: [
          { id: "ws-1", title: "New Name", status: "active", metadata: {}, createdAt: "", updatedAt: "" },
        ],
      }));

    const { result } = renderHook(() => useWorkspaces());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.workspaces[0].title).toBe("Old Name");

    const ok = await act(async () => result.current.renameWorkspace("ws-1", "New Name"));
    expect(ok).toBe(true);

    expect(desktopAwareFetchMock).toHaveBeenCalledWith(
      "/api/workspaces/ws-1",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Name" }),
      })
    );

    expect(result.current.workspaces[0].title).toBe("New Name");
  });

  it("returns false when rename fails", async () => {
    desktopAwareFetchMock
      .mockResolvedValueOnce(okJson({
        workspaces: [
          { id: "ws-1", title: "Old Name", status: "active", metadata: {}, createdAt: "", updatedAt: "" },
        ],
      }))
      .mockResolvedValueOnce({ ok: false });

    const { result } = renderHook(() => useWorkspaces());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const ok = await act(async () => result.current.renameWorkspace("ws-1", "New Name"));
    expect(ok).toBe(false);
    expect(result.current.workspaces[0].title).toBe("Old Name");
  });

  it("deletes a workspace via DELETE and refreshes list", async () => {
    desktopAwareFetchMock
      .mockResolvedValueOnce(okJson({
        workspaces: [
          { id: "ws-1", title: "Workspace One", status: "active", metadata: {}, createdAt: "", updatedAt: "" },
          { id: "ws-2", title: "Workspace Two", status: "active", metadata: {}, createdAt: "", updatedAt: "" },
        ],
      }))
      .mockResolvedValueOnce(okJson({ success: true }))
      .mockResolvedValueOnce(okJson({
        workspaces: [
          { id: "ws-2", title: "Workspace Two", status: "active", metadata: {}, createdAt: "", updatedAt: "" },
        ],
      }));

    const { result } = renderHook(() => useWorkspaces());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.workspaces).toHaveLength(2);
    });

    const ok = await act(async () => result.current.deleteWorkspace("ws-1"));
    expect(ok).toBe(true);

    expect(desktopAwareFetchMock).toHaveBeenCalledWith(
      "/api/workspaces/ws-1",
      expect.objectContaining({ method: "DELETE" })
    );

    expect(result.current.workspaces).toHaveLength(1);
    expect(result.current.workspaces[0].id).toBe("ws-2");
  });

  it("returns false when delete fails", async () => {
    desktopAwareFetchMock
      .mockResolvedValueOnce(okJson({
        workspaces: [
          { id: "ws-1", title: "Workspace One", status: "active", metadata: {}, createdAt: "", updatedAt: "" },
        ],
      }))
      .mockResolvedValueOnce({ ok: false });

    const { result } = renderHook(() => useWorkspaces());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const ok = await act(async () => result.current.deleteWorkspace("ws-1"));
    expect(ok).toBe(false);
    expect(result.current.workspaces).toHaveLength(1);
  });

  it("returns null when workspace creation fails", async () => {
    desktopAwareFetchMock
      .mockResolvedValueOnce(okJson({ workspaces: [] }))
      .mockResolvedValueOnce({ ok: false });

    const { result } = renderHook(() => useWorkspaces());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      const created = await result.current.createWorkspace("Broken");
      expect(created).toBeNull();
    });
  });
});

describe("useCodebases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips placeholder workspaces and loads codebases for real workspaces", async () => {
    desktopAwareFetchMock.mockResolvedValueOnce(okJson({
      codebases: [
        { id: "cb-1", workspaceId: "ws-1", repoPath: "/repo/main", isDefault: true, createdAt: "", updatedAt: "" },
      ],
    }));

    const placeholder = renderHook(() => useCodebases("__placeholder__"));
    await act(async () => {
      await placeholder.result.current.fetchCodebases();
    });
    expect(desktopAwareFetchMock).not.toHaveBeenCalled();

    const real = renderHook(() => useCodebases("ws-1"));

    await waitFor(() => {
      expect(real.result.current.codebases).toHaveLength(1);
    });

    expect(desktopAwareFetchMock).toHaveBeenCalledWith("/api/workspaces/ws-1/codebases");
  });
});
