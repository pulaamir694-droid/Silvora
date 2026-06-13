// src/pages/PrivacyPolicy.jsx
export default function PrivacyPolicy() {
  return (
    <main className="static-page">
      <div className="static-container">
        <div className="static-hero">
          <p className="section-sub">Legal</p>
          <h1 className="static-title">سياسة الخصوصية</h1>
          <div className="divider-gold" />
        </div>
        <div className="policy-content">
          <div className="policy-section">
            <h2>📋 المعلومات التي نجمعها</h2>
            <p>نقوم بجمع المعلومات التالية عند إتمام طلبك:</p>
            <ul>
              <li>الاسم الكامل</li>
              <li>رقم الهاتف</li>
              <li>عنوان التوصيل</li>
              <li>صور التخصيص (إن وُجدت)</li>
            </ul>
          </div>

          <div className="policy-section">
            <h2>🔒 كيف نستخدم معلوماتك</h2>
            <ul>
              <li>لإتمام وتأكيد طلباتك.</li>
              <li>للتواصل معك بشأن طلبك.</li>
              <li>لتحسين خدماتنا.</li>
              <li>لن نشارك بياناتك مع أي طرف ثالث.</li>
            </ul>
          </div>

          <div className="policy-section">
            <h2>🛡️ حماية البيانات</h2>
            <p>
              نستخدم خدمات Firebase من Google لتخزين البيانات بأمان تام.
              جميع البيانات مشفرة ومحمية وفق أعلى معايير الأمان.
            </p>
          </div>

          <div className="policy-section">
            <h2>🖼️ صور التخصيص</h2>
            <p>
              الصور التي ترفعها لأغراض التخصيص (صور العيون أو الصور الشخصية)
              تُستخدم فقط لإنتاج المنتج المطلوب ولا تُشارك مع أي جهة أخرى.
            </p>
          </div>

          <div className="policy-section">
            <h2>📞 التواصل</h2>
            <p>لأي استفسار حول سياسة الخصوصية، تواصل معنا عبر:</p>
            <a href="https://wa.me/201130479571" target="_blank" rel="noreferrer" className="btn-gold" style={{display:'inline-block',marginTop:'12px'}}>
              واتساب
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
