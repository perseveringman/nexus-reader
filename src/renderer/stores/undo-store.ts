import { create } from 'zustand';

export interface UndoAction {
  id: string;
  label: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  timestamp: number;
}

interface UndoState {
  undoStack: UndoAction[];
  redoStack: UndoAction[];
  toastAction: UndoAction | null;
  toastVisible: boolean;
  isProcessing: boolean;
  pushAction: (action: Omit<UndoAction, 'id' | 'timestamp'>) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  dismissToast: () => void;
}

let actionCounter = 0;

export const useUndoStore = create<UndoState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  toastAction: null,
  toastVisible: false,
  isProcessing: false,

  pushAction: (action) => {
    const fullAction: UndoAction = {
      ...action,
      id: `action-${++actionCounter}`,
      timestamp: Date.now(),
    };
    set((state) => ({
      undoStack: [...state.undoStack.slice(-49), fullAction],
      redoStack: [],
      toastAction: fullAction,
      toastVisible: true,
    }));
  },

  undo: async () => {
    const { undoStack, isProcessing } = get();
    if (undoStack.length === 0 || isProcessing) return;

    const action = undoStack[undoStack.length - 1];

    set((state) => ({
      isProcessing: true,
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, action],
      toastAction: { ...action, label: `已撤销: ${action.label}` },
      toastVisible: true,
    }));

    try {
      await action.undo();
    } finally {
      set({ isProcessing: false });
    }
  },

  redo: async () => {
    const { redoStack, isProcessing } = get();
    if (redoStack.length === 0 || isProcessing) return;

    const action = redoStack[redoStack.length - 1];

    set((state) => ({
      isProcessing: true,
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, action],
      toastAction: { ...action, label: `已重做: ${action.label}` },
      toastVisible: true,
    }));

    try {
      await action.redo();
    } finally {
      set({ isProcessing: false });
    }
  },

  dismissToast: () => {
    set({ toastVisible: false });
  },
}));
