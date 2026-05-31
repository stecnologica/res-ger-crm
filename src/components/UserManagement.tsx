import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';
import { User, Shield, UserPlus, Trash2, Mail, Search, ShieldCheck, Loader2, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Session } from '@supabase/supabase-js';

interface UserManagementProps {
  session: Session | null;
}

export const UserManagement: React.FC<UserManagementProps> = ({ session }) => {
  const { activeCompany, activeMembership } = useCompany();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [inviting, setInviting] = useState(false);

  const isAdmin = activeMembership?.role === 'admin';

  useEffect(() => {
    if (activeCompany) {
      fetchMembers();
      fetchInvitations();
    }
  }, [activeCompany]);

  const fetchMembers = async () => {
    if (!activeCompany) return;
    setLoading(true);
    
    // Fetch members
    const { data: membersData, error: membersError } = await supabase
      .from('company_members')
      .select(`
        id,
        role,
        created_at,
        user_id
      `)
      .eq('company_id', activeCompany.id);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      setLoading(false);
      return;
    }

    if (!membersData || membersData.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }

    // Fetch profiles for these members
    const userIds = membersData.map(m => m.user_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Merge data
    const mergedMembers = membersData.map(member => ({
      ...member,
      profile: profilesData?.find(p => p.id === member.user_id) || { email: 'Unknown', full_name: 'Unknown User' }
    }));

    setMembers(mergedMembers);
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
      // Si no existe, permitimos invitar
      setSearchResult({ email: searchEmail.toLowerCase().trim(), isNew: true });
    } else {
      const isAlreadyMember = members.some(m => m.user_id === data.id);
      const isAlreadyInvited = invitations.some(i => i.email === data.email);
      
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
      const { error } = await supabase
        .from('company_invitations')
        .insert([{
          company_id: activeCompany.id,
          email: searchResult.email,
          role: 'employee',
          invited_by: session?.user.id
        }]);

      if (error) {
        alert('Error al enviar invitación');
      } else {
        setSearchResult(null);
        setSearchEmail('');
        fetchInvitations();
      }
      setInviting(false);
    } else {
      const { error } = await supabase
        .from('company_members')
        .insert([{
          company_id: activeCompany.id,
          user_id: searchResult.id,
          role: 'employee'
        }]);

      if (error) {
        alert('Error al agregar miembro');
      } else {
        setSearchResult(null);
        setSearchEmail('');
        fetchMembers();
      }
    }
  };

  const handleCancelInvitation = async (id: string) => {
    const { error } = await supabase
      .from('company_invitations')
      .delete()
      .eq('id', id);

    if (!error) fetchInvitations();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar a este miembro?')) return;

    const { error } = await supabase
      .from('company_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      alert('Error al eliminar miembro');
    } else {
      fetchMembers();
    }
  };

  /* Comentamos la restricción temporalmente para asegurar acceso */
  if (!activeMembership || activeMembership.role !== 'admin') {
    return (
      <div className="p-8 mt-16 text-center">
        <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Acceso Restringido</h2>
        <p className="text-slate-500">Solo los administradores pueden gestionar el equipo.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1440px] mx-auto mt-16">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-[#091426] tracking-tight">Gestión de Equipo</h2>
        <p className="text-slate-500 font-medium mt-1">Administra los accesos y roles de los usuarios en {activeCompany?.nombre}.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Panel de Invitación */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-[#091426] uppercase tracking-widest mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Invitar Miembro
            </h3>
            <form onSubmit={handleSearchUser} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
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
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
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
                      {searchResult.isNew ? '?' : (searchResult.full_name?.charAt(0) || searchResult.email.charAt(0))}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{searchResult.full_name || 'Nuevo Usuario'}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{searchResult.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleAddMember}
                    disabled={inviting}
                    className={`w-full py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all ${
                      searchResult.isNew ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'
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

          {/* Invitaciones Pendientes */}
          {invitations.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black text-[#091426] uppercase tracking-widest mb-4 flex items-center gap-2">
                <History className="w-4 h-4" /> Invitaciones Pendientes
              </h3>
              <div className="space-y-3">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{inv.email}</p>
                      <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">Rol: {inv.role}</p>
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

        {/* Lista de Miembros */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-[#091426]">Miembros de la Empresa</h3>
              <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md">{members.length} Miembros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unido el</th>
                    <th className="px-6 py-4"></th>
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
                      <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#091426] font-bold text-xs uppercase">
                              {member.profile?.email.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{member.profile?.full_name || 'Usuario'}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{member.profile?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                            member.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-600'
                          }`}>
                            {member.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
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
      </div>
    </div>
  );
};
