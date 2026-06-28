import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';
import {
  User,
  Shield,
  UserPlus,
  Trash2,
  Mail,
  Search,
  ShieldCheck,
  Loader2,
  History,
  Trophy,
  Star,
  Users,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Session } from '@supabase/supabase-js';
import { formatCOP } from '../lib/formatCurrency';

interface UserManagementProps {
  session: Session | null;
}

interface MemberWithSales {
  id: string;
  user_id: string;
  role: 'admin' | 'employee';
  created_at: string;
  salario: number;
  profile: {
    id: string;
    email: string;
    full_name: string;
  };
  totalSales: number;
  active: boolean;
}

export const UserManagement: React.FC<UserManagementProps> = ({ session }) => {
  const { activeCompany, activeMembership } = useCompany();
  const [members, setMembers] = useState<MemberWithSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [inviting, setInviting] = useState(false);
  const [activeTab, setActiveTab] = useState<'colaboradores' | 'invitar'>('colaboradores');
  const [editingSalary, setEditingSalary] = useState<string | null>(null);
  const [salaryInput, setSalaryInput] = useState('');
  const [savingSalary, setSavingSalary] = useState(false);

  const isAdmin = activeMembership?.role === 'admin';

  const saveSalary = async (memberId: string, userId: string, value: number) => {
    setSavingSalary(true);
    const { error } = await supabase
      .from('company_members')
      .update({ salario: value })
      .eq('id', memberId);

    if (!error) {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, salario: value } : m));
    }
    setEditingSalary(null);
    setSalaryInput('');
    setSavingSalary(false);
  };

  const startEditSalary = (userId: string, currentSalary: number) => {
    setEditingSalary(userId);
    setSalaryInput(currentSalary > 0 ? currentSalary.toString() : '');
  };

  useEffect(() => {
    if (activeCompany) {
      fetchMembersWithSales();
      fetchInvitations();
    }
  }, [activeCompany]);

  const fetchMembersWithSales = async () => {
    if (!activeCompany) return;
    setLoading(true);

    // Fetch members with salario
    const { data: membersData, error: membersError } = await supabase
      .from('company_members')
      .select('id, role, created_at, user_id, salario')
      .eq('company_id', activeCompany.id);

    if (membersError || !membersData || membersData.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }

    // Fetch profiles
    const userIds = membersData.map((m) => m.user_id);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    // Fetch sales per user in this company
    const { data: salesData } = await supabase
      .from('ventas')
      .select('user_id, total')
      .eq('company_id', activeCompany.id);

    // Aggregate sales by user
    const salesByUser: Record<string, number> = {};
    (salesData || []).forEach((sale: any) => {
      salesByUser[sale.user_id] = (salesByUser[sale.user_id] || 0) + (sale.total || 0);
    });

    const merged: MemberWithSales[] = membersData.map((member) => ({
      ...member,
      role: member.role as 'admin' | 'employee',
      salario: Number(member.salario || 0),
      profile: profilesData?.find((p) => p.id === member.user_id) || {
        id: member.user_id,
        email: 'desconocido@resger.com',
        full_name: 'Usuario',
      },
      totalSales: salesByUser[member.user_id] || 0,
      active: true,
    }));

    setMembers(merged);
    setLoading(false);
  };

  const fetchInvitations = async () => {
    if (!activeCompany) return;
    const { data, error } = await supabase
      .from('company_invitations')
      .select('*')
      .eq('company_id', activeCompany.id);
    if (!error) setInvitations(data || []);
  };

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail) return;
    setSearching(true);
    setError(null);
    setSearchResult(null);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', searchEmail.toLowerCase().trim())
      .single();

    if (error) {
      setSearchResult({ email: searchEmail.toLowerCase().trim(), isNew: true });
    } else {
      const isAlreadyMember = members.some((m) => m.user_id === data.id);
      const isAlreadyInvited = invitations.some((i) => i.email === data.email);

      if (isAlreadyMember) {
        setError('Este usuario ya es miembro de tu empresa.');
      } else if (isAlreadyInvited) {
        setError('Este usuario ya tiene una invitación pendiente.');
      } else {
        setSearchResult(data);
      }
    }
    setSearching(false);
  };

  const handleAddMember = async () => {
    if (!searchResult || !activeCompany) return;

    if (searchResult.isNew) {
      setInviting(true);
      const { error } = await supabase.from('company_invitations').insert([
        {
          company_id: activeCompany.id,
          email: searchResult.email,
          role: 'employee',
          invited_by: session?.user.id,
        },
      ]);
      if (error) {
        alert('Error al enviar invitación');
      } else {
        setSearchResult(null);
        setSearchEmail('');
        fetchInvitations();
      }
      setInviting(false);
    } else {
      const { error } = await supabase.from('company_members').insert([
        {
          company_id: activeCompany.id,
          user_id: searchResult.id,
          role: 'employee',
        },
      ]);
      if (error) {
        alert('Error al agregar miembro');
      } else {
        setSearchResult(null);
        setSearchEmail('');
        fetchMembersWithSales();
      }
    }
  };

  const handleCancelInvitation = async (id: string) => {
    const { error } = await supabase.from('company_invitations').delete().eq('id', id);
    if (!error) fetchInvitations();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar a este miembro?')) return;
    const { error } = await supabase.from('company_members').delete().eq('id', memberId);
    if (error) {
      alert('Error al eliminar miembro');
    } else {
      fetchMembersWithSales();
    }
  };

  // ── Access guard: solo admin ──
  if (!activeMembership || activeMembership.role !== 'admin') {
    return (
      <div className="p-8 mt-16 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center max-w-sm">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso Restringido</h2>
          <p className="text-slate-500 text-sm">
            Solo los administradores pueden ver y gestionar el equipo de colaboradores.
          </p>
        </div>
      </div>
    );
  }

  // Leaderboard: sort by sales descending
  const leaderboard = [...members].sort((a, b) => b.totalSales - a.totalSales);
  const totalSalesAll = members.reduce((acc, m) => acc + m.totalSales, 0);
  const totalPayroll = members.reduce((acc, m) => acc + (m.salario || 0), 0);

  return (
    <div className="p-6 lg:p-8 max-w-[1440px] mx-auto mt-16 space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#091426] tracking-tight">
            Colaboradores y Productividad
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Gestión del equipo, accesos y ranking de ventas de{' '}
            <span className="font-semibold text-[#091426]">{activeCompany?.nombre}</span>.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveTab('colaboradores')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'colaboradores'
                ? 'bg-white text-[#091426] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Nómina
            </span>
          </button>
          <button
            onClick={() => setActiveTab('invitar')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'invitar'
                ? 'bg-white text-[#091426] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              Invitar
            </span>
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Colaboradores',
            value: members.length,
            icon: <Users className="w-5 h-5 text-indigo-500" />,
            color: 'bg-indigo-50',
          },
          {
            label: 'Nómina Total',
            value: formatCOP(totalPayroll),
            icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
            color: 'bg-emerald-50',
          },
          {
            label: 'Administradores',
            value: members.filter((m) => m.role === 'admin').length,
            icon: <ShieldCheck className="w-5 h-5 text-violet-500" />,
            color: 'bg-violet-50',
          },
          {
            label: 'Invitaciones Pendientes',
            value: invitations.length,
            icon: <History className="w-5 h-5 text-amber-500" />,
            color: 'bg-amber-50',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4"
          >
            <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center shrink-0`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-black text-[#091426] mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'colaboradores' ? (
          <motion.div
            key="colaboradores"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
          >
            {/* ── Team Table ── */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-[#091426] text-sm">Nómina del Local</h3>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md">
                  {members.length} miembros
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50">
                      <th className="px-5 py-3.5">Colaborador</th>
                      <th className="px-5 py-3.5">Rol</th>
                      <th className="px-5 py-3.5 text-right">Ventas Totales</th>
                      <th className="px-5 py-3.5 text-right">Salario Mensual</th>
                      <th className="px-5 py-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-16 text-center">
                          <Loader2 className="w-7 h-7 text-indigo-500 animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : members.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">
                          No hay colaboradores registrados.
                        </td>
                      </tr>
                    ) : (
                      members.map((member) => (
                        <tr
                          key={member.id}
                          className="hover:bg-slate-50/60 transition-colors group"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-black text-xs uppercase shrink-0">
                                {(member.profile.full_name || member.profile.email)
                                  .split(' ')
                                  .map((n: string) => n[0])
                                  .join('')
                                  .substring(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">
                                  {member.profile.full_name || 'Sin nombre'}
                                  {member.user_id === session?.user.id && (
                                    <span className="ml-1.5 text-[9px] font-black text-indigo-500 uppercase tracking-wider">
                                      (Tú)
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {member.profile.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tight ${
                                member.role === 'admin'
                                  ? 'bg-indigo-50 text-indigo-600'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {member.role === 'admin' ? (
                                <ShieldCheck className="w-3 h-3" />
                              ) : (
                                <User className="w-3 h-3" />
                              )}
                              {member.role === 'admin' ? 'Administrador' : 'Empleado'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-black text-slate-900">
                            {formatCOP(member.totalSales)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {editingSalary === member.user_id ? (
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-[10px] text-slate-400 font-bold">$</span>
                                <input
                                  autoFocus
                                  type="number"
                                  value={salaryInput}
                                  onChange={(e) => setSalaryInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveSalary(member.id, member.user_id, Number(salaryInput));
                                    if (e.key === 'Escape') { setEditingSalary(null); setSalaryInput(''); }
                                  }}
                                  className="w-28 text-right text-xs font-bold border border-indigo-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-200"
                                  placeholder="0"
                                />
                                <button
                                  onClick={() => saveSalary(member.id, member.user_id, Number(salaryInput))}
                                  disabled={savingSalary}
                                  className="text-[9px] bg-indigo-600 text-white px-2 py-1 rounded-md font-bold hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center gap-1"
                                >
                                  {savingSalary ? <Loader2 className="w-3 h-3 animate-spin" /> : 'OK'}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditSalary(member.user_id, member.salario)}
                                className="text-right w-full font-mono font-black text-slate-700 hover:text-indigo-600 transition-colors group/salary"
                                title="Clic para editar salario"
                              >
                                {member.salario > 0
                                  ? formatCOP(member.salario)
                                  : <span className="text-slate-300 text-[10px] font-semibold group-hover/salary:text-indigo-400">+ Asignar salario</span>
                                }
                              </button>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {member.user_id !== session?.user.id ? (
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                title="Eliminar miembro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[9px] text-slate-300 font-medium">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Leaderboard ── */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-black text-[#091426] text-sm">Ranking de Productividad</h3>
                  <p className="text-[10px] text-slate-400">Mayor volumen de ventas acumuladas</p>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
                </div>
              ) : leaderboard.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">Sin datos de ventas aún.</p>
              ) : (
                <div className="space-y-2.5">
                  {leaderboard.map((member, idx) => {
                    const pct =
                      totalSalesAll > 0
                        ? Math.round((member.totalSales / totalSalesAll) * 100)
                        : 0;
                    const isTop = idx === 0 && member.totalSales > 0;

                    return (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`relative flex items-center justify-between p-3 rounded-xl border overflow-hidden ${
                          isTop
                            ? 'bg-indigo-50/60 border-indigo-200'
                            : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        {isTop && (
                          <div className="absolute left-0 top-0 h-full w-1 bg-indigo-500 rounded-l-xl" />
                        )}

                        <div className="flex items-center gap-3 pl-1">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[11px] ${
                              idx === 0
                                ? 'bg-indigo-600 text-white'
                                : idx === 1
                                ? 'bg-slate-300 text-slate-700'
                                : idx === 2
                                ? 'bg-amber-200 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              {member.profile.full_name || member.profile.email.split('@')[0]}
                              {isTop && (
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="w-20 h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isTop ? 'bg-indigo-500' : 'bg-slate-400'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-slate-400 font-bold">{pct}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-black text-slate-900">
                            {formatCOP(member.totalSales)}
                          </div>
                          <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">
                            Cerrados
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          // ── INVITE TAB ──
          <motion.div
            key="invitar"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Invitation Panel */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-[#091426] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Invitar Colaborador
                </h3>
                <form onSubmit={handleSearchUser} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Correo Electrónico
                    </label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        placeholder="ejemplo@correo.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={searching || !searchEmail}
                    className="w-full bg-[#091426] text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {searching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Buscar Usuario
                  </button>
                </form>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg leading-tight"
                    >
                      {error}
                    </motion.p>
                  )}

                  {searchResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-6 p-4 border border-indigo-100 bg-indigo-50/30 rounded-xl"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                          {searchResult.isNew
                            ? '?'
                            : searchResult.full_name?.charAt(0) ||
                              searchResult.email.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {searchResult.full_name || 'Nuevo Usuario'}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {searchResult.email}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleAddMember}
                        disabled={inviting}
                        className={`w-full py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all ${
                          searchResult.isNew
                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {searchResult.isNew ? 'Crear Invitación' : 'Agregar como Empleado'}
                      </button>
                      {searchResult.isNew && (
                        <p className="mt-2 text-[9px] text-amber-600 font-medium leading-tight">
                          * El usuario se unirá automáticamente cuando se registre en la plataforma.
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-black text-[#091426] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <History className="w-4 h-4" /> Invitaciones Pendientes
                  </h3>
                  <div className="space-y-3">
                    {invitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">{inv.email}</p>
                          <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">
                            Rol: {inv.role}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCancelInvitation(inv.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Members List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-[#091426]">Miembros de la Empresa</h3>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md">
                    {members.length} Miembros
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Usuario
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Rol
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Unido el
                        </th>
                        <th className="px-6 py-4" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="p-20 text-center">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                          </td>
                        </tr>
                      ) : (
                        members.map((member) => (
                          <tr
                            key={member.id}
                            className="hover:bg-slate-50/50 transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#091426] font-bold text-xs uppercase">
                                  {member.profile?.email.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-900">
                                    {member.profile?.full_name || 'Usuario'}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-medium">
                                    {member.profile?.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                  member.role === 'admin'
                                    ? 'bg-indigo-50 text-indigo-600'
                                    : 'bg-slate-50 text-slate-600'
                                }`}
                              >
                                {member.role === 'admin' ? (
                                  <ShieldCheck className="w-3 h-3" />
                                ) : (
                                  <User className="w-3 h-3" />
                                )}
                                {member.role === 'admin' ? 'Administrador' : 'Empleado'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                              {new Date(member.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {member.user_id !== session?.user.id && (
                                <button
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
