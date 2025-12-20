import {
  PlusIcon,
  searchIcon,
  LockedIcon,
} from "@excalidraw/excalidraw/components/icons";
import { useUIAppState } from "@excalidraw/excalidraw/context/ui-appState";
import { DefaultSidebarLeft } from "@excalidraw/excalidraw/components/DefaultSidebarLeft";

import { useTunnels } from "@excalidraw/excalidraw/context/tunnels";
import useBetterAuth from "excalidraw-app/hooks/useBetterAuth";

import { useEffect, useRef, useState } from "react";
import {
  currentFile,
  googleDriveSaveStatusAtom,
  handleGoogleDriveUpdate,
  listGoogleDriveFiles,
  loadFromGoogleDrive,
  saveToGoogleDrive,
  updateGoogleDriveFile,
  GoogleDrive,
} from "excalidraw-app/data/googleDrive";

import { actionLoadSceneFromFile } from "@excalidraw/excalidraw/actions/actionExport";

import { useSetAtom, useAtomValue, useAtom } from "excalidraw-app/app-jotai";
import {
  generateThumbnail,
  prepareElementsForExport,
} from "@excalidraw/excalidraw/data";

import {
  getCachedThumbnail,
  cacheThumbnail,
  blobToDataUrl,
} from "excalidraw-app/data/thumbnailCache";

import {
  getCurrentlyOpenedDrawing,
  setCurrentlyOpenedDrawing,
} from "excalidraw-app/data/currentDrawingCache";

import { Tooltip } from "@excalidraw/excalidraw/components/Tooltip";

import { Virtuoso } from "react-virtuoso";

import {
  uniqueNamesGenerator,
  adjectives,
  animals,
} from "unique-names-generator";

import _ from "lodash";

import type {
  AppClassProperties,
  UIAppState,
} from "@excalidraw/excalidraw/types";
import type { ActionManager } from "@excalidraw/excalidraw/actions/manager";
import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import "./AppSidebar.scss";
import { DrawingsModalButton } from "./DrawingsModalButton";

export interface SidebarItem {
  id: string;
  name: string | null;
  modifiedTime: string;
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

const generateEmptyDrawing = () => {
  const name = uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: " ",
    style: "capital",
  });

  return {
    type: "excalidraw",
    version: 2,
    source: "excalidraw",
    elements: [],
    appState: {},
    files: {},
    name,
  };
};

