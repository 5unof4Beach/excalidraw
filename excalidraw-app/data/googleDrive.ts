// import { google } from "googleapis";
// import type { Auth } from "googleapis";

import { compressData } from "@excalidraw/excalidraw/data/encode";
import { decompressData } from "@excalidraw/excalidraw/data/encode";

import * as ggdriveapi from "@googleapis/drive";

import type { drive_v3 } from "@googleapis/drive";

// interface GoogleDriveAuthState {
//   accessToken: string | null;
//   refreshToken: string | null;
//   expiresAt: number | null;
//   idToken?: string;
//   clientId: string;
//   clientSecret?: string; // server-side only if using refresh token endpoint
// }

// export class GoogleDriveAuthManager {
//   private oauth2Client: Auth.OAuth2Client;

//   constructor(clientId: string, clientSecret: string, redirectUri: string) {
//     this.oauth2Client = new google.auth.OAuth2(
//       clientId,
//       clientSecret,
//       redirectUri,
//     );

//     // Automatically save new tokens when refreshed
//     this.oauth2Client.on("tokens", (tokens) => {
//       if (tokens.refresh_token) {
//         localStorage.setItem("gd_refresh_token", tokens.refresh_token);
//       }
//       localStorage.setItem("gd_access_token", tokens.access_token || "");
//       localStorage.setItem(
//         "gd_expires_at",
//         (tokens.expiry_date || 0).toString(),
//       );
//     });
//   }

//   generateAuthUrl(): string {
//     return this.oauth2Client.generateAuthUrl({
//       access_type: "offline",
//       scope: ["https://www.googleapis.com/auth/drive.file"],
//       prompt: "consent",
//     });
//   }

//   async getTokensFromCode(code: string): Promise<GoogleDriveAuthState> {
//     const { tokens } = await this.oauth2Client.getToken(code);
//     this.oauth2Client.setCredentials(tokens);

//     return {
//       accessToken: tokens.access_token || null,
//       refreshToken: tokens.refresh_token || null,
//       expiresAt: tokens.expiry_date || null,
//       idToken: tokens.id_token,
//       clientId: this.oauth2Client._clientId || "",
//     };
//   }

//   setCredentials(tokens: GoogleDriveAuthState): void {
//     this.oauth2Client.setCredentials({
//       access_token: tokens.accessToken || undefined,
//       refresh_token: tokens.refreshToken || undefined,
//       expiry_date: tokens.expiresAt || undefined,
//       id_token: tokens.idToken,
//     });
//   }

//   async refreshAccessToken(): Promise<string> {
//     const { token } = await this.oauth2Client.refreshAccessToken();
//     return token || "";
//   }

//   async revokeAccess(): Promise<void> {
//     await this.oauth2Client.revokeCredentials();
//     localStorage.removeItem("gd_access_token");
//     localStorage.removeItem("gd_refresh_token");
//     localStorage.removeItem("gd_expires_at");
//   }

//   getClient(): Auth.OAuth2Client {
//     return this.oauth2Client;
//   }
// }

// export const initializeGoogleDrive = (
//   clientId: string,
//   clientSecret: string,
//   redirectUri: string,
// ): GoogleDriveAuthManager => {
//   return new GoogleDriveAuthManager(clientId, clientSecret, redirectUri);
// };

// File Operations (using drive_v3.Drive API)
export const saveToGoogleDrive = async (
  driveClient: drive_v3.Drive,
  elements: ExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
  fileMetadata?: GDFileMetadata,
): Promise<GDSaveResult> => {
  try {
    const data = {
      type: "excalidraw",
      version: 2,
      elements,
      appState,
      files,
      metadata: fileMetadata,
    };

    // Compress data for storage efficiency
    const compressed = await compressData(JSON.stringify(data));
    const blob = new Blob([compressed], {
      type: "application/vnd.excalidraw+json",
    });

    // Use drive_v3.Params$Resource$Files$Create
    const response = await driveClient.files.create({
      requestBody: {
        name: appState.name || "Untitled.excalidraw",
        mimeType: "application/vnd.excalidraw+json",
        parents: ["appDataFolder"], // Save in app data folder
      },
      media: {
        mimeType: "application/vnd.excalidraw+json",
        body: blob as any,
      },
    });

    return {
      success: true,
      fileId: response.data.id || "",
      fileHandle: {
        fileId: response.data.id || "",
        name: response.data.name || "",
        mimeType: response.data.mimeType || "",
        metadata: fileMetadata || {},
      },
    };
  } catch (error) {
    return {
      success: false,
      fileId: "",
      fileHandle: { fileId: "", name: "", mimeType: "", metadata: {} },
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

export const loadFromGoogleDrive = async (
  driveClient: drive_v3.Drive,
  fileId: string,
): Promise<GDLoadResult> => {
  try {
    // Use drive_v3.Params$Resource$Files$Get with alt: 'media'
    const response = await driveClient.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" },
    );

    const compressed = new Uint8Array(response.data as ArrayBuffer);
    const decompressed = await decompressData(compressed);
    const data = JSON.parse(new TextDecoder().decode(decompressed));

    return {
      success: true,
      data,
      fileId,
      metadata: data.metadata || {},
    };
  } catch (error) {
    return {
      success: false,
      data: null as any,
      fileId,
      metadata: {},
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

export const listGoogleDriveFiles = async (
  driveClient: drive_v3.Drive,
  query?: string,
): Promise<GDFile[]> => {
  try {
    // Use drive_v3.Params$Resource$Files$List
    const response = await driveClient.files.list({
      spaces: "appDataFolder",
      fields: "files(id, name, mimeType, createdTime, modifiedTime, size)",
      pageSize: 50,
      q: query || "mimeType = 'application/vnd.excalidraw+json'",
    });

    return (
      response.data.files?.map((f) => ({
        id: f.id || "",
        name: f.name || "",
        mimeType: f.mimeType || "",
        createdTime: f.createdTime || "",
        modifiedTime: f.modifiedTime || "",
        size: f.size,
      })) || []
    );
  } catch (error) {
    console.error("Error listing files:", error);
    return [];
  }
};

export const deleteFromGoogleDrive = async (
  driveClient: drive_v3.Drive,
  fileId: string,
): Promise<void> => {
  await driveClient.files.delete({ fileId });
};

// Utility functions
export const isGoogleDriveAuthenticated = (): boolean => {
  return !!localStorage.getItem("gd_access_token");
};

export const getGoogleDriveUserInfo = async (
  driveClient: drive_v3.Drive,
): Promise<GoogleUserInfo> => {
  const about = await driveClient.about.get({ fields: "user" });
  return {
    id: about.data.user?.permissionId || "",
    email: about.data.user?.emailAddress || "",
    name: about.data.user?.displayName || "",
    picture: about.data.user?.photoLink || undefined,
  };
};
