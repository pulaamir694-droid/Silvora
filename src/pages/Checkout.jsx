// src/pages/Checkout.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { saveOrder, sendWhatsAppOrder } from '../services/ordersService';
import { getShippingSettings, getShippingFee } from '../services/shippingService';
import { getSettings } from '../services/settingsService';
import { supabase } from '../services/supabase';
import CustomizationModal from '../components/CustomizationModal';

const validate = (form) => {
  const e = {};
  if (!form.name.trim())    e.name  = 'الاسم مطلوب';
  if (!form.phone.trim())   e.phone = 'رقم الهاتف مطلوب';
  if (!form.governorate)    e.governorate = 'المحافظة مطلوبة';
  if (!form.address.trim()) e.address = 'العنوان مطلوب';
  return e;
};

export default function Checkout() {
  const { cart, total, clearCart, updateCustomization } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name:'', phone:'', governorate:'', address:'', notes:'' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [customizingItem, setCustomizingItem] = useState(null);
  const [governorates, setGovernorates] = useState([]);
  const [settings, setSettings] = useState(null);

  // Auth
  const [authUser, setAuthUser]   = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [showAuth, setShowAuth]   = useState(false);
  const [authMode, setAuthMode]   = useState('login');
  const [authForm, setAuthForm]   = useState({ email:'', password:'', name:'' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError]     = useState('');
  const [authRegistered, setAuthRegistered] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod]   = useState('cod');
  const [receiptFile, setReceiptFile]       = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [showCodConfirm, setShowCodConfirm] = useState(false);
  const [depositAmount, setDepositAmount]   = useState('');
  const [depositError, setDepositError]     = useState('');

  useEffect(() => {
    getShippingSettings().then(setGovernorates);
    getSettings().then(setSettings);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setAuthUser(session.user); loadPoints(session.user.id); }
    });
  }, []);

  const loadPoints = async (uid) => {
    const { data } = await supabase.from('customer_points').select('points').eq('user_id', uid).single();
    setUserPoints(data?.points || 0);
  };

  const FREE_MIN   = settings?.freeShippingMinItems || 3;
  const PTS_FREE   = settings?.pointsForFreeShipping || 100;
  const CUST_FEE   = settings?.customizationFee || 50;
  const VF_NUMBER  = settings?.vodafoneCashNumber || '01022572338';

  const totalItems      = cart.reduce((s,i) => s + i.quantity, 0);
  const freeBy3         = totalItems >= FREE_MIN;
  const freeByPoints    = userPoints >= PTS_FREE;
  const isFreeShipping  = freeBy3 || freeByPoints;

  const baseShipping  = form.governorate ? getShippingFee(governorates, form.governorate) : 0;
  const shippingFee   = isFreeShipping ? 0 : baseShipping;
  const custFee       = cart.reduce((s,i) => s + (i.customization?.engravingText?.trim() ? CUST_FEE * i.quantity : 0), 0);
  const grandTotal    = total + shippingFee + custFee;
  const pointsToEarn  = totalItems * (settings?.pointsPerItem || 25);

  const needsCustomization = cart.some(i => i.customizationType && i.customizationType !== 'none' && !i.customization);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const uploadReceipt = async () => {
    if (!receiptFile) return null;
    const ext  = receiptFile.name.split('.').pop();
    const path = `receipts/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('images').upload(path, receiptFile);
    if (error) throw error;
    return supabase.storage.from('images').getPublicUrl(path).data.publicUrl;
  };

  const handleSubmit = async () => {
    if (needsCustomization) { showToast('أكمل بيانات التخصيص أولاً', 'error'); return; }
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    // COD + deposit required → show popup first
    if (paymentMethod === 'cod' && settings?.depositEnabled && settings?.codDepositRequired) {
      setShowCodConfirm(true);
      return;
    }

    // Vodafone → validate receipt
    if (paymentMethod === 'vodafone' && !receiptFile) { showToast('ارفع صورة إيصال الدفع', 'error'); return; }

    await submitOrder();
  };

  const handleCodConfirm = () => {
    const min = settings?.depositMinAmount || 50;
    const amt = Number(depositAmount);
    if (!depositAmount || isNaN(amt)) { setDepositError('أدخل مبلغ الديبوزيت'); return; }
    if (amt < min) { setDepositError(`المبلغ قليل جداً! الحد الأدنى ${min} جنيه`); return; }
    if (!receiptFile) { setDepositError('ارفع صورة إيصال الديبوزيت'); return; }
    setShowCodConfirm(false);
    submitOrder();
  };

  const submitOrder = async () => {
    setLoading(true);
    try {
      const receiptUrl = paymentMethod === 'vodafone' ? await uploadReceipt() : null;
      await saveOrder({
        customer: form, items: cart, subtotal: total,
        shippingFee, customizationFee: custFee, total: grandTotal,
        paymentMethod,
        depositAmount: paymentMethod === 'cod' ? Number(depositAmount) : null,
        receiptUrl,
        userId: authUser?.id || null,
        freeShippingReason: isFreeShipping ? (freeByPoints ? 'points' : '3items') : null,
      });

      if (authUser && freeByPoints) {
        await supabase.from('customer_points').upsert({ user_id: authUser.id, points: 0, email: authUser.email, updated_at: new Date().toISOString() });
        setUserPoints(0);
      }

      if (paymentMethod !== 'vodafone') sendWhatsAppOrder(form, cart, grandTotal, shippingFee);
      clearCart();
      setDone(true);
    } catch (e) {
      console.error(e);
      showToast('حدث خطأ، حاول مجدداً', 'error');
    } finally { setLoading(false); }
  };

  const handleAuth = async () => {
    setAuthLoading(true); setAuthError('');
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password });
        if (error) throw error;
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) { setAuthUser(session.user); loadPoints(session.user.id); }
        setShowAuth(false);
        showToast('تم تسجيل الدخول ✓', 'success');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: { data: { full_name: authForm.name } }
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from('customer_points').insert({ user_id: data.user.id, points: 0, email: authForm.email });
        }
        setShowAuth(false);
        // Show email confirmation message
        setAuthRegistered(true);
      }
    } catch (e) {
      setAuthError(e.message === 'Invalid login credentials' ? 'إيميل أو كلمة مرور غير صحيحة' : e.message);
    } finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthUser(null); setUserPoints(0);
  };

  if (cart.length === 0 && !done) return (
    <div className="checkout-empty">
      <h2>سلتك فارغة</h2>
      <button className="btn-gold" onClick={() => navigate('/')}>تابع التسوق</button>
    </div>
  );

  if (done) return (
    <div className="order-success" dir="rtl">
      <div className="success-icon">✓</div>
      <h2>تم تأكيد طلبك!</h2>
      <p>{paymentMethod === 'vodafone' ? 'سيتم مراجعة الإيصال والتواصل معك قريباً.' : 'تم إرسال طلبك عبر واتساب. سنتواصل معك قريباً.'}</p>
      {authUser && !freeByPoints && <p style={{color:'#c9a84c',marginTop:'8px'}}>🎉 ستربح {pointsToEarn} نقطة بعد التسليم!</p>}
      <button className="btn-gold" style={{marginTop:'20px'}} onClick={() => navigate('/')}>العودة للرئيسية</button>
    </div>
  );

  return (
    <main className="checkout-page" dir="rtl">
      <div className="checkout-container">

        {/* ── Form ─────────────────────────────────────────── */}
        <div className="checkout-form-section">
          <h1 className="checkout-title">إتمام الطلب</h1>
          <div className="divider-gold" style={{margin:'0 0 24px'}} />

          {/* Auth Section */}
          <div className="auth-section">
            {authUser ? (
              <div className="auth-logged">
                <span>👤 {authUser.user_metadata?.full_name || authUser.email}</span>
                <span className="points-badge">⭐ {userPoints} نقطة</span>
                {freeByPoints && <span className="free-ship-badge">🎁 شحن مجاني محقق!</span>}
                <button className="btn-text-small" onClick={handleLogout}>خروج</button>
              </div>
            ) : (
              <div className="auth-prompt">
                <p>سجّل دخولك لتجميع نقاط 🌟 — أو اكمل كضيف بدون تسجيل</p>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'8px'}}>
                  <button className="btn-outline-gold btn-sm" onClick={() => { setShowAuth(true); setAuthMode('login'); setAuthRegistered(false); }}>دخول</button>
                  <button className="btn-outline-gold btn-sm" onClick={() => { setShowAuth(true); setAuthMode('register'); setAuthRegistered(false); }}>حساب جديد</button>
                  <span style={{fontSize:'12px',color:'var(--gray)',alignSelf:'center'}}>أو تابع بدون حساب ↓</span>
                </div>
              </div>
            )}
          </div>

          {showAuth && (
            <div className="auth-box">
              {authRegistered ? (
                <div className="email-confirm-msg">
                  <div style={{fontSize:'36px',marginBottom:'12px'}}>📧</div>
                  <h3>تحقق من إيميلك!</h3>
                  <p>تم إنشاء حسابك بنجاح ✓</p>
                  <p>سوف تصلك رسالة على الإيميل <strong style={{color:'#c9a84c'}}>{authForm.email}</strong> — اضغط على رابط التأكيد لتفعيل حسابك.</p>
                  <p style={{fontSize:'12px',color:'var(--gray)',marginTop:'8px'}}>يمكنك إكمال طلبك الآن كضيف وتسجيل الدخول لاحقاً.</p>
                  <button className="btn-outline-gold" style={{marginTop:'14px'}} onClick={() => { setShowAuth(false); setAuthRegistered(false); }}>إكمال الطلب</button>
                </div>
              ) : (
                <>
                  <h3>{authMode === 'login' ? 'تسجيل دخول' : 'إنشاء حساب'}</h3>
                  {authError && <div className="alert-error">{authError}</div>}
                  {authMode === 'register' && (
                    <div className="form-group">
                      <label>الاسم</label>
                      <input value={authForm.name} onChange={e => setAuthForm({...authForm,name:e.target.value})} placeholder="اسمك" />
                    </div>
                  )}
                  <div className="form-group">
                    <label>الإيميل</label>
                    <input type="email" value={authForm.email} onChange={e => setAuthForm({...authForm,email:e.target.value})} placeholder="email@example.com" />
                  </div>
                  <div className="form-group">
                    <label>كلمة المرور</label>
                    <input type="password" value={authForm.password} onChange={e => setAuthForm({...authForm,password:e.target.value})} placeholder="••••••••" />
                  </div>
                  <div style={{display:'flex',gap:'8px'}}>
                    <button className="btn-gold" onClick={handleAuth} disabled={authLoading}>{authLoading ? 'جاري...' : authMode === 'login' ? 'دخول' : 'إنشاء'}</button>
                    <button className="btn-outline-gold" onClick={() => setShowAuth(false)}>إلغاء</button>
                  </div>

                  <div className="login-divider"><span>أو</span></div>

                  <button className="btn-google" onClick={async () => {
                    try {
                      await supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: { redirectTo: window.location.href }
                      });
                    } catch { showToast('فشل تسجيل الدخول بـ Google', 'error'); }
                  }}>
                    <svg width="18" height="18" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    متابعة بـ Google
                  </button>

                  <p style={{fontSize:'12px',marginTop:'8px',color:'var(--gray)',cursor:'pointer'}} onClick={() => setAuthMode(authMode==='login'?'register':'login')}>
                    {authMode === 'login' ? 'مش عندك حساب؟ سجّل الآن' : 'عندك حساب؟ سجّل دخول'}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Customization notices */}
          {cart.filter(i => i.customizationType && i.customizationType !== 'none').map(item => (
            <div key={item.id} className={`customization-notice ${item.customization ? 'done' : 'pending'}`}>
              {item.customization ? '✓' : '⚠️'} {item.name} — {item.customization ? 'تم إضافة التخصيص' : 'يحتاج تخصيص'}
              {!item.customization && <button className="btn-customize-inline" onClick={() => setCustomizingItem(item)}>إضافة</button>}
            </div>
          ))}

          <div className="form-group">
            <label>الاسم الكامل *</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="اسمك كامل" className={errors.name?'error':''} />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>
          <div className="form-group">
            <label>رقم الهاتف *</label>
            <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="01xxxxxxxxx" className={errors.phone?'error':''} />
            {errors.phone && <span className="field-error">{errors.phone}</span>}
          </div>
          <div className="form-group">
            <label>المحافظة *</label>
            <select name="governorate" value={form.governorate} onChange={handleChange} className={`gov-select${errors.governorate?' error':''}`}>
              <option value="">اختر المحافظة</option>
              {governorates.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
            </select>
            {errors.governorate && <span className="field-error">{errors.governorate}</span>}
          </div>
          <div className="form-group">
            <label>العنوان التفصيلي *</label>
            <textarea name="address" value={form.address} onChange={handleChange} placeholder="الشارع، الحي، المدينة..." rows={3} className={errors.address?'error':''} />
            {errors.address && <span className="field-error">{errors.address}</span>}
          </div>
          <div className="form-group">
            <label>ملاحظات (اختياري)</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="أي ملاحظات إضافية..." rows={2} />
          </div>

          {/* Payment */}
          <div className="form-group">
            <label>طريقة الدفع *</label>
            <div className="payment-options">
              <div className={`payment-option${paymentMethod==='cod'?' active':''}`} onClick={() => setPaymentMethod('cod')}>
                <span>🚪</span>
                <div><p>الدفع عند الاستلام</p><small>كاش عند التسليم</small></div>
              </div>
              <div className={`payment-option${paymentMethod==='vodafone'?' active':''}`} onClick={() => setPaymentMethod('vodafone')}>
                <span>💳</span>
                <div><p>فودافون كاش</p><small>ديبوزيت مقدم</small></div>
              </div>
            </div>
          </div>

          {paymentMethod === 'vodafone' && (
            <div className="vodafone-section">
              <div className="vodafone-info">
                <p>📲 حوّل المبلغ على رقم فودافون كاش:</p>
                <p className="vf-number">{VF_NUMBER}</p>
                <p className="vf-amount">المبلغ المطلوب: <strong>{grandTotal.toFixed(2)} EGP</strong></p>
              </div>
              <div className="form-group">
                <label>📎 صورة إيصال الدفع *</label>
                <div className="image-upload-area" onClick={() => document.getElementById('receipt-upload').click()}>
                  {receiptPreview
                    ? <img src={receiptPreview} alt="إيصال" className="img-preview" />
                    : <div className="upload-placeholder"><span>📷</span><p>اضغط لرفع الإيصال</p></div>}
                </div>
                <input id="receipt-upload" type="file" accept="image/*" style={{display:'none'}}
                  onChange={e => { const f=e.target.files[0]; if(f){setReceiptFile(f);setReceiptPreview(URL.createObjectURL(f));} }} />
              </div>
            </div>
          )}

          <button className="btn-gold btn-block" onClick={handleSubmit} disabled={loading}>
            {loading ? 'جاري الإرسال...' : paymentMethod==='vodafone' ? '✅ تأكيد الطلب' : '📱 تأكيد الطلب عبر واتساب'}
          </button>
        </div>

        {/* ── Summary ──────────────────────────────────────── */}
        <div className="order-summary">
          <h2>ملخص الطلب</h2>
          <div className="divider-gold" style={{marginBottom:'16px'}} />

          {authUser && (
            <div className="points-summary">
              <div className="points-progress-wrap">
                <div className="points-progress-bar">
                  <div className="points-progress-fill" style={{width:`${Math.min((userPoints/PTS_FREE)*100,100)}%`}} />
                </div>
                <div className="points-progress-labels">
                  <span>⭐ {userPoints} نقطة</span>
                  <span>{PTS_FREE} = شحن مجاني</span>
                </div>
              </div>
              <p className="points-earn-note">ستكسب +{pointsToEarn} نقطة بعد التسليم</p>
            </div>
          )}

          {cart.map(item => (
            <div key={item.id} className="summary-item">
              <img src={item.imageUrl||`https://placehold.co/60x60/1a1a1a/c9a84c?text=P`} alt={item.name} />
              <div style={{flex:1}}>
                <p className="summary-name">{item.name}</p>
                <p className="summary-qty">الكمية: {item.quantity}</p>
                {item.customizationType && item.customizationType !== 'none' && (
                  <button className="btn-customize-sm" onClick={() => setCustomizingItem(item)}>
                    {item.customization ? '✓ تعديل التخصيص' : '+ إضافة تخصيص'}
                  </button>
                )}
                {item.customization?.engravingText && <p className="custom-preview">نقش: {item.customization.engravingText}</p>}
              </div>
              <span className="summary-price">{(item.price*item.quantity).toFixed(2)} EGP</span>
            </div>
          ))}

          <div className="summary-shipping"><span>المنتجات</span><span>{total.toFixed(2)} EGP</span></div>
          {custFee > 0 && <div className="summary-shipping"><span>✨ رسوم النقش</span><span>{custFee.toFixed(2)} EGP</span></div>}
          <div className="summary-shipping">
            <span>🚚 الشحن {form.governorate?`(${form.governorate})`:''}</span>
            <span>
              {isFreeShipping
                ? <><s style={{color:'var(--gray)',marginLeft:'6px'}}>{baseShipping>0?`${baseShipping} EGP`:''}</s><span style={{color:'#3a8a3a',fontWeight:'bold'}}> مجاني 🎁</span></>
                : baseShipping > 0 ? `${baseShipping} EGP` : 'اختر المحافظة'}
            </span>
          </div>
          {freeBy3    && <p className="free-ship-note">🎉 شحن مجاني لطلب {FREE_MIN} قطع أو أكتر!</p>}
          {freeByPoints && <p className="free-ship-note">🎁 شحن مجاني بنقاطك! (النقاط ستُصفَّر تلقائياً)</p>}
          <div className="summary-total">
            <span>الإجمالي</span>
            <span>{baseShipping>0||isFreeShipping ? `${grandTotal.toFixed(2)} EGP` : `${total.toFixed(2)} EGP +شحن`}</span>
          </div>
        </div>
      </div>

      {customizingItem && (
        <CustomizationModal
          item={customizingItem}
          onClose={() => setCustomizingItem(null)}
          onSave={data => { updateCustomization(customizingItem.id, data); setCustomizingItem(null); showToast('تم حفظ التخصيص ✓','success'); }}
        />
      )}

      {/* COD Deposit Popup */}
      {showCodConfirm && (
        <div className="modal-overlay" onClick={() => setShowCodConfirm(false)}>
          <div className="modal-box" dir="rtl" onClick={e => e.stopPropagation()}>
            <h3>🛵 تأكيد الطلب — ديبوزيت مطلوب</h3>
            <p className="cod-confirm-msg">{settings?.codDepositMessage || 'يسعدنا خدمتك! الدفع عند الاستلام متاح، لكن نحتاج مبلغ تأكيد (ديبوزيت) لتأكيد الطلب.'}</p>

            <div className="deposit-summary-box">
              <div className="deposit-row"><span>💰 إجمالي الطلب</span><strong>{grandTotal.toFixed(2)} EGP</strong></div>
              <div className="deposit-row highlight"><span>⬇️ الديبوزيت المدفوع</span><strong style={{color:'#c9a84c'}}>- {Number(depositAmount)||0} EGP</strong></div>
              <div className="deposit-row total"><span>🚪 المتبقي عند الاستلام</span><strong style={{color:'#fff',fontSize:'18px'}}>{Math.max(grandTotal - (Number(depositAmount)||0), 0).toFixed(2)} EGP</strong></div>
            </div>

            <div className="form-group" style={{marginTop:'16px'}}>
              <label>أدخل مبلغ الديبوزيت (EGP) *</label>
              <input type="number" value={depositAmount} min={settings?.depositMinAmount||50}
                onChange={e => { setDepositAmount(e.target.value); setDepositError(''); }}
                placeholder={`${settings?.depositMinAmount||50} جنيه أو أكتر`} />
              {depositError && <span className="field-error">{depositError}</span>}
              <small style={{color:'var(--gray)',fontSize:'11px',marginTop:'4px',display:'block'}}>
                الحد الأدنى: {settings?.depositMinAmount||50} جنيه
              </small>
            </div>

            {/* Receipt upload for COD deposit */}
            <div className="form-group">
              <label>📎 صورة إيصال الديبوزيت *</label>
              <div className="image-upload-area" style={{minHeight:'80px'}} onClick={() => document.getElementById('cod-receipt').click()}>
                {receiptPreview
                  ? <img src={receiptPreview} alt="إيصال" className="img-preview" />
                  : <div className="upload-placeholder"><span>📷</span><p>ارفع صورة تحويل الديبوزيت</p></div>}
              </div>
              <input id="cod-receipt" type="file" accept="image/*" style={{display:'none'}}
                onChange={e => { const f=e.target.files[0]; if(f){setReceiptFile(f);setReceiptPreview(URL.createObjectURL(f));} }} />
            </div>

            <div style={{display:'flex',gap:'10px',marginTop:'16px'}}>
              <button className="btn-gold" onClick={handleCodConfirm} disabled={loading}>
                {loading ? 'جاري...' : '✅ تأكيد وإرسال الطلب'}
              </button>
              <button className="btn-outline-gold" onClick={() => setShowCodConfirm(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
