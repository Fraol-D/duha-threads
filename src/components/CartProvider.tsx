"use client";
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from "next-auth/react";
import { addGuestCartItem, clearGuestCart, readGuestCart, updateGuestCartItem } from "@/lib/cart/guestCart";

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
  const { status } = useSession();
  const mergedRef = useRef(false);
  const authEventRef = useRef<"login" | "logout" | null>(null);

  const refresh = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      if (status !== "authenticated") {
        const guestItems = readGuestCart().map((item) => ({
          userId: 'guest',
          productId: item.productId,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
        }));
        setItems(guestItems);
        return;
      }
      const res = await fetch('/api/cart', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setItems(json.items || []);
      }
    } finally {
      loadingRef.current = false;
    }
  }, [status]);

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

  const reset = useCallback(() => {
    if (status !== 'authenticated') {
      clearGuestCart();
    }
    setItems([]);
  }, [status]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (status === 'authenticated' && authEventRef.current !== 'login') {
      authEventRef.current = 'login';
      window.dispatchEvent(new CustomEvent('auth:state', { detail: { state: 'login' } }));
    } else if (status === 'unauthenticated' && authEventRef.current !== 'logout') {
      authEventRef.current = 'logout';
      window.dispatchEvent(new CustomEvent('auth:state', { detail: { state: 'logout' } }));
    }
  }, [status]);

  useEffect(() => {
    const merge = async () => {
      const guestItems = readGuestCart();
      if (!guestItems.length) return;
      const res = await fetch('/api/cart/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: guestItems }),
      });
      if (res.ok) {
        clearGuestCart();
        window.dispatchEvent(new CustomEvent('cart:updated'));
      }
    };

    if (status === 'authenticated') {
      if (!mergedRef.current) {
        mergedRef.current = true;
        merge();
      }
    } else {
      mergedRef.current = false;
    }
  }, [status]);

  // Listen for global cart update events
  useEffect(() => {
    function onUpdated(e: Event) {
      const detail = (e as CustomEvent).detail as { productId?: string; size?: string; color?: string; quantity?: number; type?: string } | undefined;
      const isGuest = status !== 'authenticated';
      if (detail?.type === 'optimistic-add' && detail.productId && detail.size && detail.color && detail.quantity) {
        if (isGuest) {
          addGuestCartItem({ productId: detail.productId, size: detail.size, color: detail.color, quantity: detail.quantity });
          setItems(readGuestCart().map(item => ({ userId: 'guest', productId: item.productId, size: item.size, color: item.color, quantity: item.quantity })));
          return;
        }
        optimisticIncrement(detail.productId, detail.size, detail.color, detail.quantity);
      } else if (detail?.type === 'optimistic-remove' && detail.productId && detail.size && detail.color && detail.quantity) {
        if (isGuest) {
          updateGuestCartItem({ productId: detail.productId, size: detail.size, color: detail.color, quantity: detail.quantity }, -detail.quantity);
          setItems(readGuestCart().map(item => ({ userId: 'guest', productId: item.productId, size: item.size, color: item.color, quantity: item.quantity })));
          return;
        }
        optimisticDecrement(detail.productId, detail.size, detail.color, detail.quantity);
      } else if (detail?.type === 'reset') {
        if (isGuest) {
          clearGuestCart();
          setItems([]);
          return;
        }
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
  }, [optimisticIncrement, optimisticDecrement, reset, refresh, status]);

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
