import { create } from "zustand";

interface UiState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  importModalOpen: boolean;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setImportModalOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  importModalOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  setImportModalOpen: (importModalOpen) => set({ importModalOpen }),
}));
