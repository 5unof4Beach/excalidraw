import {
  compressData,
  decompressData,
} from "@excalidraw/excalidraw/data/encode";

import { atom } from "excalidraw-app/app-jotai";

import { serializeAsJSON } from "@excalidraw/excalidraw/data/json";

import { MIME_TYPES } from "@excalidraw/common";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { BinaryFiles, UIAppState } from "@excalidraw/excalidraw/types";

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

export const saveToGoogleDrive = async (
  authManager: GoogleDriveAuthManager,
  elements: readonly ExcalidrawElement[],
  appState: UIAppState,
  files: BinaryFiles,
  name: string,
): Promise<{ success: boolean; fileId?: string; error?: Error }> => {
  try {
    const accessToken = authManager.getAccessToken();
    if (!accessToken) {
      throw new Error("No access token");
    }

    const serialized = serializeAsJSON(elements, appState, files, "local");
    const blob = new Blob([serialized], {
      type: MIME_TYPES.excalidraw,
    });

    const boundary = `boundary_excali_drive`;
    const metadata = JSON.stringify({
      name:
        `${appState.name}.excalidraw` ||
        `${name}.excalidraw` ||
        "Untitled.excalidraw",
      mimeType: MIME_TYPES.excalidraw,
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

    const response = await fetch(
      `${DRIVE_API_UPLOAD_BASE}/files?uploadType=multipart`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
          "Content-Length": finalBody.length.toString(),
        },
        body: finalBody,
      },
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return { success: true, fileId: result.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

export const loadFromGoogleDrive = async (
  authManager: GoogleDriveAuthManager,
  fileId: string,
): Promise<{ success: boolean; data?: Blob; error?: Error }> => {
  try {
    const accessToken = authManager.getAccessToken();
    if (!accessToken) {
      throw new Error("No access token");
    }

    const response = await fetch(
      `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const buf = await response.arrayBuffer();
    return {
      success: true,
      data: new Blob([buf]),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

export const updateGoogleDriveFile = async (
  authManager: GoogleDriveAuthManager,
  fileId: string,
  elements: readonly ExcalidrawElement[],
  appState: UIAppState,
  files: BinaryFiles,
): Promise<{ success: boolean; fileId?: string; error?: Error }> => {
  try {
    const accessToken = authManager.getAccessToken();
    if (!accessToken) {
      throw new Error("No access token");
    }

    const serialized = serializeAsJSON(elements, appState, files, "local");
    const blob = new Blob([serialized], {
      type: MIME_TYPES.excalidraw,
    });

    const boundary = `boundary_excali_drive`;
    const metadata = JSON.stringify({
      mimeType: MIME_TYPES.excalidraw,
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
      body.length + fileData.byteLength + boundary.length + 8,
    );
    finalBody.set(body);
    finalBody.set(new Uint8Array(fileData), body.length);
    const footer = `\r\n--${boundary}--\r\n`;
    finalBody.set(
      new TextEncoder().encode(footer),
      body.length + fileData.byteLength,
    );

    const response = await fetch(
      `${DRIVE_API_UPLOAD_BASE}/files/${fileId}?uploadType=multipart`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
          "Content-Length": finalBody.length.toString(),
        },
        body: finalBody,
      },
    );

    if (!response.ok) {
      throw new Error(`Update failed: ${response.statusText}`);
    }

    const result = await response.json();
    return { success: true, fileId: result.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

export const listGoogleDriveFiles = async (
  authManager: GoogleDriveAuthManager,
  pageSize: number = 1000,
  pageToken?: string,
): Promise<{
  success: boolean;
  files?: Array<{
    id: string;
    name: string;
    modifiedTime: string;
    mimeType: string;
  }>;
  nextPageToken?: string;
  error?: Error;
}> => {
  try {
    const accessToken = authManager.getAccessToken();
    if (!accessToken) {
      throw new Error("No access token");
    }

    const params = new URLSearchParams({
      // Consider adding 'appDataFolder' in parents and
      q: "name contains '.excalidraw' and trashed=false",
      fields:
        "files(id,name,mimeType,modifiedTime,parents,owners,appProperties), nextPageToken",
      pageSize: pageSize.toString(),
      ...(pageToken && { pageToken }),
      orderBy: "modifiedTime desc",
    });

    const response = await fetch(
      `${DRIVE_API_BASE}/files?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`List failed: ${response.statusText}`);
    }

    const result = await response.json();
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

export const googleDriveAuthAtom = atom<GoogleDriveAuthManager | null>(null);
export const googleDriveFilesAtom = atom<
  Array<{
    id: string;
    name: string;
    modifiedTime: string;
    mimeType: string;
  }>
>([]);
export const currentFileId = atom<string | null>(null);
export const googleDriveSaveStatusAtom = atom<
  "idle" | "saving" | "saved" | "error"
>("idle");
export const googleDriveLastSavedAtom = atom<Date | null>(null);
