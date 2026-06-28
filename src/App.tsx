/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Package, Building2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './components/Dashboard';
import { Clients } from './components/Clients';
import { CreateClient } from './components/CreateClient';
import { Products } from './components/Products';
import { CreateProduct } from './components/CreateProduct';
import { EditProduct } from './components/EditProduct';
import { Settings } from './components/Settings';
import { NewSale } from './components/NewSale';
import { UserManagement } from './components/UserManagement';
import { SalesHistory } from './components/SalesHistory';
import { Auth } from './components/Auth';
import { ResetPassword } from './components/ResetPassword';
import { Screen } from './types';
import { supabase } from './lib/supabase';
import { useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { CompanyProvider, useCompany } from './context/CompanyContext';
import { INDUSTRIES, INITIAL_PRODUCTS_BY_INDUSTRY } from './lib/initialData';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    // Check if URL has recovery hash as fallback
    if (window.location.hash.includes('type=recovery')) {
      setIsRecovering(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovering(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isRecovering) {
    return <ResetPassword onSuccess={() => setIsRecovering(false)} />;
  }

  return (
    <CompanyProvider user={session?.user || null}>
      <AppContent session={session} />
    </CompanyProvider>
  );
}

function AppContent({ session }: { session: Session | null }) {
  const [screen, setScreen] = useState<Screen>('Dashboard');
  const [prevScreen, setPrevScreen] = useState<Screen | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'profile' | 'taxes' | 'support' | 'database'>('profile');
  const { activeCompany, memberships, loading: companyLoading, setActiveCompany, activeMembership } = useCompany();

  // Hooks para creación de empresa (DEBEN estar aquí arriba)
  const [newCompanyName, setNewCompanyName] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('cafeteria');
  const [loadDemoProducts, setLoadDemoProducts] = useState(true);
  const [creating, setCreating] = useState(false);

  const navigate = (newScreen: Screen, initialTab?: 'profile' | 'taxes' | 'support' | 'database') => {
    setPrevScreen(screen);
    setScreen(newScreen);
    setIsSidebarOpen(false);
    if (newScreen === 'Settings' && initialTab) {
      setSettingsActiveTab(initialTab);
    }
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName || !session?.user) return;
    setCreating(true);
    try {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{ nombre: newCompanyName }])
        .select()
        .single();

      if (companyError) throw companyError;

      const { error: memberError } = await supabase
        .from('company_members')
        .insert([{
          company_id: companyData.id,
          user_id: session.user.id,
          role: 'admin'
        }]);

      if (memberError) throw memberError;

      if (loadDemoProducts) {
        const productsToInsert = INITIAL_PRODUCTS_BY_INDUSTRY[selectedIndustry].map(p => ({
          company_id: companyData.id,
          user_id: session.user.id,
          nombre: p.name,
          descripcion: p.description,
          precio: p.price,
          costo: p.cost,
          stock: p.stock,
          stock_minimo: p.minStock,
          categoria: p.category
        }));

        const { error: productsError } = await supabase.from('productos').insert(productsToInsert);
        if (productsError) {
          console.error('Error inserting initial products', productsError);
        }
      }

      window.location.reload(); 
    } catch (err) {
      console.error('Error creating company:', err);
      alert('Error al crear la empresa. Revisa la consola.');
    } finally {
      setCreating(false);
    }
  };

  if (!session) {
    return <Auth />;
  }

  // If the user has companies but none is active (loading), show a loader
  if (companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If user has no companies, they need to create one or wait for invitation
  if (!activeCompany && memberships.length === 0) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-panel rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-brand-primary/10 rounded-md flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-8 h-8 text-brand-primary" />
          </div>
          <h2 className="text-2xl font-bold text-brand-navy font-display mb-2">¡Bienvenido!</h2>
          <p className="text-outline text-sm mb-8">No perteneces a ninguna empresa aún. Crea una para comenzar.</p>
          
          <div className="space-y-4">
            <div className="text-left">
              <label className="text-[10px] font-mono text-outline uppercase tracking-widest ml-1">Nombre de la Empresa</label>
              <input 
                type="text" 
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Ej: Mi Negocio"
                className="w-full mt-1 px-4 py-3 bg-[#F1F5F9] border-b border-b-[#E2E8F0] focus:border-b-brand-primary rounded-t-md text-sm outline-none transition-all text-brand-navy placeholder:text-outline/50"
              />
            </div>
            
            <div className="text-left mt-2">
              <label className="text-[10px] font-mono text-outline uppercase tracking-widest ml-1">Sector Comercial</label>
              <select 
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="w-full mt-1 px-4 py-3 bg-[#F1F5F9] border-b border-b-[#E2E8F0] focus:border-b-brand-primary rounded-t-md text-sm outline-none transition-all text-brand-navy"
              >
                {INDUSTRIES.map(ind => (
                  <option key={ind.id} value={ind.id}>{ind.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 mt-4 mb-2 text-left">
              <input 
                type="checkbox" 
                id="loadDemo" 
                checked={loadDemoProducts}
                onChange={(e) => setLoadDemoProducts(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer accent-[#003ec7]"
              />
              <label htmlFor="loadDemo" className="text-xs text-brand-navy font-medium cursor-pointer select-none">
                Cargar categorías y productos de demostración
              </label>
            </div>

            <button 
              onClick={handleCreateCompany}
              disabled={creating || !newCompanyName}
              className="w-full bg-gradient-to-r from-brand-primary to-brand-tertiary text-white py-3.5 rounded-md font-medium text-sm hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-brand-primary/20"
            >
              {creating ? 'Creando...' : 'Crear Empresa'}
            </button>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="w-full py-3 text-outline text-xs hover:text-brand-navy transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user has memberships but no active company (should not happen with auto-select, but for safety)
  if (!activeCompany && memberships.length > 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-8">
        <h2 className="text-2xl font-bold text-brand-navy font-display mb-6">Selecciona una Empresa</h2>
        <div className="grid gap-3 w-full max-w-md">
          {memberships.map(m => (
            <button 
              key={m.id}
              onClick={() => setActiveCompany(m.company!)}
              className="p-4 bg-white border border-[#E2E8F0] rounded-md hover:border-l-4 hover:border-l-brand-primary transition-all text-left"
            >
              <span className="font-medium text-brand-navy">{m.company?.nombre}</span>
              <span className="block font-mono text-[10px] text-outline uppercase tracking-wider mt-1">{m.role}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (screen) {
      case 'Dashboard':
        return <Dashboard key="Dashboard" user={session.user} onNavigate={navigate} />;
      case 'Clients':
        return <Clients key="Clients" onAddClient={() => navigate('CreateClient')} user={session.user} />;
      case 'CreateClient':
        return <CreateClient 
          key="CreateClient" 
          onCancel={() => navigate(prevScreen === 'NewSale' ? 'NewSale' : 'Clients')} 
          onSave={() => navigate(prevScreen === 'NewSale' ? 'NewSale' : 'Clients')} 
          user={session.user} 
        />;
      case 'Products':
        return <Products 
          key="Products" 
          onAddProduct={() => navigate('CreateProduct')} 
          onEditProduct={(prod) => {
            setEditingProduct(prod);
            navigate('EditProduct');
          }}
          user={session.user} 
        />;
      case 'CreateProduct':
        return <CreateProduct key="CreateProduct" onCancel={() => navigate('Products')} onSave={() => navigate('Products')} user={session.user} />;
      case 'EditProduct':
        return <EditProduct 
          key="EditProduct" 
          product={editingProduct} 
          onCancel={() => navigate('Products')} 
          onSave={() => navigate('Products')} 
          user={session.user} 
        />;
      case 'UserManagement':
        return <UserManagement key="UserManagement" session={session} />;
      case 'Settings':
        return <Settings 
          key="Settings" 
          user={session.user} 
          onNavigate={navigate} 
          isAdmin={activeMembership?.role === 'admin'} 
          activeTab={settingsActiveTab}
          onTabChange={setSettingsActiveTab}
        />;
      case 'NewSale':
        return <NewSale 
          key="NewSale" 
          onCancel={() => navigate('Dashboard')} 
          onFinish={() => navigate('SalesHistory')} 
          onCreateClient={() => navigate('CreateClient')}
          user={session.user} 
        />;
      case 'SalesHistory':
        return <SalesHistory key="SalesHistory" user={session.user} />;
      default:
        return <Dashboard key="Dashboard" user={session.user} />;
    }
  };

  const getTransition = (): any => {
    if (screen === 'NewSale') {
      return { 
        initial: { y: '100%' }, 
        animate: { y: 0 }, 
        exit: { y: '100%' }, 
        transition: { type: 'spring', damping: 25, stiffness: 200 } 
      };
    }
    return { 
      initial: { opacity: 0 }, 
      animate: { opacity: 1 }, 
      exit: { opacity: 0 }, 
      transition: { duration: 0.2 } 
    };
  };

  const { initial, animate, exit, transition } = getTransition();

  return (
    <div className="min-h-screen flex text-on-surface bg-surface">
      <Sidebar 
        currentScreen={screen} 
        onNavigate={navigate} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        user={session.user}
      />
      
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-[padding] duration-300">
        <TopBar 
          onMenuClick={() => setIsSidebarOpen(true)} 
          onNavigate={navigate}
          user={session.user}
        />
        <main className="flex-1 relative mt-16 overflow-x-hidden min-h-[calc(100vh-4rem)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={initial}
              animate={animate}
              exit={exit}
              transition={transition}
              className="absolute inset-0 w-full min-h-full"
            >
              {renderScreen()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

