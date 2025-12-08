import React, { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import {
  CloudCheckIcon,
  CloudOffIcon,
  CloudIcon,
} from "@excalidraw/excalidraw/components/icons";
import { useTunnels } from "@excalidraw/excalidraw/context/tunnels";

import "./CloudSaveStatus.scss";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface CloudSaveStatusProps {
  fileName: string;
  onNameChange: (newName: string) => void;
  status: SaveStatus;
  lastSavedTime?: Date;
}

const CloudSaveStatus: React.FC<CloudSaveStatusProps> = ({
  fileName,
  onNameChange,
  status,
  lastSavedTime,
}) => {
  const { CloudSaveStatus } = useTunnels();

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(fileName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedName(fileName);
  }, [fileName]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.click();
      inputRef.current.select();
    }
  }, [isEditing, inputRef]);

  const handleSave = () => {
    if (editedName.trim()) {
      onNameChange(editedName.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditedName(fileName);
      setIsEditing(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "saving":
        return CloudIcon;
      case "saved":
        return CloudCheckIcon;
      case "error":
        return CloudOffIcon;
      default:
        return CloudIcon;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "saving":
        return "Saving...";
      case "saved":
        return lastSavedTime
          ? `Saved ${formatTime(lastSavedTime)}`
          : "Saved to cloud";
      case "error":
        return "Failed to save";
      default:
        return "";
    }
  };

  return (
    <CloudSaveStatus.In>
      <div className="cloud-save-status">
        <div className="cloud-save-status__content">
          {/* {isEditing ? ( */}
          <input
            ref={inputRef}
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="cloud-save-status__input"
            placeholder="Enter file name"
            id="drawing-title"
          />
          {/* ) : (
            <span
              className="cloud-save-status__name"
              onClick={() => setIsEditing(true)}
              title="Click to edit name"
            >
              {fileName}
            </span>
          )} */}
        </div>

        <div
          className={clsx(
            "cloud-save-status__status",
            `cloud-save-status__status--${status}`,
          )}
        >
          {/* {getStatusIcon()} */}
          <div className="cloud-save-status__icon">{getStatusIcon()}</div>
          {getStatusText() && (
            <span className="cloud-save-status__status-text">
              {/* {getStatusText()} */}
            </span>
          )}
        </div>
      </div>
    </CloudSaveStatus.In>
  );
};

const formatTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return "just now";
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString();
};

CloudSaveStatus.displayName = "CloudSaveStatus";
export default CloudSaveStatus;
