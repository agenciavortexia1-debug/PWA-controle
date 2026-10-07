
import React, { useState, useEffect } from 'react';
import { X, Package, Calculator, RefreshCw, Plus, ClipboardList } from 'lucide-react';
import { InventoryItem } from '../types.ts';

type Modo = 'add' | 'restock' | 'count';

interface InventoryFormProps {
  onAdd: (item: InventoryItem) => void;
  onRestock?: (productName: string, quantity: number, totalCost: number) => void;
  onCount?: (productName: string, quantity: number) => void;
  onClose: () => void;
  initialProduct?: InventoryItem | null;
  initialMode?: Modo;
  allProducts?: InventoryItem[];
}

const emReais = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const mesmoNome = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const InventoryForm: React.FC<InventoryFormProps> = ({ onAdd, onRestock, onCount, onClose, initialProduct, initialMode, allProducts = [] }) => {
  const [mode, setMode] = useState<Modo>(initialMode ?? (initialProduct ? 'restock' : 'add'));
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

  // Trocar de aba mantém o produto só quando ele existe no estoque.
  const trocarModo = (novo: Modo) => {
    setMode(novo);
    if (novo !== 'add' && !allProducts.some(p => p.productName === formData.productName)) {
      const existente = allProducts.find(p => mesmoNome(p.productName, formData.productName));
      setFormData(prev => ({ ...prev, productName: existente?.productName ?? '' }));
    }
  };

  const qty = parseFloat(formData.quantity) || 0;
  const totalCost = parseFloat(formData.totalPurchaseValue) || 0;
  const batchUnitCost = qty > 0 ? totalCost / qty : 0;

  // Preço médio ponderado na reposição. Unidade "devendo" (estoque negativo)
  // não tem custo para entrar na média: conta como zero.
  let newAverageCost = batchUnitCost;
  if (mode === 'restock' && selectedExistingProduct) {
    const currentQty = Math.max(0, selectedExistingProduct.quantity);
    const currentCost = selectedExistingProduct.costPrice;
    const totalNewQty = currentQty + qty;
    if (totalNewQty > 0) {
      newAverageCost = ((currentQty * currentCost) + totalCost) / totalNewQty;
    }
  }

  // "Novo" com o nome de um produto que já existe sobrescrevia a quantidade dele.
  const produtoRepetido = mode === 'add' && formData.productName.trim()
    ? allProducts.find(p => mesmoNome(p.productName, formData.productName))
    : undefined;

  const contagem = parseInt(formData.quantity, 10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'count') {
      if (!onCount || !formData.productName || isNaN(contagem) || contagem < 0) return;
      onCount(formData.productName, contagem);
      onClose();
      return;
    }

    if (qty <= 0 || produtoRepetido) return;

    if (mode === 'restock' && onRestock) {
      onRestock(formData.productName, qty, totalCost);
    } else {
      const newItem: InventoryItem = {
        id: crypto.randomUUID(),
        productName: formData.productName.trim(),
        quantity: qty,
        costPrice: batchUnitCost,
        defaultSellPrice: parseFloat(formData.defaultSellPrice) || 0
      };
      onAdd(newItem);
    }
    onClose();
  };

  const campo = 'w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#920074] outline-none';
  const aba = (m: Modo) => `flex-1 py-2 text-xs font-bold uppercase rounded-xl transition ${mode === m ? 'bg-white text-[#920074] shadow-sm border border-gray-100' : 'text-gray-400'}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4 animate-fade-in">
      <div className="bg-white w-full h-[95vh] sm:h-auto sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 text-[#920074]">
            {mode === 'add' ? <Package size={24} /> : mode === 'restock' ? <RefreshCw size={24} className="animate-spin-slow" /> : <ClipboardList size={24} />}
            <h2 className="text-xl font-bold text-gray-800">
              {mode === 'add' ? 'Novo Produto' : mode === 'restock' ? 'Repor Estoque' : 'Corrigir Estoque'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X size={24} />
          </button>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex gap-2">
            <button onClick={() => trocarModo('add')} className={aba('add')}>
              <Plus size={14} className="inline mr-1" /> Novo
            </button>
            <button onClick={() => trocarModo('restock')} className={aba('restock')}>
              <RefreshCw size={14} className="inline mr-1" /> Repor
            </button>
            <button onClick={() => trocarModo('count')} className={aba('count')}>
              <ClipboardList size={14} className="inline mr-1" /> Corrigir
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
                className={campo}
                value={formData.productName}
                onChange={handleChange}
              />
            ) : (
              <select
                required
                name="productName"
                className={`${campo} appearance-none`}
                value={formData.productName}
                onChange={handleChange}
              >
                <option value="" disabled>Selecione um produto</option>
                {allProducts.map(p => (
                  <option key={p.id} value={p.productName}>{p.productName} ({p.quantity} un.)</option>
                ))}
              </select>
            )}
            {produtoRepetido && (
              <div className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-3">
                Esse produto já está no estoque. Para somar unidades a ele, use Repor.
                <button type="button" onClick={() => { setMode('restock'); setFormData(prev => ({ ...prev, productName: produtoRepetido.productName })); }} className="block mt-1 font-bold text-[#920074] underline">
                  Ir para Repor
                </button>
              </div>
            )}
          </div>

          {mode === 'count' ? (
            <>
              <p className="text-sm text-gray-500">
                Use quando o número do app não bater com o que você tem guardado. Conte os produtos e digite quantos tem agora. O custo médio não muda.
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Quantas unidades você tem agora?</label>
                <input required name="quantity" type="number" min="0" step="1" inputMode="numeric" placeholder="0" className={campo} value={formData.quantity} onChange={handleChange} />
              </div>
              {selectedExistingProduct && !isNaN(contagem) && contagem >= 0 && (
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex justify-between text-sm text-gray-600">
                  <span>No app: <b>{selectedExistingProduct.quantity} un.</b></span>
                  <span>Vai ficar: <b className="text-[#920074]">{contagem} un.</b></span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {mode === 'add' ? 'Qtd. Comprada' : 'Qtd. Entrada'}
                  </label>
                  <input required name="quantity" type="number" min="1" placeholder="0" className={campo} value={formData.quantity} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {mode === 'add' ? 'Valor Total Pago' : 'Custo do Novo Lote'}
                  </label>
                  <input required name="totalPurchaseValue" type="number" step="0.01" placeholder="0.00" className={campo} value={formData.totalPurchaseValue} onChange={handleChange} />
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
                      <span className="font-bold">{emReais(selectedExistingProduct.costPrice)}</span>
                   </div>
                 )}

                 <div className="flex justify-between text-xs text-gray-500">
                    <span>Custo deste Lote (un):</span>
                    <span className="font-bold">{emReais(batchUnitCost)}</span>
                 </div>

                 <div className="flex justify-between pt-2 border-t border-purple-200 items-center">
                    <span className="text-xs font-bold text-gray-700 uppercase">Novo Custo Médio:</span>
                    <span className="text-lg font-black text-[#920074]">{emReais(newAverageCost)}</span>
                 </div>
              </div>

              {mode === 'add' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Preço Sugerido de Venda</label>
                  <input name="defaultSellPrice" type="number" step="0.01" placeholder="0.00" className={campo} value={formData.defaultSellPrice} onChange={handleChange} />
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={!!produtoRepetido}
            className="w-full bg-[#920074] hover:bg-[#74005c] disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2"
          >
            {mode === 'add' ? <Plus size={20} /> : mode === 'restock' ? <RefreshCw size={20} /> : <ClipboardList size={20} />}
            {mode === 'add' ? 'Confirmar Cadastro' : mode === 'restock' ? 'Atualizar Estoque' : 'Salvar contagem'}
          </button>
        </form>
      </div>
    </div>
  );
};
