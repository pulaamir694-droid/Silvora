// src/context/CartContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('silvora_cart')) || []; }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('silvora_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    setCart(prev => {
      if (product.packageCustomization) {
        return [...prev, { ...product, quantity: 1, cartItemId: Date.now() }];
      }
      const existing = prev.find(i => i.id === product.id && !i.packageCustomization);
      if (existing) return prev.map(i => i.id === product.id && !i.packageCustomization ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId, cartItemId) => {
    if (cartItemId) {
      setCart(prev => prev.filter(i => i.cartItemId !== cartItemId));
    } else {
      setCart(prev => prev.filter(i => i.id !== productId));
    }
  };

  const updateQuantity = (productId, quantity, cartItemId) => {
    if (quantity <= 0) { removeFromCart(productId, cartItemId); return; }
    if (cartItemId) {
      setCart(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity } : i));
    } else {
      setCart(prev => prev.map(i => i.id === productId ? { ...i, quantity } : i));
    }
  };

  const updateCustomization = (productId, customizationData) => {
    setCart(prev => prev.map(i => i.id === productId ? { ...i, customization: customizationData } : i));
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, updateCustomization, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
