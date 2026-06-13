// src/components/ProductCard.jsx
import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [added, setAdded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [currentImg, setCurrentImg] = useState(0);

  const images = product.imageUrls?.length > 0 ? product.imageUrls : (product.imageUrl ? [product.imageUrl] : []);
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : null;

  const handleAdd = (e) => {
    e.stopPropagation();
    addToCart(product);
    setAdded(true);
    showToast(`${product.name} added to bag ✓`, 'success');
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="product-card">
      <div className="product-img-wrap">
        {!imgLoaded && <div className="img-skeleton" />}
        <img
          src={images[currentImg] || `https://placehold.co/400x400/1a1a1a/c9a84c?text=${encodeURIComponent(product.name)}`}
          alt={product.name}
          className={`product-img ${imgLoaded ? 'loaded' : ''}`}
          onLoad={() => setImgLoaded(true)}
        />
        {images.length > 1 && (
          <div className="img-dots">
            {images.map((_, i) => (
              <button key={i} className={`img-dot ${i === currentImg ? 'active' : ''}`}
                onClick={e => { e.stopPropagation(); setCurrentImg(i); }} />
            ))}
          </div>
        )}
        {discount && <div className="discount-tag">-{discount}%</div>}
        <div className="product-overlay">
          <button className="btn-quick-add" onClick={handleAdd}>Quick Add</button>
        </div>
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        {product.description && <p className="product-desc">{product.description}</p>}
        <div className="product-footer">
          <div className="price-wrap">
            {product.oldPrice && (
              <span className="product-old-price">{Number(product.oldPrice).toFixed(2)} EGP</span>
            )}
            <span className="product-price">{Number(product.price).toFixed(2)} EGP</span>
          </div>
          <button className={`btn-add-cart ${added ? 'added' : ''}`} onClick={handleAdd}>
            {added ? '✓ Added' : 'Add to Bag'}
          </button>
        </div>
      </div>
    </div>
  );
}
