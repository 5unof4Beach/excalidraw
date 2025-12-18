import clsx from "clsx";

import { useAtom } from "excalidraw-app/app-jotai";

import { leftSidebarStateAtom } from "./sidebar-left-state";

import "./SidebarTrigger.scss";

import type { SidebarTriggerProps } from "./common";
import useBetterAuth from "excalidraw-app/hooks/useBetterAuth";

export const SidebarTriggerLeft = ({
  name,
  tab,
  icon,
  title,
  children,
  onToggle,
  className,
  style,
}: SidebarTriggerProps) => {
  const [sideBarState, setSideBarState] = useAtom(leftSidebarStateAtom);
  const { session } = useBetterAuth();

  return (
    session && (
      <label title={title} className="sidebar-trigger__label-element">
        <input
          className="ToolIcon_type_checkbox"
          type="checkbox"
          onChange={(event) => {
            document
              .querySelector(".layer-ui__wrapper")
              ?.classList.remove("animate");
            const isOpen = event.target.checked;
            setSideBarState((prev) => {
              return {
                isOpen: !prev.isOpen,
              };
            });
            onToggle?.(isOpen);
          }}
          checked={!sideBarState.isOpen}
          aria-label={title}
          aria-keyshortcuts="0"
        />
        <div className={clsx("sidebar-trigger", className)} style={style}>
          {icon && <div>{icon}</div>}
          {children && <div className="sidebar-trigger__label">{children}</div>}
        </div>
      </label>
    )
  );
};
SidebarTriggerLeft.displayName = "SidebarTriggerLeft";
