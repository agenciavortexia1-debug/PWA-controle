
import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  Users,
  CreditCard,
  Search,
  Trash2,
  Package,
  Loader2,
  Home,
  Wallet,
  Calendar,
  RefreshCw,
  Info,
  Truck,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Plus,
  BarChart3,
  PieChart as PieIcon,
  CalendarDays,
  TrendingDown,
  Download,
  Scale,
  Boxes,
  SlidersHorizontal,
  ClipboardList,
  ChevronDown
} from 'lucide-react';
import { Sale, SalesSummary, InventoryItem, SaleType } from './types';
import { SalesForm } from './components/SalesForm';
import { AtacadoForm } from './components/AtacadoForm';
import { DateRangePicker } from './components/DateRangePicker';
import { InventoryForm } from './components/InventoryForm';
import { StatsCard } from './components/StatsCard';
import { Confirmacao } from './components/Confirmacao';
import { ListaDeBarras } from './components/ListaDeBarras';
import { GraficoEvolucao, PontoEvolucao } from './components/GraficoEvolucao';
import * as db from './services/db';
import { hojeManaus, dataCurta, mesmoDiaMesAnterior, periodoDa, Escala } from './utils/datas';

// Roxo = faturamento e vendas; verde = lucro. Par validado para daltonismo.
const ROXO = '#920074';
const VERDE = '#059669';

// O banco guarda a origem sem acento; na tela ela aparece escrita certo.
const ROTULO_ORIGEM: Record<string, string> = { Indicacao: 'Indicação', 'Trafego Pago': 'Tráfego Pago' };
const rotuloOrigem = (tipo?: string) => (tipo ? ROTULO_ORIGEM[tipo] ?? tipo : '');

// Unidades vendidas na linha: no varejo é sempre 1.
const unidades = (sale: Sale) => sale.quantity || 1;

// O mesmo produto chegou a ser gravado com e sem espaço no fim ("Mounnjaro " e
// "Mounnjaro"); nos números ele conta como um só.
const nomeDoProduto = (sale: Sale) => sale.productName.trim();

const lucroDaVenda = (sale: Sale) =>
  sale.amount - (sale.discount || 0) - sale.commissionValue - (sale.cost || 0) - (sale.freight || 0) - (sale.adCost || 0);

const parseLocalDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const App: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAtacadoFormOpen, setIsAtacadoFormOpen] = useState(false);
  const [isInventoryFormOpen, setIsInventoryFormOpen] = useState(false);
  const [confirmacao, setConfirmacao] = useState<{ titulo: string; texto: string; confirmar: string; acao: () => Promise<void> } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'inventory' | 'kpis'>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [inventoryFormInitialProduct, setInventoryFormInitialProduct] = useState<InventoryItem | null>(null);
  const [inventoryFormMode, setInventoryFormMode] = useState<'add' | 'restock' | 'count'>('add');
  const abrirEstoque = (modo: 'add' | 'restock' | 'count', produto: InventoryItem | null) => {
    setInventoryFormMode(modo);
    setInventoryFormInitialProduct(produto);
    setIsInventoryFormOpen(true);
  };
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [saleTypeFilter, setSaleTypeFilter] = useState<SaleType | 'Todos'>('Todos');
  const [channelFilter, setChannelFilter] = useState<'Todos' | 'Varejo' | 'Atacado'>('Todos');
  const [selectedChartProduct, setSelectedChartProduct] = useState<string | null>(null);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [calendarioAberto, setCalendarioAberto] = useState(false);
  
  // Comparativo: A começa no dia 1º do mês e vai até hoje; B é o mesmo pedaço
  // do mês anterior e acompanha A sempre que A muda.
  const [comparePeriodA, setComparePeriodA] = useState(() => {
    const hoje = hojeManaus();
    return { start: hoje.slice(0, 8) + '01', end: hoje };
  });
  const [comparePeriodB, setComparePeriodB] = useState(() => {
    const hoje = hojeManaus();
    return { start: mesmoDiaMesAnterior(hoje.slice(0, 8) + '01'), end: mesmoDiaMesAnterior(hoje) };
  });
  const [calendarioComparativo, setCalendarioComparativo] = useState<'A' | 'B' | null>(null);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    loadData();
    
    // Listen for PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [salesData, inventoryData] = await Promise.all([
        db.getSales(),
        db.getInventory()
      ]);
      setSales(salesData);
      setInventory(inventoryData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtros do painel. `data` liga o período e `produto` liga o produto
  // tocado no gráfico; tipo, origem e busca valem sempre.
  const passa = (sale: Sale, { data = true, produto = true } = {}) => {
    if (data && dateFilter.start && sale.date < dateFilter.start) return false;
    if (data && dateFilter.end && sale.date > dateFilter.end) return false;
    if (saleTypeFilter !== 'Todos' && sale.saleType !== saleTypeFilter) return false;
    if (channelFilter !== 'Todos' && (channelFilter === 'Atacado') !== !!sale.wholesale) return false;
    if (produto && selectedChartProduct && nomeDoProduto(sale) !== selectedChartProduct) return false;
    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      if (!sale.clientName.toLowerCase().includes(termo) && !sale.productName.toLowerCase().includes(termo)) return false;
    }
    return true;
  };

  const filteredSales = useMemo(() => sales.filter(sale => passa(sale)),
    [sales, dateFilter, saleTypeFilter, channelFilter, searchTerm, selectedChartProduct]);

  // No Histórico, os produtos de um pedido de atacado aparecem juntos, numa linha só.
  const historico = useMemo(() => {
    const linhas: { chave: string; venda: Sale; itens: Sale[] }[] = [];
    const porPedido = new Map<string, { chave: string; venda: Sale; itens: Sale[] }>();
    filteredSales.forEach(sale => {
      if (!sale.orderId) {
        linhas.push({ chave: sale.id, venda: sale, itens: [sale] });
        return;
      }
      const pedido = porPedido.get(sale.orderId);
      if (pedido) {
        pedido.itens.push(sale);
        return;
      }
      const novo = { chave: sale.orderId, venda: sale, itens: [sale] };
      porPedido.set(sale.orderId, novo);
      linhas.push(novo);
    });
    return linhas;
  }, [filteredSales]);

  const rotuloPeriodo = !dateFilter.start && !dateFilter.end
    ? 'Todo o período'
    : dateFilter.start === dateFilter.end
      ? `Dia ${dataCurta(dateFilter.start)}`
      : `${dataCurta(dateFilter.start)} → ${dataCurta(dateFilter.end)}`;

  // O que está filtrando agora, em palavras (aparece com o painel fechado).
  const filtrosSemPeriodo = [
    channelFilter !== 'Todos' ? channelFilter : '',
    saleTypeFilter !== 'Todos' ? rotuloOrigem(saleTypeFilter) : '',
    searchTerm.trim() ? `"${searchTerm.trim()}"` : '',
  ].filter(Boolean);
  const filtrosAtivos = [(dateFilter.start || dateFilter.end) ? rotuloPeriodo : '', ...filtrosSemPeriodo].filter(Boolean);
  // O comparativo tem datas próprias, mas segue os outros filtros e o produto tocado no gráfico.
  const filtrosDoComparativo = [...filtrosSemPeriodo, selectedChartProduct || ''].filter(Boolean);

  const limparFiltros = () => {
    setDateFilter({ start: '', end: '' });
    setChannelFilter('Todos');
    setSaleTypeFilter('Todos');
    setSearchTerm('');
    setCalendarioAberto(false);
  };

  const summary: SalesSummary = useMemo(() => {
    const totais = filteredSales.reduce((acc, sale) => {
        const adCost = sale.adCost || 0;
        const discount = sale.discount || 0;
        const freight = sale.freight || 0;
        const productCost = sale.cost || 0;
        const netProfit = sale.amount - discount - sale.commissionValue - productCost - freight - adCost;
        return {
          totalSales: acc.totalSales + sale.amount,
          totalCommission: acc.totalCommission + sale.commissionValue,
          totalNetProfit: acc.totalNetProfit + netProfit,
          totalFreight: acc.totalFreight + freight,
          totalProductCost: acc.totalProductCost + productCost,
          salesCount: 0,
          averageTicket: 0,
        };
      }, { totalSales: 0, totalCommission: 0, totalNetProfit: 0, totalFreight: 0, totalProductCost: 0, salesCount: 0, averageTicket: 0 }
    );
    // "Vendas" conta pedidos: um pedido de atacado com 3 produtos é 1 venda.
    const pedidos = new Set(filteredSales.map(sale => sale.orderId || sale.id)).size;
    return { ...totais, salesCount: pedidos, averageTicket: pedidos ? totais.totalSales / pedidos : 0 };
  }, [filteredSales]);

  // O ranking ignora o produto tocado: as outras barras ficam cinza, não somem.
  const chartData = useMemo(() => {
    const data: Record<string, { amount: number, units: number }> = {};
    sales.filter(sale => passa(sale, { produto: false })).forEach(sale => {
      const nome = nomeDoProduto(sale);
      if (!data[nome]) data[nome] = { amount: 0, units: 0 };
      data[nome].amount += sale.amount;
      data[nome].units += unidades(sale);
    });
    return Object.keys(data)
      .map(name => ({ name, value: data[name].amount, units: data[name].units }))
      .sort((a, b) => b.value - a.value);
  }, [sales, dateFilter, saleTypeFilter, channelFilter, searchTerm]);

  // KPIs. "Vendas" conta pedidos (atacado com 3 produtos = 1 venda) e
  // "un." soma as quantidades, do mesmo jeito que os cards do Início.
  const kpis = useMemo(() => {
    const byModality: Record<string, { profit: number }> = {};
    const byProduct: Record<string, { profit: number, units: number }> = {};
    const semana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(name => ({ name, amount: 0, pedidos: new Set<string>() }));

    filteredSales.forEach(sale => {
      const profit = lucroDaVenda(sale);
      const modalidade = sale.wholesale ? 'Atacado' : rotuloOrigem(sale.saleType || 'Instagram');
      if (!byModality[modalidade]) byModality[modalidade] = { profit: 0 };
      byModality[modalidade].profit += profit;

      const nome = nomeDoProduto(sale);
      if (!byProduct[nome]) byProduct[nome] = { profit: 0, units: 0 };
      byProduct[nome].profit += profit;
      byProduct[nome].units += unidades(sale);

      const dia = semana[parseLocalDate(sale.date).getDay()];
      dia.amount += sale.amount;
      dia.pedidos.add(sale.orderId || sale.id);
    });

    const modality = Object.keys(byModality).map(name => ({ name, profit: byModality[name].profit })).sort((a, b) => b.profit - a.profit);
    return {
      modality,
      totalProfit: modality.reduce((soma, m) => soma + m.profit, 0),
      productProfit: Object.keys(byProduct).map(name => ({ name, ...byProduct[name] })).sort((a, b) => b.profit - a.profit),
      weekday: semana.map(({ pedidos, ...d }) => ({ ...d, salesCount: pedidos.size })),
    };
  }, [filteredSales]);

  // Evolução: a escala acompanha o tamanho do período (até 31 dias, dia a dia;
  // até 4 meses, semana a semana; acima disso, mês a mês), para caber no
  // celular. Períodos sem venda entram zerados, para o buraco aparecer.
  const evolucao = useMemo(() => {
    const hoje = hojeManaus();
    const datas = filteredSales.map(sale => sale.date).sort();
    const inicio = dateFilter.start || datas[0] || hoje;
    const fim = dateFilter.end || (datas.length && datas[datas.length - 1] > hoje ? datas[datas.length - 1] : hoje);
    const dias = Math.round((Date.parse(fim) - Date.parse(inicio)) / 86400000) + 1;
    const escala: Escala = dias <= 31 ? 'daily' : dias <= 120 ? 'weekly' : 'monthly';
    const atual = periodoDa(hoje, escala).chave;

    const pontos = new Map<string, PontoEvolucao & { pedidos: Set<string> }>();
    for (let t = Date.parse(inicio); t <= Date.parse(fim); t += 86400000) {
      const { chave, rotulo, eixo } = periodoDa(new Date(t).toISOString().slice(0, 10), escala);
      if (!pontos.has(chave)) pontos.set(chave, { chave, rotulo, eixo, faturamento: 0, lucro: 0, vendas: 0, parcial: chave === atual, pedidos: new Set() });
    }
    filteredSales.forEach(sale => {
      const ponto = pontos.get(periodoDa(sale.date, escala).chave);
      if (!ponto) return;
      ponto.faturamento += sale.amount;
      ponto.lucro += lucroDaVenda(sale);
      ponto.pedidos.add(sale.orderId || sale.id);
    });
    return { escala, pontos: [...pontos.values()].map(({ pedidos, ...p }) => ({ ...p, vendas: pedidos.size })) };
  }, [filteredSales, dateFilter]);

  const handleAddSale = async (newSale: Sale) => {
    setSales(prev => [newSale, ...prev]);
    await db.addSale(newSale);
    await db.updateStockQuantity(newSale.productName, -1);
    loadData();
  };

  const handleAddWholesale = async (lines: Sale[]) => {
    await db.addWholesaleOrder(lines);
    setSales(prev => [...lines, ...prev]);
    for (const line of lines) {
      await db.updateStockQuantity(line.productName, -unidades(line));
    }
    loadData();
  };

  const handleAddInventory = async (item: InventoryItem) => {
    const updated = await db.addOrUpdateProduct(item);
    setInventory(updated);
  };

  const handleRestockInventory = async (productName: string, qty: number, totalCost: number) => {
    const updated = await db.restockProduct(productName, qty, totalCost);
    setInventory(updated);
  };

  const handleCountInventory = async (productName: string, quantity: number) => {
    setInventory(await db.setStockQuantity(productName, quantity));
  };

  const pedirApagarProduto = (item: InventoryItem) => setConfirmacao({
    titulo: `Excluir ${item.productName.trim()} do estoque?`,
    texto: 'O produto sai da lista do estoque e das opções de venda. As vendas já lançadas com ele continuam no histórico e nos números.',
    confirmar: 'Excluir produto',
    acao: async () => { setInventory(await db.deleteProduct(item.id)); },
  });

  // Apagar uma venda devolve as unidades dela ao estoque (o pedido de atacado
  // inteiro, se for atacado).
  const pedirApagarVenda = (itens: Sale[]) => {
    const venda = itens[0];
    const total = itens.reduce((soma, i) => soma + i.amount, 0);
    const voltam = itens.filter(i => inventory.some(p => p.productName === i.productName));
    const devolucao = voltam.length
      ? `${voltam.map(i => `${unidades(i)} ${nomeDoProduto(i)}`).join(', ')} ${voltam.length === 1 && unidades(voltam[0]) === 1 ? 'volta' : 'voltam'} para o estoque.`
      : 'O estoque não muda, porque o produto não está mais cadastrado.';
    setConfirmacao({
      titulo: venda.wholesale ? 'Apagar este pedido de atacado?' : 'Apagar esta venda?',
      texto: `${venda.clientName}, ${dataCurta(venda.date)}, ${formatCurrency(total)}. ${devolucao} Não dá para desfazer.`,
      confirmar: venda.wholesale ? 'Apagar pedido' : 'Apagar venda',
      acao: async () => {
        if (venda.orderId) await db.deleteOrder(venda.orderId);
        else await db.deleteSale(venda.id);
        for (const item of voltam) await db.updateStockQuantity(item.productName, unidades(item));
        await loadData();
      },
    });
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);


  // Comparativo: as datas são dele, mas tipo, origem e busca seguem os
  // filtros, como o resto da guia. "Vendas" conta pedidos.
  const resumoDoPeriodo = (inicio: string, fim: string) => {
    const doPeriodo = sales.filter(sale => sale.date >= inicio && sale.date <= fim && passa(sale, { data: false }));
    return {
      sales: doPeriodo.reduce((soma, sale) => soma + sale.amount, 0),
      profit: doPeriodo.reduce((soma, sale) => soma + lucroDaVenda(sale), 0),
      count: new Set(doPeriodo.map(sale => sale.orderId || sale.id)).size,
    };
  };

  const comparison = useMemo(() => {
    const a = resumoDoPeriodo(comparePeriodA.start, comparePeriodA.end);
    const b = resumoDoPeriodo(comparePeriodB.start, comparePeriodB.end);
    // Sem nada no período B não existe porcentagem: a tela mostra só os valores.
    const variacao = (valA: number, valB: number) => (valB === 0 ? null : ((valA - valB) / Math.abs(valB)) * 100);
    return {
      periodA: a,
      periodB: b,
      diffSales: variacao(a.sales, b.sales),
      diffProfit: variacao(a.profit, b.profit),
      diffCount: variacao(a.count, b.count),
    };
  }, [sales, comparePeriodA, comparePeriodB, saleTypeFilter, channelFilter, searchTerm, selectedChartProduct]);

  const escolherPeriodoA = (start: string, end: string) => {
    setComparePeriodA({ start, end });
    setComparePeriodB({ start: mesmoDiaMesAnterior(start), end: mesmoDiaMesAnterior(end) });
    setCalendarioComparativo(null);
  };

  const rotuloIntervalo = (inicio: string, fim: string) =>
    inicio === fim ? `Dia ${dataCurta(inicio)}` : `${dataCurta(inicio)} → ${dataCurta(fim)}`;

  if (loading && sales.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2 text-[#920074]">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="font-medium text-sm">Carregando Controle Da Rose...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row pb-24 md:pb-0 overflow-hidden text-slate-900">
      {/* Sidebar Desktop */}
      <aside className={`hidden md:flex flex-col bg-slate-900 text-white flex-shrink-0 transition-all duration-300 relative ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-10 bg-[#920074] p-1 rounded-full text-white shadow-lg z-10 hover:scale-110 transition"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className={`p-6 border-b border-slate-800 flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="bg-[#920074] p-2 rounded-lg flex-shrink-0">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          {!sidebarCollapsed && <span className="text-xl font-bold tracking-tight whitespace-nowrap">Controle Rose</span>}
        </div>

        <nav className="p-4 space-y-2 flex-1">
          <button onClick={() => setActiveTab('dashboard')} title="Dashboard" className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'dashboard' ? 'bg-slate-800 text-[#f5d0ed]' : 'text-slate-400 hover:text-white'} ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <Home size={20} /> {!sidebarCollapsed && <span>Dashboard</span>}
          </button>
          <button onClick={() => setActiveTab('kpis')} title="Indicadores" className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'kpis' ? 'bg-slate-800 text-[#f5d0ed]' : 'text-slate-400 hover:text-white'} ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <TrendingUp size={20} /> {!sidebarCollapsed && <span>KPIs</span>}
          </button>
          <button onClick={() => setActiveTab('sales')} title="Histórico" className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'sales' ? 'bg-slate-800 text-[#f5d0ed]' : 'text-slate-400 hover:text-white'} ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <CreditCard size={20} /> {!sidebarCollapsed && <span>Histórico</span>}
          </button>
          <button onClick={() => setActiveTab('inventory')} title="Estoque" className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'inventory' ? 'bg-slate-800 text-[#f5d0ed]' : 'text-slate-400 hover:text-white'} ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <Package size={20} /> {!sidebarCollapsed && <span>Estoque</span>}
          </button>

          {/* PWA Download Button in Sidebar */}
          {deferredPrompt && (
            <button 
              onClick={handleInstallClick} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mt-10 bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-700 ${sidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Download size={20} /> {!sidebarCollapsed && <span className="font-bold">Baixar App</span>}
            </button>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen w-full max-w-7xl mx-auto">
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {activeTab === 'dashboard' ? 'Olá Rose, boas vendas!' : 
                   activeTab === 'kpis' ? 'Indicadores de Desempenho' :
                   activeTab === 'inventory' ? 'Meu Almoxarifado' : 'Gestão'}
              </h1>
              <p className="text-gray-500 text-sm mt-1">Acompanhe seu desempenho e metas.</p>
            </div>
            
            <div className="flex flex-wrap gap-2 md:self-center">
              {/* Mobile Only Install Button */}
              {deferredPrompt && (
                <button 
                  onClick={handleInstallClick} 
                  className="md:hidden flex-1 justify-center bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition"
                >
                  <Download size={18} /> <span className="text-sm">Baixar App</span>
                </button>
              )}
              
              {activeTab === 'inventory' ? (
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => abrirEstoque('restock', null)} className="flex-1 sm:flex-none justify-center border-2 border-[#920074] text-[#920074] px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-50 transition">
                    <RefreshCw size={18} /> <span className="text-sm">Repor Estoque</span>
                  </button>
                  <button onClick={() => abrirEstoque('add', null)} className="flex-1 sm:flex-none justify-center bg-[#920074] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-[#74005c] transition">
                    <Plus size={18} /> <span className="text-sm">Novo Produto</span>
                  </button>
                </div>
              ) : activeTab === 'dashboard' && (
                // Lançar venda só no Início: Vendas e KPIs ficam só para consultar.
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => setIsAtacadoFormOpen(true)} className="flex-1 sm:flex-none justify-center border-2 border-[#920074] text-[#920074] px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-50 transition">
                    <Boxes size={18} /> <span className="text-sm">Venda Atacado</span>
                  </button>
                  <button onClick={() => setIsFormOpen(true)} className="flex-1 sm:flex-none justify-center bg-[#920074] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-[#74005c] transition">
                    <Plus size={18} /> <span className="text-sm">Nova Venda</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {(activeTab === 'dashboard' || activeTab === 'sales' || activeTab === 'kpis') && (
            // Os filtros ficam guardados atrás de um botão: no dia a dia a tela
            // mostra só as vendas. Com filtro ligado, o botão diz quantos são e
            // a linha de baixo diz quais, para nada ficar escondido.
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => { setFiltrosAbertos(v => !v); setCalendarioAberto(false); }}
                  className={`flex items-center gap-2 px-4 py-2.5 bg-white border rounded-xl text-sm font-bold shadow-sm transition ${filtrosAtivos.length ? 'border-[#920074] text-[#920074]' : 'border-gray-200 text-gray-600'}`}
                >
                  <SlidersHorizontal size={16} /> Filtros
                  {filtrosAtivos.length > 0 && <span className="bg-[#920074] text-white text-[10px] leading-none rounded-full px-1.5 py-1">{filtrosAtivos.length}</span>}
                  <ChevronDown size={16} className={`transition-transform ${filtrosAbertos ? 'rotate-180' : ''}`} />
                </button>
                {filtrosAtivos.length > 0 && (
                  <button onClick={limparFiltros} className="text-xs font-bold text-gray-500 hover:text-[#920074] underline px-1">Limpar</button>
                )}
                {selectedChartProduct && (
                  <button
                    onClick={() => setSelectedChartProduct(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-[#920074] border border-purple-200 rounded-full text-xs font-black uppercase transition-all animate-fade-in"
                  >
                    Filtrado: {selectedChartProduct} <XCircle size={14} />
                  </button>
                )}
              </div>

              {filtrosAtivos.length > 0 && !filtrosAbertos && (
                <p className="text-xs text-gray-500 break-words">{filtrosAtivos.join(' · ')}</p>
              )}

              {filtrosAbertos && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4 animate-fade-in">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar cliente ou produto..."
                        className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#920074] outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Período</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setCalendarioAberto(v => !v)}
                        className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition ${calendarioAberto ? 'border-[#920074] text-[#920074]' : 'border-gray-200 text-gray-800'}`}
                      >
                        <Calendar size={14} className="text-[#920074]" /> {rotuloPeriodo}
                      </button>
                      {(dateFilter.start || dateFilter.end) && (
                        <button onClick={() => { setDateFilter({ start: '', end: '' }); setCalendarioAberto(false); }} className="text-xs font-bold text-gray-500 hover:text-[#920074] underline px-1">
                          Ver todo o período
                        </button>
                      )}
                    </div>
                    {calendarioAberto && (
                      <div className="max-w-xs">
                        <DateRangePicker
                          startDate={dateFilter.start}
                          endDate={dateFilter.end}
                          onRange={(start, end) => { setDateFilter({ start, end }); setCalendarioAberto(false); }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Tipo de venda</p>
                    <div className="grid grid-cols-3 bg-gray-50 p-1 rounded-xl border border-gray-100 max-w-xs">
                      {(['Todos', 'Varejo', 'Atacado'] as const).map(canal => (
                        <button
                          key={canal}
                          onClick={() => { setChannelFilter(canal); if (canal === 'Atacado') setSaleTypeFilter('Todos'); }}
                          className={`py-2 rounded-lg text-xs font-bold transition ${channelFilter === canal ? 'bg-[#920074] text-white shadow-sm' : 'text-gray-500'}`}
                        >
                          {canal === 'Todos' ? 'Todas' : canal}
                        </button>
                      ))}
                    </div>
                  </div>

                  {channelFilter !== 'Atacado' && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Origem</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {['Todos', 'Instagram', 'Indicacao', 'Trafego Pago', 'Pessoal'].map((type) => (
                          <button
                            key={type}
                            onClick={() => setSaleTypeFilter(type as any)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                              saleTypeFilter === type
                              ? 'bg-[#920074] text-white border-[#920074] shadow-sm shadow-[#920074]/30'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {rotuloOrigem(type)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button onClick={() => { setFiltrosAbertos(false); setCalendarioAberto(false); }} className="text-sm font-bold text-[#920074] hover:underline">
                      Fechar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {activeTab === 'dashboard' && (
            <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
                    <StatsCard title="Líquido" value={formatCurrency(summary.totalNetProfit)} icon={Wallet} colorClass="bg-emerald-100 text-emerald-600" />
                    <StatsCard title="Bruto" value={formatCurrency(summary.totalSales)} icon={DollarSign} colorClass="bg-[#fce7f6] text-[#920074]" />
                    <StatsCard title="Custo Prod." value={formatCurrency(summary.totalProductCost)} icon={TrendingDown} colorClass="bg-red-100 text-red-600" />
                    <StatsCard title="Frete" value={formatCurrency(summary.totalFreight)} icon={Truck} colorClass="bg-blue-100 text-blue-600" />
                    <StatsCard title="Vendas" value={summary.salesCount.toString()} icon={CreditCard} colorClass="bg-orange-100 text-orange-600" />
                    <StatsCard title="Comissões" value={formatCurrency(summary.totalCommission)} icon={Users} colorClass="bg-purple-100 text-purple-600" />
                </div>
                
                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                      <h3 className="text-lg font-bold text-gray-800">Ranking de Faturamento por Produto</h3>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter flex items-center gap-1.5">
                        <Info size={12} className="text-[#920074]" /> Toque num produto para filtrar
                      </span>
                    </div>
                    <ListaDeBarras
                      cor={ROXO}
                      selecionado={selectedChartProduct}
                      onToque={nome => setSelectedChartProduct(atual => (atual === nome ? null : nome))}
                      itens={chartData.map(p => ({ chave: p.name, rotulo: p.name, valor: p.value, texto: formatCurrency(p.value), detalhe: `${p.units} un.` }))}
                    />
                </div>
            </div>
        )}

        {activeTab === 'kpis' && (
          <div className="space-y-6 animate-fade-in">
            {/* Comparativo de Períodos */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-50">
              <div className="flex items-center gap-2 mb-1">
                <Scale className="text-[#920074]" size={20} />
                <h3 className="font-bold text-gray-800">Comparativo de Períodos</h3>
              </div>
              <p className="text-xs text-gray-400 mb-6">
                Quando você muda o período A, o B vira os mesmos dias do mês anterior.
                {filtrosDoComparativo.length > 0 && <> Considerando só: {filtrosDoComparativo.join(' · ')}.</>}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {([['A', 'Período atual (A)', comparePeriodA], ['B', 'Comparar com (B)', comparePeriodB]] as const).map(([qual, titulo, periodo]) => (
                  <div key={qual} className="space-y-2">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider">{titulo}</p>
                    <button
                      onClick={() => setCalendarioComparativo(aberto => (aberto === qual ? null : qual))}
                      className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition ${calendarioComparativo === qual ? 'border-[#920074] text-[#920074]' : 'border-gray-200 text-gray-800'}`}
                    >
                      <Calendar size={14} className="text-[#920074]" /> {rotuloIntervalo(periodo.start, periodo.end)}
                    </button>
                    {calendarioComparativo === qual && (
                      <div className="max-w-xs">
                        <DateRangePicker
                          startDate={periodo.start}
                          endDate={periodo.end}
                          onRange={(start, end) => {
                            if (qual === 'A') return escolherPeriodoA(start, end);
                            setComparePeriodB({ start, end });
                            setCalendarioComparativo(null);
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {([
                  ['Faturamento', formatCurrency(comparison.periodA.sales), formatCurrency(comparison.periodB.sales), comparison.diffSales],
                  ['Lucro Líquido', formatCurrency(comparison.periodA.profit), formatCurrency(comparison.periodB.profit), comparison.diffProfit],
                  ['Vendas', String(comparison.periodA.count), String(comparison.periodB.count), comparison.diffCount],
                ] as const).map(([titulo, valorA, valorB, diferenca]) => (
                  <div key={titulo} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{titulo}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black text-slate-900">{valorA}</span>
                      {/* Sem nada no período B não há base para porcentagem. */}
                      {diferenca !== null && (
                        <div className={`flex items-center text-[10px] font-bold ${diferenca >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {diferenca >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {Math.abs(diferenca).toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">vs {valorB}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays className="text-[#920074]" size={20} />
                <h3 className="font-bold text-gray-800">Evolução de Vendas e Lucro</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                {rotuloPeriodo}, {evolucao.escala === 'daily' ? 'dia a dia' : evolucao.escala === 'weekly' ? 'semana a semana' : 'mês a mês'}. A escala muda sozinha conforme o período dos filtros.
              </p>
              <GraficoEvolucao pontos={evolucao.pontos} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <PieIcon className="text-[#920074]" size={20} />
                  <h3 className="font-bold text-gray-800">Lucro Líquido por Origem</h3>
                </div>
                <ListaDeBarras
                  cor={VERDE}
                  itens={kpis.modality.map(m => ({
                    chave: m.name, rotulo: m.name, valor: m.profit, texto: formatCurrency(m.profit),
                    detalhe: kpis.totalProfit > 0 ? `${Math.round((100 * m.profit) / kpis.totalProfit)}% do lucro` : undefined,
                  }))}
                />
              </div>

              <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <BarChart3 className="text-[#920074]" size={20} />
                  <h3 className="font-bold text-gray-800">Lucro Líquido por Produto</h3>
                </div>
                <ListaDeBarras
                  cor={VERDE}
                  itens={kpis.productProfit.map(p => ({ chave: p.name, rotulo: p.name, valor: p.profit, texto: formatCurrency(p.profit), detalhe: `${p.units} un.` }))}
                />
              </div>

              <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <Calendar className="text-[#920074]" size={20} />
                  <h3 className="font-bold text-gray-800">Vendas por Dia da Semana</h3>
                </div>
                <ListaDeBarras
                  cor={ROXO}
                  itens={kpis.weekday.map(d => ({ chave: d.name, rotulo: d.name, valor: d.salesCount, texto: `${d.salesCount} ${d.salesCount === 1 ? 'venda' : 'vendas'}`, detalhe: formatCurrency(d.amount) }))}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <h3 className="font-bold text-gray-800">Almoxarifado</h3>
                    <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full">
                      <Info size={14} className="text-blue-500" /> Custo médio calculado automaticamente.
                    </div>
                </div>
                {/* No celular cada linha vira cartão: produto e quantidade em cima,
                    custo e preço embaixo, ações à direita. Nada de rolagem lateral. */}
                <div>
                    <table className="block md:table w-full text-left">
                        <thead className="hidden md:table-header-group bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Produto</th>
                                <th className="px-6 py-4">Estoque</th>
                                <th className="px-6 py-4">Custo Médio</th>
                                <th className="px-6 py-4">Venda</th>
                                <th className="px-6 py-4 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="block md:table-row-group text-sm">
                            {inventory.map(item => (
                                <tr key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 border-t border-gray-100 md:table-row md:p-0 md:border-0 hover:bg-gray-50/50 transition group">
                                    <td className="col-start-1 row-start-1 min-w-0 md:px-6 md:py-4 font-bold text-gray-900 break-words md:whitespace-nowrap">{item.productName}</td>
                                    <td className="col-start-2 row-start-1 justify-self-end md:px-6 md:py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-slate-900 whitespace-nowrap ${item.quantity < 5 ? 'bg-red-100' : 'bg-emerald-100'}`}>
                                            {item.quantity} UN.
                                        </span>
                                    </td>
                                    <td className="col-start-1 row-start-2 md:px-6 md:py-4 text-xs md:text-sm font-medium text-slate-500 md:whitespace-nowrap">
                                        <span className="md:hidden">Custo </span>{formatCurrency(item.costPrice)}
                                        <span className="md:hidden"> · Venda <b className="text-[#920074]">{item.defaultSellPrice ? formatCurrency(item.defaultSellPrice) : '-'}</b></span>
                                    </td>
                                    <td className="hidden md:table-cell px-6 py-4 font-bold text-[#920074] whitespace-nowrap">{item.defaultSellPrice ? formatCurrency(item.defaultSellPrice) : '-'}</td>
                                    <td className="col-start-2 row-start-2 md:px-6 md:py-4 text-right">
                                      <div className="flex justify-end gap-1">
                                        <button 
                                          onClick={() => abrirEstoque(item.quantity < 0 ? 'count' : 'restock', item)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-[#920074] rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-[#920074] hover:text-white transition"
                                        >
                                          {/* Estoque negativo não se resolve repondo: precisa da contagem. */}
                                          {item.quantity < 0 ? <><ClipboardList size={12} /> Corrigir</> : <><RefreshCw size={12} /> Repor</>}
                                        </button>
                                        <button onClick={() => pedirApagarProduto(item)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                      </div>
                                    </td>
                                </tr>
                            ))}
                            {inventory.length === 0 && (
                                <tr className="block md:table-row">
                                    <td colSpan={5} className="block md:table-cell px-6 py-20 text-center text-gray-400 italic">Nenhum item cadastrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'sales' && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden text-slate-900">
                <div className="p-6">
                    <h3 className="font-bold text-gray-800">Histórico de Movimentações</h3>
                </div>
                {/* No celular cada linha vira cartão: cliente e bruto em cima,
                    produto, origem e data embaixo com o líquido, lixeira na ponta. */}
                <div>
                    <table className="block md:table w-full text-left">
                        <thead className="hidden md:table-header-group bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Produto</th>
                                <th className="px-6 py-4">Bruto</th>
                                <th className="px-6 py-4">Líquido</th>
                                <th className="px-6 py-4 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="block md:table-row-group text-sm">
                            {historico.map(({ chave, venda: sale, itens }) => {
                                const bruto = itens.reduce((s, i) => s + i.amount, 0);
                                const profit = itens.reduce((s, i) => s + lucroDaVenda(i), 0);
                                const produtos = sale.wholesale
                                  ? itens.map(i => `${unidades(i)} ${i.productName}`).join(', ')
                                  : sale.productName;
                                return (
                                <tr key={chave} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-0.5 px-4 py-3 border-t border-gray-100 md:table-row md:p-0 md:border-0 hover:bg-gray-50/50 transition">
                                    <td className="hidden md:table-cell px-6 py-4 text-gray-400 text-[11px] whitespace-nowrap">{parseLocalDate(sale.date).toLocaleDateString('pt-BR')}</td>
                                    <td className="col-start-1 row-start-1 row-span-2 min-w-0 md:px-6 md:py-4 font-bold text-gray-900 md:whitespace-nowrap">
                                        <div className="flex flex-col min-w-0">
                                            <span className="break-words">{sale.clientName}</span>
                                            <span className={`hidden md:inline text-[9px] font-bold uppercase tracking-tighter ${sale.wholesale ? 'text-[#920074]' : 'text-gray-400'}`}>{sale.wholesale ? 'Atacado' : rotuloOrigem(sale.saleType)}</span>
                                            <span className="md:hidden text-xs font-medium text-gray-400 break-words">
                                                {sale.wholesale
                                                  ? <><span className="text-[#920074]">Atacado</span> · {produtos} · {dataCurta(sale.date)}</>
                                                  : <>{produtos} · {rotuloOrigem(sale.saleType)} · {dataCurta(sale.date)}</>}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="hidden md:table-cell px-6 py-4">
                                      <div className="flex flex-wrap gap-1">
                                        {itens.map(i => (
                                          <span key={i.id} className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-600 whitespace-nowrap">
                                            {sale.wholesale ? `${unidades(i)}× ${i.productName}` : i.productName}
                                          </span>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="col-start-2 row-start-1 text-right md:text-left md:px-6 md:py-4 font-medium text-gray-600 whitespace-nowrap">{formatCurrency(bruto)}</td>
                                    <td className="col-start-2 row-start-2 text-right md:text-left text-xs md:text-sm md:px-6 md:py-4 font-black text-emerald-600 whitespace-nowrap">{formatCurrency(profit)}</td>
                                    <td className="col-start-3 row-start-1 row-span-2 md:px-6 md:py-4 text-right">
                                        <button onClick={() => pedirApagarVenda(itens)} className="p-2 text-gray-300 md:text-gray-200 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            )})}
                            {historico.length === 0 && (
                                <tr className="block md:table-row">
                                    <td colSpan={6} className="block md:table-cell px-6 py-20 text-center text-gray-400 italic">Nenhum resultado encontrado para o filtro.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 flex justify-around items-center px-4 py-3 z-50 shadow-[0_-4px_20px_0_rgba(0,0,0,0.05)] text-slate-900">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'dashboard' ? 'text-[#920074]' : 'text-gray-400'}`}>
          <Home size={22} />
          <span className="text-[10px] font-bold">Início</span>
        </button>
        <button onClick={() => setActiveTab('kpis')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'kpis' ? 'text-[#920074]' : 'text-gray-400'}`}>
          <TrendingUp size={22} />
          <span className="text-[10px] font-bold">KPIs</span>
        </button>
        <button onClick={() => setActiveTab('sales')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'sales' ? 'text-[#920074]' : 'text-gray-400'}`}>
          <CreditCard size={22} />
          <span className="text-[10px] font-bold">Vendas</span>
        </button>
        <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'inventory' ? 'text-[#920074]' : 'text-gray-400'}`}>
          <Package size={22} />
          <span className="text-[10px] font-bold">Estoque</span>
        </button>
      </nav>

      {isFormOpen && <SalesForm onAddSale={handleAddSale} inventory={inventory} onClose={() => setIsFormOpen(false)} />}
      {isAtacadoFormOpen && <AtacadoForm onSave={handleAddWholesale} inventory={inventory} onClose={() => setIsAtacadoFormOpen(false)} />}
      {isInventoryFormOpen && (
        <InventoryForm 
          allProducts={inventory}
          initialProduct={inventoryFormInitialProduct}
          onAdd={handleAddInventory} 
          onRestock={handleRestockInventory}
          onCount={handleCountInventory}
          initialMode={inventoryFormMode}
          onClose={() => { setIsInventoryFormOpen(false); setInventoryFormInitialProduct(null); }} 
        />
      )}
      {confirmacao && (
        <Confirmacao
          titulo={confirmacao.titulo}
          texto={confirmacao.texto}
          confirmar={confirmacao.confirmar}
          onConfirmar={confirmacao.acao}
          onCancelar={() => setConfirmacao(null)}
        />
      )}
    </div>
  );
};

export default App;
