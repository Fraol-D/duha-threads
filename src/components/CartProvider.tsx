"use client";
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

export interface CartItem {
  _id?: string;
  userId: string;
  productId: string;
  size: string;
  color: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  totalQuantity: number;
  refresh: () => Promise<void>;
  optimisticIncrement: (productId: string, size: string, color: string, quantity: number) => void;
  optimisticDecrement: (productId: string, size: string, color: string, quantity: number) => void;
  reset: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const loadingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const res = await fetch('/api/cart', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setItems(json.items || []);
      }
    } finally {
      loadingRef.current = false;
    }
  }, []);

  // Optimistic update for immediate badge feedback
  const optimisticIncrement = useCallback((productId: string, size: string, color: string, quantity: number) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.productId === productId && i.size === size && i.color === color);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + quantity };
        return copy;
      }
      return [...prev, { userId: 'me', productId, size, color, quantity }];
    });
  }, []);

  const optimisticDecrement = useCallback((productId: string, size: string, color: string, quantity: number) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.productId === productId && i.size === size && i.color === color);
      if (idx >= 0) {
        const copy = [...prev];
        const nextQty = Math.max(0, copy[idx].quantity - quantity);
        if (nextQty === 0) {
          copy.splice(idx,1);
          return copy;
        }
        copy[idx] = { ...copy[idx], quantity: nextQty };
        return copy;
      }
      return prev;
    });
  }, []);

  const reset = useCallback(() => { setItems([]); }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Listen for global cart update events
  useEffect(() => {
    function onUpdated(e: Event) {
      const detail = (e as CustomEvent).detail as { productId?: string; size?: string; color?: string; quantity?: number; type?: string } | undefined;
      if (detail?.type === 'optimistic-add' && detail.productId && detail.size && detail.color && detail.quantity) {
        optimisticIncrement(detail.productId, detail.size, detail.color, detail.quantity);
      } else if (detail?.type === 'optimistic-remove' && detail.productId && detail.size && detail.color && detail.quantity) {
        optimisticDecrement(detail.productId, detail.size, detail.color, detail.quantity);
      } else if (detail?.type === 'reset') {
        reset();
      } else {
        refresh();
      }
    }
    function onAuth(e: Event) {
      const detail = (e as CustomEvent).detail as { state?: 'login'|'logout' } | undefined;
      if (detail?.state === 'login') refresh();
      if (detail?.state === 'logout') reset();
    }
    window.addEventListener('cart:updated', onUpdated as EventListener);
    window.addEventListener('auth:state', onAuth as EventListener);
    return () => {
      window.removeEventListener('cart:updated', onUpdated as EventListener);
      window.removeEventListener('auth:state', onAuth as EventListener);
    };
  }, [optimisticIncrement, optimisticDecrement, reset, refresh]);

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, totalQuantity, refresh, optimisticIncrement, optimisticDecrement, reset }}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
