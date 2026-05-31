import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserPlus, ChevronLeft, Save, X, Loader2 } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

import { useCompany } from '../context/CompanyContext';

interface CreateClientProps {
  onCancel: () => void;
  onSave: () => void;
  user: User;
}

export const CreateClient: React.FC<CreateClientProps> = ({ onCancel, onSave, user }) => {
  const { activeCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');

  const handleSave = async () => {
    if (!activeCompany) return;
    if (!nombre.trim() || !telefono.trim() || !direccion.trim()) {
      alert('El nombre, teléfono y dirección son obligatorios');
      return;
    }

    setLoading(true);
    // Limpieza de datos antes de enviar
    const cleanEmail = email.trim().toLowerCase() || null;
    const cleanTelefono = telefono.trim() || null;

    const { error } = await supabase
      .from('clientes')
      .insert([
        { 
          nombre: nombre.trim(), 
          email: cleanEmail, 
          telefono: cleanTelefono, 
          direccion: direccion.trim(), 
          user_id: user.id,
          company_id: activeCompany.id
        }
      ]);

    if (error) {
      console.error('Error saving client:', error);
      // Código de error 23505 es "Unique Violation" en Postgres
      if (error.code === '23505') {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('telefono')) {
          alert('Error: Este número de teléfono ya está registrado con otro cliente en tu empresa.');
        } else if (errorMsg.includes('email')) {
          alert('Error: Este correo electrónico ya está registrado con otro cliente en tu empresa.');
        } else {
          alert('Error: Ya existe un cliente con estos datos de contacto (Teléfono o Email duplicado).');
        }
      } else {
        alert('Error al guardar el cliente: ' + error.message);
      }
    } else {
      onSave();
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-[800px] mx-auto mt-16 pb-20">
      <header className="mb-8">
        <button 
          onClick={onCancel}
          className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-[#091426] transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver a Clientes
        </button>
        <h2 className="text-3xl font-black text-[#091426] tracking-tight">Crear Nuevo Cliente</h2>
        <p className="text-slate-500 font-medium mt-1">Completa los datos para registrar un nuevo cliente en el sistema.</p>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden"
      >
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Completo</label>
              <input 
                type="text" 
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-[#091426]/5 focus:border-[#091426] outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@ejemplo.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-[#091426]/5 focus:border-[#091426] outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Teléfono</label>
              <input 
                type="tel" 
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+34 600 000 000"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-[#091426]/5 focus:border-[#091426] outline-none transition-all font-mono"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Dirección</label>
              <input 
                type="text" 
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Calle Gran Vía 12, Madrid"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-[#091426]/5 focus:border-[#091426] outline-none transition-all"
                required
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-8 py-6 border-t border-slate-100 flex items-center justify-end gap-4">
          <button 
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-2.5 text-slate-500 hover:text-[#ba1a1a] font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="px-8 py-3 bg-[#091426] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:shadow-[#091426]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Cliente
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
