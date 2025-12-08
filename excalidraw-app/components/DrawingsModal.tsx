import React, { useState, useCallback, useMemo } from "react";
import clsx from "clsx";
import { CloseIcon } from "@excalidraw/excalidraw/components/icons";

import VirtualizedGrid from "./VirtualizedGrid";
import "./DrawingsModal.scss";

export interface Drawing {
  id: string;
  name: string;
  modifiedTime: string;
  mimeType: string;
  thumbnail?: string;
}

interface DrawingsModalProps {
  isOpen: boolean;
  drawings: Drawing[];
  isLoading?: boolean;
  onClose: () => void;
  onSelectDrawing: (drawing: Drawing) => void;
}

export const DrawingsModal: React.FC<DrawingsModalProps> = ({
  isOpen,
  drawings,
  isLoading = false,
  onClose,
  onSelectDrawing,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelectDrawing = useCallback(
    (drawing: Drawing) => {
      setSelectedId(drawing.id);
      onSelectDrawing(drawing);
    },
    [onSelectDrawing],
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
            <VirtualizedGrid
              items={drawings}
              renderItem={(drawing, isSelected) => (
                <DrawingItem
                  drawing={drawing}
                  isSelected={isSelected}
                  onSelect={handleSelectDrawing}
                />
              )}
              selectedId={selectedId}
            />
          )}
        </div>
      </div>
    </div>
  );
};

interface DrawingItemProps {
  drawing: Drawing;
  isSelected: boolean;
  onSelect: (drawing: Drawing) => void;
}

const DrawingItem: React.FC<DrawingItemProps> = ({
  drawing,
  isSelected,
  onSelect,
}) => {
  return (
    <button
      className={clsx("drawing-card", {
        "drawing-card--selected": isSelected,
      })}
      onClick={() => onSelect(drawing)}
    >
      <div className="drawing-card__image-wrapper">
        {drawing.thumbnail ? (
          <img
            src={drawing.thumbnail}
            alt={drawing.name}
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
        <p className="drawing-card__name" title={drawing.name}>
          {drawing.name}
        </p>
        <p className="drawing-card__time">{drawing.modifiedTime}</p>
      </div>
    </button>
  );
};
