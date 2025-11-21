import { Sidebar } from "@excalidraw/excalidraw";
import {
  messageCircleIcon,
  presentationIcon,
} from "@excalidraw/excalidraw/components/icons";
import { useUIAppState } from "@excalidraw/excalidraw/context/ui-appState";
import { DefaultSidebarLeft } from "@excalidraw/excalidraw/components/DefaultSidebarLeft";

import { useTunnels } from "@excalidraw/excalidraw/context/tunnels";

import "./AppSidebar.scss";

export const AppSidebarLeft = () => {
  const { LeftSidebar } = useTunnels();
  const { theme, openSidebar } = useUIAppState();

  return (
    <LeftSidebar.In>
      <DefaultSidebarLeft docked>
        <DefaultSidebarLeft.TabTriggers>
          <Sidebar.TabTrigger
            tab="comments"
            style={{ opacity: openSidebar?.tab === "comments" ? 1 : 0.4 }}
          >
            {messageCircleIcon}
          </Sidebar.TabTrigger>
          <Sidebar.TabTrigger
            tab="presentation"
            style={{ opacity: openSidebar?.tab === "presentation" ? 1 : 0.4 }}
          >
            {presentationIcon}
          </Sidebar.TabTrigger>
        </DefaultSidebarLeft.TabTriggers>
      </DefaultSidebarLeft>
    </LeftSidebar.In>
  );
};
