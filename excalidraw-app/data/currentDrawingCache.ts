import { createStore, get, set, del, entries } from "idb-keyval";

const currentDrawingStore = createStore(
  "excalidraw-drawing-cache-db",
  "current-drawing-store",
);

export const setCurrentlyOpenedDrawing = async (
  fileId: string,
): Promise<void> => {
  try {
    await set("id", fileId, currentDrawingStore);
  } catch (error) {
    console.warn("Failed to set currently opened drawing:", error);
  }
};

export const getCurrentlyOpenedDrawing = async (): Promise<string | null> => {
  try {
    const fileId = await get<string>("id", currentDrawingStore);
    return fileId || null;
  } catch (error) {
    console.warn("Failed to get currently opened drawing:", error);
    return null;
  }
};

export const clearCurrentlyOpenedDrawing = async (): Promise<void> => {
  try {
    await del("id", currentDrawingStore);
  } catch (error) {
    console.warn("Failed to clear currently opened drawing:", error);
  }
};
