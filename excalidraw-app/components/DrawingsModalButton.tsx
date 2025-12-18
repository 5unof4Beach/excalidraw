import React, { useState } from "react";

import { ExpandIcon } from "@excalidraw/excalidraw/components/icons";

import { DrawingsModal } from "./DrawingsModal";

import "./DrawingsModal.scss";

import type { GoogleDriveAuthManager } from "../data/googleDrive";
import type { SidebarItem } from "./AppSidebarLeft";

interface DrawingsModalButtonProps {
  onSelectDrawing: (drawing: SidebarItem) => void;
  drawings: SidebarItem[];
}

export const DrawingsModalButton: React.FC<DrawingsModalButtonProps> = ({
  onSelectDrawing,
  drawings,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="drawings-modal-trigger"
        title="Expand"
      >
        {ExpandIcon}
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
