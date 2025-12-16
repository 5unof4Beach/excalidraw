import {
  PlusPromoIcon,
  searchIcon,
  LockedIcon,
} from "@excalidraw/excalidraw/components/icons";
import { useUIAppState } from "@excalidraw/excalidraw/context/ui-appState";
import { DefaultSidebarLeft } from "@excalidraw/excalidraw/components/DefaultSidebarLeft";

import { useTunnels } from "@excalidraw/excalidraw/context/tunnels";
import useBetterAuth from "excalidraw-app/hooks/useBetterAuth";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleDriveData } from "excalidraw-app/data/googleDriveManager";
import {
  currentFile,
  googleDriveAuthAtom,
  googleDriveSaveStatusAtom,
  handleGoogleDriveUpdate,
  listGoogleDriveFiles,
  loadFromGoogleDrive,
  saveToGoogleDrive,
  updateGoogleDriveFile,
  GoogleDrive,
  type GoogleDriveAuthManager,
} from "excalidraw-app/data/googleDrive";
import { getAccessToken } from "excalidraw-app/lib/auth-client";

import { actionLoadSceneFromFile } from "@excalidraw/excalidraw/actions/actionExport";

import { useSetAtom, useAtomValue } from "excalidraw-app/app-jotai";
import {
  generateThumbnail,
  prepareElementsForExport,
} from "@excalidraw/excalidraw/data";

import { cloneJSON, debounce } from "@excalidraw/common";

import {
  getCachedThumbnail,
  cacheThumbnail,
  blobToDataUrl,
} from "excalidraw-app/data/thumbnailCache";

import {
  getCurrentlyOpenedDrawing,
  setCurrentlyOpenedDrawing,
} from "excalidraw-app/data/currentDrawingCache";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import type {
  AppClassProperties,
  UIAppState,
} from "@excalidraw/excalidraw/types";
import type { ActionManager } from "@excalidraw/excalidraw/actions/manager";

import { Tooltip } from "@excalidraw/excalidraw/components/Tooltip";

import { Virtuoso } from "react-virtuoso";

import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";

import "./AppSidebar.scss";
import { DrawingsModalButton } from "./DrawingsModalButton";

export interface SidebarItem {
  id: string;
  name: string | null;
  modifiedTime: string;
  mimeType: string;
  thumbnailLink?: string | null;
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
    <div className="search-icon">{searchIcon}</div>
    <input id="sidebar-quick-search" type="text" placeholder="Quick search" />
    <span className="search-shortcut">⌘ P</span>
  </div>
);

const DashboardLink: React.FC = () => (
  <div className="sidebar-dashboard">
    <div className="dashboard-icon"></div>
    <span>Dashboard</span>
  </div>
);

