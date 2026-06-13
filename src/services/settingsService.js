// src/services/settingsService.js
import { supabase } from './supabase';

const DEFAULT_SETTINGS = {
  siteName: 'Silvora Accessories',
  whatsappNumber: '201130479571',
  adminWhatsappNumber: '201130479571',
  vodafoneCashNumber: '01022572338',
  freeShippingMinItems: 3,
  customizationFee: 50,
  pointsPerItem: 25,
  pointsForFreeShipping: 100,
  marqueeText: 'شحن مجاني عند طلب 3 قطع أو أكتر | إكسسوارات فاخرة | تخصيص بالاسم والصورة | توصيل لكل مصر',
  depositEnabled: true,
  depositMinAmount: 50,
  codDepositRequired: true,
  codDepositMessage: 'يسعدنا خدمتك! الدفع عند الاستلام متاح، لكن نحتاج مبلغ تأكيد (ديبوزيت) لتأكيد الطلب.',
  pkg_wallet_name_price: 30,
  pkg_wallet_eyes_price: 50,
  pkg_mug_name_price:    30,
  pkg_watch_eyes_price:  50,
  pkg_watch_date_price:  30,
};

export const getSettings = async () => {
  try {
    const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
    if (error || !data) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...data.settings };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings) => {
  const { error } = await supabase.from('site_settings').upsert({ id: 1, settings, updated_at: new Date().toISOString() });
  if (error) throw error;
};

export { DEFAULT_SETTINGS };
