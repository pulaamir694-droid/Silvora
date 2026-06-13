// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getProducts, addProduct, deleteProduct, updateProduct } from '../services/productsService';
import { getOrders, updateOrderStatus, deleteOrder, sendOrderToAdminWhatsApp } from '../services/ordersService';
import { getDashboardStats } from '../services/statsService';
import { getShippingSettings, saveShippingSettings } from '../services/shippingService';
import { getSettings, saveSettings } from '../services/settingsService';
import { supabase } from '../services/supabase';
import Spinner from '../components/Spinner';

const ORDER_STATUSES = [
  { value: 'new',        label: 'جديد',          color: '#c9a84c' },
  { value: 'processing', label: 'جاري التجهيز',  color: '#3a8abf' },
  { value: 'shipped',    label: 'تم الشحن',       color: '#7c4abf' },
  { value: 'delivered',  label: 'تم التسليم',     color: '#3a8a3a' },
  { value: 'cancelled',  label: 'ملغي',           color: '#d04040' },
];

const CATS = ['Rings', 'Necklaces', 'Bracelets', 'Earrings', 'Other'];
const CUSTOM_TYPES = [
  { value: 'none',           label: 'بدون تخصيص' },
  { value: 'eyes',           label: 'عيون — رفع صورة عيون' },
  { value: 'photo_engraving',label: 'حفر صورة' },
  { value: 'name_writing',    label: 'كتابة اسم' },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab]                     = useState('stats');
  const [products, setProducts]           = useState([]);
  const [orders, setOrders]               = useState([]);
  const [stats, setStats]                 = useState(null);
  const [shippingGovs, setShippingGovs]   = useState([]);
  const [customerPoints, setCustomerPoints] = useState([]);
  const [siteSettings, setSiteSettings]   = useState(null);
  const [loading, setLoading]             = useState(false);
  const [saving, setSaving]               = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [successMsg, setSuccessMsg]       = useState('');
  const [errorMsg, setErrorMsg]           = useState('');

  // Product form
  const emptyForm = { name:'', price:'', oldPrice:'', silverPrice:'', goldPrice:'', description:'', category:'', customizationType:'none' };
  const [form, setForm]               = useState(emptyForm);
  const [editingProduct, setEditing]  = useState(null);
  const [imageFiles, setImageFiles]   = useState([]);
  const [imagePreviews, setImagePrev] = useState([]);
  const [formErrors, setFormErrors]   = useState({});

  useEffect(() => { if (!user) navigate('/admin/login'); }, [user]);

  useEffect(() => {
    if (tab === 'stats')     loadStats();
    if (tab === 'products')  loadProducts();
    if (tab === 'orders')    { loadOrders(); loadCustomerPoints(); }
    if (tab === 'customers') loadCustomerPoints();
    if (tab === 'shipping')  loadShipping();
    if (tab === 'settings')  loadSiteSettings();
  }, [tab]);

  // ─── Loaders ──────────────────────────────────────────────────
  const loadStats = async () => {
    setLoading(true);
    try { setStats(await getDashboardStats()); setErrorMsg(''); }
    catch (e) { setErrorMsg('خطأ في تحميل الإحصائيات: ' + e.message); }
    finally { setLoading(false); }
  };

  const loadProducts = async () => {
    setLoading(true);
    try { setProducts(await getProducts()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadOrders = async () => {
    setLoading(true);
    try { setOrders(await getOrders()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadShipping = async () => {
    setLoading(true);
    try { setShippingGovs(await getShippingSettings()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadCustomerPoints = async () => {
    const { data } = await supabase.from('customer_points').select('*').order('points', { ascending: false });
    setCustomerPoints(data || []);
  };

  const loadSiteSettings = async () => {
    setLoading(true);
    try { setSiteSettings(await getSettings()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const [selectedOrders, setSelectedOrders] = useState([]);

  const toggleSelectOrder = (id) => setSelectedOrders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll   = () => setSelectedOrders(selectedOrders.length === orders.length ? [] : orders.map(o => o.id));

  const handleDeleteSelected = async () => {
    if (selectedOrders.length === 0) return;
    const toDelete = [...selectedOrders];
    if (!confirm(`حذف ${toDelete.length} طلب نهائياً؟`)) return;
    try {
      await Promise.all(toDelete.map(id => deleteOrder(id)));
      setOrders(prev => prev.filter(o => !toDelete.includes(o.id)));
      setSelectedOrders([]);
      flash(`تم حذف ${toDelete.length} طلب ✓`);
    } catch (e) { alert('خطأ في الحذف: ' + e.message); }
  };
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

      if (newStatus === 'delivered') {
        const order = orders.find(o => o.id === orderId);
        if (order?.userId) {
          const totalQty = (order.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
          const earned   = totalQty * (siteSettings?.pointsPerItem || 25);
          const { data: existing } = await supabase.from('customer_points').select('*').eq('user_id', order.userId).single();
          const newPts = (existing?.points || 0) + earned;
          await supabase.from('customer_points').upsert({ user_id: order.userId, points: newPts, email: existing?.email || '', updated_at: new Date().toISOString() });
          await loadCustomerPoints();
          flash(`✅ تمت إضافة ${earned} نقطة للعميل`);
        }
      }
    } catch (e) { alert('خطأ في التحديث: ' + e.message); }
  };

  // ─── Points ───────────────────────────────────────────────────
  const resetPoints = async (userId) => {
    if (!confirm('تصفير نقاط هذا العميل؟')) return;
    await supabase.from('customer_points').upsert({ user_id: userId, points: 0, updated_at: new Date().toISOString() });
    await loadCustomerPoints();
    flash('تم تصفير النقاط ✓');
  };

  const editPoints = async (userId, currentPts) => {
    const val = prompt('أدخل عدد النقاط الجديد:', currentPts);
    if (val === null || isNaN(val)) return;
    await supabase.from('customer_points').upsert({ user_id: userId, points: Number(val), updated_at: new Date().toISOString() });
    await loadCustomerPoints();
    flash('تم تحديث النقاط ✓');
  };

  // ─── Products ─────────────────────────────────────────────────
  const handleImageChange = e => {
    const files = Array.from(e.target.files);
    setImageFiles(p => [...p, ...files]);
    setImagePrev(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removePreview = i => {
    setImageFiles(p => p.filter((_,j) => j !== i));
    setImagePrev(p  => p.filter((_,j) => j !== i));
  };

  const startEdit = p => {
    setEditing(p);
    setForm({ name: p.name||'', price: p.price||'', oldPrice: p.oldPrice||'', silverPrice: p.silverPrice||'', goldPrice: p.goldPrice||'', description: p.description||'', category: p.category||'', customizationType: p.customizationType||'none' });
    setImageFiles([]); setImagePrev([]);
    window.scrollTo(0,0);
  };

  const cancelEdit = () => { setEditing(null); setForm(emptyForm); setImageFiles([]); setImagePrev([]); setFormErrors({}); };

  const handleSubmit = async () => {
    const errs = {};
    if (!form.name.trim())                       errs.name  = 'الاسم مطلوب';
    if (!form.price || Number(form.price) <= 0)  errs.price = 'السعر مطلوب';
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true); setErrorMsg('');
    try {
      const data = { name: form.name, price: Number(form.price), oldPrice: form.oldPrice ? Number(form.oldPrice) : null, silverPrice: form.silverPrice ? Number(form.silverPrice) : null, goldPrice: form.goldPrice ? Number(form.goldPrice) : null, description: form.description, category: form.category, customizationType: form.customizationType || 'none' };
      if (editingProduct) { await updateProduct(editingProduct.id, data, imageFiles); flash('تم التحديث ✓'); setEditing(null); }
      else                { await addProduct(data, imageFiles); flash('تم الإضافة ✓'); }
      setForm(emptyForm); setImageFiles([]); setImagePrev([]); setFormErrors({});
      await loadProducts();
    } catch (e) { setErrorMsg('خطأ: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async p => {
    if (!confirm(`حذف "${p.name}"؟`)) return;
    try { await deleteProduct(p.id); setProducts(prev => prev.filter(x => x.id !== p.id)); }
    catch (e) { alert('خطأ في الحذف'); }
  };

  // ─── Shipping ─────────────────────────────────────────────────
  const handleSaveShipping = async () => {
    setSaving(true);
    try { await saveShippingSettings(shippingGovs); flash('تم حفظ الشحن ✓'); }
    catch { setErrorMsg('خطأ في حفظ الشحن'); }
    finally { setSaving(false); }
  };

  // ─── Site Settings ────────────────────────────────────────────
  const handleSaveSettings = async () => {
    setSaving(true);
    try { await saveSettings(siteSettings); flash('تم حفظ الإعدادات ✓'); }
    catch (e) { setErrorMsg('خطأ: ' + e.message); }
    finally { setSaving(false); }
  };

  // ─── Helpers ──────────────────────────────────────────────────
  const flash = msg => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3500); };
  const getStatusInfo = s => ORDER_STATUSES.find(x => x.value === s) || ORDER_STATUSES[0];
  const newOrdersCount = orders.filter(o => o.status === 'new').length;
  const handleLogout = async () => { await logout(); navigate('/admin/login'); };

  // ─── RENDER ───────────────────────────────────────────────────
  return (
    <main className="admin-page" dir="rtl">
      <div className="admin-header">
        <div className="admin-logo"><span className="logo-s">S</span>ILVORA <span>Admin</span></div>
        <div className="admin-nav">
          <button className={tab==='stats'    ?'active':''} onClick={()=>setTab('stats')}>📊 إحصائيات</button>
          <button className={tab==='products' ?'active':''} onClick={()=>setTab('products')}>📦 المنتجات</button>
          <button className={tab==='orders'   ?'active':''} onClick={()=>setTab('orders')}>
            🧾 الطلبات {newOrdersCount>0&&<span className="orders-badge">{newOrdersCount}</span>}
          </button>
          <button className={tab==='customers'?'active':''} onClick={()=>setTab('customers')}>⭐ العملاء</button>
          <button className={tab==='shipping' ?'active':''} onClick={()=>setTab('shipping')}>🚚 الشحن</button>
          <button className={tab==='settings' ?'active':''} onClick={()=>setTab('settings')}>⚙️ الإعدادات</button>
          <button className="btn-logout" onClick={handleLogout}>خروج</button>
        </div>
      </div>

      <div className="admin-container">
        {successMsg && <div className="alert-success" style={{marginBottom:'16px'}}>{successMsg}</div>}
        {errorMsg   && <div className="alert-error"   style={{marginBottom:'16px'}}>{errorMsg}</div>}

        {/* ══ STATS ══════════════════════════════════════════════ */}
        {tab==='stats' && (
          <div className="stats-section">
            <h2 className="admin-section-title">لوحة الإحصائيات</h2>
            {loading ? <Spinner /> : stats ? (
              <div className="stats-grid">
                <div className="stat-card"><div className="stat-icon">🧾</div><div className="stat-value">{stats.totalOrders}</div><div className="stat-label">إجمالي الطلبات</div></div>
                <div className="stat-card gold"><div className="stat-icon">💰</div><div className="stat-value">{stats.totalRevenue?.toFixed(0)}</div><div className="stat-label">الإيرادات (EGP)</div></div>
                <div className="stat-card new"><div className="stat-icon">🆕</div><div className="stat-value">{stats.newOrders}</div><div className="stat-label">طلبات جديدة</div></div>
                <div className="stat-card done"><div className="stat-icon">✅</div><div className="stat-value">{stats.completedOrders}</div><div className="stat-label">مكتملة</div></div>
                <div className="stat-card processing"><div className="stat-icon">⚙️</div><div className="stat-value">{stats.processingOrders}</div><div className="stat-label">جاري التجهيز</div></div>
                <div className="stat-card"><div className="stat-icon">🛍️</div><div className="stat-value">{stats.totalProducts}</div><div className="stat-label">المنتجات</div></div>
              </div>
            ) : <button className="btn-gold" onClick={loadStats}>تحميل الإحصائيات</button>}
          </div>
        )}

        {/* ══ PRODUCTS ═══════════════════════════════════════════ */}
        {tab==='products' && (
          <>
            <div className="admin-card">
              <h2>{editingProduct ? '✏️ تعديل المنتج' : '+ إضافة منتج جديد'}</h2>
              <div className="admin-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>اسم المنتج *</label>
                    <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="مثال: خاتم ذهبي" className={formErrors.name?'error':''} />
                    {formErrors.name&&<span className="field-error">{formErrors.name}</span>}
                  </div>
                  <div className="form-group">
                    <label>السعر (EGP) *</label>
                    <input type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="350" className={formErrors.price?'error':''} />
                    {formErrors.price&&<span className="field-error">{formErrors.price}</span>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>السعر قبل التخفيض (EGP)</label>
                    <input type="number" value={form.oldPrice} onChange={e=>setForm({...form,oldPrice:e.target.value})} placeholder="اختياري" />
                  </div>
                  <div className="form-group">
                    <label>⚪ سعر الفضي (EGP)</label>
                    <input type="number" value={form.silverPrice} onChange={e=>setForm({...form,silverPrice:e.target.value})} placeholder="اختياري" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>🟡 سعر الدهبي (EGP)</label>
                    <input type="number" value={form.goldPrice} onChange={e=>setForm({...form,goldPrice:e.target.value})} placeholder="اختياري" />
                  </div>
                  <div className="form-group" />
                  <div className="form-group">
                    <label>الفئة</label>
                    <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="admin-select">
                      <option value="">اختر الفئة</option>
                      {CATS.map(c=><option key={c} value={c}>{c==='Rings'?'خواتم':c==='Necklaces'?'سلاسل':c==='Bracelets'?'أساور':c==='Earrings'?'أقراط':'أخرى'}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>نوع التخصيص</label>
                    <select value={form.customizationType} onChange={e=>setForm({...form,customizationType:e.target.value})} className="admin-select">
                      {CUSTOM_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>الوصف</label>
                    <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="وصف مختصر (اختياري)" />
                  </div>
                </div>
                <div className="form-group">
                  <label>صور المنتج {editingProduct?'(إضافة صور جديدة)':''}</label>
                  {editingProduct?.imageUrls?.length>0 && (
                    <div className="existing-images">
                      <p style={{fontSize:'11px',color:'var(--gray)',marginBottom:'8px'}}>الصور الحالية:</p>
                      <div className="image-previews-grid">
                        {editingProduct.imageUrls.map((url,i)=>(
                          <div key={i} className="preview-item"><img src={url} alt="" /><span className="preview-label">{i===0?'رئيسية':'إضافية'}</span></div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="image-upload-area" onClick={()=>document.getElementById('img-input').click()}>
                    {imagePreviews.length>0 ? (
                      <div className="image-previews-grid">
                        {imagePreviews.map((p,i)=>(
                          <div key={i} className="preview-item">
                            <img src={p} alt="" />
                            <button className="remove-preview-btn" onClick={e=>{e.stopPropagation();removePreview(i);}}>✕</button>
                            {i===0&&<span className="preview-label">رئيسية</span>}
                          </div>
                        ))}
                        <div className="add-more-btn">+ إضافة</div>
                      </div>
                    ) : (
                      <div className="upload-placeholder"><span>📷</span><p>اضغط لرفع الصور</p><small>الصورة الأولى ستكون الرئيسية</small></div>
                    )}
                  </div>
                  <input id="img-input" type="file" accept="image/*" multiple onChange={handleImageChange} style={{display:'none'}} />
                </div>
                <div style={{display:'flex',gap:'12px'}}>
                  <button className="btn-gold" onClick={handleSubmit} disabled={saving}>{saving?'جاري الحفظ...':editingProduct?'✓ حفظ التغييرات':'+ إضافة المنتج'}</button>
                  {editingProduct&&<button className="btn-outline" onClick={cancelEdit}>إلغاء</button>}
                </div>
              </div>
            </div>

            <div className="admin-card">
              <h2>المنتجات ({products.length})</h2>
              {loading?<Spinner/>:(
                <div className="admin-products-grid">
                  {products.map(p=>(
                    <div key={p.id} className="admin-product-item">
                      <img src={p.imageUrl||`https://placehold.co/80x80/1a1a1a/c9a84c?text=${(p.name||'P')[0]}`} alt={p.name} />
                      <div style={{flex:1}}>
                        <p className="ap-name">{p.name}</p>
                        <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap',marginTop:'4px'}}>
                          <p className="ap-price">{Number(p.price).toFixed(2)} EGP</p>
                          {p.oldPrice&&<p style={{fontSize:'12px',color:'var(--gray)',textDecoration:'line-through'}}>{Number(p.oldPrice).toFixed(2)} EGP</p>}
                        </div>
                        <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'4px'}}>
                          {p.category&&<span className="tag-chip">{p.category}</span>}
                          {p.customizationType&&p.customizationType!=='none'&&<span className="tag-chip gold">✨ تخصيص</span>}
                        </div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                        <button className="btn-edit" onClick={()=>startEdit(p)}>تعديل</button>
                        <button className="btn-delete" onClick={()=>handleDelete(p)}>حذف</button>
                      </div>
                    </div>
                  ))}
                  {products.length===0&&<p className="no-data">لا توجد منتجات بعد.</p>}
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ ORDERS ═════════════════════════════════════════════ */}
        {tab==='orders' && (
          <div className="admin-card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px',marginBottom:'16px'}}>
              <h2>الطلبات ({orders.length})</h2>
              <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',cursor:'pointer',color:'var(--gray)'}}>
                  <input type="checkbox" checked={selectedOrders.length===orders.length&&orders.length>0} onChange={toggleSelectAll} />
                  تحديد الكل
                </label>
                {selectedOrders.length > 0 && (
                  <button className="btn-delete" onClick={handleDeleteSelected}>
                    🗑️ حذف المحدد ({selectedOrders.length})
                  </button>
                )}
              </div>
            </div>
            {loading?<Spinner/>:(
              <div className="orders-list">
                {orders.map(order=>{
                  const si = getStatusInfo(order.status);
                  const cp = customerPoints.find(c=>c.user_id===order.userId);
                  const eligible = cp && cp.points >= (siteSettings?.pointsForFreeShipping||100);
                  const isSelected = selectedOrders.includes(order.id);
                  return (
                    <div key={order.id} className={`order-item${isSelected?' selected':''}`}>
                      <div style={{display:'flex',alignItems:'flex-start',gap:'0'}}>
                        <input type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(order.id)}
                          onClick={e => e.stopPropagation()}
                          style={{width:'18px',height:'18px',margin:'16px 0 0 12px',flexShrink:0,cursor:'pointer',accentColor:'#c9a84c'}} />
                        <div style={{flex:1}}>
                      <div className="order-header" onClick={()=>setExpandedOrder(expandedOrder===order.id?null:order.id)} style={{cursor:'pointer'}}>
                        <div style={{flex:1}}>
                          <p className="order-customer">{order.customer?.name}</p>
                          <p className="order-phone">📱 {order.customer?.phone}</p>
                          <p className="order-address">📍 {order.customer?.governorate} — {order.customer?.address}</p>
                          {order.customer?.notes&&<p style={{fontSize:'12px',color:'var(--gray)',marginTop:'4px'}}>📝 {order.customer.notes}</p>}
                        </div>
                        <div className="order-meta">
                          <span className="order-total">{Number(order.total).toFixed(2)} EGP</span>
                          {order.depositAmount > 0 && (
                            <div className="deposit-breakdown">
                              <div className="dep-row"><span>إجمالي الطلب:</span><strong>{Number(order.total).toFixed(2)} EGP</strong></div>
                              <div className="dep-row paid"><span>💳 دفع مقدماً:</span><strong style={{color:'#c9a84c'}}>{Number(order.depositAmount).toFixed(2)} EGP</strong></div>
                              <div className="dep-row remaining"><span>🚪 المتبقي:</span><strong style={{color:'#fff'}}>{Math.max(Number(order.total) - Number(order.depositAmount), 0).toFixed(2)} EGP</strong></div>
                            </div>
                          )}
                          <span style={{fontSize:'11px',color:'var(--gray)'}}>
                            شحن: {order.freeShippingReason
                              ? <span style={{color:'#3a8a3a',fontWeight:'bold'}}>مجاني 🎁</span>
                              : `${order.shippingFee||0} EGP`}
                          </span>
                          {order.paymentMethod==='vodafone'&&<span className="badge-vf">فودافون كاش</span>}
                          {order.paymentMethod==='cod'&&order.depositAmount>0&&<span className="badge-vf" style={{background:'#c9a84c',color:'#000'}}>ديبوزيت مدفوع</span>}
                          {eligible&&<span className="badge-eligible">⭐ {cp.points} نقطة — مؤهل للشحن المجاني</span>}
                          <span style={{fontSize:'10px',fontWeight:'600',padding:'3px 8px',borderRadius:'20px',background:`${si.color}22`,color:si.color}}>{si.label}</span>
                          <span style={{fontSize:'11px',color:'var(--gray)'}}>{order.createdAt?new Date(order.createdAt).toLocaleDateString('ar-EG'):'—'}</span>
                        </div>
                      </div>

                      <div className="order-actions-row">
                        {ORDER_STATUSES.map(s=>(
                          <button key={s.value}
                            className={`status-btn${order.status===s.value?' active':''}`}
                            style={order.status===s.value?{background:s.color,color:'#fff',borderColor:s.color}:{}}
                            onClick={()=>handleStatusChange(order.id,s.value)}>{s.label}</button>
                        ))}
                        <button
                          className="status-btn"
                          style={{background:'#25D366',color:'#fff',borderColor:'#25D366'}}
                          onClick={(e)=>{e.stopPropagation();sendOrderToAdminWhatsApp(order, siteSettings?.adminWhatsappNumber || siteSettings?.whatsappNumber);}}>
                          📤 إرسال الطلب واتساب
                        </button>
                      </div>

                      {/* Receipt image */}
                      {order.receiptUrl && (
                        <div className="receipt-preview-wrap">
                          <p style={{fontSize:'12px',color:'var(--gray)',marginBottom:'8px'}}>📎 إيصال الدفع:</p>
                          <a href={order.receiptUrl} target="_blank" rel="noreferrer">
                            <img src={order.receiptUrl} alt="إيصال" className="receipt-thumb" />
                          </a>
                        </div>
                      )}

                      {expandedOrder===order.id&&(
                        <div className="order-details">
                          {order.items?.map((item,i)=>(
                            <div key={i} className="order-detail-item">
                              <img src={item.imageUrl||`https://placehold.co/48x48/1a1a1a/c9a84c?text=P`} alt={item.name} style={{width:'48px',height:'48px',objectFit:'cover',borderRadius:'6px'}} />
                              <div style={{flex:1}}>
                                <p style={{fontWeight:'500',fontSize:'13px'}}>{item.name} × {item.quantity}</p>
                                <p style={{color:'var(--gold)',fontSize:'12px'}}>{(item.price*item.quantity).toFixed(2)} EGP</p>
                                {item.customization?.engravingText&&<p style={{fontSize:'11px',color:'var(--gray)',marginTop:'4px'}}>{item.customizationType==='name_writing'?'✏️ الاسم المطلوب: ':'✏️ النقش: '}{item.customization.engravingText}</p>}
                                {item.customization?.imageUrl&&(
                                  <a href={item.customization.imageUrl} target="_blank" rel="noreferrer">
                                    <img src={item.customization.imageUrl} alt="تخصيص" style={{width:'72px',height:'72px',objectFit:'cover',borderRadius:'4px',marginTop:'6px',border:'1px solid rgba(201,168,76,0.3)'}} />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="order-items" style={{marginTop:'8px'}}>
                        {order.items?.map((item,i)=><span key={i} className="order-tag">{item.name} ×{item.quantity}</span>)}
                      </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {orders.length===0&&<p className="no-data">لا توجد طلبات بعد.</p>}
              </div>
            )}
          </div>
        )}

        {/* ══ CUSTOMERS ══════════════════════════════════════════ */}
        {tab==='customers' && (
          <div className="admin-card">
            <h2>⭐ العملاء والنقاط</h2>
            <p style={{fontSize:'13px',color:'var(--gray)',marginBottom:'20px'}}>
              النقاط تُضاف تلقائياً عند تغيير حالة الطلب إلى "تم التسليم". كل قطعة = {siteSettings?.pointsPerItem||25} نقطة. عند {siteSettings?.pointsForFreeShipping||100} نقطة يحصل العميل على شحن مجاني.
            </p>
            {loading?<Spinner/>:(
              <div className="customers-list">
                {customerPoints.length===0&&<p className="no-data">لا يوجد عملاء مسجلين بعد.</p>}
                {customerPoints.map(c=>{
                  const pct = Math.min((c.points/(siteSettings?.pointsForFreeShipping||100))*100,100);
                  const eligible = c.points>=(siteSettings?.pointsForFreeShipping||100);
                  return (
                    <div key={c.user_id} className={`customer-item${eligible?' eligible':''}`}>
                      <div className="customer-info">
                        <p className="customer-email">{c.email||c.user_id}</p>
                        <div className="customer-points-bar"><div className="cp-bar-fill" style={{width:`${pct}%`}} /></div>
                        <p className="customer-points-label">{c.points} / {siteSettings?.pointsForFreeShipping||100} نقطة</p>
                      </div>
                      <div className="customer-actions">
                        {eligible&&<span className="eligible-badge">🎁 مؤهل للشحن المجاني</span>}
                        <button className="btn-edit" onClick={()=>editPoints(c.user_id,c.points)}>تعديل النقاط</button>
                        <button className="btn-delete" onClick={()=>resetPoints(c.user_id)}>تصفير</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ SHIPPING ═══════════════════════════════════════════ */}
        {tab==='shipping' && (
          <div className="admin-card">
            <h2>🚚 أسعار الشحن</h2>
            <p style={{fontSize:'13px',color:'var(--gray)',marginBottom:'20px'}}>عدّل سعر الشحن لكل محافظة ثم اضغط حفظ.</p>
            {loading?<Spinner/>:(
              <>
                <div className="shipping-grid">
                  {shippingGovs.map((gov,i)=>(
                    <div key={gov.name} className="shipping-row">
                      <span className="gov-name">{gov.name}</span>
                      <div className="shipping-fee-input">
                        <input type="number" value={gov.fee} min="0"
                          onChange={e=>setShippingGovs(prev=>prev.map((g,j)=>j===i?{...g,fee:Number(e.target.value)}:g))} />
                        <span>EGP</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn-gold" style={{marginTop:'20px'}} onClick={handleSaveShipping} disabled={saving}>
                  {saving?'جاري الحفظ...':'💾 حفظ أسعار الشحن'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ══ SETTINGS ═══════════════════════════════════════════ */}
        {tab==='settings' && siteSettings && (
          <div className="admin-card">
            <h2>⚙️ إعدادات الموقع</h2>
            <p style={{fontSize:'13px',color:'var(--gray)',marginBottom:'24px'}}>جميع الإعدادات تُحفظ في قاعدة البيانات وتؤثر مباشرة على الموقع.</p>

            <div className="settings-grid">
              <div className="settings-section">
                <h3>📱 بيانات التواصل</h3>
                <div className="form-group">
                  <label>رقم واتساب (بدون +)</label>
                  <input value={siteSettings.whatsappNumber||''} onChange={e=>setSiteSettings({...siteSettings,whatsappNumber:e.target.value})} placeholder="201130479571" />
                </div>
                <div className="form-group">
                  <label>رقم واتساب الإدارة/المندوب (لإرسال الطلبات إليه)</label>
                  <input value={siteSettings.adminWhatsappNumber||''} onChange={e=>setSiteSettings({...siteSettings,adminWhatsappNumber:e.target.value})} placeholder="201130479571" />
                  <small style={{color:'var(--gray)',fontSize:'11px'}}>هذا الرقم يُستخدم عند الضغط على زر "إرسال الطلب واتساب" في لوحة الطلبات.</small>
                </div>
                <div className="form-group">
                  <label>رقم فودافون كاش</label>
                  <input value={siteSettings.vodafoneCashNumber||''} onChange={e=>setSiteSettings({...siteSettings,vodafoneCashNumber:e.target.value})} placeholder="01022572338" />
                </div>
              </div>

              <div className="settings-section">
                <h3>🚚 إعدادات الشحن المجاني</h3>
                <div className="form-group">
                  <label>عدد القطع للشحن المجاني التلقائي</label>
                  <input type="number" value={siteSettings.freeShippingMinItems||3} min="1"
                    onChange={e=>setSiteSettings({...siteSettings,freeShippingMinItems:Number(e.target.value)})} />
                  <small style={{color:'var(--gray)',fontSize:'11px'}}>حالياً: عند طلب {siteSettings.freeShippingMinItems||3} قطع أو أكتر الشحن مجاني</small>
                </div>
              </div>

              <div className="settings-section">
                <h3>✨ إعدادات التخصيص والنقاط</h3>
                <div className="form-group">
                  <label>رسوم التخصيص (EGP)</label>
                  <input type="number" value={siteSettings.customizationFee||50} min="0"
                    onChange={e=>setSiteSettings({...siteSettings,customizationFee:Number(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label>نقاط لكل قطعة</label>
                  <input type="number" value={siteSettings.pointsPerItem||25} min="1"
                    onChange={e=>setSiteSettings({...siteSettings,pointsPerItem:Number(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label>نقاط للحصول على شحن مجاني</label>
                  <input type="number" value={siteSettings.pointsForFreeShipping||100} min="1"
                    onChange={e=>setSiteSettings({...siteSettings,pointsForFreeShipping:Number(e.target.value)})} />
                </div>
              </div>

              <div className="settings-section">
                <h3>💳 إعدادات الديبوزيت</h3>
                <div className="form-group">
                  <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer'}}>
                    <input type="checkbox" checked={siteSettings.depositEnabled||false}
                      onChange={e=>setSiteSettings({...siteSettings,depositEnabled:e.target.checked})} />
                    تفعيل نظام الديبوزيت
                  </label>
                  <small style={{color:'var(--gray)',fontSize:'11px'}}>لما يكون مفعّل، العملاء لازم يدفعوا ديبوزيت لتأكيد الطلب</small>
                </div>
                <div className="form-group">
                  <label>الحد الأدنى للديبوزيت (EGP)</label>
                  <input type="number" value={siteSettings.depositMinAmount||50} min="0"
                    onChange={e=>setSiteSettings({...siteSettings,depositMinAmount:Number(e.target.value)})} />
                  <small style={{color:'var(--gray)',fontSize:'11px'}}>لو رفع أقل من هذا المبلغ تظهر رسالة خطأ</small>
                </div>
                <div className="form-group">
                  <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer'}}>
                    <input type="checkbox" checked={siteSettings.codDepositRequired||false}
                      onChange={e=>setSiteSettings({...siteSettings,codDepositRequired:e.target.checked})} />
                    طلب ديبوزيت عند اختيار الدفع عند الاستلام
                  </label>
                </div>
                <div className="form-group">
                  <label>رسالة الدفع عند الاستلام</label>
                  <textarea rows={3} value={siteSettings.codDepositMessage||''} onChange={e=>setSiteSettings({...siteSettings,codDepositMessage:e.target.value})} />
                  <small style={{color:'var(--gray)',fontSize:'11px'}}>تظهر للعميل لما يضغط تأكيد الطلب عند الاستلام</small>
                </div>
              </div>

              <div className="settings-section">
                <h3>📢 شريط الإعلانات</h3>
                <div className="form-group">
                  <label>نص شريط الإعلانات</label>
                  <textarea rows={3} value={siteSettings.marqueeText||''} onChange={e=>setSiteSettings({...siteSettings,marqueeText:e.target.value})} />
                  <small style={{color:'var(--gray)',fontSize:'11px'}}>افصل بين الرسائل بـ | مثال: رسالة 1 | رسالة 2</small>
                </div>
              </div>
            </div>

            <button className="btn-gold" style={{marginTop:'24px'}} onClick={handleSaveSettings} disabled={saving}>
              {saving?'جاري الحفظ...':'💾 حفظ جميع الإعدادات'}
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