const PrivateSection: React.FC<{
  drawings: SidebarItem[];
  author: string;
  actionManager: ActionManager;
  downloadTriggerOriginRef: React.RefObject<string | null>;
  updateFunction: (id: string) => void;
  updateDrawingsFn: (item: SidebarItem) => void;
}> = ({
  drawings,
  author,
  actionManager,
  downloadTriggerOriginRef,
  updateFunction,
  updateDrawingsFn,
}) => {
  const [selectedFile, setSelectedFile] = useAtom(currentFile);
  const [cloudStatus, updateStatus] = useAtom(googleDriveSaveStatusAtom);

  const [isLoading, setIsLoading] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 });

  const readyRef = useRef(true);

  useEffect(() => {
    //Strict mode causes double invocation of useEffect in dev mode which fucks up the
    // update behavior parent useEffect
    function openTopListDrawing() {
      downloadDrawing(drawings[0]);
    }

    if (readyRef.current) {
      getCurrentlyOpenedDrawing().then((drawingId) => {
        if (drawingId) {
          const drawing = drawings.find((d) => d.id === drawingId);
          if (drawing) {
            downloadDrawing(drawing);
            return;
          }
          openTopListDrawing();
          return;
        }
        openTopListDrawing();
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

    loadFromGoogleDrive(id)
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
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
        updateStatus("idle");
        GoogleDrive.resumeSave("googleDrive");
      });
  };

  const createNewDrawing = () => {
    const { name, ...emptyScene } = generateEmptyDrawing();

    setIsLoading(true);

    saveToGoogleDrive(
      emptyScene.elements,
      emptyScene.appState as any,
      emptyScene.files,
      name,
    )
      .then((result) => {
        GoogleDrive.pauseSave("googleDrive");
        const { fileId: id } = result;

        setSelectedFile({
          id,
          name,
        });

        actionManager.executeAction(actionLoadSceneFromFile, "ui", {
          file: new Blob([JSON.stringify(emptyScene)], {
            type: "application/json",
          }),
          name,
        });

        updateDrawingsFn({
          id,
          modifiedTime: new Date().toISOString(),
          name,
          thumbnailLink: null,
        });
      })
      .finally(() => {
        GoogleDrive.resumeSave("googleDrive");
        setIsLoading(false);
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
    <div className="sidebar-section">
      <div className="sidebar-actions">
        <DrawingsModalButton
          onSelectDrawing={handleClick}
          drawings={drawings}
        />
        <button
          className="sidebar-create-new"
          onClick={createNewDrawing}
          title="Create new drawing"
        >
          {PlusIcon}
        </button>
      </div>
      <div className="sidebar-drawings-list">
        {drawings.length === 0 && (
          <span className="guide-text">
            No drawings to show yet. Start editting the canvas and a new drawing
            wil be created automaticallly
          </span>
        )}
        <Virtuoso
          style={{ height: "100%" }}
          className="virtuoso"
          totalCount={drawings.length}
          data={drawings}
          itemContent={(_, item) => (
            <div
              style={{ paddingBottom: "0.312rem", paddingRight: "0.225rem" }}
            >
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
            </div>
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
  );
};

export const AppSidebarLeft: React.FC<{
  elements: readonly NonDeletedExcalidrawElement[];
  appState: UIAppState;
  app: AppClassProperties;
  actionManager: ActionManager;
}> = ({ elements, appState, app, actionManager }) => {
  const { LeftSidebar } = useTunnels();
  const { session, isPending } = useBetterAuth();

  const [currentDrawing, setSelectedFile] = useAtom(currentFile);
  const [googleDriveStatus, updateStatus] = useAtom(googleDriveSaveStatusAtom);

  const [drawings, setDrawings] = useState<SidebarItem[] | null>(null);

  const downloadTriggerOriginRef = useRef<"idbLoad" | "onClickLoad" | null>(
    null,
  );

  const { exportedElements, exportingFrame } = prepareElementsForExport(
    elements,
    appState,
    false,
  );

  const filteredAppState = _.pick(appState, drawingAttributes);
  const prevAppState = useRef(filteredAppState);

  useEffect(() => {
    const fetchFiles = async () => {
      const data = await listGoogleDriveFiles();

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
  }, [session]);

  useEffect(() => {
    if (!currentDrawing) {
      return;
    }

    if (downloadTriggerOriginRef.current === "onClickLoad") {
      downloadTriggerOriginRef.current = null;
      return;
    }

    handleUpdate(currentDrawing.id, undefined, "name change");

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState.name]);

  useEffect(() => {
    if (_.isEqual(prevAppState.current, filteredAppState)) {
      return;
    }

    prevAppState.current = filteredAppState;

    if (!currentDrawing || currentDrawing.name !== appState.name) {
      return;
    }

    if (googleDriveStatus === "idle" && !GoogleDrive.isSavePaused()) {
      handleUpdate(currentDrawing.id, currentDrawing.name, "Global app state");
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDrawing, filteredAppState]);

  useEffect(() => {
    if (drawings && drawings.length === 0 && googleDriveStatus === "idle") {
      createNewDrawing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawings]);

  const handleUpdate = (
    drawingId: string,
    name?: string,
    updatedBy?: string,
  ) => {
    // console.log({ updatedBy });

    if (!drawings) {
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
    ).then(async ([blob, smallBlob]) => {
      blobToDataUrl(blob).then((dataUrl: string) => {
        cacheThumbnail(drawingId, dataUrl);
      });

      updateGoogleDriveFile(
        drawingId,
        elements,
        appState,
        app.files,
        name,
        smallBlob,
      )
        .then(async ({ fileId }) => {
          if (fileId) {
            const updatedFile: SidebarItem = {
              id: fileId,
              name: name || appState.name,
              modifiedTime: new Date().toISOString(),
              thumbnailLink: await getCachedThumbnail(fileId),
            };

            setDrawings((prev) => {
              if (!prev) {
                return prev;
              }
              const filtered = prev.filter((f) => f.id !== updatedFile.id);
              return [updatedFile, ...filtered];
            });
          }
        })
        .catch(() => {})
        .finally(() => {
          updateStatus("idle");
        });
    });
  };

  const insertDrawingToList = (item: SidebarItem) => {
    setDrawings((prev) => {
      if (!prev) {
        return prev;
      }
      return [item, ...prev];
    });
  };

  const createNewDrawing = () => {
    GoogleDrive.pauseSave("googleDrive");
    updateStatus("saving");

    const { name, ...emptyScene } = generateEmptyDrawing();

    saveToGoogleDrive(
      emptyScene.elements,
      emptyScene.appState as any,
      emptyScene.files,
      name,
    )
      .then((result) => {
        GoogleDrive.pauseSave("googleDrive");

        const { fileId: id } = result;

        setSelectedFile({
          id,
          name,
        });

        actionManager.executeAction(actionLoadSceneFromFile, "ui", {
          file: new Blob([JSON.stringify(emptyScene)], {
            type: "application/json",
          }),
          name,
        });

        insertDrawingToList({
          id,
          modifiedTime: new Date().toISOString(),
          name,
          thumbnailLink: null,
        });
      })
      .finally(() => {
        GoogleDrive.resumeSave("googleDrive");
        updateStatus("idle");
      });
  };

  return (
    <LeftSidebar.In>
      <DefaultSidebarLeft>
        <div className="sidebar-left-content">
          <div className="sidebar-scroll-area">
            <UserProfile session={session} isPending={isPending} />
            {/* <QuickSearch /> */}
            {drawings && (
              <PrivateSection
                drawings={drawings}
                author={session?.user.name || ""}
                actionManager={actionManager}
                downloadTriggerOriginRef={downloadTriggerOriginRef}
                updateFunction={handleUpdate}
                updateDrawingsFn={insertDrawingToList}
              />
            )}
          </div>
        </div>
      </DefaultSidebarLeft>
    </LeftSidebar.In>
  );
};

const drawingAttributes: (keyof UIAppState)[] = [
  "activeEmbeddable",
  "newElement",
  "resizingElement",
  "multiElement",
  "selectionElement",
  "isBindingEnabled",
  "frameToHighlight",
  "frameRendering",
  "editingFrame",
  "elementsToHighlight",
  "editingTextElement",
  "activeTool",
  "preferredSelectionTool",
  "penMode",
  "penDetected",
  "currentItemStrokeColor",
  "currentItemBackgroundColor",
  "currentItemFillStyle",
  "currentItemStrokeWidth",
  "currentItemStrokeStyle",
  "currentItemRoughness",
  "currentItemOpacity",
  "currentItemFontFamily",
  "currentItemFontSize",
  "currentItemTextAlign",
  "currentItemStartArrowhead",
  "currentItemEndArrowhead",
  "currentHoveredFontFamily",
  "currentItemRoundness",
  "currentItemArrowType",
  "isResizing",
  "isRotating",
  "selectedElementIds",
  "hoveredElementIds",
  "previousSelectedElementIds",
  "selectedElementsAreBeingDragged",
  "gridSize",
  "gridStep",
  "gridModeEnabled",
  "selectedGroupIds",
  "editingGroupId",
  "currentChartType",
  "selectedLinearElement",
  "snapLines",
  "originSnapOffset",
  "objectsSnapModeEnabled",
  "isCropping",
  "croppingElementId",
  "searchMatches",
  "activeLockedId",
  "lockedMultiSelections",
];
