import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  open,
  onClose,
}) => {
  const shortcuts = [
    { key: 'F1', label: 'POS / Billing', desc: 'Jump to Product Grid and Cart' },
    { key: 'F2', label: 'Tokens (Live)', desc: 'Jump to Desktop Billing Queue' },
    { key: 'F3', label: 'Generate Token', desc: 'Instantly create order and token' },
    { key: 'F4', label: 'Approve / Pay', desc: 'Accept or complete active token' },
    { key: '/', label: 'Search Item', desc: 'Focus instant product search' },
    { key: 'Esc', label: 'Close / Cancel', desc: 'Dismiss modals and reset input' },
    { key: 'Barcode', label: 'Scanner Ready', desc: 'Scan any toy barcode directly to add to cart' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6" onClose={onClose}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-brand" />
            <DialogTitle>Speed Keyboard Shortcuts</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-2 mt-4">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors"
            >
              <div>
                <span className="font-semibold text-sm text-foreground">{s.label}</span>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <kbd className="px-2.5 py-1 text-xs font-mono font-bold bg-card border border-border rounded-lg shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} variant="default" className="w-full">
            Got it, Let's Sell!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

