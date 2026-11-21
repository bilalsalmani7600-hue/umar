import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface KeyboardShortcutsOptions {
  onGenerateToken?: () => void;
  onAcceptToken?: () => void;
  onClearCart?: () => void;
  onSearchFocus?: () => void;
  onBarcodeScan?: (barcode: string) => void;
}

export function useKeyboardShortcuts({
  onGenerateToken,
  onAcceptToken,
  onClearCart,
  onSearchFocus,
  onBarcodeScan,
}: KeyboardShortcutsOptions = {}) {
  const navigate = useNavigate();

  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in an input/textarea (unless function keys)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // F1 -> POS / Billing
      if (e.key === 'F1') {
        e.preventDefault();
        navigate('/');
        return;
      }

      // F2 -> Live Tokens
      if (e.key === 'F2') {
        e.preventDefault();
        navigate('/tokens');
        return;
      }

      // F3 -> Generate Token
      if (e.key === 'F3') {
        e.preventDefault();
        if (onGenerateToken) {
          onGenerateToken();
        }
        return;
      }

      // F4 -> Accept Token / Pay
      if (e.key === 'F4') {
        e.preventDefault();
        if (onAcceptToken) {
          onAcceptToken();
        }
        return;
      }

      // / or Ctrl+K -> Focus Search
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && !isInput) {
        e.preventDefault();
        if (onSearchFocus) {
          onSearchFocus();
        }
        return;
      }

      // Hardware Barcode Scanner integration
      // Barcode scanners act like rapid keystrokes followed by Enter
      const now = Date.now();
      if (now - lastKeyTime > 100) {
        barcodeBuffer = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter' && barcodeBuffer.length >= 6) {
        if (onBarcodeScan) {
          onBarcodeScan(barcodeBuffer);
        }
        barcodeBuffer = '';
      } else if (e.key.length === 1 && !isInput) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, onGenerateToken, onAcceptToken, onSearchFocus, onBarcodeScan]);
}

