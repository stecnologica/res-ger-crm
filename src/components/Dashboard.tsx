import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell
} from 'recharts';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';

interface DashboardProps {
  user: User;
  onNavigate?: (screen: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const { activeCompany, activeMembership } = useCompany();
  const [loading, setLoading] = useState(true);

  // States for KPIs
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayTransactions, setTodayTransactions] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [profitMarginPercent, setProfitMarginPercent] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  
  // States for Charts
  const [salesHistoryData, setSalesHistoryData] = useState<any[]>([]);
  const [topProductsData, setTopProductsData] = useState<any[]>([]);
  
  // States for Leaderboard & Recent Activity
  const [sellerLeaderboard, setSellerLeaderboard] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);

  // States for Filters and Sold Products List
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month'>('week');
  const [soldProductsList, setSoldProductsList] = useState<any[]>([]);

  useEffect(() => {
    if (activeCompany) {
      // Use fallback dynamically for date filtering as the RPC doesn't support dates out-of-the-box
      fetchDashboardDataFallback();
    }
  }, [activeCompany, timeFilter]);

  const applyDashboardSummary = (summary: any) => {
    setTodayRevenue(Number(summary.todayRevenue || 0));
    setTodayTransactions(Number(summary.todayTransactions || 0));
    setNetProfit(Number(summary.netProfit || 0));
    setProfitMarginPercent(Number(summary.profitMarginPercent || 0));
    setLowStockItems(summary.lowStockItems || []);
    setSalesHistoryData(summary.salesHistoryData || []);
    setTopProductsData(summary.topProductsData || []);
    setSellerLeaderboard(summary.sellerLeaderboard || []);
    setRecentSales(summary.recentSales || []);
  };

  const fetchDashboardData = async () => {
    if (!activeCompany) return;
    setLoading(true);

    const { data: summary, error: summaryError } = await supabase.rpc('get_dashboard_summary', {
      p_company_id: activeCompany.id
    });

    if (!summaryError && summary) {
      applyDashboardSummary(summary);
      setLoading(false);
      return;
    }

    console.warn('Dashboard RPC unavailable, using compatibility queries:', summaryError?.message);
    await fetchDashboardDataFallback();
  };

  const fetchDashboardDataFallback = async () => {
    if (!activeCompany) return;
    setLoading(true);

    let daysToSubtract = 0;
    if (timeFilter === 'day') daysToSubtract = 0;
    else if (timeFilter === 'week') daysToSubtract = 6;
    else if (timeFilter === 'month') daysToSubtract = 29;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToSubtract);
    startDate.setHours(0, 0, 0, 0);

    const [recentVentasRes, allVentaItemsRes, productsRes, membersRes, allSalesRes] = await Promise.all([
      supabase
        .from('ventas')
        .select('id, total, created_at, user_id, cliente_id, manual_name, cliente:clientes(nombre)')
        .eq('company_id', activeCompany.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('venta_items')
        .select('cantidad, precio_unitario, venta:ventas!inner(company_id, created_at), producto:productos(costo)')
        .eq('ventas.company_id', activeCompany.id)
        .gte('ventas.created_at', startDate.toISOString()),
      supabase
        .from('productos')
        .select('id, nombre, stock, stock_minimo')
        .eq('company_id', activeCompany.id),
      supabase
        .from('company_members')
        .select('user_id, role, profile:profiles(full_name, email)')
        .eq('company_id', activeCompany.id),
      supabase
        .from('ventas')
        .select('user_id, total')
        .eq('company_id', activeCompany.id)
        .gte('created_at', startDate.toISOString())
    ]);

    if (recentVentasRes.error) console.error('Error fetching recent dashboard sales:', recentVentasRes.error);
    if (allVentaItemsRes.error) console.error('Error fetching dashboard profit items:', allVentaItemsRes.error);
    if (productsRes.error) console.error('Error fetching dashboard products:', productsRes.error);
    if (membersRes.error) console.error('Error fetching dashboard members:', membersRes.error);
    if (allSalesRes.error) console.error('Error fetching dashboard seller sales:', allSalesRes.error);

    const ventas = recentVentasRes.data || [];

    const revenuePeriod = ventas.reduce((acc, v) => acc + Number(v.total || 0), 0);
    const transactionsPeriod = ventas.length;

    let totalRev = 0;
    let totalCost = 0;
    (allVentaItemsRes.data || []).forEach((item: any) => {
      totalRev += Number(item.precio_unitario || 0) * Number(item.cantidad || 0);
      const costo = item.producto?.costo || (Number(item.precio_unitario || 0) * 0.4);
      totalCost += Number(costo || 0) * Number(item.cantidad || 0);
    });
    const calculatedNetProfit = totalRev - totalCost;

    const criticalStock = (productsRes.data || []).filter(p => p.stock <= (p.stock_minimo || 10));

    const datesMap: Record<string, number> = {};
    const today = new Date();
    for (let i = daysToSubtract; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      datesMap[dateKey] = 0;
    }
    ventas.forEach(v => {
      const dateKey = v.created_at.split('T')[0];
      if (datesMap[dateKey] !== undefined) {
        datesMap[dateKey] += Number(v.total || 0);
      }
    });
    const historyData = Object.entries(datesMap).map(([date, total]) => {
      const [, month, day] = date.split('-');
      return { date: `${day}/${month}`, Ventas: parseFloat(total.toFixed(2)) };
    });

    const recentSalesBase = ventas.slice(0, 4);
    const ventaIds = ventas.map(v => v.id);
    const recentUserIds = [...new Set(recentSalesBase.map(s => s.user_id).filter(id => id))];

    const [recentItemsRes, profilesRes] = await Promise.all([
      ventaIds.length > 0
        ? supabase
            .from('venta_items')
            .select('producto_id, cantidad, precio_unitario, producto:productos(nombre)')
            .in('venta_id', ventaIds)
        : Promise.resolve({ data: [], error: null }),
      recentUserIds.length > 0
        ? supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', recentUserIds)
        : Promise.resolve({ data: [], error: null })
    ]);

    if (recentItemsRes.error) console.error('Error fetching dashboard top products:', recentItemsRes.error);
    if (profilesRes.error) console.error('Error fetching dashboard profiles:', profilesRes.error);

    const productQuantities: Record<string, { name: string, quantity: number, revenue: number }> = {};
    (recentItemsRes.data || []).forEach((item: any) => {
      const pId = item.producto_id;
      if (!productQuantities[pId]) {
        productQuantities[pId] = { name: item.producto?.nombre || 'Desconocido', quantity: 0, revenue: 0 };
      }
      productQuantities[pId].quantity += Number(item.cantidad || 0);
      productQuantities[pId].revenue += Number(item.precio_unitario || 0) * Number(item.cantidad || 0);
    });

    const allProductsSoldData = Object.entries(productQuantities)
      .map(([id, info]) => ({
        id,
        name: info.name,
        Cantidad: info.quantity,
        Ingresos: parseFloat(info.revenue.toFixed(2))
      }))
      .sort((a, b) => b.Cantidad - a.Cantidad);

    setSoldProductsList(allProductsSoldData);
    
    const top = allProductsSoldData.slice(0, 5).map(item => ({
      ...item,
      name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name
    }));

    // --- Leaderboard: aggregate sales by user_id from the period ---
    const sellerAmounts: Record<string, { amount: number, count: number }> = {};
    (allSalesRes.data || []).forEach((s: any) => {
      const uid = s.user_id || '__anon__';
      if (!sellerAmounts[uid]) sellerAmounts[uid] = { amount: 0, count: 0 };
      sellerAmounts[uid].amount += Number(s.total || 0);
      sellerAmounts[uid].count += 1;
    });

    // Fetch profiles for all unique user_ids that sold in the period
    const periodSellerIds = Object.keys(sellerAmounts).filter(id => id !== '__anon__');
    const memberRoleMap: Record<string, string> = {};
    (membersRes.data || []).forEach((m: any) => {
      memberRoleMap[m.user_id] = m.role;
    });

    let profilesForSellers: any[] = [];
    if (periodSellerIds.length > 0) {
      const { data: profData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', periodSellerIds);
      profilesForSellers = profData || [];
    }

    const profileMap: Record<string, string> = {};
    profilesForSellers.forEach((p: any) => {
      profileMap[p.id] = p.full_name || p.email || 'Usuario';
    });

    const leaderboard = periodSellerIds
      .map(uid => ({
        name: profileMap[uid] || 'Usuario',
        amount: sellerAmounts[uid].amount,
        count: sellerAmounts[uid].count,
        role: memberRoleMap[uid] || 'Colaborador'
      }))
      .sort((a, b) => b.amount - a.amount);

    // Add anon sales as a row if any
    if (sellerAmounts['__anon__']) {
      leaderboard.push({
        name: 'Ventas Directas',
        amount: sellerAmounts['__anon__'].amount,
        count: sellerAmounts['__anon__'].count,
        role: 'Sin asignar'
      });
    }

    const salesWithProfiles = recentSalesBase.map((sale: any) => ({
      ...sale,
      vendedor: profilesForSellers.find((p: any) => p.id === sale.user_id)
    }));

    applyDashboardSummary({
      todayRevenue: revenuePeriod,
      todayTransactions: transactionsPeriod,
      netProfit: calculatedNetProfit,
      profitMarginPercent: totalRev > 0 ? Math.round((calculatedNetProfit / totalRev) * 100) : 0,
      lowStockItems: criticalStock,
      salesHistoryData: historyData,
      topProductsData: top,
      sellerLeaderboard: leaderboard,
      recentSales: salesWithProfiles
    });

    setLoading(false);
  };
  if (loading) {
    return <div className="p-10 text-center text-[#434656] mt-16">Cargando dashboard...</div>;
  }

  return (
    <div className="p-8 max-w-[1440px] mx-auto mt-16 bg-[#f8f9fc] min-h-screen">
      <div className="space-y-6">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-display text-2xl font-black text-[#191b25] tracking-tight">Dashboard 360°</h1>
            <p className="text-xs text-[#434656] mt-0.5">
              Estadísticas consolidadas en tiempo real para <strong className="text-[#003ec7]">{activeCompany?.nombre}</strong>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="bg-white border border-[#E2E8F0] p-1 rounded-lg flex mr-2 sm:mr-4 shadow-sm h-10">
              <button onClick={() => setTimeFilter('day')} className={`px-4 py-1 text-xs font-bold rounded-md transition-all ${timeFilter === 'day' ? 'bg-[#003ec7] text-white shadow-sm' : 'text-[#434656] hover:bg-[#F1F5F9]'}`}>Día</button>
              <button onClick={() => setTimeFilter('week')} className={`px-4 py-1 text-xs font-bold rounded-md transition-all ${timeFilter === 'week' ? 'bg-[#003ec7] text-white shadow-sm' : 'text-[#434656] hover:bg-[#F1F5F9]'}`}>Semana</button>
              <button onClick={() => setTimeFilter('month')} className={`px-4 py-1 text-xs font-bold rounded-md transition-all ${timeFilter === 'month' ? 'bg-[#003ec7] text-white shadow-sm' : 'text-[#434656] hover:bg-[#F1F5F9]'}`}>Mes</button>
            </div>
            <button 
              onClick={() => onNavigate && onNavigate('NewSale')}
              className="bg-[#003ec7] hover:bg-[#0052ff] text-white px-4 py-2 rounded-lg font-display text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 h-10 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">point_of_sale</span>
              Nueva Venta (POS)
            </button>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-[#c3c5d9]/30 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#434656] tracking-wider font-display">
                Ventas ({timeFilter === 'day' ? 'Hoy' : timeFilter === 'week' ? '7 Días' : '30 Días'})
              </span>
              <div className="text-2xl font-black text-[#191b25] font-display">${todayRevenue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              <div className="text-[10px] text-[#006c4b] font-medium flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                En sucursal
              </div>
            </div>
            <div className="w-10 h-10 bg-[#003ec7]/10 rounded-xl flex items-center justify-center text-[#003ec7]">
              <span className="material-symbols-outlined text-xl">payments</span>
            </div>
          </div>

          {/* Transactions */}
          <div className="bg-white p-5 rounded-xl border border-[#c3c5d9]/30 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#434656] tracking-wider font-display">Transacciones ({timeFilter === 'day' ? 'Hoy' : timeFilter === 'week' ? '7 Días' : '30 Días'})</span>
              <div className="text-2xl font-black text-[#191b25] font-display">{todayTransactions}</div>
              <div className="text-[10px] text-[#434656] font-medium">Tickets emitidos</div>
            </div>
            <div className="w-10 h-10 bg-[#006c4b]/10 rounded-xl flex items-center justify-center text-[#006c4b]">
              <span className="material-symbols-outlined text-xl">receipt_long</span>
            </div>
          </div>

          {/* Profit Cumulative */}
          <div className="bg-white p-5 rounded-xl border border-[#c3c5d9]/30 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#434656] tracking-wider font-display">Utilidad Estimada ({timeFilter === 'day' ? 'Hoy' : timeFilter === 'week' ? '7 Días' : '30 Días'})</span>
              <div className="text-2xl font-black text-[#191b25] font-display">${netProfit.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              <div className="text-[10px] text-[#006c4b] font-medium flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[12px]">trending_up</span>
                {profitMarginPercent}% margen de utilidad
              </div>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-700">
              <span className="material-symbols-outlined text-xl">paid</span>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className={`p-5 rounded-xl border shadow-xs flex items-center justify-between transition-colors ${
            lowStockItems.length > 0 
              ? 'bg-amber-50 border-amber-200 text-amber-900' 
              : 'bg-white border-[#c3c5d9]/30 text-[#191b25]'
          }`}>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#434656] tracking-wider font-display">Alertas de Stock</span>
              <div className={`text-2xl font-black font-display ${lowStockItems.length > 0 ? 'text-amber-700' : 'text-[#191b25]'}`}>
                {lowStockItems.length}
              </div>
              <div className="text-[10px] font-medium">
                {lowStockItems.length > 0 ? 'Productos agotándose' : 'Todo el stock al día'}
              </div>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              lowStockItems.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-[#434656]'
            }`}>
              <span className="material-symbols-outlined text-xl">inventory_2</span>
            </div>
          </div>
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Performance Line Chart */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-[#c3c5d9]/30 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-display font-bold text-[#191b25] text-sm">Rendimiento de Ventas ($)</h3>
                <p className="text-[10px] text-[#434656]">Ingresos del periodo seleccionado</p>
              </div>
              <span className="text-[10px] font-bold text-[#003ec7] bg-[#003ec7]/10 px-2 py-0.5 rounded-full font-display capitalize">
                {timeFilter === 'day' ? 'Día' : timeFilter === 'week' ? 'Semana' : 'Mes'}
              </span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#737688" fontSize={11} tickLine={false} />
                  <YAxis stroke="#737688" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #c3c5d9' }}
                    labelClassName="font-display font-bold text-xs text-[#191b25]"
                    formatter={(val: number) => [`$${val.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`, 'Ventas']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Ventas" 
                    stroke="#003ec7" 
                    strokeWidth={3} 
                    activeDot={{ r: 6 }} 
                    dot={{ r: 3, stroke: '#003ec7', strokeWidth: 1, fill: '#ffffff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Products Bar Chart */}
          <div className="bg-white p-5 rounded-xl border border-[#c3c5d9]/30 shadow-xs">
            <div className="mb-4">
              <h3 className="font-display font-bold text-[#191b25] text-sm">Productos Más Vendidos</h3>
              <p className="text-[10px] text-[#434656]">Top 5 artículos (últimos 7 días)</p>
            </div>
            <div className="h-64 w-full">
              {topProductsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductsData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" horizontal={false} />
                    <XAxis type="number" stroke="#737688" fontSize={10} hide />
                    <YAxis dataKey="name" type="category" stroke="#191b25" fontSize={10} width={90} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #c3c5d9' }}
                      formatter={(val: number) => [`${val} unidades`, 'Cantidad']}
                    />
                    <Bar dataKey="Cantidad" fill="#003ec7" radius={[0, 4, 4, 0]} barSize={12}>
                      {topProductsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#003ec7' : '#0052ff'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">query_stats</span>
                  <p className="text-xs text-gray-400 font-bold">Sin datos de ventas</p>
                  <p className="text-[10px] text-gray-400 max-w-xs mt-1">Realiza una venta para ver las estadísticas reflejadas aquí.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Layout Grid: Stock Warnings & Leaderboard & Recent Sales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Low Stock Real-Time Alert list */}
          <div className="bg-white p-5 rounded-xl border border-[#c3c5d9]/30 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="font-display font-bold text-[#191b25] text-sm">Alertas de Reposición</h3>
                  <p className="text-[10px] text-[#434656]">Productos con niveles de stock bajo el mínimo</p>
                </div>
                {lowStockItems.length > 0 && (
                  <span className="px-2 py-0.5 text-[9px] bg-amber-100 text-amber-800 rounded-full font-bold animate-pulse font-display">Crítico</span>
                )}
              </div>

              <div className="space-y-3 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {lowStockItems.length > 0 ? (
                  lowStockItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-amber-50/70 border border-amber-100 rounded-lg">
                      <div>
                        <div className="text-xs font-bold text-gray-900 leading-tight">{item.nombre}</div>
                        <div className="text-[10px] text-[#434656] mt-0.5 flex items-center gap-1">
                          <span>Stock: <strong className="text-amber-700">{item.stock} u.</strong></span>
                          <span className="text-gray-300">|</span>
                          <span>Mínimo: {item.stock_minimo || 10} u.</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => onNavigate && onNavigate('Products')}
                        className="bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-[12px]">edit</span>
                        Ver
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <span className="material-symbols-outlined text-3xl text-emerald-500 mb-2">check_circle</span>
                    <p className="text-xs text-[#006c4b] font-bold">¡Inventario Excelente!</p>
                    <p className="text-[10px] text-gray-400 mt-1">Todos los artículos tienen suficiente stock disponible.</p>
                  </div>
                )}
              </div>
            </div>
            {lowStockItems.length > 0 && (
              <button 
                onClick={() => onNavigate && onNavigate('Products')}
                className="mt-4 w-full bg-slate-50 hover:bg-slate-100 border border-gray-200 py-2 rounded-lg text-xs font-bold text-gray-700 font-display transition-colors text-center cursor-pointer"
              >
                Ir a Inventarios Completos
              </button>
            )}
          </div>

          {/* Seller Leaderboard (Performance) */}
          <div className="bg-white p-5 rounded-xl border border-[#c3c5d9]/30 shadow-xs flex flex-col justify-between">
            <div>
              <div className="mb-4">
                <h3 className="font-display font-bold text-[#191b25] text-sm">Productividad del Equipo</h3>
                <p className="text-[10px] text-[#434656]">
                  Ventas por colaborador ({timeFilter === 'day' ? 'Hoy' : timeFilter === 'week' ? 'Semana' : 'Mes'})
                </p>
              </div>

              <div className="space-y-3 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
              {sellerLeaderboard.map((seller, idx) => (
                <div key={seller.name} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-display text-xs font-black ${
                      idx === 0 && seller.amount > 0 ? 'bg-[#dde1ff] text-[#003ec7]' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        {seller.name}
                        {idx === 0 && seller.amount > 0 && (
                          <span className="material-symbols-outlined text-amber-500 text-sm">emoji_events</span>
                        )}
                      </div>
                      <div className="text-[9px] text-[#434656] uppercase">{seller.role} • {seller.count} trans.</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-gray-900">${seller.amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                    <div className="text-[8px] text-[#006c4b] font-bold uppercase">Vendido</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

          {/* Recent Transactions Feed */}
          <div className="bg-white p-5 rounded-xl border border-[#c3c5d9]/30 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="font-display font-bold text-[#191b25] text-sm">Últimas Transacciones</h3>
                  <p className="text-[10px] text-[#434656]">Flujo operativo de ventas recientes</p>
                </div>
                <button 
                  onClick={() => onNavigate && onNavigate('SalesHistory')}
                  className="text-[10px] font-bold text-[#003ec7] hover:underline"
                >
                  Ver todas
                </button>
              </div>

              <div className="space-y-3">
                {recentSales.map((sale: any) => (
                  <div key={sale.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-all border border-transparent hover:border-[#c3c5d9]/20">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-1">
                        <span>#{sale.id.slice(0, 6).toUpperCase()}</span>
                      </div>
                      <div className="text-[10px] text-[#434656] flex items-center gap-1">
                        <span>{sale.cliente?.nombre || sale.manual_name || 'Venta Rápida'}</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <div className="text-xs font-black text-gray-900">${sale.total.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                        <div className="text-[9px] text-gray-400">{new Date(sale.created_at).toLocaleDateString()}</div>
                      </div>
                      <button 
                        onClick={() => onNavigate && onNavigate('SalesHistory')}
                        className="w-7 h-7 bg-slate-50 hover:bg-[#dde1ff] text-[#434656] hover:text-[#003ec7] rounded-lg flex items-center justify-center transition-colors border border-gray-100"
                        title="Ver Detalles"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                      </button>
                    </div>
                  </div>
                ))}
                {recentSales.length === 0 && (
                  <p className="text-xs text-center text-gray-400 mt-4">No hay ventas recientes</p>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Sold Products List Detail Row */}
        <div className="bg-white p-5 rounded-xl border border-[#c3c5d9]/30 shadow-xs mt-6">
          <div className="mb-4">
            <h3 className="font-display font-bold text-[#191b25] text-sm">Listado de Productos Vendidos</h3>
            <p className="text-[10px] text-[#434656]">
              Todos los artículos vendidos durante el periodo ({timeFilter === 'day' ? 'Hoy' : timeFilter === 'week' ? 'Semana' : 'Mes'}). 
              Se han vendido <strong>{soldProductsList.length}</strong> productos diferentes.
            </p>
          </div>
          
          {soldProductsList.length > 0 ? (
            <div className="overflow-x-auto max-h-80 custom-scrollbar border border-[#c3c5d9]/30 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#f8f9fc] text-[10px] uppercase font-bold text-[#434656] sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="p-3 border-b border-[#c3c5d9]/30">Producto</th>
                    <th className="p-3 border-b border-[#c3c5d9]/30 text-center">Cantidad Vendida</th>
                    <th className="p-3 border-b border-[#c3c5d9]/30 text-right">Ingresos Brutos ($)</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-[#c3c5d9]/20">
                  {soldProductsList.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-gray-900">{product.name}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-md font-bold">
                          {product.Cantidad} u.
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-gray-900">
                        ${product.Ingresos.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 text-center bg-slate-50 rounded-lg border border-dashed border-gray-300">
              <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">production_quantity_limits</span>
              <p className="text-xs text-gray-500 font-bold">No hay productos vendidos</p>
              <p className="text-[10px] text-gray-400 mt-1">Intenta seleccionar otro rango de fechas o registrar una nueva venta.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
