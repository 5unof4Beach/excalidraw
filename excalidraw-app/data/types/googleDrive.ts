// OAuth & Auth types
interface GoogleDriveAuthConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
}

interface GoogleDriveAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  idToken?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// File & Folder types
interface GDFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  owners?: Array<{ displayName: string; emailAddress: string }>;
  size?: string;
  webViewLink?: string;
  version?: number;
}

interface GDFileMetadata {
  excalidrawVersion: string;
  localVersion: number;
  remoteVersion: number;
  lastModifiedBy: string;
  conflictResolutionStrategy: "local" | "remote" | "manual";
}

interface GDFileHandle {
  fileId: string;
  name: string;
  mimeType: string;
  metadata: GDFileMetadata;
}

interface GDSaveResult {
  success: boolean;
  fileId: string;
  fileHandle: GDFileHandle;
  error?: Error;
  conflictInfo?: ConflictInfo;
}

interface GDLoadResult {
  success: boolean;
  // data: ImportedDataState;
  data: any;
  fileId: string;
  metadata: GDFileMetadata;
  error?: Error;
}

interface ConflictInfo {
  localVersion: number;
  remoteVersion: number;
  remoteData: any;
  // remoteData: DataState;
  strategy: "local" | "remote" | "manual";
}

// API Response types (from Google Drive API)
interface GDAPIDriveFile {
  kind: string;
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
}
