import React, { useState, useEffect } from "react";
import { DrawingsModal, type Drawing } from "./DrawingsModal";
import { listGoogleDriveFiles } from "../data/googleDrive";
import type { GoogleDriveAuthManager } from "../data/googleDrive";
import type { SidebarItem } from "./AppSidebarLeft";

interface DrawingsModalButtonProps {
  authManager: GoogleDriveAuthManager | null;
  onSelectDrawing: (drawing: Drawing) => void;
  drawings: SidebarItem[];
  children?: React.ReactNode;
}

export const DrawingsModalButton: React.FC<DrawingsModalButtonProps> = ({
  authManager,
  onSelectDrawing,
  drawings,
  children = "Open Drawing",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
