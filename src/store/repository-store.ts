import { create } from "zustand";

interface RepositoryState {
  selectedRepositoryId: string | null;
  selectedNodeId: string | null;
  selectRepository: (id: string | null) => void;
  selectNode: (id: string | null) => void;
}

export const useRepositoryStore = create<RepositoryState>((set) => ({
  selectedRepositoryId: "atlas-web",
  selectedNodeId: null,
  selectRepository: (selectedRepositoryId) => set({ selectedRepositoryId }),
  selectNode: (selectedNodeId) => set({ selectedNodeId }),
}));
