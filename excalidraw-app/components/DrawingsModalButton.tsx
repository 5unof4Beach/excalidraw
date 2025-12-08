import React, { useState, useEffect } from "react";
import { DrawingsModal, type Drawing } from "./DrawingsModal";
import { listGoogleDriveFiles } from "../data/googleDrive";
import type { GoogleDriveAuthManager } from "../data/googleDrive";

interface DrawingsModalButtonProps {
  authManager: GoogleDriveAuthManager | null;
  onSelectDrawing: (drawing: Drawing) => void;
  children?: React.ReactNode;
}

export const DrawingsModalButton: React.FC<DrawingsModalButtonProps> = ({
  authManager,
  onSelectDrawing,
  children = "Open Drawing",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && authManager) {
      fetchDrawings();
    }
  }, [isOpen, authManager]);

  const fetchDrawings = async () => {
    if (!authManager) return;

    setIsLoading(true);
    try {
      const result = await listGoogleDriveFiles(authManager);
      if (result.success && result.files) {
        const formattedDrawings: Drawing[] = result.files.map((file) => ({
          id: file.id,
          name: file.name,
          modifiedTime: new Date(file.modifiedTime).toLocaleDateString(),
          mimeType: file.mimeType,
        }));
        setDrawings(formattedDrawings);
      }
    } catch (error) {
      console.error("Failed to fetch drawings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="drawings-modal-trigger"
        title="Open a drawing"
      >
        {children}
      </button>

      <DrawingsModal
        isOpen={isOpen}
        drawings={drawings}
        isLoading={isLoading}
        onClose={() => setIsOpen(false)}
        onSelectDrawing={onSelectDrawing}
      />
    </>
  );
};
