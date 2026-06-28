import React, { useState, useEffect, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Client } from '../types';
import { useCompany } from '../context/CompanyContext';
import { formatCOP } from '../lib/formatCurrency';

interface ClientsProps {
  onAddClient?: () => void; // Keep for backward compatibility in App.tsx
  user: User;
}

interface ClientWithMetrics extends Client {
  totalSpent: number;
  transactionCount: number;
}

export const Clients: React.FC<ClientsProps> = ({ user }) => {
  const { activeCompany } = useCompany();
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');

  useEffect(() => {
    if (activeCompany) {
      fetchData();
    }
  }, [activeCompany]);

  const fetchData = async () => {
    if (!activeCompany) return;
    setLoading(true);

    // 1. Fetch Clients
    const { data: clientsData, error: clientsError } = await supabase
      .from('clientes')
      .select('*')
      .eq('company_id', activeCompany.id)
      .order('nombre', { ascending: true });

    if (clientsError) console.error('Error fetching clients:', clientsError);
    else setClients(clientsData || []);

    // 2. Fetch Sales to calculate metrics
    const { data: salesData, error: salesError } = await supabase
      .from('ventas')
      .select('cliente_id, total')
      .eq('company_id', activeCompany.id);

    if (salesError) console.error('Error fetching sales for metrics:', salesError);
    else setSales(salesData || []);

    setLoading(false);
  };

  // Combine clients with metrics
  const clientsWithMetrics = useMemo<ClientWithMetrics[]>(() => {
    const metricsMap: Record<string, { totalSpent: number; count: number }> = {};
    
    // Initialize map
    clients.forEach(c => {
      metricsMap[c.id] = { totalSpent: 0, count: 0 };
    });

    // Aggregate sales
    sales.forEach(sale => {
      if (sale.cliente_id && metricsMap[sale.cliente_id]) {
        metricsMap[sale.cliente_id].totalSpent += sale.total;
        metricsMap[sale.cliente_id].count += 1;
      }
    });

    return clients.map(c => ({
      ...c,
      totalSpent: metricsMap[c.id]?.totalSpent || 0,
      transactionCount: metricsMap[c.id]?.count || 0
    }));
  }, [clients, sales]);

  // Filter clients
  const filteredClients = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return clientsWithMetrics;
    
    return clientsWithMetrics.filter(c => 
      c.nombre.toLowerCase().includes(term) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.telefono && c.telefono.toLowerCase().includes(term)) ||
      (c.direccion && c.direccion.toLowerCase().includes(term))
    );
  }, [clientsWithMetrics, searchQuery]);

  // Leaderboard (Top 10 Clients)
  const topClients = [...clientsWithMetrics]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  // Handlers
  const handleOpenAdd = () => {
    setEditingClient(null);
    setNombre('');
    setEmail('');
    setTelefono('');
    setDireccion('');
    setShowModal(true);
  };

  const handleOpenEdit = (c: Client) => {
    setEditingClient(c);
    setNombre(c.nombre);
    setEmail(c.email || '');
    setTelefono(c.telefono || '');
    setDireccion(c.direccion || '');
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al cliente "${name}"?`)) return;

    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id)
      .eq('company_id', activeCompany.id);

    if (error) {
      alert('Error al eliminar cliente: ' + error.message);
    } else {
      setClients(clients.filter(c => c.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert("El nombre es obligatorio");
      return;
    }
    if (!activeCompany) return;

    setIsSubmitting(true);
    const cleanEmail = email.trim().toLowerCase() || null;
    const cleanTelefono = telefono.trim() || null;

    const payload = {
      nombre: nombre.trim(),
      email: cleanEmail,
      telefono: cleanTelefono,
      direccion: direccion.trim(),
      company_id: activeCompany.id,
      user_id: user.id
    };

    if (editingClient) {
      const { data, error } = await supabase
        .from('clientes')
        .update(payload)
        .eq('id', editingClient.id)
        .eq('company_id', activeCompany.id)
        .select();

      if (error) {
        if (error.code === '23505') alert("Error: Este número de teléfono o correo ya está registrado.");
        else alert('Error al actualizar el cliente: ' + error.message);
      } else if (data) {
        setClients(clients.map(c => c.id === editingClient.id ? data[0] : c));
        setShowModal(false);
      }
    } else {
      const { data, error } = await supabase
        .from('clientes')
        .insert([payload])
        .select();

      if (error) {
        if (error.code === '23505') alert("Error: Este número de teléfono o correo ya está registrado.");
        else alert('Error al registrar el cliente: ' + error.message);
      } else if (data) {
        setClients([...clients, data[0]]);
        setShowModal(false);
      }
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return <div className="p-10 text-center text-[#434656] mt-16">Cargando base de clientes...</div>;
  }

  return (
    <div className="p-8 max-w-[1440px] mx-auto mt-16 bg-[#f8f9fc] min-h-screen">
      <div className="space-y-6">
        
        {/* Title header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-display text-2xl font-black text-[#191b25] tracking-tight">Cartera de Clientes</h1>
            <p className="text-xs text-[#434656] mt-0.5">Administra tu base de datos y analiza el valor y lealtad de tus compradores.</p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="bg-[#003ec7] hover:bg-[#0052ff] text-white px-4 py-2.5 rounded-lg font-display text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            Registrar Cliente
          </button>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-xl border border-[#c3c5d9]/30 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:max-w-md">
            <span className="material-symbols-outlined text-[#737688] absolute left-3 top-2.5 text-lg">search</span>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, teléfono, email..."
              className="w-full bg-[#fbf8ff] border border-[#c3c5d9]/50 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-[#003ec7] transition-all"
            />
          </div>
          <div className="text-xs font-bold text-gray-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
            Total Registrados: {clients.length}
          </div>
        </div>

        {/* Grid: Left - Clients Table, Right - Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Complete Clients Table */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#c3c5d9]/30 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-[#fbf8ff]">
              <h3 className="font-display font-bold text-gray-900 text-sm">Directorio General</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#c3c5d9]/30 text-[9px] font-bold uppercase tracking-wider text-gray-500 font-display bg-slate-50/50">
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Contacto</th>
                    <th className="p-4 text-center">Frecuencia</th>
                    <th className="p-4 text-right">Monto Consumido</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredClients.map(client => (
                    <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-slate-100 text-[#003ec7] rounded-full flex items-center justify-center font-display font-black text-xs uppercase tracking-tight">
                          {client.nombre.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{client.nombre}</div>
                          <div className="text-[10px] text-gray-400 truncate max-w-[150px]">{client.direccion || 'Sin dirección'}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-gray-700">{client.telefono || 'N/A'}</div>
                        <div className="text-[10px] text-gray-400">{client.email || 'N/A'}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-display ${
                          client.transactionCount > 5 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : client.transactionCount > 0
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-500'
                        }`}>
                          {client.transactionCount} compras
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-black text-gray-900">
                        {formatCOP(client.totalSpent)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(client)}
                            className="w-7 h-7 bg-slate-50 hover:bg-[#dde1ff] text-[#434656] hover:text-[#003ec7] rounded-md flex items-center justify-center border border-gray-100 cursor-pointer"
                            title="Editar Cliente"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(client.id, client.nombre)}
                            className="w-7 h-7 bg-red-50 hover:bg-[#ffdad6] text-red-600 hover:text-[#ba1a1a] rounded-md flex items-center justify-center border border-transparent cursor-pointer"
                            title="Eliminar Cliente"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredClients.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400 font-medium italic">
                        No se encontraron clientes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Best Clients Leaderboard */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-[#c3c5d9]/30 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
              <span className="material-symbols-outlined text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>diamond</span>
              <div>
                <h3 className="font-display font-black text-gray-900 text-sm">Mejores Clientes (VIP)</h3>
                <p className="text-[10px] text-gray-500">Quienes más han invertido en tu negocio</p>
              </div>
            </div>

            <div className="space-y-3 custom-scrollbar overflow-y-auto max-h-[500px] pr-1">
              {topClients.map((client, idx) => (
                <div key={client.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 relative overflow-hidden">
                  
                  {idx === 0 && client.totalSpent > 0 && (
                    <div className="absolute left-0 top-0 h-full w-1.5 bg-amber-500"></div>
                  )}

                  <div className="flex items-center gap-3 pl-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-display text-xs font-black ${
                      idx === 0 && client.totalSpent > 0
                        ? 'bg-amber-100 text-amber-600' 
                        : idx === 1 
                          ? 'bg-slate-200 text-slate-600' 
                          : idx === 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-400'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5 truncate max-w-[120px]">
                        {client.nombre}
                      </div>
                      <span className="text-[9px] text-gray-500 font-semibold font-display">{client.transactionCount} visitas</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black text-gray-900">{formatCOP(client.totalSpent)}</div>
                    <span className="text-[8px] text-emerald-600 font-bold font-display uppercase tracking-wider">Aportado</span>
                  </div>
                </div>
              ))}
              {topClients.length === 0 && (
                <p className="text-xs text-center text-gray-400 italic">No hay registros de ventas para clasificar.</p>
              )}
            </div>
          </div>

        </div>

        {/* CREATE / EDIT CLIENT MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#c3c5d9]/40">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                <h3 className="font-display font-extrabold text-[#191b25] text-sm">
                  {editingClient ? 'Editar Ficha del Cliente' : 'Registrar Nuevo Cliente'}
                </h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#434656] mb-1 font-display">Nombre Completo / Empresa *</label>
                  <input 
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="ej. Juan Carlos López"
                    className="w-full bg-[#fbf8ff] border border-[#c3c5d9]/50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#003ec7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#434656] mb-1 font-display">Número de Teléfono</label>
                  <input 
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="ej. +57 300 000 0000"
                    className="w-full bg-[#fbf8ff] border border-[#c3c5d9]/50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#003ec7] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#434656] mb-1 font-display">Correo Electrónico (Email)</label>
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ej. correo@empresa.com"
                    className="w-full bg-[#fbf8ff] border border-[#c3c5d9]/50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#003ec7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#434656] mb-1 font-display">Dirección de Entrega / Facturación</label>
                  <input 
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="ej. Calle 123 #45-67, Ciudad"
                    className="w-full bg-[#fbf8ff] border border-[#c3c5d9]/50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#003ec7]"
                  />
                </div>

                <div className="pt-4 flex gap-3 border-t border-gray-100">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={isSubmitting}
                    className="w-1/2 py-2.5 border border-[#c3c5d9] text-[#434656] rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-1/2 py-2.5 bg-[#003ec7] hover:bg-[#0052ff] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Guardando...' : editingClient ? 'Guardar Cambios' : 'Registrar Cliente'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
