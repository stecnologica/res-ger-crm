import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Bell, 
  Shield, 
  Database, 
  Globe, 
  CreditCard,
  Mail,
  Lock,
  Camera,
  ChevronRight,
  ShieldCheck,
  Save,
  CheckCircle2,
  Users,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Screen } from '../types';

interface SettingsProps {
  user: SupabaseUser;
  onNavigate: (screen: Screen) => void;
  isAdmin?: boolean;
}

export const Settings: React.FC<SettingsProps> = ({ user, onNavigate, isAdmin }) => {
  const currentFullName = user.user_metadata?.full_name || 'Admin RESGER';
  const [firstName, setFirstName] = useState(currentFullName.split(' ')[0]);
  const [lastName, setLastName] = useState(currentFullName.split(' ').slice(1).join(' ') || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const newFullName = `${firstName} ${lastName}`.trim();
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: newFullName }
      });

      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: newFullName })
        .eq('id', user.id);

      if (profileError) throw profileError;
      
      setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al actualizar perfil' });
    } finally {
      setIsSaving(false);
    }
  };

  const displayFullName = `${firstName} ${lastName}`.trim() || 'Admin RESGER';

  return (
    <div className="p-8 max-w-[1200px] mx-auto mt-16 pb-20">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-[#091426] tracking-tight">Configuración</h2>
          <p className="text-slate-500 font-medium mt-1">Gestiona tu perfil, preferencias del sistema y seguridad.</p>
        </div>
        <button 
          onClick={handleLogout}
          className="px-6 py-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-100 transition-all"
        >
          Cerrar Sesión
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-3 space-y-2">
          <button
            onClick={() => {}}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all bg-white border border-slate-200 text-[#091426] shadow-sm"
          >
            <div className="flex items-center gap-3">
              <User className="w-4 h-4" />
              <span>Perfil de Usuario</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-[#091426]" />
          </button>

            <button
              onClick={() => onNavigate('UserManagement')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all border border-indigo-100"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                <span>Gestión de Equipo</span>
              </div>
              <ChevronRight className="w-4 h-4 text-indigo-400" />
            </button>

          {[
            { label: 'Notificaciones', icon: Bell },
            { label: 'Seguridad', icon: Shield },
            { label: 'Base de Datos', icon: Database },
            { label: 'Región & Idioma', icon: Globe },
            { label: 'Facturación', icon: CreditCard },
          ].map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all"
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <main className="lg:col-span-9 space-y-8">
          {/* User Profile Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden relative"
          >
            {/* Notifications */}
            <AnimatePresence>
              {message && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`absolute top-0 left-0 right-0 p-4 flex items-center justify-center gap-2 text-sm font-bold z-10 ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-b border-emerald-100' : 'bg-rose-50 text-rose-600 border-b border-rose-100'
                  }`}
                >
                  {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {message.text}
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`p-8 ${message ? 'mt-8' : ''} transition-all duration-300`}>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-10">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center text-[#091426] border-2 border-slate-50 shadow-inner overflow-hidden uppercase font-black text-2xl">
                    {displayFullName.charAt(0)}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#091426]">{displayFullName}</h3>
                  <p className="text-sm text-slate-500 font-medium">Administrador de Sistema • ID: {user.id.slice(0,8)}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-md border border-blue-100">Super Admin</span>
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-md border border-emerald-100 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Verificado
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-[#091426]/5 focus:border-[#091426] outline-none transition-all font-bold"
                    />
                  </div>
                </div>

                {/* Apellido */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Apellido</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-[#091426]/5 focus:border-[#091426] outline-none transition-all font-bold"
                    />
                  </div>
                </div>

                {/* Correo */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="email" 
                      readOnly
                      defaultValue={user.email}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-[#091426]/5 focus:border-[#091426] outline-none transition-all font-mono opacity-70 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Contraseña */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="password" 
                      readOnly 
                      disabled
                      defaultValue="********"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none transition-all font-mono opacity-70 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Rol */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Rol / Perfil</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <select 
                      disabled 
                      value={isAdmin ? 'Administrador' : 'Empleado'}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none transition-all font-bold opacity-75 cursor-not-allowed appearance-none"
                    >
                      <option value="Administrador">Administrador</option>
                      <option value="Empleado">Empleado</option>
                    </select>
                  </div>
                </div>

                {/* Estado Activo */}
                <div className="md:col-span-2 flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 opacity-80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Estado de la Cuenta</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Activo (No modificable)</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-not-allowed">
                    <input type="checkbox" defaultChecked disabled className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#091426] opacity-70"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-8 py-6 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Última actualización: Reciente</p>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-8 py-3 bg-[#091426] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:shadow-[#091426]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </motion.div>

          {/* Quick Stats or Additional settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-2xl border border-slate-200">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Actividad Reciente</h4>
              <div className="space-y-4">
                {[
                  { action: 'Inicio de sesión', time: 'Hoy, 09:12 AM', device: 'Chrome on MacOS' },
                  { action: 'Cambio de contraseña', time: 'Ayer, 06:45 PM', device: 'Safari on iPhone' },
                ].map((log, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <div>
                      <p className="text-sm font-bold text-slate-900 group-hover:text-[#091426] transition-colors">{log.action}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{log.time} • {log.device}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-900/10">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Suscripción RESGER CRM</h4>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <p className="text-xl font-black">Plan Enterprise</p>
                  <p className="text-xs text-slate-400">Próxima facturación: 15 Mayo 2024</p>
                </div>
              </div>
              <button className="w-full py-3 bg-white text-[#091426] rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">
                Gestionar Suscripción
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
