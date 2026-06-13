// src/pages/ProductDetail.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProducts } from '../services/productsService';
import { getSettings } from '../services/settingsService';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useSEO } from '../hooks/useSEO';
import { supabase } from '../services/supabase';
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
  const [lightboxImg, setLightboxImg] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [added, setAdded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [siteSettings, setSiteSettings] = useState(null);

  // Package Customization state
  const [walletName, setWalletName] = useState('');
  const [walletEyes, setWalletEyes] = useState(null);
  const [walletEyesFile, setWalletEyesFile] = useState(null);
  const [walletEyesPreview, setWalletEyesPreview] = useState('');
  const [mugName, setMugName] = useState('');
  const [watchEyes, setWatchEyes] = useState(null);
  const [watchEyesFile, setWatchEyesFile] = useState(null);
  const [watchEyesPreview, setWatchEyesPreview] = useState('');
  const [watchDate, setWatchDate] = useState(null);
  const [watchDateText, setWatchDateText] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  // Touch swipe
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  useSEO({
    title: product?.name,
    description: product?.description || `${product?.name} — Silvora Accessories`,
    image: product?.imageUrl,
  });

  useEffect(() => { loadProduct(); loadSettings(); window.scrollTo(0, 0); }, [id]);

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

  const loadSettings = async () => {
    try { setSiteSettings(await getSettings()); }
    catch (e) { console.error(e); }
  };

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchMove  = (e) => { touchEndX.current = e.touches[0].clientX; };
  const handleTouchEnd   = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setCurrentImg(i => (i + 1) % images.length);
      else          setCurrentImg(i => (i - 1 + images.length) % images.length);
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const prices = {
    walletName:  siteSettings?.pkg_wallet_name_price   ?? 0,
    walletEyes:  siteSettings?.pkg_wallet_eyes_price   ?? 0,
    mugName:     siteSettings?.pkg_mug_name_price      ?? 0,
    watchEyes:   siteSettings?.pkg_watch_eyes_price    ?? 0,
    watchDate:   siteSettings?.pkg_watch_date_price    ?? 0,
  };

  const extraTotal =
    (walletName.trim()  ? prices.walletName : 0) +
    (walletEyes === true ? prices.walletEyes : 0) +
    (mugName.trim()     ? prices.mugName    : 0) +
    (watchEyes === true  ? prices.watchEyes  : 0) +
    (watchDate === true  ? prices.watchDate  : 0);

  const uploadCustomizationImage = async (file, bucket = 'customization-images') => {
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleAddToCart = async () => {
    if (hasVariants && !selectedVariant) { showToast('اختر النوع أولاً (فضي أو دهبي)', 'error'); return; }
    if (walletEyes === true && !walletEyesFile) { showToast('ارفع صورة عيون المحفظة', 'error'); return; }
    if (watchEyes  === true && !watchEyesFile)  { showToast('ارفع صورة عيون قفل الساعة', 'error'); return; }
    if (watchDate  === true && !watchDateText.trim()) { showToast('أدخل التاريخ', 'error'); return; }

    setUploadingImages(true);
    try {
      let walletEyesUrl = '';
      let watchEyesUrl  = '';
      if (walletEyes === true && walletEyesFile) walletEyesUrl = await uploadCustomizationImage(walletEyesFile);
      if (watchEyes  === true && watchEyesFile)  watchEyesUrl  = await uploadCustomizationImage(watchEyesFile);

      const packageCustomization = {
        walletName:    walletName.trim()   || null,
        walletEyes:    walletEyes === true,
        walletEyesUrl: walletEyesUrl       || null,
        mugName:       mugName.trim()      || null,
        watchEyes:     watchEyes === true,
        watchEyesUrl:  watchEyesUrl        || null,
        watchDate:     watchDate === true,
        watchDateText: watchDate === true ? watchDateText.trim() : null,
        extraTotal,
        prices,
      };

      const productToAdd = {
        ...product,
        price: displayPrice + extraTotal,
        basePrice: displayPrice,
        selectedVariant,
        variantLabel: selectedVariant === 'silver' ? 'فضي' : selectedVariant === 'gold' ? 'دهبي' : null,
        packageCustomization,
      };

      addToCart(productToAdd);
      setAdded(true);
      showToast(`${product.name} تمت إضافته للسلة ✓`, 'success');
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      showToast('خطأ في رفع الصور: ' + e.message, 'error');
    } finally {
      setUploadingImages(false);
    }
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
  const isPackage = product.category === 'Package' || product.customizationType === 'package';

  const FileUploadField = ({ label, file, preview, onChange }) => (
    <div className="pkg-upload-field">
      <label className="pkg-upload-label">{label}</label>
      <div className="pkg-upload-area" onClick={() => { const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.onchange=e=>onChange(e.target.files[0]); inp.click(); }}>
        {preview
          ? <img src={preview} alt="preview" className="pkg-upload-preview" />
          : <div className="pkg-upload-placeholder"><span>📷</span><p>اضغط لرفع صورة</p></div>
        }
      </div>
      {file && <p className="pkg-file-name">✓ {file.name}</p>}
    </div>
  );

  const handleWalletEyesFile = (f) => { setWalletEyesFile(f); setWalletEyesPreview(f ? URL.createObjectURL(f) : ''); };
  const handleWatchEyesFile  = (f) => { setWatchEyesFile(f);  setWatchEyesPreview(f  ? URL.createObjectURL(f)  : ''); };

  const YesNoField = ({ label, value, onChange }) => (
    <div className="pkg-yesno-field">
      <p className="pkg-yesno-label">{label}</p>
      <div className="pkg-yesno-btns">
        <button className={`pkg-yn-btn ${value === true ? 'active' : ''}`}  onClick={() => onChange(true)}>نعم</button>
        <button className={`pkg-yn-btn ${value === false ? 'active' : ''}`} onClick={() => onChange(false)}>لا</button>
      </div>
    </div>
  );

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
            <div className="pd-main-img-wrapper">
              {images.length > 1 && (
                <button className="pd-img-arrow pd-img-arrow-left"
                  onClick={() => setCurrentImg(i => (i - 1 + images.length) % images.length)}>‹</button>
              )}
              <div
                className={`pd-main-img-wrap ${zoomed ? 'zoomed' : ''}`}
                onMouseEnter={() => setZoomed(true)}
                onMouseLeave={() => setZoomed(false)}
                onMouseMove={handleMouseMove}
                onClick={() => { setLightboxImg(currentImg); setLightbox(true); }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
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
              {images.length > 1 && (
                <button className="pd-img-arrow pd-img-arrow-right"
                  onClick={() => setCurrentImg(i => (i + 1) % images.length)}>›</button>
              )}
            </div>

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
              <span className="pd-price">{Number(displayPrice + extraTotal).toFixed(2)} EGP</span>
              {discount && <span className="pd-discount">-{discount}%</span>}
              {extraTotal > 0 && (
                <span style={{fontSize:'12px',color:'var(--gold)',opacity:0.8}}>
                  ({Number(displayPrice).toFixed(0)} + {extraTotal} تخصيص)
                </span>
              )}
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

            {isPackage && (
              <div className="pkg-customization">
                <div className="pkg-header">
                  <span className="pkg-icon">✨</span>
                  <h3 className="pkg-title">Package Customization</h3>
                </div>
                <p className="pkg-subtitle">خصّص الباقة حسب اختيارك — الإضافات تُحسب تلقائياً</p>

                <div className="pkg-section">
                  <div className="pkg-section-title">👛 خيارات المحفظة</div>
                  <div className="pkg-field">
                    <label className="pkg-label">
                      أدخل الاسم الذي تريد كتابته على المحفظة
                      {prices.walletName > 0 && <span className="pkg-price-tag">+{prices.walletName} EGP</span>}
                    </label>
                    <input
                      className="pkg-input"
                      placeholder="الاسم (اتركه فارغاً إن لم تُرد)"
                      value={walletName}
                      onChange={e => setWalletName(e.target.value)}
                    />
                  </div>
                  <YesNoField
                    label={`هل تريد إضافة صورة عيون داخل المحفظة؟${prices.walletEyes > 0 ? ` (+${prices.walletEyes} EGP)` : ''}`}
                    value={walletEyes}
                    onChange={setWalletEyes}
                  />
                  {walletEyes === true && (
                    <FileUploadField
                      label="ارفع صورة العيون للمحفظة"
                      file={walletEyesFile}
                      preview={walletEyesPreview}
                      onChange={handleWalletEyesFile}
                    />
                  )}
                </div>

                <div className="pkg-section">
                  <div className="pkg-section-title">☕ خيارات المج الحراري</div>
                  <div className="pkg-field">
                    <label className="pkg-label">
                      أدخل الاسم الذي تريد كتابته على المج الحراري
                      {prices.mugName > 0 && <span className="pkg-price-tag">+{prices.mugName} EGP</span>}
                    </label>
                    <input
                      className="pkg-input"
                      placeholder="الاسم (اتركه فارغاً إن لم تُرد)"
                      value={mugName}
                      onChange={e => setMugName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pkg-section">
                  <div className="pkg-section-title">⌚ خيارات قفل الساعة</div>
                  <YesNoField
                    label={`هل تريد إضافة صورة عيون على قفل الساعة؟${prices.watchEyes > 0 ? ` (+${prices.watchEyes} EGP)` : ''}`}
                    value={watchEyes}
                    onChange={setWatchEyes}
                  />
                  {watchEyes === true && (
                    <FileUploadField
                      label="ارفع صورة العيون لقفل الساعة"
                      file={watchEyesFile}
                      preview={watchEyesPreview}
                      onChange={handleWatchEyesFile}
                    />
                  )}
                  <YesNoField
                    label={`هل تريد كتابة تاريخ على قفل الساعة؟${prices.watchDate > 0 ? ` (+${prices.watchDate} EGP)` : ''}`}
                    value={watchDate}
                    onChange={setWatchDate}
                  />
                  {watchDate === true && (
                    <div className="pkg-field">
                      <label className="pkg-label">أدخل التاريخ</label>
                      <input
                        className="pkg-input"
                        placeholder="مثال: 14/6/2026"
                        value={watchDateText}
                        onChange={e => setWatchDateText(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {extraTotal > 0 && (
                  <div className="pkg-summary">
                    <span>💰 إجمالي الإضافات:</span>
                    <span className="pkg-summary-price">+{extraTotal} EGP</span>
                  </div>
                )}
              </div>
            )}

            {!isPackage && product.customizationType && product.customizationType !== 'none' && (
              <div className="pd-customization-info">
                <span>✨</span>
                <p>هذا المنتج يدعم التخصيص — {product.customizationType === 'eyes' ? 'رفع صورة عيون' : product.customizationType === 'name_writing' ? 'كتابة اسم' : 'حفر صورة'}. ستتمكن من {product.customizationType === 'name_writing' ? 'إدخال الاسم' : 'رفع الصورة'} عند إتمام الطلب.</p>
                <p style={{color:'#c9a84c', fontWeight:'bold', marginTop:'6px'}}>⚡ لو أضفت اسم أو تاريخ: +{siteSettings?.customizationFee || 50} جنيه رسوم نقش</p>
              </div>
            )}

            <div className="pd-actions">
              <button
                className={`btn-gold pd-add-btn ${added ? 'added' : ''}`}
                onClick={handleAddToCart}
                disabled={uploadingImages}
              >
                {uploadingImages ? '⏳ جاري الرفع...' : added ? '✓ تمت الإضافة!' : 'أضف للسلة'}
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

      {lightbox && images.length > 0 && (
        <div className="lightbox" onClick={() => setLightbox(false)}>
          <button className="lightbox-close">✕</button>
          <img src={images[lightboxImg]} alt={product.name} onClick={e => e.stopPropagation()} />
          {images.length > 1 && (
            <div className="lightbox-nav">
              <button onClick={e => { e.stopPropagation(); setLightboxImg(i => (i - 1 + images.length) % images.length); }}>‹</button>
              <span>{lightboxImg + 1} / {images.length}</span>
              <button onClick={e => { e.stopPropagation(); setLightboxImg(i => (i + 1) % images.length); }}>›</button>
            </div>
          )}
        </div>
      )}
    </main>
  );
          }
