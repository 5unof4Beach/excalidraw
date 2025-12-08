import { FileManager } from "./FileManager";

import { GoogleDriveAuthManager } from "./googleDrive";

export class GoogleDriveManager extends FileManager {}

export class GoogleDriveData {
  private _authManager: GoogleDriveAuthManager;

  constructor(tokenData: {
    accessToken: string;
    accessTokenExpiresAt: Date | undefined;
    scopes: string[];
    idToken: string | undefined;
  }) {
    this._authManager = new GoogleDriveAuthManager(tokenData.accessToken);
  }

  getAuthManager() {
    return this._authManager;
  }

  static fileStorage = new GoogleDriveManager({
    getFiles: async (fileIds) => {
      return { loadedFiles: [], erroredFiles: new Map() };
    },
    saveFiles: async ({ addedFiles }) => {
      return { savedFiles: new Map(), erroredFiles: new Map() };
    },
  });
}
