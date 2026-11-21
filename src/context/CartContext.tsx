import React, { createContext, useContext, useState, useMemo } from 'react';
import { Product, CartItem } from '@/lib/types';
import { sound } from '@/lib/soundEngine';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  decrementQuantity: (productId: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  totalAmount: number;
  getItemQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      sound.playWarning();
      return;
    }

    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          sound.playWarning();
          return prev;
        }
        sound.playTap();
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      sound.playTap();
      return [...prev, { product, quantity: 1 }];
    });
  };

  const decrementQuantity = (productId: string) => {
    sound.playTap();
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === productId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((item) => item.product.id !== productId);
      }
      return prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const maxAllowed = Math.min(quantity, item.product.stock);
          return { ...item, quantity: maxAllowed };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    sound.playTap();
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = useMemo(() => {
    return items.reduce((acc, item) => acc + item.quantity, 0);
  }, [items]);

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [items]);

  const totalAmount = subtotal;

  const getItemQuantity = (productId: string) => {
    const item = items.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        decrementQuantity,
        clearCart,
        totalItems,
        subtotal,
        totalAmount,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

