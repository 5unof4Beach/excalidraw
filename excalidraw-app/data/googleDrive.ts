import {
  compressData,
  decompressData,
} from "@excalidraw/excalidraw/data/encode";

import { atom } from "excalidraw-app/app-jotai";

import { serializeAsJSON } from "@excalidraw/excalidraw/data/json";

import { MIME_TYPES } from "@excalidraw/common";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { BinaryFiles, UIAppState } from "@excalidraw/excalidraw/types";

import { Locker } from "./Locker";
import axiosClient from "excalidraw-app/lib/axios-client";

interface GoogleDriveAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  idToken?: string | null;
}

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_API_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

export class GoogleDriveAuthManager {
  private accessToken: string | null = null;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  setCredentials(tokens: GoogleDriveAuthState): void {
    this.accessToken = tokens.accessToken;
  }

  async refreshAccessToken(): Promise<string> {
    throw new Error("Use Better Auth server for token refresh");
  }

  async revokeAccess(): Promise<void> {
    localStorage.removeItem("gd_access_token");
    localStorage.removeItem("gd_refresh_token");
    localStorage.removeItem("gd_expires_at");
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }
}

const getOrCreateExcalidrawFolder = async (): Promise<{
  success: boolean;
  folderId?: string;
  error?: Error;
}> => {
  try {
    // Check if Excalidraw folder already exists
    const params = new URLSearchParams({
      q: "name='Excalidraw' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: "files(id)",
      pageSize: "1",
    });

    const { data: searchResult } = await axiosClient.get(
      `${DRIVE_API_BASE}/files?${params.toString()}`,
    );

    if (searchResult.files && searchResult.files.length > 0) {
      return { success: true, folderId: searchResult.files[0].id };
    }

    // Folder doesn't exist, create it
    const folderMetadata = JSON.stringify({
      name: "Excalidraw",
      mimeType: "application/vnd.google-apps.folder",
    });

    const { data: createResult } = await axiosClient.post(
      `${DRIVE_API_BASE}/files?fields=id`,
      folderMetadata,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return { success: true, folderId: createResult.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

export const saveToGoogleDrive = async (
  elements: readonly ExcalidrawElement[],
  appState: UIAppState,
  files: BinaryFiles,
  name: string,
  parentFolderId?: string,
): Promise<{ success: boolean; fileId: string; error?: Error }> => {
  try {
    // Get or create Excalidraw folder if no parent is specified
    let folderId = parentFolderId;
    if (!folderId) {
      const folderResult = await getOrCreateExcalidrawFolder();
      if (!folderResult.success || !folderResult.folderId) {
        throw new Error("Failed to get or create Excalidraw folder");
      }
      folderId = folderResult.folderId;
    }

    const serialized = serializeAsJSON(elements, appState, files, "database");
    const blob = new Blob([serialized], {
      type: MIME_TYPES.excalidraw,
    });

    const boundary = `boundary_excali_drive`;
    const metadata = JSON.stringify({
      name:
        `${name}.excalidraw` ||
        `${appState.name}.excalidraw` ||
        "Untitled.excalidraw",
      mimeType: MIME_TYPES.excalidraw,
      parents: [folderId],
    });

    const body = new Uint8Array(
      await new Blob([
        `--${boundary}\r\n`,
        `Content-Type: application/json; charset=UTF-8\r\n\r\n`,
        `${metadata}\r\n`,
        `--${boundary}\r\n`,
        `Content-Type: ${MIME_TYPES.excalidraw}\r\n\r\n`,
      ]).arrayBuffer(),
    );

    const fileData = await blob.arrayBuffer();
    const finalBody = new Uint8Array(
      body.length + fileData.byteLength + boundary.length + 20,
    );
    finalBody.set(body);
    finalBody.set(new Uint8Array(fileData), body.length);
    const footer = `\r\n--${boundary}--\r\n`;
    finalBody.set(
      new TextEncoder().encode(footer),
      body.length + fileData.byteLength,
    );

    const { data: response } = await axiosClient.post(
      `${DRIVE_API_UPLOAD_BASE}/files?uploadType=multipart`,
      finalBody,
      {
        headers: {
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
      },
    );

    return { success: true, fileId: response.id };
  } catch (error) {
    return {
      success: false,
      fileId: "",
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

export const loadFromGoogleDrive = async (
  fileId: string,
): Promise<{ success: boolean; data?: Blob; error?: Error }> => {
  try {
    const { data: response } = await axiosClient.get(
      `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
    );

    return {
      success: true,
      data: new Blob([JSON.stringify(response)]),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

export const updateGoogleDriveFile = async (
  fileId: string,
  elements: readonly ExcalidrawElement[],
  appState: UIAppState,
  files: BinaryFiles,
  name?: string,
  thumbnailBlob?: Blob,
): Promise<{
  success: boolean;
  data: { id: string; name: string; modifiedTime: string };
  error?: Error;
}> => {
  try {
    const serialized = serializeAsJSON(elements, appState, files, "local");
    const blob = new Blob([serialized], {
      type: MIME_TYPES.excalidraw,
    });

    const boundary = `boundary_excali_drive`;

    // Build metadata with optional thumbnail
    const metadataObj: any = {
      name: `${name || appState.name}.excalidraw`,
      mimeType: MIME_TYPES.excalidraw,
    };

    // Add thumbnail if provided
    if (thumbnailBlob) {
      const thumbnailData = await thumbnailBlob.arrayBuffer();
      const base64Thumbnail = btoa(
        String.fromCharCode(...new Uint8Array(thumbnailData)),
      );
      metadataObj.contentHints = {
        thumbnail: {
          image: base64Thumbnail,
          mimeType: thumbnailBlob.type || "image/png",
        },
      };
    }

    const metadata = JSON.stringify(metadataObj);

    const body = new Uint8Array(
      await new Blob([
        `--${boundary}\r\n`,
        `Content-Type: application/json; charset=UTF-8\r\n\r\n`,
        `${metadata}\r\n`,
        `--${boundary}\r\n`,
        `Content-Type: ${MIME_TYPES.excalidraw}\r\n\r\n`,
      ]).arrayBuffer(),
    );

    const fileData = await blob.arrayBuffer();
    const finalBody = new Uint8Array(
      body.length + fileData.byteLength + boundary.length + 8,
    );
    finalBody.set(body);
    finalBody.set(new Uint8Array(fileData), body.length);
    const footer = `\r\n--${boundary}--\r\n`;
    finalBody.set(
      new TextEncoder().encode(footer),
      body.length + fileData.byteLength,
    );

    const { data } = await axiosClient.patch(
      `${DRIVE_API_UPLOAD_BASE}/files/${fileId}?uploadType=multipart&fields=id,name,modifiedTime`,
      finalBody,
      {
        headers: {
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
      },
    );

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      data: null as any,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

export const deleteGoogleDriveFile = async (
  fileId: string,
): Promise<{ success: boolean; error?: Error }> => {
  try {
    await axiosClient.delete(`${DRIVE_API_BASE}/files/${fileId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

export const getGoogleDriveFileMetadata = async (
  fileId: string,
): Promise<{
  success: boolean;
  modifiedTime?: string;
  error?: Error;
}> => {
  try {
    const params = new URLSearchParams({
      fields: "modifiedTime",
    });

    const { data: result } = await axiosClient.get(
      `${DRIVE_API_BASE}/files/${fileId}?${params.toString()}`,
    );

    return {
      success: true,
      modifiedTime: result.modifiedTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

export const listGoogleDriveFiles = async (
  pageSize: number = 1000,
  pageToken?: string,
): Promise<{
  success: boolean;
  files?: Array<{
    id: string;
    name: string;
    modifiedTime: string;
    mimeType: string;
    thumbnailLink?: string;
  }>;
  nextPageToken?: string;
  error?: Error;
}> => {
  try {
    const params = new URLSearchParams({
      q: "mimeType = 'application/vnd.excalidraw+json' and trashed=false",
      fields:
        "files(id,name,mimeType,modifiedTime,parents,owners,appProperties, thumbnailLink), nextPageToken",
      pageSize: pageSize.toString(),
      ...(pageToken && { pageToken }),
      orderBy: "modifiedTime desc",
    });

    const { data: result } = await axiosClient.get(
      `${DRIVE_API_BASE}/files?${params.toString()}`,
    );
    return {
      success: true,
      files: result.files ?? [],
      nextPageToken: result.nextPageToken,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

type SavingLockTypes = "googleDrive";

export class GoogleDrive {
  private static locker = new Locker<SavingLockTypes>();

  static pauseSave = (lockType: SavingLockTypes) => {
    this.locker.lock(lockType);
  };

  static resumeSave = (lockType: SavingLockTypes) => {
    this.locker.unlock(lockType);
  };

  static isSavePaused = () => {
    return this.locker.isLocked();
  };
}

export const googleDriveFilesAtom = atom<
  Array<{
    id: string;
    name: string;
    modifiedTime: string;
    mimeType: string;
  }>
>([]);
export const currentFile = atom<{ id: string; name: string } | null>(null);
export const googleDriveSaveStatusAtom = atom<
  "idle" | "saving" | "saved" | "error"
>("idle");
export const googleDriveLastSavedAtom = atom<Date | null>(null);
export const handleGoogleDriveUpdate = atom<(() => void) | null>(null);
