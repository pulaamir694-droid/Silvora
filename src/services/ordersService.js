// src/services/ordersService.js
import { supabase } from './supabase';

export const saveOrder = async (orderData) => {
  const { data, error } = await supabase.from('orders').insert([{
    customer: orderData.customer,
    items: orderData.items,
    total: orderData.total,
    governorate: orderData.governorate,
    shipping_fee: orderData.shippingFee,
    status: 'new',
  }]).select().single();
  if (error) throw error;
  return data.id;
};

export const getOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(o => ({
    ...o,
    shippingFee: o.shipping_fee,
    createdAt: o.created_at,
  }));
};

export const updateOrderStatus = async (orderId, status) => {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);
  if (error) throw error;
};

export const sendWhatsAppOrder = (customerInfo, cartItems, total, shippingFee) => {
  const WHATSAPP_NUMBER = '201130479571';

  const itemsList = cartItems.map(item => {
    let line = `• ${item.name} x${item.quantity} — ${(item.price * item.quantity).toFixed(2)} EGP`;
    if (item.customization) {
      if (item.customization.engravingText) {
        line += `\n  ${item.customizationType === 'name_writing' ? 'الاسم المطلوب' : 'النقش'}: ${item.customization.engravingText}`;
      }
      if (item.customization.imageUrl) {
        line += `\n  صورة التخصيص: ${item.customization.imageUrl}`;
      }
    }
    return line;
  }).join('\n');

  const message = `
🛍️ *طلب جديد من Silvora Accessories*

👤 *بيانات العميل:*
الاسم: ${customerInfo.name}
التليفون: ${customerInfo.phone}
المحافظة: ${customerInfo.governorate}
العنوان: ${customerInfo.address}
${customerInfo.notes ? `ملاحظات: ${customerInfo.notes}` : ''}

📦 *المنتجات:*
${itemsList}

🚚 *رسوم الشحن:* ${shippingFee} EGP
💰 *الإجمالي: ${total.toFixed(2)} EGP*

شكراً لتسوقك معنا! ✨
`.trim();

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
};

// إرسال تفاصيل الطلب كاملة إلى واتساب الإدارة/المندوب
export const sendOrderToAdminWhatsApp = (order, adminWhatsappNumber) => {
  const customer = order.customer || {};

  const itemsList = (order.items || []).map(item => {
    let line = `• ${item.name} x${item.quantity} — ${(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)} EGP`;
    if (item.customization) {
      if (item.customization.engravingText) {
        line += `\n  ${item.customizationType === 'name_writing' ? 'الاسم المطلوب' : 'النقش'}: ${item.customization.engravingText}`;
      }
      if (item.customization.imageUrl) {
        line += `\n  صورة التخصيص: ${item.customization.imageUrl}`;
      }
    }
    return line;
  }).join('\n');

  let message = `
🧾 *طلب رقم #${order.id}*

👤 *بيانات العميل:*
الاسم: ${customer.name || '—'}
التليفون: ${customer.phone || '—'}
المحافظة: ${customer.governorate || '—'}
العنوان: ${customer.address || '—'}
${customer.notes ? `ملاحظات: ${customer.notes}` : ''}

📦 *المنتجات:*
${itemsList || '—'}

🚚 *رسوم الشحن:* ${order.shippingFee || 0} EGP`;

  if (order.depositAmount > 0) {
    message += `
💳 *دفع مقدماً (ديبوزيت):* ${Number(order.depositAmount).toFixed(2)} EGP
🚪 *المتبقي:* ${Math.max(Number(order.total) - Number(order.depositAmount), 0).toFixed(2)} EGP`;
  }

  message += `
💰 *الإجمالي: ${Number(order.total).toFixed(2)} EGP*

📌 *حالة الطلب:* ${order.status || '—'}
${order.paymentMethod ? `💳 *طريقة الدفع:* ${order.paymentMethod === 'vodafone' ? 'فودافون كاش' : 'الدفع عند الاستلام'}` : ''}
${order.receiptUrl ? `📎 *إيصال الدفع:* ${order.receiptUrl}` : ''}
${order.createdAt ? `🕒 *تاريخ الطلب:* ${new Date(order.createdAt).toLocaleString('ar-EG')}` : ''}
`.trim();

  window.open(`https://wa.me/${adminWhatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
};


export const deleteOrder = async (orderId) => {
  const { error } = await supabase.from('orders').delete().eq('id', orderId);
  if (error) throw error;
};
