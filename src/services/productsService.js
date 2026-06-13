// src/services/productsService.js
import { supabase } from './supabase';

export const uploadImageToSupabase = async (imageFile) => {
  const fileExt = imageFile.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { error } = await supabase.storage
    .from('images')
    .upload(filePath, imageFile, { cacheControl: '3600', upsert: false });

  if (error) throw new Error('Upload failed: ' + error.message);

  const { data } = supabase.storage.from('images').getPublicUrl(filePath);
  return data.publicUrl;
};

export const uploadMultipleImages = async (imageFiles) => {
  const urls = [];
  for (const file of imageFiles) {
    const url = await uploadImageToSupabase(file);
    urls.push(url);
  }
  return urls;
};

export const getProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(p => ({
    ...p,
    imageUrl: p.images?.[0] || '',
    imageUrls: p.images || [],
    oldPrice: p.old_price,
    silverPrice: p.silver_price,
    goldPrice: p.gold_price,
    customizationType: p.customization_type,
    createdAt: p.created_at,
  }));
};

export const addProduct = async (productData, imageFiles) => {
  let imageUrls = [];
  if (imageFiles && imageFiles.length > 0) {
    imageUrls = await uploadMultipleImages(imageFiles);
  }
  const { data, error } = await supabase.from('products').insert([{
    name: productData.name,
    price: productData.price,
    old_price: productData.oldPrice || null,
    silver_price: productData.silverPrice || null,
    gold_price: productData.goldPrice || null,
    description: productData.description,
    category: productData.category,
    customization_type: productData.customizationType || 'none',
    images: imageUrls,
  }]).select().single();
  if (error) throw error;
  return data.id;
};

export const updateProduct = async (productId, productData, newImageFiles) => {
  let updateData = {
    name: productData.name,
    price: productData.price,
    old_price: productData.oldPrice || null,
    silver_price: productData.silverPrice || null,
    gold_price: productData.goldPrice || null,
    description: productData.description,
    category: productData.category,
    customization_type: productData.customizationType || 'none',
  };

  if (newImageFiles && newImageFiles.length > 0) {
    const newUrls = await uploadMultipleImages(newImageFiles);
    updateData.images = [...(productData.imageUrls || []), ...newUrls];
  }

  const { error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', productId);
  if (error) throw error;
};

export const deleteProduct = async (productId) => {
  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) throw error;
};
