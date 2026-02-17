
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
  UserPlus,
  RefreshCw,
  ShoppingCart,
  Info,
  Truck,
  ChevronLeft,
  ChevronRight,
  Filter,
  XCircle,
  Plus,
  BarChart3,
  PieChart as PieIcon,
  CalendarDays,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingDown,
  Download
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Cell, 
  LabelList, 
  Tooltip, 
  PieChart, 
  Pie, 
  LineChart, 
  Line, 
  CartesianGrid,
  Legend
} from 'recharts';
import { Sale, SalesSummary, Lead, InventoryItem, SaleType } from './types';
import { SalesForm } from './components/SalesForm';
import { LeadForm } from './components/LeadForm';
import { InventoryForm } from './components/InventoryForm';
import { StatsCard } from './components/StatsCard';
import * as db from './services/db';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 shadow-xl rounded-xl border border-gray-50">
        <p className="text-xs font-black text-gray-400 uppercase tracking-tighter mb-1">{payload[0].payload.name || payload[0].payload.date}</p>
        {payload.map((p: any, index: number) => (
          <p key={index} className={`text-sm font-black ${p.dataKey === 'profit' || p.dataKey === 'lucro' ? 'text-emerald-600' : 'text-[#920074]'}`}>
            {p.name}: {p.dataKey === 'salesCount' ? p.value : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.value)}
          </p>
        ))}
        {payload[0].payload.salesCount !== undefined && payload[0].dataKey !== 'salesCount' && (
          <p className="text-[10px] font-bold text-gray-500">
            Vendas: {payload[0].payload.salesCount} un.
          </p>
        )}
      </div>
    );
  }
  return null;
};

