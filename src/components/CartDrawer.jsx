// src/components/CartDrawer.jsx
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

export default function CartDrawer({ open, onClose }) {
  const { cart, removeFromCart, updateQuantity, total, itemCount } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <>
      <div className={`drawer-overlay ${open ? 'visible' : ''}`} onClick={onClose} />
      <div className={`cart-drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h2>Shopping Bag <span>({itemCount})</span></h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <div className="empty-icon">🛍️</div>
              <p>Your bag is empty</p>
              <button className="btn-outline" onClick={onClose}>Continue Shopping</button>
            </div>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <img src={item.imageUrl || '/placeholder.jpg'} alt={item.name} className="cart-item-img" />
                  <div className="cart-item-info">
                    <p className="cart-item-name">{item.name}</p>
                    <p className="cart-item-price">{item.price.toFixed(2)} EGP</p>
                    <div className="qty-control">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                    </div>
                  </div>
                  <button className="remove-btn" onClick={() => removeFromCart(item.id)}>✕</button>
                </div>
              ))}
            </>
          )}
        </div>

        {cart.length > 0 && (
          <div className="drawer-footer">
            <div className="total-row">
              <span>Total</span>
              <span className="total-amount">{total.toFixed(2)} EGP</span>
            </div>
            <button className="btn-gold" onClick={handleCheckout}>Proceed to Checkout</button>
          </div>
        )}
      </div>
    </>
  );
}
