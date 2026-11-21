import * as React from 'react';

export interface ToastMessage {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  duration?: number;
}

type ToastListener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
const listeners: Set<ToastListener> = new Set();

function emitChange() {
  listeners.forEach((listener) => listener([...toasts]));
}

export function toast({
  title,
  description,
  variant = 'default',
  duration = 3500,
}: Omit<ToastMessage, 'id'>) {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: ToastMessage = { id, title, description, variant, duration };

  toasts = [newToast, ...toasts.slice(0, 3)]; // Keep max 4 toasts
  emitChange();

  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }

  return id;
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emitChange();
}

export function useToast() {
  const [activeToasts, setActiveToasts] = React.useState<ToastMessage[]>(toasts);

  React.useEffect(() => {
    listeners.add(setActiveToasts);
    return () => {
      listeners.delete(setActiveToasts);
    };
  }, []);

  return { toasts: activeToasts, toast, dismissToast };
}

