// src/pages/ReturnPolicy.jsx
export default function ReturnPolicy() {
  return (
    <main className="static-page">
      <div className="static-container">
        <div className="static-hero">
          <p className="section-sub">Policy</p>
          <h1 className="static-title">سياسة الاستبدال والاسترجاع</h1>
          <div className="divider-gold" />
        </div>
        <div className="policy-content">
          <div className="policy-section">
            <h2>📦 شروط الاسترجاع</h2>
            <ul>
              <li>يمكن استرجاع المنتج خلال <strong>7 أيام</strong> من تاريخ الاستلام.</li>
              <li>يجب أن يكون المنتج في حالته الأصلية غير مستخدم.</li>
              <li>يجب الاحتفاظ بالتغليف الأصلي.</li>
              <li>يتحمل العميل تكلفة الشحن عند الإرجاع.</li>
            </ul>
          </div>

          <div className="policy-section">
            <h2>🔄 شروط الاستبدال</h2>
            <ul>
              <li>يمكن استبدال المنتج خلال <strong>7 أيام</strong> من تاريخ الاستلام.</li>
              <li>الاستبدال متاح في حالة وجود عيب مصنعي أو خطأ في الطلب.</li>
              <li>يتم الاستبدال بنفس المنتج أو منتج بنفس القيمة.</li>
            </ul>
          </div>

          <div className="policy-section">
            <h2>❌ منتجات لا يمكن إرجاعها</h2>
            <ul>
              <li>المنتجات المخصصة (نقش أسماء أو صور) — لا يمكن إرجاعها أو استبدالها.</li>
              <li>المنتجات التي تم استخدامها.</li>
              <li>المنتجات التي فُقد تغليفها الأصلي.</li>
            </ul>
          </div>

          <div className="policy-section">
            <h2>💰 استرداد المبلغ</h2>
            <ul>
              <li>يتم استرداد المبلغ خلال <strong>3-5 أيام عمل</strong> بعد استلام المنتج المُرجَع.</li>
              <li>يتم الاسترداد بنفس طريقة الدفع الأصلية.</li>
              <li>رسوم الشحن غير قابلة للاسترداد.</li>
            </ul>
          </div>

          <div className="policy-contact">
            <p>للتواصل بخصوص الاسترجاع والاستبدال:</p>
            <a href="https://wa.me/201130479571" target="_blank" rel="noreferrer" className="btn-gold">
              تواصل معنا عبر واتساب
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
