// src/pages/Home.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../services/productsService';
import ProductCard from '../components/ProductCard';
import Spinner from '../components/Spinner';
import { useSEO } from '../hooks/useSEO';

const CATEGORIES = ['الكل', 'Rings', 'Necklaces', 'Bracelets', 'Earrings', 'Other'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'price_asc', label: 'السعر: الأقل' },
  { value: 'price_desc', label: 'السعر: الأعلى' },
];

export default function Home() {
  useSEO({
    title: 'إكسسوارات فاخرة',
    description: 'سيلفورا أكسسوارات — تسوق أرقى الإكسسوارات مع إمكانية التخصيص. توصيل لجميع محافظات مصر.',
  });

  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('الكل');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('newest');
  const navigate = useNavigate();

  useEffect(() => { loadProducts(); }, []);

  useEffect(() => {
    let result = [...products];
    if (search.trim()) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    if (category !== 'الكل') {
      result = result.filter(p => (p.category || 'Other') === category);
    }
    if (maxPrice && !isNaN(maxPrice)) {
      result = result.filter(p => Number(p.price) <= Number(maxPrice));
    }
    if (sort === 'price_asc') result.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') result.sort((a, b) => b.price - a.price);
    setFiltered(result);
  }, [search, category, maxPrice, sort, products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch {
      setError('فشل تحميل المنتجات. تحقق من إعدادات Firebase.');
    } finally {
      setLoading(false);
    }
  };

  const highestPrice = products.length ? Math.max(...products.map(p => p.price)) : 1000;

  return (
    <main>
      {/* HERO */}
      <section className="hero">
        <div className="hero-bg-overlay" />
        <div className="hero-content">
          <p className="hero-sub">New Collection 2025</p>
          <h1 className="hero-title">
            Welcome to<br />
            <span className="gold-text">Silvora Accessories</span>
          </h1>
          <p className="hero-desc">
            Luxury Accessories Crafted For Every Style
          </p>
          <a href="#products" className="btn-gold hero-cta">Explore Collection</a>
        </div>
        <div className="hero-decoration">
          <div className="hero-ring ring-1" /><div className="hero-ring ring-2" /><div className="hero-ring ring-3" />
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee-bar">
        <div className="marquee-track">
          {['شحن مجاني عند طلب 3 قطع أو أكتر','إكسسوارات فاخرة','تخصيص بالاسم والصورة','توصيل لكل مصر','واتساب أوردر'].concat(['شحن مجاني عند طلب 3 قطع أو أكتر','إكسسوارات فاخرة','تخصيص بالاسم والصورة','توصيل لكل مصر','واتساب أوردر']).map((t,i) => <span key={i}>{t}</span>)}
        </div>
      </div>

      {/* PRODUCTS */}
      <section className="products-section" id="products">
        <div className="section-header">
          <p className="section-sub">Our Collection</p>
          <h2 className="section-title">Featured Pieces</h2>
          <div className="divider-gold" />
        </div>

        {/* FILTERS */}
        <div className="filters-bar">
          <div className="search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="ابحث عن منتج..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
            {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
          </div>

          <div className="filters-row">
            <div className="category-filters">
              {CATEGORIES.map(cat => (
                <button key={cat} className={`cat-btn ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>{cat}</button>
              ))}
            </div>
            <select value={sort} onChange={e => setSort(e.target.value)} className="sort-select">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {products.length > 0 && (
            <div className="price-filter">
              <label>الحد الأقصى للسعر: <span className="gold-text">{maxPrice || highestPrice} EGP</span></label>
              <input type="range" min="0" max={highestPrice} value={maxPrice || highestPrice} onChange={e => setMaxPrice(e.target.value)} className="price-range" />
            </div>
          )}

          {(search || category !== 'الكل' || maxPrice) && (
            <button className="btn-clear-filters" onClick={() => { setSearch(''); setCategory('الكل'); setMaxPrice(''); }}>
              ✕ مسح الفلاتر
            </button>
          )}
        </div>

        {loading && <Spinner message="جاري التحميل..." />}
        {error && <div className="error-msg">{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-products">
            <p>لا توجد منتجات تطابق البحث.</p>
          </div>
        )}

        {!loading && (
          <div className="products-grid">
            {filtered.map((product, i) => (
              <div key={product.id} className="product-card-wrapper" style={{ animationDelay: `${i * 0.06}s` }}
                onClick={() => navigate(`/product/${product.id}`)}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* BANNER */}
      <section className="banner-section">
        <div className="banner-content">
          <h2>Crafted With Passion</h2>
          <p>كل قطعة مختارة بعناية لتوصيل الفخامة بين يديك.</p>
          <a href="https://wa.me/201130479571" target="_blank" rel="noreferrer" className="btn-outline-gold">تواصل معنا على واتساب</a>
        </div>
      </section>
    </main>
  );
}
