
import { createClient } from '@supabase/supabase-js';
import { Sale, InventoryItem } from '../types';

const SUPABASE_URL = 'https://xjmtxshvpwcyrfbxsmpj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqbXR4c2h2cHdjeXJmYnhzbXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTIyNDksImV4cCI6MjA4NDE4ODI0OX0.Qlo4xPAhPtRFRzkcC7p-aoHTDCdEdnmTuuzTOXynYRQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const toNum = (val: any) => val === null || val === undefined ? 0 : Number(val);

export const getSales = async (): Promise<Sale[]> => {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      clientName: item.client_name,
      productName: item.product_name,
      amount: toNum(item.amount),
      cost: toNum(item.cost),
      freight: toNum(item.freight),
      commissionRate: toNum(item.commission_rate),
      commissionValue: toNum(item.commission_value),
      date: item.date,
      status: item.status,
      saleType: item.sale_type,
      adCost: toNum(item.ad_cost),
      discount: toNum(item.discount),
      wholesale: item.wholesale === true,
      quantity: item.quantity ? Number(item.quantity) : 1,
      orderId: item.order_id ?? undefined
    })) as Sale[];
  } catch (err) {
    return [];
  }
};

export const addSale = async (sale: Sale): Promise<Sale> => {
  const { data, error } = await supabase
    .from('sales')
    .insert([{
      id: sale.id,
      client_name: sale.clientName,
      product_name: sale.productName,
      amount: sale.amount,
      cost: sale.cost,
      freight: sale.freight,
      commission_rate: sale.commissionRate,
      commission_value: sale.commissionValue,
      date: sale.date,
      status: sale.status,
      sale_type: sale.saleType,
      ad_cost: sale.adCost,
      discount: sale.discount
    }])
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Sale;
};

export const deleteSale = async (id: string): Promise<void> => {
  const { error } = await supabase.from('sales').delete().eq('id', id);
  if (error) throw error;
};

// Um pedido de atacado entra de uma vez só: se uma linha falhar, nenhuma entra.
export const addWholesaleOrder = async (lines: Sale[]): Promise<void> => {
  const { error } = await supabase
    .from('sales')
    .insert(lines.map(sale => ({
      id: sale.id,
      client_name: sale.clientName,
      product_name: sale.productName,
      amount: sale.amount,
      cost: sale.cost,
      freight: sale.freight,
      commission_rate: sale.commissionRate,
      commission_value: sale.commissionValue,
      date: sale.date,
      status: sale.status,
      sale_type: null,
      ad_cost: 0,
      discount: 0,
      wholesale: true,
      quantity: sale.quantity,
      order_id: sale.orderId
    })));

  if (error) throw error;
};

export const deleteOrder = async (orderId: string): Promise<void> => {
  const { error } = await supabase.from('sales').delete().eq('order_id', orderId);
  if (error) throw error;
};

export const getInventory = async (): Promise<InventoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('product_name', { ascending: true });

    if (error) throw error;
    
    return (data || []).map(item => ({
      id: item.id,
      productName: item.product_name,
      quantity: toNum(item.quantity),
      costPrice: toNum(item.cost_price),
      defaultSellPrice: toNum(item.default_sell_price)
    })) as InventoryItem[];
  } catch (err) {
    return [];
  }
};

export const addOrUpdateProduct = async (item: InventoryItem): Promise<InventoryItem[]> => {
  const { data: existing } = await supabase
    .from('inventory')
    .select('*')
    .eq('product_name', item.productName)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('inventory')
      .update({
        quantity: item.quantity,
        cost_price: item.costPrice,
        default_sell_price: item.defaultSellPrice
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('inventory')
      .insert([{
        product_name: item.productName,
        quantity: item.quantity,
        cost_price: item.costPrice,
        default_sell_price: item.defaultSellPrice
      }]);
  }
  
  return getInventory();
};

export const restockProduct = async (productName: string, additionalQuantity: number, batchTotalCost: number): Promise<InventoryItem[]> => {
  const { data: existing } = await supabase
    .from('inventory')
    .select('*')
    .eq('product_name', productName)
    .maybeSingle();

  if (existing) {
    const currentQty = toNum(existing.quantity);
    const currentCost = toNum(existing.cost_price);
    
    // Unidade "devendo" (estoque negativo) não tem custo para entrar na média.
    const qtyComCusto = Math.max(0, currentQty);
    const newQty = currentQty + additionalQuantity;
    const totalValue = (qtyComCusto * currentCost) + batchTotalCost;
    const newAverageCost = qtyComCusto + additionalQuantity > 0 ? totalValue / (qtyComCusto + additionalQuantity) : 0;

    await supabase
      .from('inventory')
      .update({
        quantity: newQty,
        cost_price: newAverageCost
      })
      .eq('id', existing.id);
  }
  
  return getInventory();
};

export const deleteProduct = async (id: string): Promise<InventoryItem[]> => {
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) throw error;
  return getInventory();
};

// Contagem: troca a quantidade pelo que ela contou. O custo médio fica.
export const setStockQuantity = async (productName: string, quantity: number): Promise<InventoryItem[]> => {
  const { error } = await supabase.from('inventory').update({ quantity }).eq('product_name', productName);
  if (error) throw error;
  return getInventory();
};

export const updateStockQuantity = async (productName: string, quantityChange: number): Promise<void> => {
  const { data: existing } = await supabase
    .from('inventory')
    .select('id, quantity')
    .eq('product_name', productName)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('inventory')
      .update({ quantity: (existing.quantity || 0) + quantityChange })
      .eq('id', existing.id);
  }
};
