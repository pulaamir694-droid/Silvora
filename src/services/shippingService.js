// src/services/shippingService.js
import { supabase } from './supabase';

const DEFAULT_GOVERNORATES = [
  { name: 'القاهرة', fee: 50 },
  { name: 'الجيزة', fee: 50 },
  { name: 'القليوبية', fee: 50 },
  { name: 'الإسكندرية', fee: 55 },
  { name: 'البحيرة', fee: 55 },
  { name: 'الدقهلية', fee: 65 },
  { name: 'الشرقية', fee: 65 },
  { name: 'المنوفية', fee: 65 },
  { name: 'الغربية', fee: 65 },
  { name: 'كفر الشيخ', fee: 65 },
  { name: 'دمياط', fee: 65 },
  { name: 'بورسعيد', fee: 65 },
  { name: 'الإسماعيلية', fee: 65 },
  { name: 'السويس', fee: 65 },
  { name: 'شمال سيناء', fee: 70 },
  { name: 'جنوب سيناء', fee: 70 },
  { name: 'المنيا', fee: 70 },
  { name: 'أسيوط', fee: 70 },
  { name: 'سوهاج', fee: 70 },
  { name: 'قنا', fee: 70 },
  { name: 'الأقصر', fee: 70 },
  { name: 'أسوان', fee: 70 },
  { name: 'بني سويف', fee: 70 },
  { name: 'الفيوم', fee: 70 },
  { name: 'مطروح', fee: 90 },
  { name: 'البحر الأحمر', fee: 90 },
  { name: 'الوادي الجديد', fee: 90 },
];

export const getShippingSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('shipping')
      .select('*')
      .order('id');
    if (error || !data || data.length === 0) return DEFAULT_GOVERNORATES;
    return data.map(r => ({ name: r.name, fee: r.fee }));
  } catch {
    return DEFAULT_GOVERNORATES;
  }
};

export const saveShippingSettings = async (governorates) => {
  // Delete all and re-insert
  await supabase.from('shipping').delete().neq('id', 0);
  const { error } = await supabase.from('shipping').insert(
    governorates.map(g => ({ name: g.name, fee: g.fee }))
  );
  if (error) throw error;
};

export const getShippingFee = (governorates, name) => {
  const gov = governorates.find(g => g.name === name);
  return gov ? gov.fee : 65;
};

export { DEFAULT_GOVERNORATES };
