import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CreateOrderPayload, TransitionOrderPayload, Order } from '@/lib/types';
import { sound } from '@/lib/soundEngine';
import { toast } from '@/components/ui/use-toast';

// Module-level deduplication to prevent duplicate toasts/sounds across multi-mounted components
let lastAlertedOrderId: string | null = null;

export function useOrders() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.getOrders(),
    staleTime: 1000 * 2, // 2 seconds
    refetchInterval: 3000, // 3-second background polling guarantee
  });

  // Setup realtime subscription
  useEffect(() => {
    const unsubscribe = api.subscribeRealtime(
      (newOrder: Order) => {
        // Desktop receives new order alert (deduplicated across component mounts)
        if (newOrder.id !== lastAlertedOrderId) {
          lastAlertedOrderId = newOrder.id;
          sound.playNewOrderChime();
          toast({
            title: `🔔 New Order Token: ${newOrder.token_number}`,
            description: `${newOrder.items_count} items • ₹${newOrder.total_amount}`,
            variant: 'warning',
            duration: 4000,
          });
        }
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
      },
      (updatedOrder: Order) => {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ['products'] });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  const createOrderMutation = useMutation({
    mutationFn: (payload: CreateOrderPayload) => api.createTokenOrder(payload),
    onSuccess: (order) => {
      sound.playTokenGenerated();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      sound.playWarning();
      toast({
        title: 'Order Generation Failed',
        description: err.message || 'Could not generate token',
        variant: 'destructive',
      });
    },
  });

  const transitionOrderMutation = useMutation({
    mutationFn: (payload: TransitionOrderPayload) => api.transitionOrderStatus(payload),
    onSuccess: (order, variables) => {
      if (variables.targetStatus === 'COMPLETED') {
        sound.playSuccess();
        toast({
          title: `Order ${order.token_number} Completed!`,
          description: 'Payment verified and inventory deducted.',
          variant: 'success',
        });
      } else if (variables.targetStatus === 'ACCEPTED') {
        sound.playTap();
        toast({
          title: `Token ${order.token_number} Accepted`,
          description: 'Ready for payment collection.',
          variant: 'default',
        });
      } else if (variables.targetStatus === 'PAID') {
        sound.playTap();
        toast({
          title: `Payment Received for ${order.token_number}`,
          description: 'Now complete the order to finalize.',
          variant: 'success',
        });
      } else if (variables.targetStatus === 'VOID') {
        sound.playWarning();
        toast({
          title: `Order ${order.token_number} Voided`,
          description: 'Token marked as cancelled.',
          variant: 'destructive',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      sound.playWarning();
      toast({
        title: 'Transition Failed',
        description: err.message || 'Invalid status change',
        variant: 'destructive',
      });
    },
  });

  return {
    orders: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    createOrder: createOrderMutation.mutateAsync,
    transitionOrder: transitionOrderMutation.mutateAsync,
    isCreating: createOrderMutation.isPending,
    isTransitioning: transitionOrderMutation.isPending,
  };
}

