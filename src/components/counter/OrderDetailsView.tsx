import React, { useState } from 'react';
import { Order, PaymentMethod } from '@/lib/types';
import { formatCurrency, formatTimeAgo, formatClockTime } from '@/lib/utils';
import { PaymentSection } from './PaymentSection';
import { ThermalReceiptModal } from '@/components/common/ThermalReceiptModal';
import { Button } from '@/components/ui/button';
import {
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderDetailsViewProps {
  order: Order | null;
  onAccept: (orderId: string) => void;
  onPaymentConfirm: (orderId: string, paymentData: any) => void;
  onComplete: (orderId: string) => void;
  onVoid: (orderId: string) => void;
  isProcessing?: boolean;
}

export const OrderDetailsView: React.FC<OrderDetailsViewProps> = ({
  order,
  onAccept,
  onPaymentConfirm,
  onComplete,
  onVoid,
  isProcessing,
}) => {
  const [showReceipt, setShowReceipt] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);

  if (!order) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 rounded-2xl border border-border bg-card/60 text-center text-muted-foreground select-none">
        <div className="text-5xl mb-3 opacity-40">🎫</div>
        <h4 className="font-extrabold text-base text-foreground">No Token Selected</h4>
        <p className="text-xs max-w-xs mt-1">
          Select an incoming token from the left queue to verify items and collect payment.
        </p>
      </div>
    );
  }

  const isNew = order.status === 'NEW';
  const isAccepted = order.status === 'ACCEPTED';
  const isPaid = order.status === 'PAID';
  const isCompleted = order.status === 'COMPLETED';
  const isVoid = order.status === 'VOID';

  return (
    <>
      <div className="flex flex-col h-full min-h-0 rounded-2xl border border-border bg-card p-3 sm:p-4 select-none overflow-hidden justify-between">
        {/* Header (Matching Image 2) */}
        <div className="flex items-start justify-between pb-2.5 sm:pb-3 border-b border-border shrink-0">
          <div>
            <div className="text-[11px] uppercase font-extrabold tracking-wider text-muted-foreground">
              Token
            </div>
            <div className="flex items-center gap-2.5 mt-0.5">
              <span className="font-mono font-black text-2xl sm:text-3xl text-foreground tracking-tight">
                {order.token_number}
              </span>

              {/* Status Badge */}
              {isNew && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  <Clock className="h-3 w-3" /> Pending
                </span>
              )}
              {isAccepted && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  <ArrowRight className="h-3 w-3" /> Accepted
                </span>
              )}
              {isPaid && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  <Check className="h-3 w-3" /> Paid
                </span>
              )}
              {isCompleted && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3" /> Completed
                </span>
              )}
              {isVoid && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                  <XCircle className="h-3 w-3" /> Cancelled
                </span>
              )}
            </div>

            <div className="text-[11px] text-muted-foreground mt-0.5">
              Received {formatTimeAgo(order.created_at)} • {formatClockTime(order.created_at)} • {order.counter_id}
            </div>
          </div>

          {/* Action header icons */}
          <button
            onClick={() => setShowReceipt(true)}
            className="p-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Print Token Slip"
          >
            <Printer className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Order Items list (Scrollable Middle with guaranteed containment) */}
        <div className="flex-1 flex flex-col min-h-0 my-2.5 overflow-hidden">
          <div className="text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 shrink-0">
            Order Items ({order.items?.length || 0})
          </div>

          <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-1.5 min-h-0">
            {order.items?.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/50"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.product_name}
                      className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg object-cover bg-muted border border-border shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <h5 className="font-extrabold text-xs sm:text-sm text-foreground truncate">
                      {item.product_name}
                    </h5>
                    <p className="text-[11px] text-muted-foreground">
                      {formatCurrency(item.unit_price)} × {item.quantity}
                    </p>
                  </div>
                </div>

                <div className="font-black text-xs sm:text-sm text-foreground shrink-0 pl-2">
                  {formatCurrency(item.subtotal)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total Amount Box & Actions (Guaranteed pinned at Bottom, NEVER clipped) */}
        <div className="shrink-0 pt-2 border-t border-border mt-auto">
          <div className="flex items-baseline justify-between mb-2 p-2 sm:p-2.5 rounded-xl bg-muted/50 border border-border">
            <span className="text-xs sm:text-sm font-extrabold text-muted-foreground">
              Total Amount
            </span>
            <span className="text-xl sm:text-2xl font-black text-foreground">
              {formatCurrency(order.total_amount)}
            </span>
          </div>

          {/* DYNAMIC ACTION BUTTONS ACCORDING TO STATE MACHINE */}
          {/* STATE 1 & 2: NEW or ACCEPTED -> 1-Tap Approve & Complete */}
          {(isNew || isAccepted) && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  onClick={() => onComplete(order.id)}
                  disabled={isProcessing}
                  variant="success"
                  className="flex-1 h-12 rounded-xl text-xs sm:text-sm font-black shadow-lg flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <CheckCircle2 className="h-4.5 w-4.5" />
                  <span>1-Tap Approve & Deduct Stock</span>
                </Button>

                <Button
                  onClick={() => onVoid(order.id)}
                  disabled={isProcessing}
                  variant="destructive"
                  className="px-3.5 sm:px-4 h-12 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-500 text-white"
                >
                  <XCircle className="h-4.5 w-4.5" />
                  <span>Cancel</span>
                </Button>
              </div>

              {/* Collapsible custom UPI payment option */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                  className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground py-1"
                >
                  {showPaymentDetails ? '▲ Hide Custom Payment' : '▼ Or Record UPI / Split Payment'}
                </button>
                {showPaymentDetails && (
                  <div className="mt-2">
                    <PaymentSection
                      totalAmount={order.total_amount}
                      isProcessing={isProcessing}
                      onConfirmPayment={async (paymentData) => {
                        await onPaymentConfirm(order.id, paymentData);
                        await onComplete(order.id);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STATE 3: PAID -> Ready to complete and deduct stock */}
          {isPaid && (
            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Payment recorded! Press Complete Order to hand toys to customer & deduct inventory.</span>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => onComplete(order.id)}
                  disabled={isProcessing}
                  variant="success"
                  className="flex-1 h-12 sm:h-13 rounded-xl text-base font-black shadow-xl flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Complete Order (Deduct Inventory)</span>
                </Button>
              </div>
            </div>
          )}

          {/* STATE 4: COMPLETED (Locked) */}
          {isCompleted && (
            <div className="p-3 sm:p-4 rounded-xl bg-muted/70 border border-border text-center space-y-1.5">
              <div className="flex items-center justify-center gap-2 text-sm font-black text-emerald-400">
                <Lock className="h-4 w-4" /> Order Completed & Locked
              </div>
              <p className="text-xs text-muted-foreground">
                Inventory successfully deducted. Receipt can be re-printed anytime.
              </p>
              <Button
                onClick={() => setShowReceipt(true)}
                variant="outline"
                className="w-full mt-1.5 font-bold flex items-center justify-center gap-2 h-10"
              >
                <Printer className="h-4 w-4" /> Print Thermal Receipt
              </Button>
            </div>
          )}

          {/* STATE 5: VOID */}
          {isVoid && (
            <div className="p-3 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
              <div className="text-sm font-black text-red-400 flex items-center justify-center gap-1.5">
                <XCircle className="h-4 w-4" /> Order Cancelled & Token Voided
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Token was kept in sequence to prevent reuse.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Printable Receipt Modal */}
      <ThermalReceiptModal
        order={order}
        open={showReceipt}
        onClose={() => setShowReceipt(false)}
      />
    </>
  );
};

