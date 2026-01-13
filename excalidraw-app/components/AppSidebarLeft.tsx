import {
  PlusIcon,
  searchIcon,
  TrashIcon,
} from "@excalidraw/excalidraw/components/icons";
import { DefaultSidebarLeft } from "@excalidraw/excalidraw/components/DefaultSidebarLeft";

import { useTunnels } from "@excalidraw/excalidraw/context/tunnels";
import useBetterAuth from "excalidraw-app/hooks/useBetterAuth";

import { useEffect, useRef, useState } from "react";
import {
  currentFile,
  googleDriveSaveStatusAtom,
  listGoogleDriveFiles,
  loadFromGoogleDrive,
  saveToGoogleDrive,
  updateGoogleDriveFile,
  GoogleDrive,
  deleteGoogleDriveFile,
  getGoogleDriveFileMetadata,
} from "excalidraw-app/data/googleDrive";

import { actionLoadSceneFromFile } from "@excalidraw/excalidraw/actions/actionExport";

import { useAtom } from "excalidraw-app/app-jotai";
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
  name: string;
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
  updateFn: (
    id: string,
    modifiedTime?: string,
    reason?: string,
    force?: boolean,
  ) => void;
  updateDrawingsFn: (item: SidebarItem) => void;
  setDrawingsFn: React.Dispatch<React.SetStateAction<SidebarItem[] | null>>;
  loadedDrawingModifiedTimeRef: React.RefObject<{
    [key: string]: string;
  } | null>;
  updateConflictId: { id: string; modifiedTime: string } | null;
  setUpdateConflictId: React.Dispatch<
    React.SetStateAction<{
      id: string;
      modifiedTime: string;
    } | null>
  >;
}> = ({
  drawings,
  author,
  actionManager,
  downloadTriggerOriginRef,
  updateFn,
  updateDrawingsFn,
  setDrawingsFn,
  loadedDrawingModifiedTimeRef,
  updateConflictId,
  setUpdateConflictId,
}) => {
  const [selectedFile, setSelectedFile] = useAtom(currentFile);
  const [cloudStatus, updateStatus] = useAtom(googleDriveSaveStatusAtom);

  const [isLoading, setIsLoading] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 });
  const [preDeleteId, setPreDeleteId] = useState<string | null>(null);

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

  const downloadDrawing = (
    { id, name, modifiedTime }: SidebarItem,
    force = false,
  ) => {
    if ((selectedFile && selectedFile.id === id) || !name) {
      if (!force) {
        return;
      }
    }

    GoogleDrive.pauseSave("googleDrive");
    setIsLoading(true);
    updateStatus("saving");

    const index = name.lastIndexOf(".excalidraw");
    const strippedName = name.slice(0, index !== -1 ? index : name.length);

    const prevSelectedFile = selectedFile;
    setSelectedFile({
      id,
      name: strippedName,
    });

    loadFromGoogleDrive(id)
      .then(async (result) => {
        await setCurrentlyOpenedDrawing(id);
        loadedDrawingModifiedTimeRef.current = { [id]: modifiedTime };

        actionManager.executeAction(actionLoadSceneFromFile, "ui", {
          file: result.data || new Blob(),
          name: strippedName,
        });
      })
      .catch(() => {
        setSelectedFile(prevSelectedFile);
      })
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

        loadedDrawingModifiedTimeRef.current = null;

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
      updateFn(selectedFile.id);
    }
    downloadTriggerOriginRef.current = "onClickLoad";
    downloadDrawing(item);
  };

  const handleDelete = (
    e: React.MouseEvent<HTMLButtonElement>,
    itemId: string,
  ) => {
    e.stopPropagation();
    setPreDeleteId(itemId);
  };

  const handleConflictResolution = (
    choice: "overwrite" | "reload",
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.stopPropagation();

    switch (choice) {
      case "overwrite":
        if (updateConflictId) {
          updateFn(updateConflictId.id, undefined, "conflict overwrite", true);
        }
        break;
      case "reload":
        if (updateConflictId && drawings) {
          const drawing = drawings.find((d) => d.id === updateConflictId.id);
          if (drawing) {
            downloadDrawing(
              { ...drawing, modifiedTime: updateConflictId.modifiedTime },
              true,
            );
          }
        }
        break;
    }
    setUpdateConflictId(null);
  };

  const handleDeleteConfirm = (
    selection: "yes" | "no",
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.stopPropagation();

    switch (selection) {
      case "yes":
        if (preDeleteId) {
          GoogleDrive.pauseSave("googleDrive");
          updateStatus("saving");

          deleteGoogleDriveFile(preDeleteId)
            .then(() => {
              setDrawingsFn((prev) => {
                if (!prev) {
                  return prev;
                }
                return prev.filter((item) => item.id !== preDeleteId);
              });

              if (selectedFile?.id === preDeleteId) {
                setSelectedFile(null);
              }
            })
            .catch(() => {})
            .finally(() => {
              GoogleDrive.resumeSave("googleDrive");
              updateStatus("idle");
              setPreDeleteId(null);
            });
        }
        break;
      case "no":
        setPreDeleteId(null);
        break;
    }
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
                  }
                  ${isLoading ? "sidebar-drawing-item--loading" : ""}`}
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

                  {!(preDeleteId === item.id) && (
                    <button
                      className="sidebar-drawing-item__delete-btn"
                      onClick={(e) => handleDelete(e, item.id)}
                      title="Delete drawing"
                      disabled={isLoading || cloudStatus === "saving"}
                    >
                      {TrashIcon}
                    </button>
                  )}
                  {preDeleteId === item.id && (
                    <div className="sidebar-drawing-item__delete-confirmation">
                      <button
                        onClick={(e) => handleDeleteConfirm("yes", e)}
                        disabled={isLoading || cloudStatus === "saving"}
                      >
                        Y
                      </button>
                      <button
                        onClick={(e) => handleDeleteConfirm("no", e)}
                        disabled={isLoading || cloudStatus === "saving"}
                      >
                        N
                      </button>
                    </div>
                  )}
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
      {updateConflictId && (
        <div className="sidebar-conflict-dialog">
          <div className="sidebar-conflict-dialog__content">
            <h3>Update Conflict Detected</h3>
            <p>
              This drawing{" "}
              {drawings.find((d) => d.id === updateConflictId.id)?.name} was
              modified on another device or tab. What would you like to do?
            </p>
            <div className="sidebar-conflict-dialog__buttons">
              <button
                onClick={(e) => handleConflictResolution("reload", e)}
                className="sidebar-conflict-dialog__reload"
              >
                Reload Remote Version
              </button>
              <button
                onClick={(e) => handleConflictResolution("overwrite", e)}
                className="sidebar-conflict-dialog__overwrite"
              >
                Overwrite with Local Changes
              </button>
            </div>
          </div>
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
  const loadedDrawingModifiedTimeRef = useRef<{
    [key: string]: string;
  } | null>(null);
  const [updateConflictId, setUpdateConflictId] = useState<{
    id: string;
    modifiedTime: string;
  } | null>(null);

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
    force = false,
  ) => {
    // console.log({ updatedBy });

    if (!drawings) {
      return;
    }

    updateStatus("saving");

    if (
      loadedDrawingModifiedTimeRef.current &&
      loadedDrawingModifiedTimeRef.current[drawingId] &&
      !force
    ) {
      getGoogleDriveFileMetadata(drawingId)
        .then((result) => {
          if (result.success && result.modifiedTime) {
            if (
              result.modifiedTime >
              (loadedDrawingModifiedTimeRef.current?.[drawingId] || "")
            ) {
              setUpdateConflictId({
                id: drawingId,
                modifiedTime: result.modifiedTime,
              });
              return;
            }
          }
          // No conflict, proceed with update
          proceedWithUpdate(drawingId, name);
        })
        .catch(() => {
          // On error, proceed with update anyway
          proceedWithUpdate(drawingId, name);
        });
      return;
    }

    proceedWithUpdate(drawingId, name);
  };

  const proceedWithUpdate = (drawingId: string, name?: string) => {
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
        .then(async ({ data }) => {
          const { id, name, modifiedTime } = data;
          if (id) {
            const updatedFile: SidebarItem = {
              id,
              name: name || appState.name || "Untitled",
              modifiedTime,
              thumbnailLink: await getCachedThumbnail(id),
            };

            setDrawings((prev) => {
              if (!prev) {
                return prev;
              }
              const filtered = prev.filter((f) => f.id !== updatedFile.id);
              return [updatedFile, ...filtered];
            });

            // Update the loaded modified time to the new value
            loadedDrawingModifiedTimeRef.current = {
              [updatedFile.id]: updatedFile.modifiedTime,
            };
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
                updateFn={handleUpdate}
                updateDrawingsFn={insertDrawingToList}
                setDrawingsFn={setDrawings}
                loadedDrawingModifiedTimeRef={loadedDrawingModifiedTimeRef}
                updateConflictId={updateConflictId}
                setUpdateConflictId={setUpdateConflictId}
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

  "isBindingEnabled",
  "frameToHighlight",
  "frameRendering",

  "elementsToHighlight",

  "activeTool",
  "preferredSelectionTool",

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
  "activeLockedId",
  "lockedMultiSelections",

  //excluded attributes

  // "editingFrame",
  // "editingTextElement",
  // "penMode",
  // "penDetected",
  // "searchMatches",
  // "selectionElement",
  // "previousSelectedElementIds",
];
