// src/components/Footer.jsx
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-brand-name"><span className="logo-s">S</span>ILVORA</div>
          <p>Elegance in every detail.<br />Luxury accessories for the modern woman.</p>
        </div>
        <div className="footer-col">
          <h4>Quick Links</h4>
          <Link to="/">الرئيسية</Link>
          <Link to="/about">من نحن</Link>
          <Link to="/contact">تواصل معنا</Link>
        </div>
        <div className="footer-col">
          <h4>سياسات</h4>
          <Link to="/return-policy">سياسة الاسترجاع</Link>
          <Link to="/privacy-policy">سياسة الخصوصية</Link>
        </div>
        <div className="footer-col">
          <h4>تواصل معنا</h4>
          <a href="https://wa.me/201130479571" target="_blank" rel="noreferrer">📱 واتساب</a>
          <a href="https://www.facebook.com/share/1DxKaZLkoe/" target="_blank" rel="noreferrer">👍 فيسبوك</a>
          <a href="https://www.instagram.com/silvora_accessories_1" target="_blank" rel="noreferrer">📸 إنستجرام</a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Silvora Accessories. All rights reserved.</p>
      </div>
    </footer>
  );
}
