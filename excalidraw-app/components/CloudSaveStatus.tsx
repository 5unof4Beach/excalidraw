import React, { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import {
  CloudCheckIcon,
  CloudOffIcon,
  CloudIcon,
} from "@excalidraw/excalidraw/components/icons";
import { useTunnels } from "@excalidraw/excalidraw/context/tunnels";

import { useAtomValue } from "excalidraw-app/app-jotai";
import {
  GoogleDrive,
  googleDriveSaveStatusAtom,
} from "excalidraw-app/data/googleDrive";

import "./CloudSaveStatus.scss";
import Spinner from "@excalidraw/excalidraw/components/Spinner";

interface CloudSaveStatusProps {
  fileName: string;
  onNameChange: (newName: string) => void;
  lastSavedTime?: Date;
}

const CloudSaveStatus: React.FC<CloudSaveStatusProps> = ({
  fileName,
  onNameChange,
  lastSavedTime,
}) => {
  const { CloudSaveStatus } = useTunnels();

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(fileName);
  const status = useAtomValue(googleDriveSaveStatusAtom);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedName(fileName);
  }, [fileName]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing, inputRef]);

  const handleSave = () => {
    if (editedName.trim()) {
      onNameChange(editedName.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      inputRef.current?.blur();
      setEditedName(fileName);
      setIsEditing(false);
    } else if (e.key === "Enter") {
      inputRef.current?.blur();
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "saving":
        return <Spinner />;
      case "saved":
        return CloudIcon;
      case "idle":
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
      <div
        className="cloud-save-status"
        onClickCapture={(e) => {
          e.preventDefault();
          GoogleDrive.pauseSave("googleDrive");
        }}
      >
        <div className="cloud-save-status__content">
          <input
            ref={inputRef}
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            onClickCapture={(e) => {
              GoogleDrive.pauseSave("googleDrive");
            }}
            className="cloud-save-status__input"
            placeholder="Enter file name"
            id="drawing-title"
          />
        </div>

        <div
          className={clsx(
            "cloud-save-status__status",
            `cloud-save-status__status--${status}`,
          )}
        >
          <div className="cloud-save-status__icon">{getStatusIcon()}</div>
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
