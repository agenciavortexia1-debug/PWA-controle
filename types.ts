
export type SaleType = 'Trafego Pago' | 'Indicacao' | 'Instagram' | 'Pessoal';

export interface Sale {
  id: string;
  clientName: string;
  productName: string;
  amount: number;
  cost?: number; // Total cost for this sale (calculated automatically)
  freight?: number; // Shipping cost
  commissionRate: number; // Percentage
  commissionValue: number;
  date: string;
  status: 'Paid' | 'Pending' | 'Cancelled';
  saleType?: SaleType;
  adCost?: number; // Custo por venda (se Tráfego Pago)
  discount?: number; // Valor do desconto dado
  // Atacado: cada produto do pedido é uma linha, todas com o mesmo orderId.
  // No varejo, wholesale é false e quantity é 1.
  wholesale?: boolean;
  quantity?: number;
  orderId?: string;
}

export interface SalesSummary {
  totalSales: number;
  totalCommission: number;
  totalNetProfit: number;
  totalFreight: number;
  totalProductCost: number;
  averageTicket: number;
  salesCount: number;
}

export interface InventoryItem {
  id: string;
  productName: string;
  quantity: number;
  costPrice: number; // Unit cost price calculated: Total Purchase / Quantity
  defaultSellPrice?: number; // Optional default selling price
}
