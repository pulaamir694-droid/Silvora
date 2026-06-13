// src/components/CustomizationModal.jsx
import { useState } from 'react';
import { supabase } from '../services/supabase';

const uploadImage = async (file) => {
  // Try Supabase storage first
  try {
    const ext = file.name.split('.').pop();
    const path = `customizations/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true });
    if (!error) {
      return supabase.storage.from('images').getPublicUrl(path).data.publicUrl;
    }
  } catch {}

  // Fallback: convert to base64 for guests
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function CustomizationModal({ item, onClose, onSave }) {
  const [engravingText, setEngravingText] = useState(item.customization?.engravingText || '');
  const [imageFile, setImageFile]         = useState(null);
  const [imagePreview, setImagePreview]   = useState(item.customization?.imageUrl || '');
  const [uploading, setUploading]         = useState(false);
  const [error, setError]                 = useState('');

  const isEyes  = item.customizationType === 'eyes';
  const isPhoto = item.customizationType === 'photo_engraving';
  const isNameWriting = item.customizationType === 'name_writing';
  const needsImage = isEyes || isPhoto;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const handleSave = async () => {
    if (needsImage && !imagePreview) { setError('يرجى رفع الصورة المطلوبة'); return; }
    if (isNameWriting && !engravingText.trim()) { setError('يرجى كتابة الاسم المطلوب'); return; }
    setUploading(true); setError('');
    try {
      let imageUrl = item.customization?.imageUrl || '';
      if (imageFile) imageUrl = await uploadImage(imageFile);
      onSave({ engravingText, imageUrl, type: item.customizationType });
    } catch {
      setError('فشل رفع الصورة، حاول مرة أخرى');
    } finally { setUploading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" dir="rtl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>تخصيص المنتج</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="modal-product-name">{item.name}</p>
          {error && <div className="alert-error">{error}</div>}

          {needsImage && (
            <div className="form-group">
              <label>{isEyes ? '📷 صورة العين (إجباري)' : '📷 الصورة المراد حفرها (إجباري)'}</label>
              <div className="image-upload-area" onClick={() => document.getElementById('custom-img').click()}>
                {imagePreview
                  ? <img src={imagePreview} alt="preview" className="img-preview" />
                  : <div className="upload-placeholder"><span>📷</span><p>اضغط لرفع الصورة</p></div>}
              </div>
              <input id="custom-img" type="file" accept="image/*" onChange={handleImageChange} style={{display:'none'}} />
            </div>
          )}

          <div className="form-group">
            <label>{isNameWriting ? 'الاسم المطلوب كتابته *' : 'النقش الخلفي (اختياري) — اسم أو تاريخ'}</label>
            <input type="text" value={engravingText} onChange={e => setEngravingText(e.target.value)}
              placeholder={isNameWriting ? 'مثال: محمد' : 'مثال: محمد أو 2024/01/15'} maxLength={30} />
            <span style={{fontSize:'11px',color:'var(--gray)',marginTop:'4px',display:'block'}}>{engravingText.length}/30 حرف</span>
          </div>

          <button className="btn-gold btn-block" onClick={handleSave} disabled={uploading}>
            {uploading ? 'جاري الحفظ...' : '✓ حفظ التخصيص'}
          </button>
        </div>
      </div>
    </div>
  );
}
