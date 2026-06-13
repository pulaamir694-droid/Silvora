// src/pages/About.jsx
export default function About() {
  return (
    <main className="static-page">
      <div className="static-container">
        <div className="static-hero">
          <p className="section-sub">Our Story</p>
          <h1 className="static-title">من نحن</h1>
          <div className="divider-gold" />
        </div>

        <div className="static-content">
          <div className="about-grid">
            <div className="about-text">
              <h2>Silvora Accessories</h2>
              <p>
                سيلفورا أكسسوارات — متجر متخصص في الإكسسوارات الفاخرة المصنوعة بعناية واحترافية عالية.
                نؤمن أن كل قطعة تحكي قصة، وكل تفصيلة تعكس ذوقًا رفيعًا.
              </p>
              <p>
                نقدم مجموعة متنوعة من المجوهرات والإكسسوارات الفاخرة التي تناسب كل مناسبة وكل أسلوب،
                مع إمكانية التخصيص الكامل لتجعل كل قطعة فريدة من نوعها.
              </p>
              <p>
                هدفنا هو تقديم تجربة تسوق فاخرة وسهلة، مع الحرص على أعلى معايير الجودة في كل منتج.
              </p>
            </div>

            <div className="about-features">
              <div className="about-feature-card">
                <span>💎</span>
                <h3>جودة فاخرة</h3>
                <p>كل قطعة تمر بمراجعة دقيقة للتأكد من أعلى معايير الجودة</p>
              </div>
              <div className="about-feature-card">
                <span>✨</span>
                <h3>تخصيص كامل</h3>
                <p>نقش أسماء وصور على منتجاتنا لتجعلها هدية لا تُنسى</p>
              </div>
              <div className="about-feature-card">
                <span>🚚</span>
                <h3>توصيل لكل مصر</h3>
                <p>نوصل لجميع المحافظات المصرية بأسعار مناسبة وسرعة عالية</p>
              </div>
              <div className="about-feature-card">
                <span>💬</span>
                <h3>خدمة عملاء متميزة</h3>
                <p>فريقنا متاح على واتساب للرد على جميع استفساراتك</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
