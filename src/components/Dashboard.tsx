import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ShoppingCart,
  UserPlus,
  AlertTriangle,
  Percent,
  TrendingUp,
  Users,
  Package,
  CalendarDays,
  Download,
  MoreVertical,
  Filter
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';

interface DashboardProps {
  user: User;
  onNavigate?: (screen: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const { activeCompany, activeMembership } = useCompany();
  const [stats, setStats] = useState({
    totalSales: 0,
    clientCount: 0,
    lowStockCount: 0,
    conversion: '64.2%'
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const isAdmin = activeMembership?.role === 'admin';

  useEffect(() => {
    if (activeCompany) {
      fetchDashboardData();
      fetchTeamMembers();
    }
  }, [activeCompany, selectedUserId, activeMembership]);

  const fetchTeamMembers = async () => {
    if (!activeCompany) return;
    const { data } = await supabase
      .from('company_members')
      .select(`
        user_id,
        role,
        profile:profiles(full_name, email)
      `)
      .eq('company_id', activeCompany.id);

    setTeamMembers(data || []);
  };

  const [teamPerformance, setTeamPerformance] = useState<{ [key: string]: number }>({});

  const fetchDashboardData = async () => {
    if (!activeCompany) return;
    setLoading(true);

    let salesQuery = supabase
      .from('ventas')
      .select('total, user_id')
      .eq('company_id', activeCompany.id);

    if (selectedUserId !== 'all') {
      salesQuery = salesQuery.eq('user_id', selectedUserId);
    }

    const { data: salesData } = await salesQuery;

    const { count: clientCount } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', activeCompany.id);

    const { count: lowStockCount } = await supabase
      .from('productos')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', activeCompany.id)
      .lt('stock', 10);

    const totalSales = salesData?.reduce((acc, curr) => acc + curr.total, 0) || 0;

    // Calculate team performance based on all sales
    const performance: { [key: string]: number } = {};
    salesData?.forEach(sale => {
      if (sale.user_id) {
        performance[sale.user_id] = (performance[sale.user_id] || 0) + sale.total;
      }
    });
    setTeamPerformance(performance);

    setStats({
      totalSales,
      clientCount: clientCount || 0,
      lowStockCount: lowStockCount || 0,
      conversion: '64.2%'
    });

    // 2. Fetch recent activity (recent sales)
    let recentQuery = supabase
      .from('ventas')
      .select(`
        id,
        total, 
        created_at,
        manual_name,
        user_id,
        cliente:clientes(nombre)
      `)
      .eq('company_id', activeCompany.id);

    if (selectedUserId !== 'all') {
      recentQuery = recentQuery.eq('user_id', selectedUserId);
    }

    const { data: recentSales } = await recentQuery
      .order('created_at', { ascending: false })
      .limit(5);

    let salesWithProfiles = recentSales || [];
    if (salesWithProfiles.length > 0) {
      const userIds = [...new Set(salesWithProfiles.map(s => s.user_id).filter(id => id))];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profilesData) {
          salesWithProfiles = salesWithProfiles.map(sale => ({
            ...sale,
            vendedor: profilesData.find(p => p.id === sale.user_id)
          }));
        }
      }
    }

    setRecentActivity(salesWithProfiles);

    // 3. Fetch top clients (simplified for now)
    const { data: clients } = await supabase
      .from('clientes')
      .select('*')
      .eq('company_id', activeCompany.id)
      .limit(3);

    setTopClients(clients || []);

    setLoading(false);
  };

  return (
    <div className="p-10 max-w-[1440px] mx-auto mt-16 bg-surface min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-[32px] leading-tight font-bold text-brand-navy font-display">Dashboard</h2>
          <p className="text-outline text-sm mt-1">Panel de control de {activeCompany?.nombre}</p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-md px-3 py-2">
              <Users className="w-4 h-4 text-outline" />
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="text-xs font-semibold text-brand-navy bg-transparent outline-none cursor-pointer"
              >
                <option value="all">Todo el equipo</option>
                {teamMembers.map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profile?.full_name || m.profile?.email}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-md px-4 py-2.5 text-xs font-semibold text-brand-navy hover:bg-surface-dim/20 transition-all">
            <CalendarDays className="w-4 h-4 text-brand-primary" />
            Últimos 30 días
          </button>
          <button className="flex items-center gap-2 bg-gradient-to-r from-brand-primary to-brand-tertiary text-white rounded-md px-4 py-2.5 text-xs font-medium hover:shadow-lg hover:shadow-brand-primary/20 transition-all">
            <Download className="w-4 h-4" />
            Reporte
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Ventas Totales', value: `$${stats.totalSales.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'brand-secondary', bg: 'bg-brand-secondary/10', text: 'text-brand-secondary', trend: '+12.5%' },
          { label: 'Clientes Nuevos', value: stats.clientCount, icon: UserPlus, color: 'brand-primary', bg: 'bg-brand-primary/10', text: 'text-brand-primary', trend: '+4' },
          { label: 'Stock Bajo', value: stats.lowStockCount, icon: AlertTriangle, color: 'rose-500', bg: 'bg-rose-50', text: 'text-rose-500', trend: 'Crítico' },
          { label: 'Conversión', value: stats.conversion, icon: Percent, color: 'brand-tertiary', bg: 'bg-brand-tertiary/10', text: 'text-brand-tertiary', trend: '+2.1%' },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="bg-white p-4 rounded-lg border border-[#E2E8F0] hover:ambient-shadow hover:border-l-4 hover:border-l-brand-primary transition-all duration-300 group flex flex-col justify-between"
            style={{ borderLeftWidth: '1px' }} // Initially 1px to avoid layout jump
            onMouseEnter={(e) => { e.currentTarget.style.borderLeftWidth = '4px'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderLeftWidth = '1px'; }}
          >
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2.5 rounded-md ${stat.bg} ${stat.text} group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className={`font-mono text-[11px] font-medium px-2 py-1 rounded bg-surface-dim/30 ${stat.text}`}>
                {stat.trend}
              </span>
            </div>
            <div>
              <p className="text-outline text-xs font-semibold uppercase tracking-wider mb-1">{stat.label}</p>
              <h3 className="text-[24px] font-bold text-brand-navy font-mono leading-none">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-white">
            <div>
              <h4 className="font-semibold text-brand-navy font-display text-lg">Actividad Reciente</h4>
              <p className="text-xs text-outline">Últimas transacciones realizadas</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] font-medium text-outline uppercase tracking-wider border-b border-[#E2E8F0] bg-surface-bright">
                  <th className="px-4 py-3 font-mono">ID Venta</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Vendedor</th>
                  <th className="px-4 py-3 font-mono text-right">Total</th>
                  <th className="px-4 py-3 font-mono">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[14px]">
                {recentActivity.map((sale, idx) => {
                  const sellerName = sale.vendedor?.full_name || 'Admin';
                  const sellerInitials = sale.vendedor?.full_name?.[0] || sale.vendedor?.email?.[0] || '?';
                  const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-brand-primary/[0.02]';
                  return (
                    <tr key={sale.id} className={`${rowBg} hover:bg-brand-primary/[0.04] transition-colors`}>
                      <td className="px-4 py-3 font-mono text-[13px] text-brand-navy">#{sale.id.slice(0, 6).toUpperCase()}</td>
                      <td className="px-4 py-3 font-medium text-brand-navy">
                        {sale.cliente?.nombre || (
                          <div className="flex flex-col">
                            <span>{sale.manual_name || 'Venta Rápida'}</span>
                            <span className="text-[11px] font-mono text-outline">Invitado</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-surface-dim/30 flex items-center justify-center text-[11px] font-bold text-brand-navy uppercase">
                            {sellerInitials}
                          </div>
                          <span className="text-[13px] text-brand-navy">
                            {sellerName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[13px] font-medium text-brand-navy text-right">${sale.total.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-outline font-mono text-[13px]">{new Date(sale.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
                {recentActivity.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-outline text-sm">No hay ventas registradas para este filtro.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center">
              <h4 className="font-semibold text-brand-navy font-display text-lg">Rendimiento</h4>
              <TrendingUp className="w-4 h-4 text-brand-secondary" />
            </div>
            <div className="p-4 space-y-4">
              {teamMembers.length > 0 ? (
                teamMembers.map((member, idx) => {
                  const total = teamPerformance[member.user_id] || 0;

                  return (
                    <div key={member.user_id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded bg-surface-dim/30 border border-brand-primary/10 flex items-center justify-center text-brand-navy font-bold uppercase text-[14px]">
                            {member.profile?.full_name?.[0] || member.profile?.email?.[0]}
                          </div>
                          {idx === 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-secondary rounded border-2 border-white flex items-center justify-center text-[8px] text-brand-navy">★</div>}
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-brand-navy">{member.profile?.full_name || 'Miembro'}</p>
                          <p className="font-mono text-[11px] text-outline uppercase">{member.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] font-medium text-brand-navy font-mono">${total.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                        <p className="font-mono text-[10px] text-brand-secondary uppercase">Ventas</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-outline py-4 text-sm">No hay miembros registrados.</p>
              )}
            </div>
          </div>

          <div className="bg-brand-navy text-white rounded-lg p-5 relative overflow-hidden flex flex-col justify-between h-[180px]">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="text-brand-secondary w-4 h-4" />
                <h4 className="font-display font-semibold text-lg">Alertas Críticas</h4>
              </div>
              <p className="text-white/70 text-[13px] leading-relaxed">
                Tienes <span className="font-mono font-medium text-brand-secondary">{stats.lowStockCount}</span> productos con stock crítico. Revisa el inventario para evitar quiebres.
              </p>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('Products')}
              className="relative z-10 w-full py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-md font-medium text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Gestionar Stock
            </button>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-primary/30 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
