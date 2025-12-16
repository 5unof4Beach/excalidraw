import React, { useState, useCallback, useMemo, memo } from "react";
import clsx from "clsx";
import { CloseIcon } from "@excalidraw/excalidraw/components/icons";
import { VirtuosoGrid } from "react-virtuoso";
import { VirtuosoMasonry } from "@virtuoso.dev/masonry";

import { useAtomValue } from "excalidraw-app/app-jotai";
import { currentFile } from "excalidraw-app/data/googleDrive";

import "./DrawingsModal.scss";

import type { SidebarItem } from "./AppSidebarLeft";

interface DrawingsModalProps {
  isOpen: boolean;
  drawings: SidebarItem[];
  isLoading?: boolean;
  onClose: () => void;
  onSelectDrawing: (drawing: SidebarItem) => void;
}

interface MasonryItemProps {
  context: {
    handleSelectDrawing: (d: SidebarItem) => void;
  };
  index: number;
  drawing: SidebarItem;
}

export const DrawingsModal: React.FC<DrawingsModalProps> = ({
  isOpen,
  drawings,
  isLoading = false,
  onClose,
  onSelectDrawing,
}) => {
  const handleSelectDrawing = useCallback(
    (drawing: SidebarItem) => {
      onSelectDrawing(drawing);
    },
    [onSelectDrawing],
  );

  const MansoryItemContent = memo(
    ({ context, index, drawing }: MasonryItemProps) => {
      console.log("Rendering drawing in masonry:", drawing.id);
      const selectedFile = useAtomValue(currentFile);
      return (
        <DrawingItem
          drawing={drawing}
          isSelected={drawing.id === selectedFile?.id}
          onSelect={context.handleSelectDrawing}
        />
      );
    },
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="drawings-modal-overlay" onClick={onClose}>
      <div className="drawings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="drawings-modal__header">
          <h2 className="drawings-modal__title">My Drawings</h2>
          <button
            className="drawings-modal__close"
            onClick={onClose}
            aria-label="Close modal"
          >
            {CloseIcon}
          </button>
        </div>

        <div className="drawings-modal__content">
          {isLoading ? (
            <div className="drawings-modal__loading">
              <div className="drawings-modal__spinner" />
              <p>Loading your drawings...</p>
            </div>
          ) : drawings.length === 0 ? (
            <div className="drawings-modal__empty">
              <p>No drawings found</p>
            </div>
          ) : (
            // <VirtuosoGrid
            //   style={{ height: "80vh" }}
            //   data={drawings}
            //   itemContent={(index, drawing) => {
            //     console.log("Rendering drawing:", drawing.id);
            //     return (
            //       <DrawingItem
            //         drawing={drawing}
            //         isSelected={selectedId === drawing.id}
            //         onSelect={handleSelectDrawing}
            //       />
            //     );
            //   }}
            //   listClassName="drawings-grid__list"
            //   itemClassName="drawings-grid__item"
            //   components={{
            //     List: React.forwardRef(({ style, children }, ref) => (
            //       <div
            //         ref={ref}
            //         style={{
            //           ...style,
            //           display: "grid",
            //           gridTemplateColumns:
            //             "repeat(auto-fill, minmax(160px, 1fr))",
            //           gap: "16px",
            //           padding: "16px",
            //         }}
            //       >
            //         {children}
            //       </div>
            //     )),
            //   }}
            // />
            <VirtuosoMasonry
              columnCount={3}
              data={drawings}
              style={{ height: "80vh" }}
              initialItemCount={drawings.length}
              context={{ handleSelectDrawing }}
              ItemContent={({ context, index, data: drawing }) => {
                return (
                  <MansoryItemContent
                    context={context}
                    index={index}
                    drawing={drawing}
                  />
                );
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

interface DrawingItemProps {
  drawing: SidebarItem;
  isSelected: boolean;
  onSelect: (drawing: SidebarItem) => void;
}

const DrawingItem: React.FC<DrawingItemProps> = ({
  drawing,
  isSelected,
  onSelect,
}) => {
  return (
    <div style={{ padding: "0.25rem", backgroundColor: "transparent" }}>
      <button
        className={clsx("drawing-card", {
          "drawing-card--selected": isSelected,
        })}
        onClickCapture={(e) => {
          e.preventDefault();
          onSelect(drawing);
        }}
      >
        <div className="drawing-card__image-wrapper">
          {drawing.thumbnailLink ? (
            <img
              src={drawing.thumbnailLink}
              alt={drawing.name ?? "Drawing thumbnail"}
              className="drawing-card__thumbnail"
            />
          ) : (
            <div className="drawing-card__thumbnail drawing-card__thumbnail--placeholder">
              📄
            </div>
          )}
          {isSelected && <div className="drawing-card__checkmark">✓</div>}
        </div>
        <div className="drawing-card__content">
          <p className="drawing-card__name" title={drawing.name ?? ""}>
            {drawing.name}
          </p>
          <p className="drawing-card__time">{drawing.modifiedTime}</p>
        </div>
      </button>
    </div>
  );
};
