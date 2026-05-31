import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Client } from '../types';
import { 
  UserPlus, Filter, Search, Edit2, Trash2, 
  ChevronLeft, ChevronRight, TrendingUp, Loader2, Save, X 
} from 'lucide-react';

import { useCompany } from '../context/CompanyContext';

interface ClientsProps {
  onAddClient: () => void;
  user: User;
}

export const Clients: React.FC<ClientsProps> = ({ onAddClient, user }) => {
  const { activeCompany } = useCompany();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editDireccion, setEditDireccion] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (activeCompany) {
      fetchClients();
    }
  }, [activeCompany]);

  const fetchClients = async () => {
    if (!activeCompany) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('company_id', activeCompany.id)
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error fetching clients:', error);
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  const deleteClient = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este cliente?')) return;

    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error al eliminar cliente');
    } else {
      setClients(clients.filter(c => c.id !== id));
    }
  };

  const startEditing = (client: Client) => {
    setEditingClient(client);
    setEditNombre(client.nombre);
    setEditEmail(client.email || '');
    setEditTelefono(client.telefono || '');
    setEditDireccion(client.direccion || '');
  };

  const handleUpdateClient = async () => {
    if (!editingClient) return;
    if (!editNombre.trim()) {
      alert("El nombre es obligatorio");
      return;
    }
    setSavingEdit(true);
    
    const cleanEmail = editEmail.trim().toLowerCase() || null;
    const cleanTelefono = editTelefono.trim() || null;

    const { error } = await supabase
      .from('clientes')
      .update({
        nombre: editNombre.trim(),
        email: cleanEmail,
        telefono: cleanTelefono,
        direccion: editDireccion.trim()
      })
      .eq('id', editingClient.id);

    if (error) {
      console.error("Error al actualizar:", error);
      if (error.code === '23505') {
         alert("Error: Este número de teléfono o correo ya está registrado en tu empresa.");
      } else {
         alert("Error al actualizar el cliente.");
      }
    } else {
      setClients(clients.map(c => c.id === editingClient.id ? { ...c, nombre: editNombre.trim(), email: cleanEmail, telefono: cleanTelefono, direccion: editDireccion.trim() } : c));
      setEditingClient(null);
    }
    setSavingEdit(false);
  };

  return (
    <div className="p-8 max-w-[1440px] mx-auto mt-16 relative">
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#091426]">Editar Cliente</h3>
              <button onClick={() => setEditingClient(null)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#091426]/20 focus:border-[#091426] outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
                <input 
                  type="email" 
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#091426]/20 focus:border-[#091426] outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Teléfono</label>
                <input 
                  type="tel" 
                  value={editTelefono}
                  onChange={(e) => setEditTelefono(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#091426]/20 focus:border-[#091426] outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Dirección</label>
                <input 
                  type="text" 
                  value={editDireccion}
                  onChange={(e) => setEditDireccion(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#091426]/20 focus:border-[#091426] outline-none transition-all"
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setEditingClient(null)}
                className="px-4 py-2 text-slate-600 font-bold text-xs uppercase hover:bg-slate-200 rounded-lg transition-colors"
                disabled={savingEdit}
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateClient}
                disabled={savingEdit}
                className="px-6 py-2 bg-gradient-to-r from-brand-primary to-brand-tertiary text-white font-bold text-xs uppercase rounded-lg hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-70 shadow-lg shadow-brand-primary/20"
              >
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-[#091426] tracking-tight">Gestión de Clientes</h2>
          <p className="text-slate-500 font-medium mt-1">Administra y organiza tu base de datos de clientes corporativos.</p>
        </div>
        <button 
          onClick={onAddClient}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-primary to-brand-tertiary text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-brand-primary/20 hover:opacity-90 transition-all flex items-center justify-center"
        >
          <UserPlus className="w-4 h-4" />
          Añadir Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Clientes', val: clients.length.toString(), trend: '+0% este mes' },
          { label: 'Clientes Activos', val: clients.length.toString(), sub: '100% de retención' },
          { label: 'Nuevos (7d)', val: '0', sub: 'Crecimiento orgánico' },
          { label: 'Tasa de Conversión', val: '0%', progress: 0 },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden group">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">{stat.label}</p>
            <h3 className="text-2xl font-black text-[#091426]">{stat.val}</h3>
            {stat.trend && (
              <div className="flex items-center gap-1 mt-2 text-emerald-600 font-bold text-[10px] uppercase">
                <TrendingUp size={12} />
                <span>{stat.trend}</span>
              </div>
            )}
            {stat.sub && (
              <p className="text-slate-400 text-[10px] mt-2 italic font-medium uppercase tracking-tighter">{stat.sub}</p>
            )}
            {stat.progress !== undefined && (
              <div className="w-full bg-slate-100 h-1 rounded-full mt-3 overflow-hidden">
                <div className="bg-brand-primary h-full" style={{ width: `${stat.progress}%` }}></div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-bold text-slate-700">Filtrar por:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {['Categoría: Todos', 'Estado: Activos', 'Fecha: Último año'].map((f) => (
            <select key={f} className="bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-full px-4 py-1.5 focus:ring-[#091426]/10 focus:border-[#091426] appearance-none cursor-pointer">
              <option>{f}</option>
            </select>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 flex justify-center items-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  {['Nombre', 'Email', 'Teléfono', 'Dirección', 'Acciones'].map((h) => (
                    <th key={h} className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm italic">
                      No se encontraron clientes.
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#091426] font-bold text-xs uppercase tracking-tight">
                            {client.nombre.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900">{client.nombre}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 font-medium">{client.email}</td>
                      <td className="px-6 py-4 text-xs text-slate-600 font-mono">{client.telefono}</td>
                      <td className="px-6 py-4 text-xs text-slate-600">{client.direccion}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => startEditing(client)}
                            className="p-1.5 text-slate-400 hover:text-[#091426] hover:bg-slate-100 rounded-md transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteClient(client.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-4 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mostrando <span className="text-[#091426]">4</span> de <span className="text-[#091426]">1,284</span> clientes</p>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded border border-slate-200 text-slate-400 hover:bg-white hover:text-brand-navy transition-colors disabled:opacity-50" disabled>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-1">
              <button className="w-7 h-7 flex items-center justify-center rounded bg-brand-primary text-white text-[10px] font-bold shadow-md shadow-brand-primary/20">1</button>
              <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-600 text-[10px] font-bold hover:bg-white transition-colors">2</button>
              <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-600 text-[10px] font-bold hover:bg-white transition-colors">3</button>
            </div>
            <button className="p-1.5 rounded border border-slate-200 text-slate-400 hover:bg-white hover:text-brand-navy transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
