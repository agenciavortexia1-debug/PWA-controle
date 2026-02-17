
import React, { useState, useEffect } from 'react';
import { X, Package, Calculator, RefreshCw, Plus } from 'lucide-react';
import { InventoryItem } from '../types.ts';

interface InventoryFormProps {
  onAdd: (item: InventoryItem) => void;
  onRestock?: (productName: string, quantity: number, totalCost: number) => void;
  onClose: () => void;
  initialProduct?: InventoryItem | null;
  allProducts?: InventoryItem[];
}

export const InventoryForm: React.FC<InventoryFormProps> = ({ onAdd, onRestock, onClose, initialProduct, allProducts = [] }) => {
  const [mode, setMode] = useState<'add' | 'restock'>(initialProduct ? 'restock' : 'add');
  const [formData, setFormData] = useState({
    productName: initialProduct?.productName || '',
    quantity: '',
    totalPurchaseValue: '',
    defaultSellPrice: initialProduct?.defaultSellPrice?.toString() || ''
  });

  const selectedExistingProduct = allProducts.find(p => p.productName === formData.productName);

  useEffect(() => {
    if (initialProduct) {
      setFormData(prev => ({
        ...prev,
        productName: initialProduct.productName,
        defaultSellPrice: initialProduct.defaultSellPrice?.toString() || ''
      }));
    }
  }, [initialProduct]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'productName' && mode === 'restock') {
      const prod = allProducts.find(p => p.productName === value);
      if (prod) {
        setFormData(prev => ({ ...prev, defaultSellPrice: prod.defaultSellPrice?.toString() || '' }));
      }
    }
  };

  const qty = parseFloat(formData.quantity) || 0;
  const totalCost = parseFloat(formData.totalPurchaseValue) || 0;
  const batchUnitCost = qty > 0 ? totalCost / qty : 0;

  // Cálculo de Preço Médio Ponderado para o modo Reposição
  let newAverageCost = batchUnitCost;
  if (mode === 'restock' && selectedExistingProduct) {
    const currentQty = selectedExistingProduct.quantity;
    const currentCost = selectedExistingProduct.costPrice;
    const totalNewQty = currentQty + qty;
    if (totalNewQty > 0) {
      newAverageCost = ((currentQty * currentCost) + totalCost) / totalNewQty;
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qty <= 0) return;

    if (mode === 'restock' && onRestock) {
      onRestock(formData.productName, qty, totalCost);
    } else {
      const newItem: InventoryItem = {
        id: crypto.randomUUID(),
        productName: formData.productName,
        quantity: qty,
        costPrice: batchUnitCost,
        defaultSellPrice: parseFloat(formData.defaultSellPrice) || 0
      };
      onAdd(newItem);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4 animate-fade-in">
      <div className="bg-white w-full h-[95vh] sm:h-auto sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 text-[#920074]">
            {mode === 'add' ? <Package size={24} /> : <RefreshCw size={24} className="animate-spin-slow" />}
            <h2 className="text-xl font-bold text-gray-800">
              {mode === 'add' ? 'Novo Produto' : 'Repor Estoque'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X size={24} />
          </button>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex gap-2">
            <button 
              onClick={() => setMode('add')} 
              className={`flex-1 py-2 text-xs font-bold uppercase rounded-xl transition ${mode === 'add' ? 'bg-white text-[#920074] shadow-sm border border-gray-100' : 'text-gray-400'}`}
            >
              <Plus size={14} className="inline mr-1" /> Novo
            </button>
            <button 
              onClick={() => setMode('restock')} 
              className={`flex-1 py-2 text-xs font-bold uppercase rounded-xl transition ${mode === 'restock' ? 'bg-white text-[#920074] shadow-sm border border-gray-100' : 'text-gray-400'}`}
            >
              <RefreshCw size={14} className="inline mr-1" /> Repor
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {mode === 'add' ? 'Nome do Produto' : 'Selecionar Produto'}
            </label>
            {mode === 'add' ? (
              <input
                required
                name="productName"
                placeholder="Ex: Monjauro Red"
                className="w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#920074] outline-none"
                value={formData.productName}
                onChange={handleChange}
              />
            ) : (
              <select
                required
                name="productName"
                className="w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#920074] outline-none appearance-none"
                value={formData.productName}
                onChange={handleChange}
              >
                <option value="" disabled>Selecione um produto</option>
                {allProducts.map(p => (
                  <option key={p.id} value={p.productName}>{p.productName} ({p.quantity} un.)</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {mode === 'add' ? 'Qtd. Comprada' : 'Qtd. Entrada'}
              </label>
              <input
                required
                name="quantity"
                type="number"
                min="1"
                placeholder="0"
                className="w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#920074] outline-none"
                value={formData.quantity}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {mode === 'add' ? 'Valor Total Pago' : 'Custo do Novo Lote'}
              </label>
              <input
                required
                name="totalPurchaseValue"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#920074] outline-none"
                value={formData.totalPurchaseValue}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-2">
             <div className="flex items-center gap-2 text-[#920074]">
                <Calculator size={16} />
                <span className="text-[10px] font-black uppercase tracking-wider">Detalhamento de Custo</span>
             </div>
             
             {mode === 'restock' && selectedExistingProduct && (
               <div className="flex justify-between text-xs text-gray-500">
                  <span>Custo Atual:</span>
                  <span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedExistingProduct.costPrice)}</span>
               </div>
             )}

             <div className="flex justify-between text-xs text-gray-500">
                <span>Custo deste Lote (un):</span>
                <span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(batchUnitCost)}</span>
             </div>

             <div className="flex justify-between pt-2 border-t border-purple-200 items-center">
                <span className="text-xs font-bold text-gray-700 uppercase">Novo Custo Médio:</span>
                <span className="text-lg font-black text-[#920074]">
                   {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newAverageCost)}
                </span>
             </div>
          </div>

          {mode === 'add' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Preço Sugerido de Venda</label>
              <input
                name="defaultSellPrice"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#920074] outline-none"
                value={formData.defaultSellPrice}
                onChange={handleChange}
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[#920074] hover:bg-[#74005c] text-white font-bold py-4 rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2"
          >
            {mode === 'add' ? <Plus size={20} /> : <RefreshCw size={20} />}
            {mode === 'add' ? 'Confirmar Cadastro' : 'Atualizar Estoque'}
          </button>
        </form>
      </div>
    </div>
  );
};
