import React from 'react';
import { Search, Bell, HelpCircle, Menu, User, Settings as SettingsIcon, LogOut, ChevronDown, ChevronRight, Package, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';
import { Building } from 'lucide-react';

interface TopBarProps {
  onMenuClick: () => void;
  onNavigate: (screen: any) => void;
  user: SupabaseUser;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick, onNavigate, user }) => {
    const { activeCompany, memberships, setActiveCompany } = useCompany();
    const [isProfileOpen, setIsProfileOpen] = React.useState(false);

    const [searchQuery, setSearchQuery] = React.useState('');
    const [isSearching, setIsSearching] = React.useState(false);
    const [searchResults, setSearchResults] = React.useState<{
      clients: any[];
      products: any[];
      navigation: any[];
    }>({ clients: [], products: [], navigation: [] });
    const [showDropdown, setShowDropdown] = React.useState(false);

    const searchRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (!searchQuery.trim() || !activeCompany) {
        setSearchResults({ clients: [], products: [], navigation: [] });
        setIsSearching(false);
        return;
      }

      const delayDebounce = setTimeout(async () => {
        setIsSearching(true);
        const query = searchQuery.trim();

        try {
          // Local navigation filtering
          const navigationShortcuts = [
            { label: 'Ir a Dashboard (Resumen)', screen: 'Dashboard', desc: 'Panel principal' },
            { label: 'Crear Nueva Venta', screen: 'NewSale', desc: 'Registrar transacción' },
            { label: 'Historial de Ventas y Facturas', screen: 'SalesHistory', desc: 'Ver facturación' },
            { label: 'Ver Clientes', screen: 'Clients', desc: 'Directorio de clientes' },
            { label: 'Inventario de Productos', screen: 'Products', desc: 'Administrar stock' },
            { label: 'Configuración / Equipo', screen: 'Settings', desc: 'Roles y datos de empresa' }
          ].filter(s => s.label.toLowerCase().includes(query.toLowerCase()));

          // Supabase Queries
          const [clientsRes, productsRes] = await Promise.all([
            supabase
              .from('clientes')
              .select('id, nombre, email, telefono')
              .eq('company_id', activeCompany.id)
              .or(`nombre.ilike.%${query}%,email.ilike.%${query}%`)
              .limit(5),
            supabase
              .from('productos')
              .select('id, nombre, precio, stock')
              .eq('company_id', activeCompany.id)
              .ilike('nombre', `%${query}%`)
              .limit(5)
          ]);

          setSearchResults({
            navigation: navigationShortcuts,
            clients: clientsRes.data || [],
            products: productsRes.data || []
          });
        } catch (err) {
          console.error('Error global search:', err);
        } finally {
          setIsSearching(false);
        }
      }, 300);

      return () => clearTimeout(delayDebounce);
    }, [searchQuery, activeCompany]);

    React.useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
          setShowDropdown(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
  
    const handleLogout = async () => {
      await supabase.auth.signOut();
    };

    return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 z-30 bg-white/80 backdrop-blur-md border-b border-[#e4e2e3] shadow-sm flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        {/* Company Selector/Info */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg overflow-hidden max-w-[200px] truncate sm:max-w-none">
          <Building className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-xs font-black text-[#091426] truncate uppercase tracking-tight">
            {activeCompany?.nombre || 'Seleccionar Empresa'}
          </span>
        </div>

        <div ref={searchRef} className="relative w-full max-w-md hidden md:block ml-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Buscar clientes, productos o navegación..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-10 focus:ring-2 focus:ring-[#091426]/10 focus:border-[#091426] outline-none transition-all text-sm"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 animate-spin" />
          )}

          {/* Search Dropdown */}
          <AnimatePresence>
            {showDropdown && searchQuery.trim() !== '' && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute left-0 right-0 mt-2 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl z-50 max-h-[480px] overflow-y-auto overflow-x-hidden p-2"
              >
                {/* Loader state inside dropdown when starting search */}
                {isSearching && searchResults.navigation.length === 0 && searchResults.clients.length === 0 && searchResults.products.length === 0 ? (
                  <div className="py-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#091426]" />
                    Buscando en la empresa...
                  </div>
                ) : (
                  <>
                    {/* Navigation Results */}
                    {searchResults.navigation.length > 0 && (
                      <div className="mb-3">
                        <p className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Navegación rápida</p>
                        <div className="space-y-1 mt-1">
                          {searchResults.navigation.map((item, idx) => (
                            <button
                              key={`nav-${idx}`}
                              onClick={() => {
                                onNavigate(item.screen);
                                setShowDropdown(false);
                                setSearchQuery('');
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#091426] hover:text-white rounded-xl transition-all group text-left cursor-pointer"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-800 group-hover:text-white leading-tight">{item.label}</p>
                                <p className="text-[9px] text-slate-400 group-hover:text-slate-300 font-medium">{item.desc}</p>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clients Results */}
                    {searchResults.clients.length > 0 && (
                      <div className="mb-3">
                        <p className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Clientes</p>
                        <div className="space-y-1 mt-1">
                          {searchResults.clients.map((client) => (
                            <button
                              key={`client-${client.id}`}
                              onClick={() => {
                                onNavigate('Clients');
                                setShowDropdown(false);
                                setSearchQuery('');
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#091426] hover:text-white rounded-xl transition-all group text-left cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-white/10 flex items-center justify-center text-[#091426] group-hover:text-white font-bold text-xs">
                                {client.nombre.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 group-hover:text-white leading-tight truncate">{client.nombre}</p>
                                <p className="text-[9px] text-slate-400 group-hover:text-slate-300 font-medium truncate">{client.email || client.telefono || 'Sin contacto'}</p>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Products Results */}
                    {searchResults.products.length > 0 && (
                      <div className="mb-1">
                        <p className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Productos / Inventario</p>
                        <div className="space-y-1 mt-1">
                          {searchResults.products.map((product) => (
                            <button
                              key={`product-${product.id}`}
                              onClick={() => {
                                onNavigate('Products');
                                setShowDropdown(false);
                                setSearchQuery('');
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#091426] hover:text-white rounded-xl transition-all group text-left cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-white/10 flex items-center justify-center text-[#091426] group-hover:text-white">
                                <Package className="w-4 h-4 shrink-0" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 group-hover:text-white leading-tight truncate">{product.nombre}</p>
                                <p className="text-[9px] text-slate-400 group-hover:text-slate-300 font-medium">
                                  Stock: <span className={product.stock < 10 ? 'text-rose-500 font-bold group-hover:text-rose-300' : 'text-emerald-600 font-bold group-hover:text-emerald-300'}>{product.stock}</span>
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-black text-[#091426] group-hover:text-white font-mono">${product.precio.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                                <p className="text-[8px] text-slate-400 group-hover:text-slate-300 font-bold uppercase tracking-tighter">Precio Unitario</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No results state */}
                    {searchResults.navigation.length === 0 && searchResults.clients.length === 0 && searchResults.products.length === 0 && (
                      <div className="py-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                        No se encontraron resultados
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <div className="flex items-center gap-6 text-slate-500">
        <div className="flex items-center gap-4">
          <button className="relative hover:text-slate-900 transition-opacity transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-[#ba1a1a] rounded-full border-2 border-white"></span>
          </button>
          <button className="hover:text-slate-900 transition-colors">
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="h-8 w-[1px] bg-slate-200"></div>
        
        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 cursor-pointer group hover:bg-slate-50 p-1 rounded-full transition-all"
          >
            <div className="text-right hidden sm:block">
              <p className="font-bold text-slate-900 leading-none text-xs">{user.user_metadata.full_name || user.email}</p>
              <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Usuario RESGER</p>
            </div>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 group-hover:border-[#091426] transition-colors shadow-sm bg-slate-200 flex items-center justify-center">
              {user.user_metadata.avatar_url ? (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsProfileOpen(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Empresa Activa</p>
                    <p className="text-sm font-black text-[#091426] truncate">{activeCompany?.nombre}</p>
                  </div>
                  
                  {memberships.length > 1 && (
                    <div className="p-2 border-b border-slate-100">
                      <p className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cambiar Empresa</p>
                      {memberships
                        .filter(m => m.company_id !== activeCompany?.id)
                        .map(m => (
                          <button 
                            key={m.id}
                            onClick={() => {
                              setActiveCompany(m.company!);
                              setIsProfileOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                          >
                            {m.company?.nombre}
                          </button>
                        ))
                      }
                    </div>
                  )}
                  <div className="p-2">
                    <button 
                      onClick={() => {
                        onNavigate('Settings');
                        setIsProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-50 rounded-xl transition-all text-sm font-bold group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="leading-tight">Mi Perfil</p>
                        <p className="text-[10px] text-slate-400 font-medium">Editar info & Rol</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => {
                        onNavigate('Settings');
                        setIsProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-50 rounded-xl transition-all text-sm font-bold group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-slate-100 transition-colors">
                        <SettingsIcon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="leading-tight">Configuración</p>
                        <p className="text-[10px] text-slate-400 font-medium">Preferencias de cuenta</p>
                      </div>
                    </button>
                  </div>
                  <div className="p-2 bg-slate-50 border-t border-slate-100">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all text-sm font-bold"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-100/50 flex items-center justify-center">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
