// src/pages/ProductDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProducts } from '../services/productsService';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useSEO } from '../hooks/useSEO';
import Spinner from '../components/Spinner';
import ProductCard from '../components/ProductCard';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentImg, setCurrentImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [added, setAdded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const CUSTOMIZATION_FEE = 50;

  useSEO({
    title: product?.name,
    description: product?.description || `${product?.name} — Silvora Accessories`,
    image: product?.imageUrl,
  });

  useEffect(() => { loadProduct(); window.scrollTo(0, 0); }, [id]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const all = await getProducts();
      const found = all.find(p => p.id === id);
      setProduct(found || null);
      setCurrentImg(0);
      if (found) {
        setSelectedVariant(found.silverPrice ? 'silver' : found.goldPrice ? 'gold' : null);
        setRelated(all.filter(p => p.id !== id && p.category === found.category).slice(0, 4));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAddToCart = () => {
    if (hasVariants && !selectedVariant) { showToast('اختر النوع أولاً (فضي أو دهبي)', 'error'); return; }
    const productToAdd = {
      ...product,
      price: displayPrice,
      selectedVariant: selectedVariant,
      variantLabel: selectedVariant === 'silver' ? 'فضي' : selectedVariant === 'gold' ? 'دهبي' : null,
    };
    addToCart(productToAdd);
    setAdded(true);
    showToast(`${product.name} تمت إضافته للسلة ✓`, 'success');
    setTimeout(() => setAdded(false), 2000);
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  };

  if (loading) return <div style={{ paddingTop: '68px' }}><Spinner message="جاري التحميل..." /></div>;
  if (!product) return (
    <div className="checkout-empty">
      <h2>المنتج غير موجود</h2>
      <button className="btn-gold" onClick={() => navigate('/')}>العودة للرئيسية</button>
    </div>
  );

  const images = product.imageUrls?.length > 0 ? product.imageUrls : product.imageUrl ? [product.imageUrl] : [];
  const hasVariants = product.silverPrice || product.goldPrice;
  const displayPrice = hasVariants
    ? (selectedVariant === 'silver' ? product.silverPrice : selectedVariant === 'gold' ? product.goldPrice : product.price)
    : product.price;

  const discount = product.oldPrice ? Math.round((1 - displayPrice / product.oldPrice) * 100) : null;

  return (
    <main className="product-detail-page">
      <div className="pd-container">
        <button className="back-btn" onClick={() => navigate(-1)}>← رجوع</button>

        <div className="pd-grid">
          {/* IMAGES */}
          <div className="pd-images">
            {images.length > 1 && (
              <div className="pd-thumbs">
                {images.map((img, i) => (
                  <img key={i} src={img} alt={`thumb-${i}`}
                    className={`pd-thumb ${i === currentImg ? 'active' : ''}`}
                    onClick={() => setCurrentImg(i)} />
                ))}
              </div>
            )}
            <div
              className={`pd-main-img-wrap ${zoomed ? 'zoomed' : ''}`}
              onMouseEnter={() => setZoomed(true)}
              onMouseLeave={() => setZoomed(false)}
              onMouseMove={handleMouseMove}
              onClick={() => setLightbox(true)}
            >
              <img
                src={images[currentImg] || `https://placehold.co/600x600/1a1a1a/c9a84c?text=${encodeURIComponent(product.name)}`}
                alt={product.name}
                className="pd-main-img"
                style={zoomed ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`, transform: 'scale(2.2)' } : {}}
              />
              {discount && <div className="discount-tag">-{discount}%</div>}
              <div className="zoom-hint">🔍 اضغط للتكبير</div>
            </div>

            {/* Image dots mobile */}
            {images.length > 1 && (
              <div className="pd-dots-mobile">
                {images.map((_, i) => (
                  <button key={i} className={`img-dot ${i === currentImg ? 'active' : ''}`} onClick={() => setCurrentImg(i)} />
                ))}
              </div>
            )}
          </div>

          {/* INFO */}
          <div className="pd-info">
            {product.category && <p className="pd-category">{product.category}</p>}
            <h1 className="pd-title">{product.name}</h1>
            <div className="pd-price-wrap">
              {product.oldPrice && <span className="pd-old-price">{Number(product.oldPrice).toFixed(2)} EGP</span>}
              <span className="pd-price">{Number(displayPrice).toFixed(2)} EGP</span>
              {discount && <span className="pd-discount">-{discount}%</span>}
            </div>

            {hasVariants && (
              <div className="variant-selector">
                <p className="variant-label">اختر النوع:</p>
                <div className="variant-options">
                  {product.silverPrice && (
                    <button
                      className={`variant-btn${selectedVariant==='silver'?' active':''}`}
                      onClick={() => setSelectedVariant('silver')}>
                      ⚪ فضي — {Number(product.silverPrice).toFixed(0)} EGP
                    </button>
                  )}
                  {product.goldPrice && (
                    <button
                      className={`variant-btn gold${selectedVariant==='gold'?' active':''}`}
                      onClick={() => setSelectedVariant('gold')}>
                      🟡 دهبي — {Number(product.goldPrice).toFixed(0)} EGP
                    </button>
                  )}
                </div>
              </div>
            )}
            {product.description && (
              <div className="pd-description">
                <h3>الوصف</h3>
                <p>{product.description}</p>
              </div>
            )}
            {product.customizationType && product.customizationType !== 'none' && (
              <div className="pd-customization-info">
                <span>✨</span>
                <p>هذا المنتج يدعم التخصيص — {product.customizationType === 'eyes' ? 'رفع صورة عيون' : product.customizationType === 'name_writing' ? 'كتابة اسم' : 'حفر صورة'}. ستتمكن من {product.customizationType === 'name_writing' ? 'إدخال الاسم' : 'رفع الصورة'} عند إتمام الطلب.</p>
                <p style={{color:'#c9a84c', fontWeight:'bold', marginTop:'6px'}}>⚡ لو أضفت اسم أو تاريخ: +50 جنيه رسوم نقش</p>
              </div>
            )}
            <div className="pd-actions">
              <button className={`btn-gold pd-add-btn ${added ? 'added' : ''}`} onClick={handleAddToCart}>
                {added ? '✓ تمت الإضافة!' : 'أضف للسلة'}
              </button>
              <a href={`https://wa.me/201130479571?text=${encodeURIComponent(`مرحبا، أريد الاستفسار عن: ${product.name}`)}`}
                target="_blank" rel="noreferrer" className="btn-outline-gold pd-wa-btn">
                📱 استفسر على واتساب
              </a>
            </div>
            <div className="pd-features">
              <div className="pd-feature"><span>🚚</span><p>شحن مجاني فوق 500 EGP</p></div>
              <div className="pd-feature"><span>💎</span><p>إكسسوارات فاخرة أصلية</p></div>
              <div className="pd-feature"><span>↩️</span><p>استرجاع خلال 7 أيام</p></div>
            </div>
          </div>
        </div>

        {/* RELATED */}
        {related.length > 0 && (
          <div className="related-section">
            <div className="section-header">
              <p className="section-sub">قد يعجبك أيضاً</p>
              <h2 className="section-title">منتجات مشابهة</h2>
              <div className="divider-gold" />
            </div>
            <div className="products-grid">
              {related.map((p, i) => (
                <div key={p.id} className="product-card-wrapper" style={{ animationDelay: `${i * 0.07}s` }}
                  onClick={() => navigate(`/product/${p.id}`)}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* LIGHTBOX */}
      {lightbox && images.length > 0 && (
        <div className="lightbox" onClick={() => setLightbox(false)}>
          <button className="lightbox-close">✕</button>
          <img src={images[currentImg]} alt={product.name} onClick={e => e.stopPropagation()} />
          {images.length > 1 && (
            <div className="lightbox-nav">
              <button onClick={e => { e.stopPropagation(); setCurrentImg(i => (i - 1 + images.length) % images.length); }}>‹</button>
              <span>{currentImg + 1} / {images.length}</span>
              <button onClick={e => { e.stopPropagation(); setCurrentImg(i => (i + 1) % images.length); }}>›</button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
