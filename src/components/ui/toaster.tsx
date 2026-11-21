import { useToast, dismissToast } from './use-toast';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Toaster() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-h-screen w-full max-w-sm flex-col-reverse gap-2 pointer-events-none p-4">
      {toasts.map((t) => {
        const isSuccess = t.variant === 'success';
        const isDestructive = t.variant === 'destructive';
        const isWarning = t.variant === 'warning';

        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-xl transition-all',
              isSuccess && 'border-emerald-500/40 bg-emerald-950/90 text-white',
              isDestructive && 'border-red-500/40 bg-red-950/90 text-white',
              isWarning && 'border-amber-500/40 bg-amber-950/90 text-white',
              !isSuccess && !isDestructive && !isWarning && 'border-border bg-card text-card-foreground'
            )}
          >
            {isSuccess && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />}
            {isDestructive && <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />}
            {isWarning && <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />}
            {!isSuccess && !isDestructive && !isWarning && <Info className="h-5 w-5 text-brand shrink-0 mt-0.5" />}

            <div className="flex-1">
              {t.title && <h5 className="font-bold text-sm leading-snug">{t.title}</h5>}
              {t.description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.description}</p>}
            </div>

            <button
              onClick={() => dismissToast(t.id)}
              className="text-muted-foreground hover:text-foreground rounded p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

