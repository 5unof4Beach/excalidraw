import { atom } from "excalidraw-app/app-jotai";

export const leftSidebarStateAtom = atom<{ isOpen: boolean }>({
  isOpen: true,
});