const App: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [isInventoryFormOpen, setIsInventoryFormOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'leads' | 'inventory' | 'repurchase' | 'kpis'>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [salesFormInitialData, setSalesFormInitialData] = useState<{clientName: string, productName: string} | null>(null);
  const [inventoryFormInitialProduct, setInventoryFormInitialProduct] = useState<InventoryItem | null>(null);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [saleTypeFilter, setSaleTypeFilter] = useState<SaleType | 'Todos'>('Todos');
  const [selectedChartProduct, setSelectedChartProduct] = useState<string | null>(null);
  const [kpiPeriod, setKpiPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

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
      const [salesData, leadsData, inventoryData] = await Promise.all([
        db.getSales(),
        db.getLeads(),
        db.getInventory()
      ]);
      setSales(salesData);
      setLeads(leadsData);
      setInventory(inventoryData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      let datePass = true;
      if (dateFilter.start || dateFilter.end) {
        const saleDate = new Date(sale.date);
        const start = dateFilter.start ? new Date(dateFilter.start) : new Date('2000-01-01');
        const end = dateFilter.end ? new Date(dateFilter.end) : new Date('2099-12-31');
        saleDate.setHours(0,0,0,0);
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);
        datePass = saleDate >= start && saleDate <= end;
      }
      let typePass = true;
      if (saleTypeFilter !== 'Todos') {
        typePass = sale.saleType === saleTypeFilter;
      }
      let chartPass = true;
      if (selectedChartProduct) {
        chartPass = sale.productName === selectedChartProduct;
      }
      let searchPass = true;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        searchPass = sale.clientName.toLowerCase().includes(term) || 
                     sale.productName.toLowerCase().includes(term);
      }
      return datePass && typePass && chartPass && searchPass;
    });
  }, [sales, dateFilter, saleTypeFilter, searchTerm, selectedChartProduct]);

  const summary: SalesSummary = useMemo(() => {
    return filteredSales.reduce((acc, sale) => {
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
          salesCount: acc.salesCount + 1,
          averageTicket: (acc.totalSales + sale.amount) / (acc.salesCount + 1),
        };
      }, { totalSales: 0, totalCommission: 0, totalNetProfit: 0, totalFreight: 0, totalProductCost: 0, salesCount: 0, averageTicket: 0 }
    );
  }, [filteredSales]);

  const repurchaseList = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const lastSalesByClient: Record<string, Sale> = {};
    sales.forEach(sale => {
      if (!lastSalesByClient[sale.clientName] || new Date(sale.date) > new Date(lastSalesByClient[sale.clientName].date)) {
        lastSalesByClient[sale.clientName] = sale;
      }
    });
    return Object.values(lastSalesByClient).filter(sale => {
        const saleDate = new Date(sale.date);
        saleDate.setHours(0,0,0,0);
        const diffDays = Math.ceil(Math.abs(today.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24)); 
        return diffDays >= 28;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales]);

  const chartData = useMemo(() => {
    const data: Record<string, { amount: number, count: number }> = {};
    const salesForChart = sales.filter(sale => {
      let datePass = true;
      if (dateFilter.start || dateFilter.end) {
        const saleDate = new Date(sale.date);
        const start = dateFilter.start ? new Date(dateFilter.start) : new Date('2000-01-01');
        const end = dateFilter.end ? new Date(dateFilter.end) : new Date('2099-12-31');
        saleDate.setHours(0,0,0,0);
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);
        datePass = saleDate >= start && saleDate <= end;
      }
      let typePass = true;
      if (saleTypeFilter !== 'Todos') {
        typePass = sale.saleType === saleTypeFilter;
      }
      return datePass && typePass;
    });
    salesForChart.forEach(sale => {
      if (!data[sale.productName]) {
        data[sale.productName] = { amount: 0, count: 0 };
      }
      data[sale.productName].amount += sale.amount;
      data[sale.productName].count += 1;
    });
    return Object.keys(data)
      .map(name => ({ 
        name, 
        value: data[name].amount, 
        salesCount: data[name].count 
      }))
      .sort((a, b) => b.value - a.value);
  }, [sales, dateFilter, saleTypeFilter]);

  // KPI INDICATORS CALCULATION
  const kpis = useMemo(() => {
    const byModality: Record<string, { value: number, profit: number, salesCount: number }> = {};
    const byProductProfit: Record<string, { profit: number, salesCount: number }> = {};
    const timeSeries: Record<string, { date: string, amount: number, profit: number, salesCount: number }> = {};
    const weekdayData = [
      { name: 'Dom', amount: 0, profit: 0, salesCount: 0 },
      { name: 'Seg', amount: 0, profit: 0, salesCount: 0 },
      { name: 'Ter', amount: 0, profit: 0, salesCount: 0 },
      { name: 'Qua', amount: 0, profit: 0, salesCount: 0 },
      { name: 'Qui', amount: 0, profit: 0, salesCount: 0 },
      { name: 'Sex', amount: 0, profit: 0, salesCount: 0 },
      { name: 'Sáb', amount: 0, profit: 0, salesCount: 0 },
    ];

    filteredSales.forEach(sale => {
      const profit = sale.amount - (sale.discount || 0) - sale.commissionValue - (sale.cost || 0) - (sale.freight || 0) - (sale.adCost || 0);
      const type = sale.saleType || 'Instagram';
      if (!byModality[type]) byModality[type] = { value: 0, profit: 0, salesCount: 0 };
      byModality[type].value += sale.amount;
      byModality[type].profit += profit;
      byModality[type].salesCount += 1;

      if (!byProductProfit[sale.productName]) byProductProfit[sale.productName] = { profit: 0, salesCount: 0 };
      byProductProfit[sale.productName].profit += profit;
      byProductProfit[sale.productName].salesCount += 1;

      const dateObj = new Date(sale.date);
      let timeKey = sale.date; 
      if (kpiPeriod === 'weekly') {
        const firstDayOfYear = new Date(dateObj.getFullYear(), 0, 1);
        const week = Math.ceil((((dateObj.getTime() - firstDayOfYear.getTime()) / 86400000) + firstDayOfYear.getDay() + 1) / 7);
        timeKey = `Semana ${week}/${dateObj.getFullYear().toString().slice(-2)}`;
      } else if (kpiPeriod === 'monthly') {
        timeKey = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
      }

      if (!timeSeries[timeKey]) timeSeries[timeKey] = { date: timeKey, amount: 0, profit: 0, salesCount: 0 };
      timeSeries[timeKey].amount += sale.amount;
      timeSeries[timeKey].profit += profit;
      timeSeries[timeKey].salesCount += 1;

      const dayIdx = dateObj.getDay();
      weekdayData[dayIdx].amount += sale.amount;
      weekdayData[dayIdx].profit += profit;
      weekdayData[dayIdx].salesCount += 1;
    });

    const timeSeriesList = Object.values(timeSeries).sort((a,b) => a.date.localeCompare(b.date));
    const sortedTimeSeries = [...timeSeriesList].sort((a,b) => b.amount - a.amount);

    return {
      modality: Object.keys(byModality).map(name => ({ name, value: byModality[name].value, profit: byModality[name].profit, salesCount: byModality[name].salesCount })),
      productProfit: Object.keys(byProductProfit).map(name => ({ name, profit: byProductProfit[name].profit, salesCount: byProductProfit[name].salesCount })).sort((a,b) => b.profit - a.profit),
      timeSeries: timeSeriesList,
      weekday: weekdayData,
      bestPeriod: sortedTimeSeries.length > 0 ? sortedTimeSeries[0] : null,
      worstPeriod: sortedTimeSeries.length > 0 ? sortedTimeSeries[sortedTimeSeries.length - 1] : null
    };
  }, [filteredSales, kpiPeriod]);

  const handleAddSale = async (newSale: Sale) => {
    setSales(prev => [newSale, ...prev]);
    await db.addSale(newSale);
    await db.updateStockQuantity(newSale.productName, -1);
    if (convertingLeadId) {
        setLeads(prev => prev.filter(l => l.id !== convertingLeadId));
        await db.deleteLead(convertingLeadId);
        setConvertingLeadId(null);
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

  const handleDeleteProduct = async (id: string) => {
    if(window.confirm('Excluir este produto do estoque?')) {
        const updated = await db.deleteProduct(id);
        setInventory(updated);
    }
  };

  const handleConvertLead = (lead: Lead) => {
    setConvertingLeadId(lead.id);
    setSalesFormInitialData({ clientName: lead.clientName, productName: lead.productInterest || '' });
    setIsFormOpen(true);
  };

  const handleChartClick = (data: any) => {
    if (data && data.activeLabel) {
      const productName = data.activeLabel;
      setSelectedChartProduct(prev => prev === productName ? null : productName);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const totalModalityProfit = useMemo(() => kpis.modality.reduce((sum, item) => sum + item.profit, 0), [kpis.modality]);

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
          <button onClick={() => setActiveTab('leads')} title="Pendentes" className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'leads' ? 'bg-slate-800 text-[#f5d0ed]' : 'text-slate-400 hover:text-white'} ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <Users size={20} /> {!sidebarCollapsed && <span>Pendentes</span>}
          </button>
          <button onClick={() => setActiveTab('repurchase')} title="Recompra" className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'repurchase' ? 'bg-slate-800 text-[#f5d0ed]' : 'text-slate-400 hover:text-white'} ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <RefreshCw size={20} /> {!sidebarCollapsed && <span>Recompra</span>}
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
                   activeTab === 'inventory' ? 'Meu Almoxarifado' : 
                   activeTab === 'repurchase' ? 'Hora de Recontato!' : 'Gestão'}
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
                  <button onClick={() => { setInventoryFormInitialProduct(null); setIsInventoryFormOpen(true); }} className="flex-1 sm:flex-none justify-center border-2 border-[#920074] text-[#920074] px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-50 transition">
                    <RefreshCw size={18} /> <span className="text-sm">Repor Estoque</span>
                  </button>
                  <button onClick={() => { setInventoryFormInitialProduct(null); setIsInventoryFormOpen(true); }} className="flex-1 sm:flex-none justify-center bg-[#920074] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-[#74005c] transition">
                    <Plus size={18} /> <span className="text-sm">Novo Produto</span>
                  </button>
                </div>
              ) : activeTab === 'leads' ? (
                  <button onClick={() => setIsLeadFormOpen(true)} className="flex-1 md:flex-none justify-center bg-[#920074] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-[#74005c] transition">
                    <UserPlus size={18} /> <span className="text-sm">Novo Pendente</span>
                  </button>
              ) : (
                  <button onClick={() => setIsFormOpen(true)} className="flex-1 md:flex-none justify-center bg-[#920074] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-[#74005c] transition">
                    {/* Fixed "Cannot find name 'PlusCircle'" by using 'Plus' instead */}
                    <Plus size={18} /> <span className="text-sm">Nova Venda</span>
                  </button>
              )}
            </div>
          </div>

          {(activeTab === 'dashboard' || activeTab === 'sales' || activeTab === 'kpis') && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                      type="text" 
                      placeholder="Buscar cliente ou produto..." 
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-[#920074] outline-none"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm overflow-x-auto no-scrollbar whitespace-nowrap">
                  <Calendar size={14} className="text-[#920074] ml-1" />
                  <input 
                      type="date" 
                      value={dateFilter.start} 
                      onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})}
                      className="text-xs bg-transparent outline-none text-gray-900 border-none focus:ring-0 p-0 w-28"
                  />
                  <span className="text-gray-300">até</span>
                  <input 
                      type="date" 
                      value={dateFilter.end} 
                      onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})}
                      className="text-xs bg-transparent outline-none text-gray-900 border-none focus:ring-0 p-0 w-28"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1">
                  <Filter size={14} className="text-[#920074] flex-shrink-0" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter whitespace-nowrap">Origem:</span>
                  <div className="flex items-center gap-1.5 ml-1">
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
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedChartProduct && (
                  <button 
                    onClick={() => setSelectedChartProduct(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-[#920074] border border-purple-200 rounded-full text-xs font-black uppercase transition-all animate-fade-in"
                  >
                    Filtrado: {selectedChartProduct} <XCircle size={14} />
                  </button>
                )}
              </div>
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
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-lg font-bold text-gray-800">Ranking de Faturamento por Produto</h3>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter flex items-center gap-1.5">
                        <Info size={12} className="text-[#920074]" /> Toque na barra para filtrar
                      </span>
                    </div>
                    <div className="h-72 md:h-80 w-full cursor-pointer">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={chartData} 
                              margin={{ top: 20, right: 20, left: 20, bottom: 80 }}
                              onClick={handleChartClick}
                            >
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                <XAxis 
                                  dataKey="name" 
                                  tick={{
                                    fontSize: 8.5, 
                                    fill: '#64748b',
                                    angle: -40,
                                    textAnchor: 'end',
                                    dy: 5
                                  } as any} 
                                  axisLine={false} 
                                  tickLine={false} 
                                  interval={0}
                                />
                                <YAxis hide={true} />
                                <Bar dataKey="value" fill="#920074" radius={[6, 6, 0, 0]} barSize={45}>
                                    {chartData.map((entry, i) => (
                                      <Cell 
                                        key={i} 
                                        fill={selectedChartProduct && entry.name !== selectedChartProduct ? '#e2e8f0' : ['#920074', '#8B5CF6', '#10B981', '#3B82F6', '#F59E0B'][i % 5]} 
                                        className="transition-all duration-300 hover:opacity-80"
                                      />
                                    ))}
                                    <LabelList 
                                      dataKey="value" 
                                      position="top" 
                                      formatter={(val: number) => `R$${val.toFixed(0)}`} 
                                      style={{ fontSize: '11px', fontWeight: 'bold', fill: '#64748b' }}
                                    />
                                    <LabelList 
                                      dataKey="salesCount" 
                                      position="insideTop" 
                                      offset={10}
                                      formatter={(val: number) => val > 5 ? `${val} un.` : ''}
                                      style={{ fontSize: '10px', fontWeight: 'black', fill: '#ffffff', textShadow: '0px 1px 2px rgba(0,0,0,0.3)' }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'kpis' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kpis.bestPeriod && (
                <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4 transition-all hover:shadow-md border border-emerald-50">
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                    <ArrowUpCircle size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Melhor Período ({kpiPeriod === 'daily' ? 'Dia' : kpiPeriod === 'weekly' ? 'Semana' : 'Mês'})</p>
                    <h3 className="text-lg font-black text-gray-900">{kpis.bestPeriod.date}</h3>
                    <p className="text-xs font-bold text-emerald-600">{formatCurrency(kpis.bestPeriod.amount)} em vendas</p>
                  </div>
                </div>
              )}
              {kpis.worstPeriod && (
                <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4 transition-all hover:shadow-md border border-red-50">
                  <div className="p-3 rounded-xl bg-red-50 text-red-600">
                    <ArrowDownCircle size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Pior Período ({kpiPeriod === 'daily' ? 'Dia' : kpiPeriod === 'weekly' ? 'Semana' : 'Mês'})</p>
                    <h3 className="text-lg font-black text-gray-900">{kpis.worstPeriod.date}</h3>
                    <p className="text-xs font-bold text-red-600">{formatCurrency(kpis.worstPeriod.amount)} em vendas</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex bg-white p-1 rounded-xl shadow-sm w-fit border border-gray-100">
              {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setKpiPeriod(p)}
                  className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                    kpiPeriod === p ? 'bg-[#920074] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {p === 'daily' ? 'Diário' : p === 'weekly' ? 'Semanal' : 'Mensal'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <CalendarDays className="text-[#920074]" size={20} />
                  <h3 className="font-bold text-gray-800">Evolução de Vendas e Lucro</h3>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={kpis.timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" />
                      <Line name="Faturamento" type="monotone" dataKey="amount" stroke="#920074" strokeWidth={3} dot={{r: 4, fill: '#920074'}} activeDot={{r: 6}} />
                      <Line name="Lucro Líquido" type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981'}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Calendar className="text-[#920074]" size={20} />
                  <h3 className="font-bold text-gray-800">Melhores Dias da Semana</h3>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={kpis.weekday} margin={{ bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                        padding={{ left: 10, right: 10 }}
                      />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar name="Volume de Vendas" dataKey="salesCount" fill="#920074" radius={[4, 4, 0, 0]} barSize={45}>
                        <LabelList 
                          dataKey="salesCount" 
                          position="insideTop" 
                          offset={12} 
                          style={{fontSize: 12, fontWeight: 'black', fill: '#ffffff'}} 
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <PieIcon className="text-[#920074]" size={20} />
                  <h3 className="font-bold text-gray-800">Lucro Líquido por Modalidade</h3>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={kpis.modality}
                        dataKey="profit"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={50}
                        paddingAngle={5}
                        stroke="none"
                      >
                        {kpis.modality.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#920074', '#8b5cf6', '#10b981', '#3b82f6'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => formatCurrency(val)} />
                      <Legend 
                        verticalAlign="bottom" 
                        align="center" 
                        layout="horizontal" 
                        iconType="circle"
                        formatter={(value, entry: any) => {
                          const val = entry.payload.profit;
                          const percent = totalModalityProfit > 0 ? ((val / totalModalityProfit) * 100).toFixed(0) : 0;
                          return <span className="text-[10px] md:text-xs font-bold text-gray-600">{value} ({percent}%)</span>;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="text-[#920074]" size={20} />
                  <h3 className="font-bold text-gray-800">Lucro Líquido por Produto</h3>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={kpis.productProfit.slice(0, 6)} margin={{ left: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar name="Lucro" dataKey="profit" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20}>
                        <LabelList 
                          dataKey="profit" 
                          position="insideRight" 
                          offset={10} 
                          formatter={(v: number) => `R$${v.toFixed(0)}`} 
                          style={{fontSize: 9, fontWeight: 'bold', fill: '#ffffff'}} 
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
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
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Produto</th>
                                <th className="px-6 py-4">Estoque</th>
                                <th className="px-6 py-4">Custo Médio</th>
                                <th className="px-6 py-4">Venda</th>
                                <th className="px-6 py-4 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {inventory.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50/50 transition group">
                                    <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">{item.productName}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-slate-900 ${item.quantity < 5 ? 'bg-red-100' : 'bg-emerald-100'}`}>
                                            {item.quantity} UN.
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-500 whitespace-nowrap">{formatCurrency(item.costPrice)}</td>
                                    <td className="px-6 py-4 font-bold text-[#920074] whitespace-nowrap">{item.defaultSellPrice ? formatCurrency(item.defaultSellPrice) : '-'}</td>
                                    <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end gap-1">
                                        <button 
                                          onClick={() => { setInventoryFormInitialProduct(item); setIsInventoryFormOpen(true); }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-[#920074] rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-[#920074] hover:text-white transition"
                                        >
                                          <RefreshCw size={12} /> Repor
                                        </button>
                                        <button onClick={() => handleDeleteProduct(item.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                      </div>
                                    </td>
                                </tr>
                            ))}
                            {inventory.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-gray-400 italic">Nenhum item cadastrado.</td>
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
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Produto</th>
                                <th className="px-6 py-4">Bruto</th>
                                <th className="px-6 py-4">Líquido</th>
                                <th className="px-6 py-4 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filteredSales.map(sale => {
                                const adCost = sale.adCost || 0;
                                const disc = sale.discount || 0;
                                const profit = sale.amount - disc - sale.commissionValue - (sale.cost || 0) - (sale.freight || 0) - adCost;
                                return (
                                <tr key={sale.id} className="hover:bg-gray-50/50 transition">
                                    <td className="px-6 py-4 text-gray-400 text-[11px] whitespace-nowrap">{new Date(sale.date).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span>{sale.clientName}</span>
                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">{sale.saleType}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-600">{sale.productName}</span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-600 whitespace-nowrap">{formatCurrency(sale.amount)}</td>
                                    <td className="px-6 py-4 font-black text-emerald-600 whitespace-nowrap">{formatCurrency(profit)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => db.deleteSale(sale.id).then(loadData)} className="p-2 text-gray-200 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            )})}
                            {filteredSales.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-gray-400 italic">Nenhum resultado encontrado para o filtro.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'leads' && (
            <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-amber-700 bg-amber-50 p-4 rounded-2xl">
                  <div className="bg-amber-100 p-2 rounded-lg"><Users size={18} /></div>
                  <p><b>Leads:</b> Clientes que demonstraram interesse, mas ainda não converteram em venda.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {leads.map(lead => (
                        <div key={lead.id} className="bg-white p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <h4 className="font-bold text-gray-900 text-lg group-hover:text-[#920074] transition-colors">{lead.clientName}</h4>
                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-black uppercase">Pendente</span>
                                </div>
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600">
                                      <ShoppingCart size={14} className="text-[#920074]" />
                                      <span>Interesse: <b className="text-gray-900">{lead.productInterest}</b></span>
                                    </div>
                                    {lead.phone && <div className="flex items-center gap-2 text-gray-600">
                                      <DollarSign size={14} className="text-emerald-500" />
                                      <span>{lead.phone}</span>
                                    </div>}
                                    {lead.expectedDate && <div className="flex items-center gap-2 text-orange-600 font-bold">
                                      <Calendar size={14} />
                                      <span>Previsão: {new Date(lead.expectedDate).toLocaleDateString('pt-BR')}</span>
                                    </div>}
                                    {lead.notes && <p className="italic text-xs text-gray-400 bg-gray-50 p-3 rounded-xl mt-2">"{lead.notes}"</p>}
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center gap-2">
                                <button onClick={() => handleConvertLead(lead)} className="flex-1 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-emerald-100 flex items-center justify-center gap-1.5 transition">
                                    <ShoppingCart size={16} /> Vender
                                </button>
                                <button onClick={() => db.deleteLead(lead.id).then(loadData)} className="p-2.5 text-gray-300 hover:text-red-500 bg-gray-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    ))}
                    {leads.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-400 italic bg-white rounded-2xl text-slate-900">Sem leads pendentes no momento.</div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'repurchase' && (
            <div className="space-y-6">
                <div className="bg-gradient-to-br from-[#920074] to-[#74005c] p-6 md:p-8 rounded-3xl text-white shadow-xl overflow-hidden relative">
                  <div className="relative z-10">
                    <h3 className="text-xl md:text-2xl font-black mb-2 flex items-center gap-2">
                      <RefreshCw className="animate-spin-slow" size={24} /> Ouro na Mão!
                    </h3>
                    <p className="text-white/80 text-sm md:text-base max-w-lg">
                      Estes clientes compraram há mais de <b>28 dias</b>. Eles já conhecem a qualidade do seu produto, agora é só oferecer de novo!
                    </p>
                  </div>
                  <div className="absolute right-[-20px] bottom-[-20px] opacity-10 text-white">
                    <RefreshCw size={150} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {repurchaseList.map(sale => {
                        const today = new Date();
                        const saleDate = new Date(sale.date);
                        const diffDays = Math.ceil(Math.abs(today.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
                        return (
                            <div key={sale.id} className="bg-white p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition group">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <h4 className="font-bold text-gray-900 text-lg">{sale.clientName}</h4>
                                        <span className="text-[10px] bg-purple-100 text-[#920074] px-2.5 py-1 rounded-full font-black uppercase">{diffDays} dias</span>
                                    </div>
                                    <div className="space-y-3 text-sm text-gray-500">
                                        <p className="flex items-center gap-2">📦 <b className="text-gray-800">{sale.productName}</b></p>
                                        <p className="flex items-center gap-2">📅 Última compra: <b>{new Date(sale.date).toLocaleDateString('pt-BR')}</b></p>
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-gray-100">
                                    <button 
                                      onClick={() => {
                                        setSalesFormInitialData({ clientName: sale.clientName, productName: sale.productName });
                                        setIsFormOpen(true);
                                      }}
                                      className="w-full bg-[#920074] text-white px-4 py-3 rounded-xl font-bold text-xs hover:bg-[#74005c] flex items-center justify-center gap-2 shadow-lg transition transform active:scale-[0.98]"
                                    >
                                        <RefreshCw size={16} /> Registrar Recompra
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                    {repurchaseList.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-400 italic bg-white rounded-2xl text-slate-900">Nenhum cliente no ciclo de recompra ainda.</div>
                    )}
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
        <button onClick={() => setActiveTab('leads')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'leads' ? 'text-[#920074]' : 'text-gray-400'}`}>
          <Users size={22} />
          <span className="text-[10px] font-bold">Leads</span>
        </button>
        <button onClick={() => setActiveTab('repurchase')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'repurchase' ? 'text-[#920074]' : 'text-gray-400'}`}>
          <RefreshCw size={22} />
          <span className="text-[10px] font-bold">Recompra</span>
        </button>
      </nav>

      {isFormOpen && <SalesForm onAddSale={handleAddSale} inventory={inventory} initialData={salesFormInitialData} onClose={() => { setIsFormOpen(false); setSalesFormInitialData(null); }} />}
      {isLeadFormOpen && <LeadForm onAddLead={(l) => { db.addLead(l).then(loadData); setIsLeadFormOpen(false); }} onClose={() => setIsLeadFormOpen(false)} />}
      {isInventoryFormOpen && (
        <InventoryForm 
          allProducts={inventory}
          initialProduct={inventoryFormInitialProduct}
          onAdd={handleAddInventory} 
          onRestock={handleRestockInventory}
          onClose={() => { setIsInventoryFormOpen(false); setInventoryFormInitialProduct(null); }} 
        />
      )}
    </div>
  );
};

export default App;
