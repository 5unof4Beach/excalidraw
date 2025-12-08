import { Sidebar } from "@excalidraw/excalidraw";
import {
  messageCircleIcon,
  presentationIcon,
  PlusPromoIcon,
  searchIcon,
  LockedIcon,
} from "@excalidraw/excalidraw/components/icons";
import { useUIAppState } from "@excalidraw/excalidraw/context/ui-appState";
import { DefaultSidebarLeft } from "@excalidraw/excalidraw/components/DefaultSidebarLeft";

import { useTunnels } from "@excalidraw/excalidraw/context/tunnels";
import useBetterAuth from "excalidraw-app/hooks/useBetterAuth";

import { useEffect, useState } from "react";
import { GoogleDriveData } from "excalidraw-app/data/googleDriveManager";
import {
  currentFileId,
  googleDriveAuthAtom,
  listGoogleDriveFiles,
  loadFromGoogleDrive,
  saveToGoogleDrive,
  updateGoogleDriveFile,
  type GoogleDriveAuthManager,
} from "excalidraw-app/data/googleDrive";
import { au } from "excalidraw-app/build/assets/index-BVTvNk0c";
import { getAccessToken } from "excalidraw-app/lib/auth-client";

import { actionLoadSceneFromFile } from "@excalidraw/excalidraw/actions/actionExport";

import { DrawingsModalButton } from "./DrawingsModalButton";

import { useSetAtom, useAtomValue } from "excalidraw-app/app-jotai";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import type {
  AppClassProperties,
  UIAppState,
} from "@excalidraw/excalidraw/types";
import type { ActionManager } from "@excalidraw/excalidraw/actions/manager";

import "./AppSidebar.scss";

interface SidebarItem {
  id: string;
  name: string;
  modifiedTime: string;
  mimeType: string;
}

const UserProfile: React.FC<{ session: any; isPending: boolean }> = ({
  session,
  isPending,
}) => {
  if (isPending) {
    return null;
  }

  return (
    <div className="sidebar-user-profile">
      <img
        src={session?.user?.image || "/default_avatar.png"}
        alt={session?.user?.name || "Guest"}
        className="sidebar-user-avatar"
      />
      <span className="sidebar-user-name">
        {session?.user?.name || "Guest"}
      </span>
    </div>
  );
};

const QuickSearch: React.FC = () => (
  <div className="sidebar-quick-search">
    {searchIcon}
    <input type="text" placeholder="Quick search" />
    <span className="search-shortcut">⌘ P</span>
  </div>
);

const DashboardLink: React.FC = () => (
  <div className="sidebar-dashboard">
    <div className="dashboard-icon">📊</div>
    <span>Dashboard</span>
  </div>
);

const PrivateSection: React.FC<{
  drawings: SidebarItem[];
  author: string;
  authManager: GoogleDriveAuthManager;
  actionManager: ActionManager;
  updateFn: (drawingId: string) => void;
}> = ({ drawings, author, authManager, actionManager, updateFn }) => {
  const selectedDrawingId = useAtomValue(currentFileId);
  const setSelectedDrawingId = useSetAtom(currentFileId);

  const [isLoading, setIsLoading] = useState(false);

  const downloadDrawing = (id: string) => {
    if (selectedDrawingId === id) {
      return;
    }
    setIsLoading(true);
    setSelectedDrawingId(id);
    loadFromGoogleDrive(authManager, id).then((result) => {
      actionManager.executeAction(actionLoadSceneFromFile, "ui", result.data);
      setIsLoading(false);
    });
  };

  return (
    <div className="sidebar-section">
      <div className="section-header">
        <div className="section-title">
          {PlusPromoIcon}
          <span>Private</span>
        </div>
        <button className="section-action-btn">{PlusPromoIcon}</button>
      </div>

      <div className="section-items">
        {drawings.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${
              selectedDrawingId === item.id ? "selected" : ""
            }`}
            onClick={() => downloadDrawing(item.id)}
            disabled={isLoading}
          >
            <div className="item-content">
              <h4 className="item-title">{item.name}</h4>
              <p className="item-meta">
                by {author} • {new Date(item.modifiedTime).toLocaleDateString()}
              </p>
            </div>
            <div className="item-action-btn">{LockedIcon}</div>
          </button>
        ))}
      </div>
      {selectedDrawingId && (
        <button
          disabled={isLoading}
          onClick={() => updateFn(selectedDrawingId)}
        >
          Update File
        </button>
      )}
    </div>
  );
};

export const AppSidebarLeft: React.FC<{
  elements: readonly NonDeletedExcalidrawElement[];
  appState: UIAppState;
  app: AppClassProperties;
  actionManager: ActionManager;
}> = ({ elements, appState, app, actionManager }) => {
  const { LeftSidebar } = useTunnels();
  const { openSidebarLeft } = useUIAppState();
  const { session, isPending } = useBetterAuth();

  const setAuthManager = useSetAtom(googleDriveAuthAtom);
  const authManager = useAtomValue(googleDriveAuthAtom);

  const [drawings, setDrawings] = useState<SidebarItem[]>([]);

  useEffect(() => {
    if (authManager) {
      return;
    }

    const fetchAccessToken = async () => {
      const tokenData = await getAccessToken({ providerId: "google" });
      if (!tokenData?.data) {
        return;
      }
      const googleDriveData = new GoogleDriveData(tokenData.data);
      setAuthManager(googleDriveData.getAuthManager());
    };
    fetchAccessToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authManager]);

  useEffect(() => {
    if (!authManager) {
      return;
    }

    const fetchFiles = async () => {
      const data = await listGoogleDriveFiles(authManager);
      setDrawings(data.files || []);
      // Log the fetched data for debugging
    };

    fetchFiles();
  }, [authManager]);

  const handleSave = () => {
    if (!authManager) {
      return;
    }

    saveToGoogleDrive(
      authManager,
      elements,
      appState,
      app.files,
      `Name-${new Date().toISOString()}`,
    ).then((result) => {});
  };

  const handleUpdate = (drawingId: string) => {
    if (!authManager) {
      return;
    }

    updateGoogleDriveFile(
      authManager,
      drawingId,
      elements,
      appState,
      app.files,
    ).then((result) => {});
  };

  return (
    <LeftSidebar.In>
      <DefaultSidebarLeft>
        <div className="sidebar-left-content">
          <div className="sidebar-scroll-area">
            <UserProfile session={session} isPending={isPending} />
            <QuickSearch />
            <DashboardLink />
            {/* <DrawingsModalButton
              authManager={authManager}
              onSelectDrawing={() => {}}
            /> */}
            {authManager && (
              <PrivateSection
                drawings={drawings}
                author={session?.user.name || ""}
                authManager={authManager}
                actionManager={actionManager}
                updateFn={handleUpdate}
              />
            )}
            <button onClick={handleSave}>Save</button>
          </div>

          <UserProfile session={session} isPending={isPending} />
        </div>
      </DefaultSidebarLeft>
    </LeftSidebar.In>
  );
};
