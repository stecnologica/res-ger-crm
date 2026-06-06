import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  TableProperties, 
  TrendingUp, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  ChevronRight, 
  Search, 
  CalendarDays,
  MoreVertical,
  ChevronLeft,
  ArrowRight,
  Loader2,
  Eye,
  Wallet,
  Receipt,
  ShoppingCart,
  DollarSign as MoneyIcon,
  X,
  Printer,
  Truck,
  Phone,
  MapPin,
  Mail
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Sale } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useCompany } from '../context/CompanyContext';

interface SalesHistoryProps { user?: any }

export const SalesHistory: React.FC<SalesHistoryProps> = () => {
  const { activeCompany, activeMembership } = useCompany();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [closureData, setClosureData] = useState<any>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [closures, setClosures] = useState<any[]>([]);
  const [loadingClosures, setLoadingClosures] = useState(false);
  const [selectedClosure, setSelectedClosure] = useState<any>(null);
  const [showClosureDetailModal, setShowClosureDetailModal] = useState(false);
  const [closureSales, setClosureSales] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSalesCount, setTotalSalesCount] = useState(0);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (activeCompany) {
      fetchSales();
    }
  }, [activeCompany, dateFilter, currentPage]);

  useEffect(() => {
    if (activeCompany) {
      fetchClosures();
    }
  }, [activeCompany]);

  const fetchClosures = async () => {
    if (!activeCompany) return;
    setLoadingClosures(true);
    
    let query = supabase
      .from('cierres_caja')
      .select('*')
      .eq('company_id', activeCompany.id)
      .order('created_at', { ascending: false });

    if (dateFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte('created_at', today.toISOString());
    } else {
      query = query.limit(10);
    }

    const { data: closuresData, error } = await query;

    if (error) {
      console.error('Error fetching closures:', error);
      setLoadingClosures(false);
      return;
    }

    if (closuresData && closuresData.length > 0) {
      // Get unique user IDs
      const userIds = [...new Set(closuresData.map(c => c.user_id).filter(id => id))];
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
          
        if (profilesData) {
          const mergedClosures = closuresData.map(c => ({
            ...c,
            user: profilesData.find(p => p.id === c.user_id)
          }));
          setClosures(mergedClosures);
        } else {
          setClosures(closuresData);
        }
      } else {
        setClosures(closuresData);
      }
    } else {
      setClosures([]);
    }
    setLoadingClosures(false);
  };

  const fetchSales = async () => {
    if (!activeCompany) return;
    setLoading(true);
    
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    let query = supabase
      .from('ventas')
      .select(`
        *,
        cliente:clientes(*)
      `, { count: 'exact' })
      .eq('company_id', activeCompany.id)
      .order('created_at', { ascending: false });

    if (dateFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte('created_at', today.toISOString());
    }

    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching sales:', error);
    } else {
      let salesData = data || [];
      if (salesData.length > 0) {
        const userIds = [...new Set(salesData.map((s: any) => s.user_id).filter((id: string) => id))];
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);
            
          if (profilesData) {
            salesData = salesData.map((sale: any) => ({
              ...sale,
              vendedor: profilesData.find(p => p.id === sale.user_id)
            }));
          }
        }
      }
      setSales(salesData);
      if (count !== null) setTotalSalesCount(count);
    }
    setLoading(false);
  };

  const fetchSaleItems = async (saleId: string) => {
    setLoadingItems(true);
    const { data, error } = await supabase
      .from('venta_items')
      .select(`
        *,
        producto:productos(nombre, imagen_url)
      `)
      .eq('venta_id', saleId);

    if (error) {
      console.error('Error fetching sale items:', error);
    } else {
      setSaleItems(data || []);
    }
    setLoadingItems(false);
  };

  const handleViewDetail = (sale: any) => {
    setSelectedSale(sale);
    fetchSaleItems(sale.id);
    setShowDetailModal(true);
  };

  const prepareClosure = async () => {
    if (!activeCompany) return;
    setLoading(true);
    
    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData.user?.id;
    const isAdmin = activeMembership?.role === 'admin';

    // Get admins to identify general closures
    const { data: admins } = await supabase
      .from('company_members')
      .select('user_id')
      .eq('company_id', activeCompany.id)
      .eq('role', 'admin');
    const adminUserIds = admins?.map(a => a.user_id).filter(id => id) || [];

    // Find the relevant last closure time
    let lastClosureQuery = supabase
      .from('cierres_caja')
      .select('periodo_fin, user_id')
      .eq('company_id', activeCompany.id)
      .order('periodo_fin', { ascending: false });

    if (!isAdmin && currentUserId) {
      if (adminUserIds.length > 0) {
        lastClosureQuery = lastClosureQuery.or(`user_id.eq.${currentUserId},user_id.in.(${adminUserIds.join(',')})`);
      } else {
        lastClosureQuery = lastClosureQuery.eq('user_id', currentUserId);
      }
    } else {
      if (adminUserIds.length > 0) {
        lastClosureQuery = lastClosureQuery.in('user_id', adminUserIds);
      }
    }

    const { data: lastClosures } = await lastClosureQuery.limit(1);
    const startTime = lastClosures?.[0]?.periodo_fin || '2000-01-01T00:00:00Z';
    const endTime = new Date().toISOString();

    // Get sales in this period
    let salesQuery = supabase
      .from('ventas')
      .select('total')
      .eq('company_id', activeCompany.id)
      .gt('created_at', startTime)
      .lte('created_at', endTime);

    if (!isAdmin && currentUserId) {
      salesQuery = salesQuery.eq('user_id', currentUserId);
    }

    const { data: recentSales, error } = await salesQuery;

    if (error) {
      console.error('Error preparing closure:', error);
      alert('Error al preparar el cierre');
    } else {
      const total = recentSales?.reduce((acc, s) => acc + s.total, 0) || 0;
      setClosureData({
        total,
        count: recentSales?.length || 0,
        start: startTime,
        end: endTime,
        type: isAdmin ? 'Cierre General' : 'Cierre de Turno'
      });
      setShowClosureModal(true);
    }
    setLoading(false);
  };

  const handlePerformClosure = async () => {
    if (!activeCompany || !closureData) return;
    setIsClosing(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    const userEmail = userData.user?.email;
    const isAdmin = activeMembership?.role === 'admin';

    const { error } = await supabase
      .from('cierres_caja')
      .insert({
        company_id: activeCompany.id,
        user_id: userId,
        total_ventas: closureData.total,
        conteo_ventas: closureData.count,
        periodo_inicio: closureData.start,
        periodo_fin: closureData.end,
        notas: `${closureData.type} realizado el ${new Date().toLocaleString()}`
      });

    if (error) {
      console.error('Error performing closure:', error);
      alert('Error al guardar el cierre en la base de datos');
    } else {
      // 1. Fetch detailed sales for the report
      let fullSalesQuery = supabase
        .from('ventas')
        .select(`*, cliente:clientes(nombre)`)
        .eq('company_id', activeCompany.id)
        .gt('created_at', closureData.start)
        .lte('created_at', closureData.end)
        .order('created_at', { ascending: true });
        
      if (!isAdmin && userId) {
        fullSalesQuery = fullSalesQuery.eq('user_id', userId);
      }

      const { data: fullSalesData } = await fullSalesQuery;

      // 2. Generate PDF
      try {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.text(`${closureData.type} - ${activeCompany.nombre}`, 14, 22);
        
        doc.setFontSize(10);
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Generado por: ${userEmail || 'Usuario'}`, 14, 35);
        
        // Summary block
        doc.setDrawColor(200);
        doc.setFillColor(248, 250, 252);
        doc.rect(14, 45, 182, 30, 'FD');
        
        doc.setFontSize(12);
        doc.text(`Periodo: ${new Date(closureData.start).toLocaleDateString()} a ${new Date(closureData.end).toLocaleDateString()}`, 20, 53);
        doc.text(`Total Ventas: ${closureData.count}`, 20, 61);
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Recaudado: $${closureData.total.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 20, 69);
        doc.setFont('helvetica', 'normal');

        // Tables
        if (fullSalesData && fullSalesData.length > 0) {
          if (isAdmin) {
            // Group by employee
            const { data: profilesData } = await supabase.from('profiles').select('id, full_name, email');
            
            const salesByUser = fullSalesData.reduce((acc: any, sale) => {
              const uid = sale.user_id || 'unknown';
              if (!acc[uid]) acc[uid] = [];
              acc[uid].push(sale);
              return acc;
            }, {});
            
            let currentY = 85;
            
            Object.keys(salesByUser).forEach((uid) => {
               const userSales = salesByUser[uid];
               const profile = profilesData?.find(p => p.id === uid);
               const userName = profile ? (profile.full_name || profile.email) : 'Usuario Desconocido';
               const userTotal = userSales.reduce((sum: number, s: any) => sum + s.total, 0);
               
               if (currentY > 250) { doc.addPage(); currentY = 20; }
               
               doc.setFontSize(12);
               doc.setFont('helvetica', 'bold');
               doc.text(`Empleado: ${userName} - Subtotal: $${userTotal.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 14, currentY);
               doc.setFont('helvetica', 'normal');
               
               autoTable(doc, {
                  startY: currentY + 5,
                  head: [['ID Venta', 'Fecha', 'Cliente', 'Monto']],
                  body: userSales.map((sale: any) => [
                    `#${sale.id.slice(0, 8).toUpperCase()}`,
                    new Date(sale.created_at).toLocaleString(),
                    sale.cliente?.nombre || sale.manual_name || 'Venta Rápida',
                    `$${sale.total.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                  ]),
                  theme: 'striped',
                  headStyles: { fillColor: [9, 20, 38] }
               });
               currentY = (doc as any).lastAutoTable.finalY + 15;
            });
          } else {
            // Single table for employee
            autoTable(doc, {
              startY: 85,
              head: [['ID Venta', 'Fecha', 'Cliente', 'Monto']],
              body: fullSalesData.map(sale => [
                `#${sale.id.slice(0, 8).toUpperCase()}`,
                new Date(sale.created_at).toLocaleString(),
                sale.cliente?.nombre || sale.manual_name || 'Venta Rápida',
                `$${sale.total.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              ]),
              theme: 'striped',
              headStyles: { fillColor: [9, 20, 38] }
            });
          }
        } else {
          doc.text('No hay ventas registradas en este periodo.', 14, 90);
        }

        // Footer
        const pageCount = (doc.internal as any).getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.text(`Página ${i} de ${pageCount} - RESGER CRM`, 14, (doc.internal as any).pageSize.height - 10);
        }

        // Save PDF
        const fileName = `${closureData.type.replace(/\s+/g, '_')}_${activeCompany.nombre.replace(/\s+/g, '_')}_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
        doc.save(fileName);
        
        alert('Cierre realizado con éxito. El documento PDF se ha descargado.');
      } catch (err) {
        console.error('Failed to generate PDF:', err);
        alert('Cierre registrado, pero hubo un error al generar el PDF.');
      }

      setShowClosureModal(false);
      fetchClosures(); // Refresh list
    }
    setIsClosing(false);
  };

  const handleViewClosureDetails = async (closure: any) => {
    setSelectedClosure(closure);
    setShowClosureDetailModal(true);
    
    // Fetch sales that belong to this closure period
    const { data, error } = await supabase
      .from('ventas')
      .select(`
        *,
        cliente:clientes(nombre)
      `)
      .eq('company_id', activeCompany?.id)
      .gt('created_at', closure.periodo_inicio)
      .lte('created_at', closure.periodo_fin);

    if (error) {
      console.error('Error fetching closure sales:', error);
    } else {
      setClosureSales(data || []);
    }
  };

  const totalSales = sales.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <>
    <div className="p-8 max-w-[1440px] mx-auto mt-16">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#091426] tracking-tight">Historial de Ventas</h2>
          <p className="text-slate-500 font-medium mt-1">Revisa y gestiona todas las transacciones históricas y facturación.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-slate-200/50 p-1 rounded-xl flex">
            <button 
              onClick={() => { setDateFilter('today'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${dateFilter === 'today' ? 'bg-white text-[#091426] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Hoy
            </button>
            <button 
              onClick={() => { setDateFilter('all'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${dateFilter === 'all' ? 'bg-white text-[#091426] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Todas
            </button>
          </div>
          <button 
            onClick={prepareClosure}
            className="px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-tertiary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            Cierre de Caja
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Ventas', val: `$${totalSales.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, trend: 'Histórico total', icon: TrendingUp, color: 'text-emerald-600' },
          { label: 'Ticket Promedio', val: `$${sales.length ? (totalSales / sales.length).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}`, trend: 'Por transacción', icon: History, color: 'text-blue-600' },
          { label: 'Ventas Realizadas', val: sales.length.toString(), trend: 'Transacciones totales', icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Conversión', val: '64.2%', trend: '+4.1% eficiencia', icon: CheckCircle2, color: 'text-emerald-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md cursor-default">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl font-black text-[#091426] mt-2 mb-1">{stat.val}</h3>
            <div className={`flex items-center gap-1.5 ${stat.color} font-black text-[9px] uppercase tracking-widest`}>
              <stat.icon size={10} />
              <span>{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-10">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 flex justify-center items-center">
              <Loader2 className="w-8 h-8 text-[#091426] animate-spin" />
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {['ID Venta', 'Cliente', 'Vendedor', 'Fecha', 'Total', 'Acciones'].map(h => (
                    <th key={h} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm italic">
                      No se encontraron ventas registradas.
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs font-black text-[#091426] tracking-tighter">#{sale.id.slice(0,8).toUpperCase()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-[#091426] border border-slate-200 uppercase tracking-tighter">
                            {sale.cliente?.nombre.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#091426] tracking-tight">{sale.cliente?.nombre || sale.manual_name || 'Venta Rápida'}</p>
                            <p className="text-[10px] text-slate-400 font-mono italic">{sale.cliente?.email || 'Sin correo'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase">
                            {sale.vendedor?.full_name?.[0] || sale.vendedor?.email?.[0] || '?'}
                          </div>
                          <span className="text-xs font-medium text-slate-600">
                            {sale.vendedor?.full_name || 'Admin'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-600 tracking-tight">{new Date(sale.created_at).toLocaleDateString()}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-6 py-4 font-mono font-black text-sm text-[#091426] tracking-tighter">${sale.total.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleViewDetail(sale)}
                          className="flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:text-[#091426] hover:bg-slate-100 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Detalle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
            Mostrando {sales.length} de {totalSalesCount} transacciones
          </p>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-white hover:text-[#091426] transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-1.5">
              <button className="w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-black bg-brand-primary text-white shadow-xl shadow-brand-primary/20">
                {currentPage}
              </button>
            </div>
            <button 
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage * ITEMS_PER_PAGE >= totalSalesCount}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-white hover:text-[#091426] transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-brand-navy p-8 rounded-2xl text-white flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <h4 className="text-xl font-black uppercase tracking-tight mb-2">Need detailed analysis?</h4>
            <p className="text-sm opacity-60 font-medium max-w-md">Generate a custom BI report with historical forecasting, deep client segmentation and churn analysis.</p>
            <button className="mt-6 px-8 py-3 bg-white text-[#091426] rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-2">
              Go to Analytics
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/5 rounded-full blur-[100px] group-hover:scale-125 transition-transform duration-700"></div>
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-10 right-10 opacity-10"
          >
            <History size={120} />
          </motion.div>
        </div>
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6 group">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 shadow-inner">
              <Wallet className="w-6 h-6 text-[#091426]" />
            </div>
            <div>
              <h4 className="font-black text-[#091426] uppercase tracking-wide text-lg">Historial de Cierres</h4>
              <p className="text-sm text-slate-500 font-medium">
                {dateFilter === 'today' ? 'Arqueos de hoy.' : 'Últimos 10 arqueos.'}
              </p>
            </div>
          </div>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {loadingClosures ? (
              <div className="py-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-slate-300" /></div>
            ) : closures.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4 font-medium border-2 border-dashed border-slate-50 rounded-xl">No hay cierres registrados aún.</p>
            ) : (
              closures.map((c) => (
                <button 
                  key={c.id}
                  onClick={() => handleViewClosureDetails(c)}
                  className="w-full p-4 bg-slate-50 hover:bg-brand-navy hover:text-white rounded-2xl border border-slate-100 transition-all flex items-center justify-between group/item"
                >
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{new Date(c.created_at).toLocaleDateString()}</p>
                    <p className="text-xs font-bold mt-0.5">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1">Por: {c.user?.full_name || 'Usuario'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black tracking-tight">${c.total_ventas.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-50">{c.conteo_ventas} ventas</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Sale Detail Modal */}
      {showDetailModal && selectedSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setShowDetailModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-[800px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#091426]" />
                <h3 className="font-black text-[#091426] uppercase tracking-widest text-sm">Detalle de Factura</h3>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="invoice-content" className="flex-1 overflow-y-auto p-10 bg-white">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <h2 className="text-3xl font-black text-[#091426]">{activeCompany?.nombre || 'RESGER CRM'}</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Factura Proforma / Historial</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-[#091426]">#{selectedSale.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-slate-500 font-medium">{new Date(selectedSale.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {/* Detalles de Entrega / Cliente */}
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="w-5 h-5 text-[#091426]" />
                    <h4 className="text-[10px] font-black text-[#091426] uppercase tracking-widest">Datos de Entrega / Cliente</h4>
                  </div>
                  <p className="text-xl font-black text-[#091426] mb-2">{selectedSale.cliente?.nombre || selectedSale.manual_name || 'Venta Rápida'}</p>
                  
                  {(selectedSale.cliente?.direccion || selectedSale.manual_address) && (
                    <p className="text-sm font-bold text-slate-700 flex items-start gap-3 mt-3">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <span className="leading-tight">{selectedSale.cliente?.direccion || selectedSale.manual_address}</span>
                    </p>
                  )}
                  
                  {(selectedSale.cliente?.telefono || selectedSale.manual_phone) && (
                    <p className="text-sm font-bold text-slate-700 flex items-center gap-3 mt-3">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      {selectedSale.cliente?.telefono || selectedSale.manual_phone}
                    </p>
                  )}
                  
                  {selectedSale.cliente?.email && (
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-3 mt-3">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      {selectedSale.cliente?.email}
                    </p>
                  )}
                </div>

                <div className="flex flex-col justify-between">
                  <div className="text-right">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Vendedor:</h4>
                    <div className="flex flex-col items-end gap-1">
                      <span className="px-4 py-2 bg-slate-100 text-[#091426] text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200">
                        {selectedSale.vendedor?.full_name || 'Administrador'}
                      </span>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Transacción Completada</p>
                    </div>
                  </div>

                  {/* Observaciones destacadas para el domiciliario */}
                  {selectedSale.notas && (
                    <div className="mt-6 p-5 bg-amber-50 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Observaciones de Entrega</h4>
                      </div>
                      <p className="text-sm text-amber-900 font-bold italic leading-relaxed">{selectedSale.notas}</p>
                    </div>
                  )}
                </div>
              </div>

              <table className="w-full mb-12 border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Descripción</th>
                    <th className="py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Cant.</th>
                    <th className="py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Precio</th>
                    <th className="py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingItems ? (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
                  ) : saleItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-4">
                        <p className="text-sm font-bold text-[#091426]">{item.producto?.nombre || 'Producto'}</p>
                      </td>
                      <td className="py-4 text-center text-sm font-bold text-slate-600">{item.cantidad}</td>
                      <td className="py-4 text-right text-sm font-mono text-slate-600">${item.precio_unitario.toLocaleString('es-CO')}</td>
                      <td className="py-4 text-right text-sm font-mono font-bold text-[#091426]">${(item.precio_unitario * item.cantidad).toLocaleString('es-CO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end pt-8 border-t border-slate-200">
                <div className="w-full max-w-[240px] space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-bold uppercase tracking-widest">Subtotal</span>
                    <span className="font-mono font-black text-[#091426]">${(selectedSale.total / 1.19).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-bold uppercase tracking-widest">IVA (19%)</span>
                    <span className="font-mono font-black text-[#091426]">${(selectedSale.total - (selectedSale.total / 1.19)).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t-2 border-slate-900">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Total Pago</span>
                    <span className="text-xl font-black text-[#091426] font-mono tracking-tight">${selectedSale.total.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>

              <div className="mt-16 pt-8 border-t border-slate-100">
                <p className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-[0.2em] leading-relaxed">
                  Historial generado en RESGER CRM. Este documento no reemplaza una factura electrónica DIAN.
                </p>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => {
                  const printContent = document.getElementById('invoice-content');
                  if (printContent) {
                    const originalContents = document.body.innerHTML;
                    document.body.innerHTML = printContent.innerHTML;
                    window.print();
                    document.body.innerHTML = originalContents;
                    window.location.reload();
                  }
                }}
                className="flex items-center gap-2 px-8 py-3 bg-[#091426] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl hover:shadow-[#091426]/20 transition-all"
              >
                <Printer className="w-4 h-4" />
                Imprimir Recibo
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Cash Closure Modal */}
      {showClosureModal && closureData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#091426]/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-8 text-center border-b border-slate-100">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Wallet className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-[#091426]">{closureData.type}</h3>
              <p className="text-slate-500 text-sm font-medium mt-2">Resumen de ventas pendientes de cierre.</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Ventas</p>
                  <p className="text-xl font-black text-[#091426]">{closureData.count}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total</p>
                  <p className="text-xl font-black text-emerald-600">${closureData.total.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Desde:</span>
                  <span className="text-[#091426]">{new Date(closureData.start).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Hasta:</span>
                  <span className="text-[#091426]">{new Date(closureData.end).toLocaleString()}</span>
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                  Al confirmar, estas ventas se marcarán como parte de este cierre y se generará un registro histórico.
                </p>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
              <button 
                onClick={handlePerformClosure}
                disabled={isClosing || closureData.count === 0}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
              >
                {isClosing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirmar {closureData.type}
              </button>
              <button 
                onClick={() => setShowClosureModal(false)}
                className="w-full py-4 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-slate-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Closure Detail Modal */}
      {showClosureDetailModal && selectedClosure && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#091426]/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-[#091426]">Detalle de Cierre</h3>
                <p className="text-slate-500 text-sm font-medium mt-1">
                  Arqueo realizado el {new Date(selectedClosure.created_at).toLocaleString()}
                </p>
              </div>
              <button 
                onClick={() => setShowClosureDetailModal(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-[#091426]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Recaudado</p>
                  <p className="text-xl font-black text-[#091426]">${selectedClosure.total_ventas.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Ventas Totales</p>
                  <p className="text-xl font-black text-[#091426]">{selectedClosure.conteo_ventas}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Periodo</p>
                  <p className="text-[10px] font-bold text-[#091426] leading-tight">
                    {new Date(selectedClosure.periodo_inicio).toLocaleDateString()} - <br/>
                    {new Date(selectedClosure.periodo_fin).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Receipt className="w-3 h-3" /> Transacciones Incluidas
                </h4>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase">ID Venta</th>
                        <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase">Cliente</th>
                        <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {closureSales.map((sale) => (
                        <tr key={sale.id}>
                          <td className="px-6 py-4 text-[10px] font-mono font-bold text-[#091426]">#{sale.id.slice(0,8).toUpperCase()}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-600">{sale.cliente?.nombre || sale.manual_name || 'General'}</td>
                          <td className="px-6 py-4 text-xs font-mono font-black text-right">${sale.total.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowClosureDetailModal(false)}
                className="px-8 py-3 bg-[#091426] text-white rounded-xl font-black text-xs uppercase tracking-widest"
              >
                Cerrar Vista
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};
