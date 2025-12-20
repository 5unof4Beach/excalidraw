import clsx from "clsx";

import { CANVAS_SEARCH_TAB, LEFT_SIDEBAR } from "@excalidraw/common";

import type { MarkOptional, Merge } from "@excalidraw/common/utility-types";

import { useTunnels } from "../context/tunnels";
import { useUIAppState } from "../context/ui-appState";

import "../components/dropdownMenu/DropdownMenu.scss";

import "./DefaultSidebarLeft.scss";

import { useExcalidrawSetAppState } from "./App";
import { withInternalFallback } from "./hoc/withInternalFallback";

import { SidebarLeft } from "./Sidebar/SidebarLeft";

import type { SidebarProps, SidebarTriggerProps } from "./Sidebar/common";

const DefaultSidebarLeftTrigger = withInternalFallback(
  "DefaultSidebarLeftTrigger",
  (
    props: Omit<SidebarTriggerProps, "name"> &
      React.HTMLAttributes<HTMLDivElement>,
  ) => {
    const { DefaultSidebarLeftTriggerTunnel } = useTunnels();
    return (
      <DefaultSidebarLeftTriggerTunnel.In>
        <SidebarLeft.Trigger
          {...props}
          className="default-sidebar-left-trigger"
          name={LEFT_SIDEBAR.name}
        />
      </DefaultSidebarLeftTriggerTunnel.In>
    );
  },
);
DefaultSidebarLeftTrigger.displayName = "DefaultSidebarLeftTrigger";

const DefaultTabTriggers = ({ children }: { children: React.ReactNode }) => {
  const { DefaultSidebarTabTriggersTunnel } = useTunnels();
  return (
    <DefaultSidebarTabTriggersTunnel.In>
      {children}
    </DefaultSidebarTabTriggersTunnel.In>
  );
};
DefaultTabTriggers.displayName = "DefaultTabTriggers";

export const DefaultSidebarLeft = Object.assign(
  withInternalFallback(
    "DefaultSidebarLeft",
    ({
      children,
      className,
      onDock,
      docked,
      ...rest
    }: Merge<
      MarkOptional<Omit<SidebarProps, "name">, "children">,
      {
        /** pass `false` to disable docking */
        onDock?: SidebarProps["onDock"] | false;
      }
    >) => {
      const appState = useUIAppState();
      const setAppState = useExcalidrawSetAppState();

      const { DefaultSidebarTabTriggersTunnel } = useTunnels();

      const isForceDocked = appState.openSidebar?.tab === CANVAS_SEARCH_TAB;

      return (
        <SidebarLeft
          {...rest}
          name="default-left"
          key="default-left"
          className={clsx("default-sidebar", className)}
          docked={docked}
        >
          {children}
        </SidebarLeft>
      );
    },
  ),
  {
    Trigger: DefaultSidebarLeftTrigger,
    TabTriggers: DefaultTabTriggers,
  },
);
