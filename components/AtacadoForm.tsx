
import React, { useState, useMemo } from 'react';
import { X, Info, Plus, Trash2 } from 'lucide-react';
import { Sale, InventoryItem } from '../types';
import { hojeManaus } from '../utils/datas';

interface AtacadoFormProps {
  onSave: (lines: Sale[]) => Promise<void>;
  onClose: () => void;
  inventory: InventoryItem[];
}

interface Item {
  key: string;
  productName: string;
  quantity: string;
  unitPrice: string;
}

const novoItem = (): Item => ({ key: crypto.randomUUID(), productName: '', quantity: '', unitPrice: '' });
const emReais = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const centavos = (v: number) => Math.round(v * 100);

// Pedido de atacado: vários produtos, preço combinado na hora, frete e comissão
// do pedido inteiro. Cada produto vira uma linha de venda com o mesmo orderId,
// e o frete é dividido entre as linhas pelo peso de cada uma no total.
export const AtacadoForm: React.FC<AtacadoFormProps> = ({ onSave, onClose, inventory }) => {
  const [clientName, setClientName] = useState('');
  const [date, setDate] = useState(hojeManaus());
  const [itens, setItens] = useState<Item[]>([novoItem()]);
  const [freight, setFreight] = useState('');
  const [commissionRate, setCommissionRate] = useState('0');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const mudarItem = (key: string, campo: keyof Item, valor: string) =>
    setItens(prev => prev.map(i => (i.key === key ? { ...i, [campo]: valor } : i)));

  const custoUnitario = (productName: string) =>
    inventory.find(p => p.productName === productName)?.costPrice || 0;

  const linhas = useMemo(() => itens.map(i => {
    const qtd = parseInt(i.quantity, 10) || 0;
    const preco = parseFloat(i.unitPrice) || 0;
    return { ...i, qtd, valor: qtd * preco, custo: qtd * custoUnitario(i.productName) };
  }), [itens, inventory]);

  const total = linhas.reduce((s, l) => s + l.valor, 0);
  const custo = linhas.reduce((s, l) => s + l.custo, 0);
  const frete = parseFloat(freight) || 0;
  const taxa = parseFloat(commissionRate) || 0;
  const comissao = total * (taxa / 100);
  const lucro = total - custo - frete - comissao;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvando || total <= 0) return;

    const orderId = crypto.randomUUID();
    const freteCentavos = centavos(frete);
    let freteUsado = 0;
    const vendas: Sale[] = linhas.map((l, idx) => {
      const ultima = idx === linhas.length - 1;
      const freteLinha = ultima ? freteCentavos - freteUsado : Math.round(freteCentavos * (l.valor / total));
      freteUsado += freteLinha;
      return {
        id: crypto.randomUUID(),
        clientName: clientName.trim(),
        productName: l.productName,
        amount: l.valor,
        cost: l.custo,
        freight: freteLinha / 100,
        commissionRate: taxa,
        commissionValue: centavos(l.valor * (taxa / 100)) / 100,
        date,
        status: 'Pending',
        discount: 0,
        adCost: 0,
        wholesale: true,
        quantity: l.qtd,
        orderId,
      };
    });

    setSalvando(true);
    setErro(null);
    try {
      await onSave(vendas);
      onClose();
    } catch {
      setErro('Não deu pra salvar o pedido. Confira a internet e tente de novo.');
      setSalvando(false);
    }
  };

  const campo = 'w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl outline-none';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white w-full h-[95vh] sm:h-auto sm:max-h-[95vh] sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slide-up">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Venda Atacado</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Cliente</label>
            <input required placeholder="Nome do cliente" className={`${campo} focus:ring-2 focus:ring-[#920074]`} value={clientName} onChange={e => setClientName(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Data</label>
            <input required type="date" className={campo} value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">Produtos do pedido</label>
            {linhas.map(l => {
              const escolhidosNasOutras = itens.filter(i => i.key !== l.key).map(i => i.productName);
              return (
                <div key={l.key} className="rounded-xl border border-gray-200 p-3 space-y-2">
                  <div className="flex gap-2">
                    <select
                      required
                      className={`${campo} min-w-0 appearance-none`}
                      value={l.productName}
                      onChange={e => mudarItem(l.key, 'productName', e.target.value)}
                    >
                      <option value="" disabled>Selecione um produto</option>
                      {inventory.filter(p => !escolhidosNasOutras.includes(p.productName)).map(p => (
                        <option key={p.id} value={p.productName}>{p.productName} ({p.quantity} un.)</option>
                      ))}
                    </select>
                    {itens.length > 1 && (
                      <button type="button" title="Tirar este produto do pedido" onClick={() => setItens(prev => prev.filter(i => i.key !== l.key))} className="p-3 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Quantidade</label>
                      <input required type="number" min="1" step="1" inputMode="numeric" className={campo} value={l.quantity} onChange={e => mudarItem(l.key, 'quantity', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Preço por unidade (R$)</label>
                      <input required type="number" min="0.01" step="0.01" inputMode="decimal" className={campo} value={l.unitPrice} onChange={e => mudarItem(l.key, 'unitPrice', e.target.value)} />
                    </div>
                  </div>
                  {l.valor > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{l.qtd} × {emReais(l.valor / l.qtd)}</span>
                      <span className="font-bold text-gray-700">{emReais(l.valor)}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {itens.length < inventory.length && (
              <button type="button" onClick={() => setItens(prev => [...prev, novoItem()])} className="flex items-center gap-1.5 text-sm font-bold text-[#920074] hover:underline">
                <Plus size={16} /> Adicionar outro produto
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Frete (R$)</label>
              <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" className="w-full px-4 py-3 bg-blue-50 text-gray-900 border border-blue-100 rounded-xl outline-none" value={freight} onChange={e => setFreight(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Comissão (%)</label>
              <input type="number" min="0" step="0.1" inputMode="decimal" className={campo} value={commissionRate} onChange={e => setCommissionRate(e.target.value)} />
            </div>
          </div>

          <div className="bg-[#fdf4fa] p-4 rounded-xl space-y-2 border border-[#f5d0ed]">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
              <Info size={14} /> Detalhamento de Lucro
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total do pedido:</span>
              <span className="font-bold">{emReais(total)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Custo dos produtos:</span>
              <span className="font-bold text-red-400">-{emReais(custo)}</span>
            </div>
            {frete > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Frete:</span>
                <span className="font-bold text-red-400">-{emReais(frete)}</span>
              </div>
            )}
            {comissao > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Comissão:</span>
                <span className="font-bold text-red-400">-{emReais(comissao)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-purple-100 pt-2 text-lg font-black">
              <span className="text-gray-800">Lucro Líquido:</span>
              <span className={lucro >= 0 ? 'text-green-600' : 'text-red-600'}>{emReais(lucro)}</span>
            </div>
          </div>

          {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{erro}</p>}

          <button type="submit" disabled={salvando} className="w-full bg-[#920074] hover:bg-[#74005c] disabled:opacity-60 text-white font-bold py-4 rounded-xl shadow-lg transition transform active:scale-95">
            {salvando ? 'Salvando...' : 'Finalizar Venda Atacado'}
          </button>
        </form>
      </div>
    </div>
  );
};
