import { FileManager } from "./FileManager";

export class GoogleDriveManager extends FileManager {
  private authState: GoogleDriveAuthState;
  private rateLimiter: RateLimiter;
  private fileCache: Map<string, CachedGDFile>;

  constructor(clientId: string);

  // Auth management
  authenticate(): Promise<void>
  isAuthenticated(): boolean
  refreshToken(): Promise<void>

  // File operations
  saveFile(
    elements: ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles
  ): Promise<{ fileId: string; fileHandle: GDFileHandle }>

  loadFile(fileId: string): Promise<ImportedDataState>
  listFiles(): Promise<GDFile[]>
  deleteFile(fileId: string): Promise<void>
  updateFileMetadata(fileId: string, metadata: Partial<GDFileMetadata>): Promise<void>

  // Sync & conflict resolution
  checkRemoteChanges(fileId: string, localVersion: number): Promise<boolean>
  resolveConflict(localData: DataState, remoteData: DataState): Promise<DataState>
}
