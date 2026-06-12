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
  AlertCircle,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Screen } from '../types';

interface SettingsProps {
  user: SupabaseUser;
  onNavigate: (screen: Screen) => void;
  isAdmin?: boolean;
  activeTab: 'profile' | 'taxes' | 'support';
  onTabChange: (tab: 'profile' | 'taxes' | 'support') => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onNavigate, isAdmin, activeTab, onTabChange }) => {
  const currentFullName = user.user_metadata?.full_name || 'Admin RESGER';
  const [firstName, setFirstName] = useState(currentFullName.split(' ')[0]);
  const [lastName, setLastName] = useState(currentFullName.split(' ').slice(1).join(' ') || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Tabs and Taxes configuration states
  const [country, setCountry] = useState(localStorage.getItem('resger_country') || 'Colombia');
  const [ivaRate, setIvaRate] = useState(Number(localStorage.getItem('resger_iva_rate') || '19'));
  const [defaultIvaEnabled, setDefaultIvaEnabled] = useState(localStorage.getItem('resger_iva_enabled') !== 'false');

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleCountryChange = (c: string) => {
    setCountry(c);
    let rate = 19;
    if (c === 'Colombia') rate = 19;
    else if (c === 'México') rate = 16;
    else if (c === 'España') rate = 21;
    else if (c === 'Chile') rate = 19;
    else if (c === 'Perú') rate = 18;
    else if (c === 'Argentina') rate = 21;
    else if (c === 'Ecuador') rate = 15;
    else if (c === 'Estados Unidos') rate = 0;

    setIvaRate(rate);
  };

  const handleSaveTaxes = () => {
    localStorage.setItem('resger_country', country);
    localStorage.setItem('resger_iva_rate', ivaRate.toString());
    localStorage.setItem('resger_iva_enabled', defaultIvaEnabled ? 'true' : 'false');
    setMessage({ type: 'success', text: 'Configuración de impuestos y país guardada correctamente' });
    setTimeout(() => setMessage(null), 3000);
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
          {/* User profile tab */}
          <button
            onClick={() => onTabChange('profile')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all border ${activeTab === 'profile'
                ? 'bg-white border-slate-200 text-[#091426] shadow-sm'
                : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
          >
            <div className="flex items-center gap-3">
              <User className="w-4 h-4" />
              <span>Perfil de Usuario</span>
            </div>
            {activeTab === 'profile' && <div className="w-1.5 h-1.5 rounded-full bg-[#091426]" />}
          </button>

          {/* Region and Taxes tab */}
          <button
            onClick={() => onTabChange('taxes')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all border ${activeTab === 'taxes'
                ? 'bg-white border-slate-200 text-[#091426] shadow-sm'
                : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
          >
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4" />
              <span>Impuestos y Región</span>
            </div>
            {activeTab === 'taxes' && <div className="w-1.5 h-1.5 rounded-full bg-[#091426]" />}
          </button>

          {/* Support and Help tab */}
          <button
            onClick={() => onTabChange('support')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all border ${activeTab === 'support'
                ? 'bg-white border-slate-200 text-[#091426] shadow-sm'
                : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-4 h-4 text-brand-primary" />
              <span>Soporte y Desarrollador</span>
            </div>
            {activeTab === 'support' && <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />}
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
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`p-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold shadow-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                  }`}
              >
                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* User Profile Section */}
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-10">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center text-[#091426] border-2 border-slate-50 shadow-inner overflow-hidden uppercase font-black text-2xl">
                      {displayFullName.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#091426]">{displayFullName}</h3>
                    <p className="text-sm text-slate-500 font-medium">Administrador de Sistema • ID: {user.id.slice(0, 8)}</p>
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
          )}

          {/* Taxes and Region settings */}
          {activeTab === 'taxes' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-xl font-black text-[#091426] mb-6">Configuración de Impuestos y Región</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Select Country */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">País</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <select
                        value={country}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none transition-all font-bold appearance-none cursor-pointer"
                      >
                        <option value="Colombia">Colombia (19% IVA)</option>
                        <option value="México">México (16% IVA)</option>
                        <option value="España">España (21% IVA)</option>
                        <option value="Chile">Chile (19% IVA)</option>
                        <option value="Perú">Perú (18% IGV)</option>
                        <option value="Argentina">Argentina (21% IVA)</option>
                        <option value="Ecuador">Ecuador (15% IVA)</option>
                        <option value="Estados Unidos">Estados Unidos (0% Tax)</option>
                        <option value="Otro">Otro (Personalizado)</option>
                      </select>
                    </div>
                  </div>

                  {/* IVA Rate */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Porcentaje de Impuesto / IVA (%)</label>
                    <input
                      type="number"
                      value={ivaRate}
                      onChange={(e) => setIvaRate(Number(e.target.value))}
                      disabled={country !== 'Otro'}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-[#091426]/5 focus:border-[#091426] outline-none transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Toggle Default IVA status */}
                  <div className="md:col-span-2 flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Aplicar IVA por defecto en ventas</p>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Establece si el IVA está marcado inicialmente en las ventas</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={defaultIvaEnabled}
                        onChange={(e) => setDefaultIvaEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#091426]"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 px-8 py-6 border-t border-slate-100 flex items-center justify-end">
                <button
                  onClick={handleSaveTaxes}
                  className="px-8 py-3 bg-[#091426] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:shadow-[#091426]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Guardar Configuración
                </button>
              </div>
            </motion.div>
          )}

          {/* Support and Developer Info Section */}
          {activeTab === 'support' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden"
            >
              <div className="p-8">
                {/* Header branding */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                  <div>
                    <span className="px-2.5 py-1 bg-brand-primary/10 text-brand-primary text-[10px] font-black uppercase tracking-widest rounded-md">Desarrollador Oficial</span>
                    <h3 className="text-2xl font-black text-[#091426] mt-2">Soporte Técnico SoftBootDev</h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">Estamos aquí para ayudarte a resolver dudas o inconvenientes con tu plataforma RESGER.</p>
                  </div>
                  <div className="flex items-center gap-2 bg-[#091426] text-white py-2.5 px-4 rounded-xl shadow-lg shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
                    <span className="text-[11px] font-mono uppercase tracking-wider font-bold">Servicio Activo</span>
                  </div>
                </div>

                {/* Grid of contact channels */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
                  {/* WhatsApp */}
                  <a
                    href="https://wa.me/573136099600" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col justify-between p-5 bg-emerald-50/40 border border-emerald-100 hover:bg-emerald-50 hover:shadow-md rounded-2xl transition-all group cursor-pointer"
                  >
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-black text-slate-800">Chat de WhatsApp</h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">Soporte rápido e interactivo directo con un técnico.</p>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-6 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Iniciar Chat &rarr;
                    </span>
                  </a>

                  {/* Correo Electrónico */}
                  <a
                    href="mailto:stecnologicas97@gmail.com"
                    className="flex flex-col justify-between p-5 bg-blue-50/40 border border-blue-100 hover:bg-blue-50 hover:shadow-md rounded-2xl transition-all group cursor-pointer"
                  >
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform">
                        <Mail className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-black text-slate-800">Correo de Soporte</h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">Para reportes de fallos detallados o solicitudes formales.</p>
                    </div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-6 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Enviar Email &rarr;
                    </span>
                  </a>

                  {/* Horario de Atención */}
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-[#091426] text-white flex items-center justify-center mb-4 shadow-md">
                        <Globe className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-black text-slate-800">Horarios de Soporte</h4>
                      <div className="text-xs text-slate-500 font-medium mt-1 space-y-1">
                        <p>Lunes a Viernes: 8:00 AM - 6:00 PM</p>
                        <p>Sábados: 9:00 AM - 1:00 PM</p>
                        <p>Zona horaria: Bogotá/Colombia</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-6">
                      Soporte no urgente 24h por Email
                    </span>
                  </div>
                </div>

                {/* Developer Info & Redes */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mt-8">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-2">Sobre SoftBootDev</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Somos una empresa dedicada a crear soluciones de software de alta calidad, ágiles e intuitivas para optimizar la administración y potenciar las ventas de tu negocio. Conoce más sobre nuestros servicios y proyectos en nuestras redes sociales y canal web.
                  </p>

                  {/* Social media links bar */}
                  <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-slate-200/60">
                    <a
                      href="https://www.facebook.com/SoftDev/61581012380420/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all shadow-sm"
                    >
                      Facebook
                    </a>
                    <a
                      href="https://www.instagram.com/softbootdev/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all shadow-sm"
                    >
                      Instagram
                    </a>
                    <a
                      href="https://www.youtube.com/@softbootdev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all shadow-sm"
                    >
                      YouTube
                    </a>
                    <a
                      href="https://www.linkedin.com/in/soluciones-tecnologicas-1b0830415/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all shadow-sm"
                    >
                      LinkedIn
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick Stats or Additional settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-2xl border border-slate-200">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Actividad Reciente</h4>
              <div className="space-y-4">
                {[
                  {
                    action: 'Último inicio de sesión',
                    time: user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleString('es-CO', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })
                      : 'Fecha no disponible',
                    device: navigator.userAgent.includes('Mobi') ? 'Dispositivo Móvil' : 'Navegador Web Escritorio'
                  },
                  {
                    action: 'Creación de cuenta',
                    time: user.created_at
                      ? new Date(user.created_at).toLocaleString('es-CO', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })
                      : 'Fecha no disponible',
                    device: 'Sistema RESGER'
                  },
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
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Suscripción RESGER</h4>
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
