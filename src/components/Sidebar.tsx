import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  History, 
  Settings,
  X,
  LogOut,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { Screen, NavItem } from '../types';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import logoImg from '../assets/logo.png';

interface SidebarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  isOpen: boolean;
  onClose: () => void;
  user: SupabaseUser;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' },
  { label: 'Clientes', icon: Users, screen: 'Clients' },
  { label: 'Productos', icon: Package, screen: 'Products' },
  { label: 'Historial', icon: History, screen: 'SalesHistory' },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentScreen, onNavigate, isOpen, onClose, user }) => {
  const { activeCompany, activeMembership } = useCompany();
  const isAdmin = activeMembership?.role === 'admin';

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`fixed left-0 top-0 h-screen w-64 bg-brand-navy z-50 flex flex-col py-6 px-4 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        {/* Logo & Close */}
        <div className="mb-6 flex flex-col px-1">
          <div className="flex items-center justify-between mb-6">
            <img src={logoImg} alt="RESGER CRM" className="h-16 object-contain drop-shadow-lg" />
            <button onClick={onClose} className="lg:hidden p-2 text-white/40 hover:text-white/80 rounded-md transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Company Badge */}
          <div className="bg-white/8 border border-white/15 px-4 py-3.5 rounded-lg">
            <p className="text-[11px] text-white/50 font-mono uppercase tracking-widest mb-2">Empresa Activa</p>
            <p className="text-base font-bold text-white truncate leading-tight">{activeCompany?.nombre}</p>
            {isAdmin && (
              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-brand-secondary font-mono uppercase tracking-wider">
                <ShieldCheck size={11} />
                <span>Administrador</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5">
          <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest px-3 mb-3">Navegación</p>
          {navItems.map((item) => {
            const isActive = currentScreen === item.screen;
            return (
              <button
                key={item.label}
                onClick={() => onNavigate(item.screen)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${
                  isActive 
                    ? 'bg-brand-primary text-white font-medium shadow-lg shadow-brand-primary/30' 
                    : 'text-white/70 hover:bg-white/8 hover:text-white'
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/60'}`} />
                <span className="text-sm">{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-secondary" />}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="mt-auto space-y-1 pt-4 border-t border-white/10">
          <button 
            onClick={() => onNavigate('NewSale')}
            className="w-full bg-gradient-to-r from-brand-primary to-brand-tertiary text-white py-3 rounded-md font-medium text-sm flex items-center justify-center gap-2 mb-4 hover:opacity-90 transition-opacity shadow-lg shadow-brand-primary/25"
          >
            <Plus className="w-4 h-4" />
            Nueva Venta
          </button>
          <button 
            onClick={() => onNavigate('Settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-sm font-medium ${
              currentScreen === 'Settings' 
                ? 'bg-brand-primary text-white' 
                : 'text-white/70 hover:bg-white/8 hover:text-white'
            }`}
          >
            <Settings className={`w-4 h-4 ${currentScreen === 'Settings' ? 'text-white' : 'text-white/60'}`} />
            <span>Configuración</span>
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all text-sm font-medium rounded-md"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};
