import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Product } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';

export function useProducts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['products'],
    queryFn: () => api.getProducts(),
    staleTime: 1000 * 2, // 2s cache
    refetchInterval: 2500, // Background polling guarantee every 2.5s
  });

  // Real-time synchronization for instant stock updates
  useEffect(() => {
    const unsubscribe = api.subscribeRealtime(
      () => {
        // When new order arrives
        queryClient.invalidateQueries({ queryKey: ['products'] });
      },
      () => {
        // When order updated / completed
        queryClient.invalidateQueries({ queryKey: ['products'] });
      },
      () => {
        // When product or inventory changes
        queryClient.invalidateQueries({ queryKey: ['products'] });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  const updateProductMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Product> }) =>
      api.updateProduct(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Product updated', variant: 'success' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to update product', description: err.message, variant: 'destructive' });
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: ({ id, delta, reason }: { id: string; delta: number; reason: string }) =>
      api.adjustStock(id, delta, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Stock adjusted', variant: 'success' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to adjust stock', description: err.message, variant: 'destructive' });
    },
  });

  const createProductMutation = useMutation({
    mutationFn: (newProd: Omit<Product, 'id'>) => api.createProduct(newProd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Product created', variant: 'success' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to create product', description: err.message, variant: 'destructive' });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Product deleted', variant: 'default' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to delete product', description: err.message, variant: 'destructive' });
    },
  });

  return {
    products: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    updateProduct: updateProductMutation.mutateAsync,
    adjustStock: adjustStockMutation.mutateAsync,
    createProduct: createProductMutation.mutateAsync,
    deleteProduct: deleteProductMutation.mutateAsync,
  };
}

