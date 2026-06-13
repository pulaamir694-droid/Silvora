// src/services/statsService.js
import { supabase } from './supabase';

export const getDashboardStats = async () => {
  try {
    const [{ data: orders, error: e1 }, { count: totalProducts, error: e2 }] = await Promise.all([
      supabase.from('orders').select('*'),
      supabase.from('products').select('*', { count: 'exact', head: true }),
    ]);

    if (e1) throw e1;
    if (e2) throw e2;

    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const newOrders = orders.filter(o => o.status === 'new').length;
    const completedOrders = orders.filter(o => o.status === 'delivered').length;
    const processingOrders = orders.filter(
      o => o.status === 'processing' || o.status === 'shipped'
    ).length;

    return { totalOrders, totalRevenue, newOrders, completedOrders, processingOrders, totalProducts };
  } catch (e) {
    console.error('Stats error:', e.message);
    throw e;
  }
};