const PrivateSection: React.FC<{
  drawings: SidebarItem[];
  author: string;
  authManager: GoogleDriveAuthManager;
  actionManager: ActionManager;
  downloadTriggerOriginRef: React.RefObject<string | null>;
  updateFunction: (id: string) => void;
}> = ({
  drawings,
  author,
  authManager,
  actionManager,
  downloadTriggerOriginRef,
  updateFunction,
}) => {
  const selectedFile = useAtomValue(currentFile);
  const setSelectedFile = useSetAtom(currentFile);
  const updateStatus = useSetAtom(googleDriveSaveStatusAtom);
  const cloudStatus = useAtomValue(googleDriveSaveStatusAtom);

  const [isLoading, setIsLoading] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 });

  const readyRef = useRef(true);

  useEffect(() => {
    //Strict mode causes double invocation of useEffect in dev mode which fucks up the
    // update behavior parent useEffect

    if (readyRef.current) {
      getCurrentlyOpenedDrawing().then((drawingId) => {
        if (drawingId) {
          const drawing = drawings.find((d) => d.id === drawingId);
          if (drawing) {
            downloadTriggerOriginRef.current = "idbLoad";
            downloadDrawing(drawing);
          }
        }
      });
    }

    return () => {
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadDrawing = ({ id, name }: SidebarItem) => {
    if ((selectedFile && selectedFile.id === id) || !name) {
      return;
    }

    GoogleDrive.pauseSave("googleDrive");
    setIsLoading(true);
    updateStatus("saving");

    loadFromGoogleDrive(authManager, id)
      .then(async (result) => {
        const index = name.lastIndexOf(".excalidraw");
        const strippedName = name.slice(0, index !== -1 ? index : name.length);
        await setCurrentlyOpenedDrawing(id);

        actionManager.executeAction(actionLoadSceneFromFile, "ui", {
          file: result.data || new Blob(),
          name: strippedName,
        });
        setSelectedFile({
          id,
          name: strippedName,
        });
        setIsLoading(false);
        updateStatus("saved");
      })
      .catch(() => {
        setIsLoading(false);
        updateStatus("error");
      })
      .finally(() => {
        updateStatus("idle");
      });
  };

  const createNewDrawing = () => {
    const emptyScene = {
      type: "excalidraw",
      version: 2,
      source: "excalidraw",
      elements: [],
      appState: {},
      files: {},
    };

    const name = uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: " ",
      style: "capital",
    });

    saveToGoogleDrive(
      authManager,
      emptyScene.elements,
      emptyScene.appState as any,
      emptyScene.files,
      name,
    ).then((result) => {
      GoogleDrive.pauseSave("googleDrive");

      actionManager.executeAction(actionLoadSceneFromFile, "ui", {
        file: new Blob([JSON.stringify(emptyScene)], {
          type: "application/json",
        }),
        name,
      });
    });
  };

  const handleClick = (item: SidebarItem) => {
    if (selectedFile) {
      updateFunction(selectedFile.id);
    }
    downloadTriggerOriginRef.current = "onClickLoad";
    downloadDrawing(item);
  };

  const handleMouseEnter = (
    e: React.MouseEvent<HTMLButtonElement>,
    itemId: string,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredItemId(itemId);
    setPreviewPos({
      top: rect.top,
      left: rect.right + 12,
    });
  };

  const hoveredItem = drawings.find((item) => item.id === hoveredItemId);

  return (
    <>
      <DrawingsModalButton
        authManager={authManager}
        onSelectDrawing={handleClick}
        drawings={drawings}
      />
      <button onClick={createNewDrawing}>New</button>
      <div className="sidebar-section">
        <div className="sidebar-drawings-list">
          <Virtuoso
            style={{ height: "100%" }}
            totalCount={drawings.length}
            data={drawings}
            itemContent={(_, item) => (
              <Tooltip
                key={item.id}
                label={`Last modified: ${new Date(
                  item.modifiedTime,
                ).toLocaleString()}`}
              >
                <button
                  key={item.id}
                  className={`sidebar-drawing-item ${
                    selectedFile?.id === item.id
                      ? "sidebar-drawing-item--selected"
                      : ""
                  } ${isLoading ? "sidebar-drawing-item--loading" : ""}`}
                  onClick={() => handleClick(item)}
                  onMouseEnter={(e) => handleMouseEnter(e, item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  disabled={isLoading || cloudStatus === "saving"}
                >
                  <div className="sidebar-drawing-item__thumbnail">
                    {item.thumbnailLink ? (
                      <img
                        src={item.thumbnailLink}
                        alt={item.name || undefined}
                        className="sidebar-drawing-item__image"
                      />
                    ) : (
                      <div className="sidebar-drawing-item__placeholder">
                        📄
                      </div>
                    )}
                  </div>

                  <div className="sidebar-drawing-item__content">
                    <h4 className="sidebar-drawing-item__title">
                      {item.name?.slice(
                        0,
                        item.name.lastIndexOf(".excalidraw") !== -1
                          ? item.name.lastIndexOf(".excalidraw")
                          : item.name.length,
                      )}
                    </h4>
                    <p className="sidebar-drawing-item__meta">
                      by {author} •{" "}
                      {new Date(item.modifiedTime).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="sidebar-drawing-item__action">
                    {LockedIcon}
                  </div>
                </button>
              </Tooltip>
            )}
          />
        </div>

        {hoveredItem && hoveredItem.thumbnailLink && (
          <div
            className="sidebar-preview-modal"
            style={{
              top: `${previewPos.top}px`,
              left: `${previewPos.left}px`,
            }}
          >
            <img
              src={hoveredItem.thumbnailLink}
              alt={hoveredItem.name || undefined}
              className="sidebar-preview-modal__image"
            />
          </div>
        )}
      </div>
    </>
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
  const currentDrawing = useAtomValue(currentFile);
  const updateStatus = useSetAtom(googleDriveSaveStatusAtom);

  const [drawings, setDrawings] = useState<SidebarItem[]>([]);

  const setHandleGoogleDriveUpdate = useSetAtom(handleGoogleDriveUpdate);

  const downloadTriggerOriginRef = useRef<"idbLoad" | "onClickLoad" | null>(
    null,
  );

  const { exportedElements, exportingFrame } = prepareElementsForExport(
    elements,
    appState,
    false,
  );

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

      // Load cached thumbnails for each file
      const filesWithThumbnails = await Promise.all(
        (data.files || []).map(async (file) => {
          const cachedThumbnail = await getCachedThumbnail(file.id);
          return {
            ...file,
            thumbnailLink: cachedThumbnail || file.thumbnailLink,
          };
        }),
      );

      setDrawings(filesWithThumbnails);
    };

    fetchFiles();
  }, [authManager]);

  useEffect(() => {
    if (!authManager || !currentDrawing) {
      return;
    }

    GoogleDrive.pauseSave("googleDrive");

    if (downloadTriggerOriginRef.current === "onClickLoad") {
      downloadTriggerOriginRef.current = null;
      return;
    }

    handleUpdate(currentDrawing.id, undefined);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState.name]);

  useEffect(() => {
    if (
      !authManager ||
      !currentDrawing ||
      currentDrawing.name !== appState.name
    ) {
      return;
    }

    if (downloadTriggerOriginRef.current === "idbLoad") {
      downloadTriggerOriginRef.current = null;
      return;
    }

    GoogleDrive.resumeSave("googleDrive");
    setHandleGoogleDriveUpdate(() => () => {
      handleUpdate(currentDrawing.id, currentDrawing.name);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDrawing, appState]);

  const handleUpdate = (drawingId: string, name?: string) => {
    if (!authManager || !drawingId) {
      return;
    }
    updateStatus("saving");

    generateThumbnail(
      exportedElements,
      {
        ...appState,
        cursorButton: "up",
        startBoundElement: null,
        suggestedBindings: [],
        scrollX: 0,
        scrollY: 0,
      },
      app.files,
      {
        exportBackground: true,
        viewBackgroundColor: appState?.viewBackgroundColor ?? "#ffffff",
        exportingFrame,
      },
    ).then(async (blob) => {
      blobToDataUrl(blob).then((dataUrl: string) => {
        cacheThumbnail(drawingId, dataUrl);
      });

      updateGoogleDriveFile(
        authManager,
        drawingId,
        elements,
        appState,
        app.files,
        name,
        blob,
      )
        .then(async ({ fileId }) => {
          if (fileId) {
            const updatedFile: SidebarItem = {
              id: fileId,
              name: name || appState.name,
              modifiedTime: new Date().toISOString(),
              mimeType: "application/vnd.excalidraw+json",
              thumbnailLink: await getCachedThumbnail(fileId),
            };

            setDrawings((prev) => {
              const filtered = prev.filter((f) => f.id !== updatedFile.id);
              return [updatedFile, ...filtered];
            });
          }
          updateStatus("saved");
        })
        .catch(() => {
          updateStatus("error");
        })
        .finally(() => {
          updateStatus("idle");
        });
    });
  };

  return (
    <LeftSidebar.In>
      <DefaultSidebarLeft>
        <div className="sidebar-left-content">
          <div className="sidebar-scroll-area">
            <UserProfile session={session} isPending={isPending} />
            <QuickSearch />
            {authManager && drawings.length > 0 && (
              <PrivateSection
                drawings={drawings}
                author={session?.user.name || ""}
                authManager={authManager}
                actionManager={actionManager}
                downloadTriggerOriginRef={downloadTriggerOriginRef}
                updateFunction={handleUpdate}
              />
            )}
          </div>

          <UserProfile session={session} isPending={isPending} />
        </div>
      </DefaultSidebarLeft>
    </LeftSidebar.In>
  );
};
