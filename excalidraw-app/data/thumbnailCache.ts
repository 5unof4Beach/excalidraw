import { createStore, get, set, del, entries } from "idb-keyval";

const thumbnailStore = createStore("excalidraw-cache-db", "thumbnails-store");

const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedThumbnail {
  dataUrl: string;
  timestamp: number;
  expiresAt: number;
}

export const cacheThumbnail = async (
  fileId: string,
  dataUrl: string,
  expiresIn: number = CACHE_EXPIRY,
): Promise<void> => {
  try {
    const cacheData: CachedThumbnail = {
      dataUrl,
      timestamp: Date.now(),
      expiresAt: Date.now() + expiresIn,
    };
    await set(fileId, cacheData, thumbnailStore);
  } catch (error) {
    console.warn("Failed to cache thumbnail:", error);
  }
};

export const getCachedThumbnail = async (
  fileId: string,
): Promise<string | null> => {
  try {
    const cached = await get<CachedThumbnail>(fileId, thumbnailStore);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (cached.expiresAt < Date.now()) {
      await deleteCachedThumbnail(fileId);
      return null;
    }

    return cached.dataUrl;
  } catch (error) {
    console.warn("Failed to get cached thumbnail:", error);
    return null;
  }
};

export const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const deleteCachedThumbnail = async (fileId: string): Promise<void> => {
  try {
    await del(fileId, thumbnailStore);
  } catch (error) {
    console.warn("Failed to delete cached thumbnail:", error);
  }
};

export const clearThumbnailCache = async (): Promise<void> => {
  try {
    const allEntries = await entries(thumbnailStore);
    await Promise.all(
      allEntries.map(([fileId]) => del(fileId, thumbnailStore)),
    );
  } catch (error) {
    console.warn("Failed to clear thumbnail cache:", error);
  }
};

export const clearExpiredThumbnails = async (): Promise<void> => {
  try {
    const allEntries = await entries<string, CachedThumbnail>(thumbnailStore);
    const now = Date.now();

    await Promise.all(
      allEntries
        .filter(([, cached]) => cached.expiresAt < now)
        .map(([fileId]) => del(fileId, thumbnailStore)),
    );
  } catch (error) {
    console.warn("Failed to clear expired thumbnails:", error);
  }
};
