import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import {
  Plus,
  Package,
  DollarSign,
  AlertTriangle,
  List,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  History,
  Trash2,
  Pencil,
  Search,
  Filter,
  X
} from 'lucide-react';

import { useCompany } from '../context/CompanyContext';

interface ProductsProps {
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  user: User;
}

export const Products: React.FC<ProductsProps> = ({ onAddProduct, onEditProduct, user }) => {
  const { activeCompany } = useCompany();
  const [products, setProducts] = useState<Product[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedStock, setSelectedStock] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedStock]);

  const [mostSoldProducts, setMostSoldProducts] = useState<any[]>([]);
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);

  useEffect(() => {
    if (activeCompany) {
      fetchProducts();
      fetchActivity();
      fetchMostSold();
    }
  }, [activeCompany]);

  const fetchMostSold = async () => {
    if (!activeCompany) return;
    try {
      const { data, error } = await supabase
        .from('venta_items')
        .select('cantidad, producto_id, productos!inner(nombre, company_id)')
        .eq('productos.company_id', activeCompany.id);

      if (error) {
        console.error('Error fetching most sold items:', error);
        return;
      }

      // Aggregate in memory
      const salesMap: { [key: string]: { nombre: string; cantidad: number } } = {};
      data?.forEach((item: any) => {
        const prodId = item.producto_id;
        const qty = item.cantidad || 0;
        const name = item.productos?.nombre || 'Producto Desconocido';
        if (!salesMap[prodId]) {
          salesMap[prodId] = { nombre: name, cantidad: 0 };
        }
        salesMap[prodId].cantidad += qty;
      });

      const sorted = Object.entries(salesMap)
        .map(([id, val]) => ({ id, nombre: val.nombre, cantidad: val.cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

      setMostSoldProducts(sorted);
    } catch (err) {
      console.error('Error in fetchMostSold:', err);
    }
  };

  const fetchProducts = async () => {
    if (!activeCompany) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('company_id', activeCompany.id)
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const fetchActivity = async () => {
    if (!activeCompany) return;

    try {
      // 1. Obtener últimas ventas y sus items
      const { data: salesItems, error: salesError } = await supabase
        .from('venta_items')
        .select(`
          cantidad,
          created_at,
          producto:productos(nombre)
        `)
        .eq('productos.company_id', activeCompany.id)
        .order('created_at', { ascending: false })
        .limit(3);

      // 2. Obtener productos con stock bajo
      const { data: lowStockProds } = await supabase
        .from('productos')
        .select('nombre, stock')
        .eq('company_id', activeCompany.id)
        .lt('stock', 10)
        .order('stock', { ascending: true })
        .limit(2);

      // 3. Obtener productos recién agregados (que sí tienen stock)
      const { data: newProds } = await supabase
        .from('productos')
        .select('nombre, stock, created_at')
        .eq('company_id', activeCompany.id)
        .gte('stock', 10)
        .order('created_at', { ascending: false })
        .limit(2);

      const combinedActivities: any[] = [];

      if (salesItems) {
        salesItems.forEach((item: any) => {
          if (item.producto) {
            combinedActivities.push({
              title: `Salida: ${item.producto.nombre}`,
              sub: `-${item.cantidad} unidades vendidas.`,
              time: new Date(item.created_at).getTime(),
              timeLabel: new Date(item.created_at).toLocaleString(),
              color: 'bg-blue-500'
            });
          }
        });
      }

      if (lowStockProds) {
        lowStockProds.forEach((prod: any) => {
          combinedActivities.push({
            title: 'Alerta: Stock Bajo',
            sub: `${prod.nombre} solo tiene ${prod.stock} unidades.`,
            time: Date.now(),
            timeLabel: '¡Atención!',
            color: 'bg-amber-500'
          });
        });
      }

      if (newProds) {
        newProds.forEach((prod: any) => {
          combinedActivities.push({
            title: 'Nuevo Ingreso',
            sub: `${prod.nombre} registrado con ${prod.stock} unidades.`,
            time: new Date(prod.created_at).getTime(),
            timeLabel: new Date(prod.created_at).toLocaleDateString(),
            color: 'bg-emerald-500'
          });
        });
      }

      setActivities(combinedActivities.sort((a, b) => b.time - a.time).slice(0, 5));
    } catch (err) {
      console.error('Error fetching activity:', err);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este producto?')) return;

    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error al eliminar producto');
    } else {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const inventoryValue = products.reduce((acc, curr) => acc + (curr.precio * curr.stock), 0);
  const lowStockCount = products.filter(p => p.stock < 10).length;
  const uniqueCategories = new Set(products.map(p => p.categoria).filter(c => c)).size;

  const categories = Array.from(new Set(products.map(p => p.categoria).filter(Boolean))).sort() as string[];

  const filteredProducts = products.filter((prod) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term ||
      (prod.nombre || '').toLowerCase().includes(term) ||
      (prod.descripcion || '').toLowerCase().includes(term);

    let matchesCategory = true;
    if (selectedCategory !== 'Todos') {
      matchesCategory = prod.categoria === selectedCategory;
    }

    let matchesStock = true;
    if (selectedStock === 'Sin Stock') {
      matchesStock = prod.stock === 0;
    } else if (selectedStock === 'Stock Bajo') {
      matchesStock = prod.stock > 0 && prod.stock < 10;
    } else if (selectedStock === 'En Stock') {
      matchesStock = prod.stock >= 10;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="p-8 max-w-[1440px] mx-auto mt-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#091426] tracking-tight">Catálogo de Productos</h2>
          <p className="text-slate-500 font-medium mt-1">Gestión integral del inventario y existencias del almacén.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onAddProduct}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-brand-primary to-brand-tertiary text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-brand-primary/20"
          >
            <Plus className="w-4 h-4" />
            Agregar Producto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total Productos', val: products.length.toString(), icon: Package, iconBg: 'bg-blue-50 text-blue-600' },
          { label: 'Valor Inventario', val: `$${inventoryValue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: DollarSign, iconBg: 'bg-emerald-50 text-emerald-600' },
          { label: 'Stock Bajo', val: lowStockCount.toString(), icon: AlertTriangle, iconBg: 'bg-rose-50 text-rose-600', isAlert: lowStockCount > 0 },
          { label: 'Categorías', val: uniqueCategories.toString(), icon: List, iconBg: 'bg-amber-50 text-amber-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group cursor-default">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">{stat.label}</p>
            <div className="flex items-center justify-between">
              <h3 className={`text-2xl font-black ${stat.isAlert ? 'text-rose-600' : 'text-[#091426]'}`}>{stat.val}</h3>
              <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="flex flex-1 items-center gap-2 max-w-md bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm text-[#091426] outline-none placeholder:text-slate-400"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer text-xs font-bold px-1">
              X
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Filtrar por:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-full px-4 py-1.5 focus:ring-[#091426]/10 focus:border-[#091426] cursor-pointer"
            >
              <option value="Todos">Categoría: Todos</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Stock Filter */}
            <select
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-full px-4 py-1.5 focus:ring-[#091426]/10 focus:border-[#091426] cursor-pointer"
            >
              <option value="Todos">Stock: Todos</option>
              <option value="En Stock">{"En Stock (>= 10)"}</option>
              <option value="Stock Bajo">{"Stock Bajo (< 10)"}</option>
              <option value="Sin Stock">{"Sin Stock (= 0)"}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-10">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 flex justify-center items-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {['Producto', 'Precio', 'Stock', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm italic">
                      No se encontraron productos.
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center border border-slate-200">
                            {prod.imagen_url ? (
                              <img src={prod.imagen_url} alt={prod.nombre} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold text-[#091426]">{prod.nombre.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#091426]">{prod.nombre}</p>
                            {prod.categoria && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase tracking-widest">
                                {prod.categoria}
                              </span>
                            )}
                            <p className="text-[10px] text-slate-500 italic mt-0.5 truncate max-w-[200px]">{prod.descripcion}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-[#091426] font-mono">${prod.precio.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-xs font-black font-mono ${prod.stock < 10 ? 'text-rose-600' : 'text-slate-600'}`}>
                          {prod.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${prod.stock === 0 ? 'bg-rose-50 text-rose-600' :
                            prod.stock < 10 ? 'bg-amber-50 text-amber-600' :
                              'bg-emerald-50 text-emerald-600'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${prod.stock === 0 ? 'bg-rose-500' :
                              prod.stock < 10 ? 'bg-amber-500' :
                                'bg-emerald-500'
                            }`}></span>
                          {prod.stock === 0 ? 'Sin Stock' : prod.stock < 10 ? 'Stock Bajo' : 'En Stock'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEditProduct(prod)}
                            className="p-1.5 text-slate-400 hover:text-[#091426] hover:bg-slate-100 rounded-md transition-all"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteProduct(prod.id)}
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
        <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-between border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Mostrando <span className="text-[#091426]">{filteredProducts.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</span> a <span className="text-[#091426]">{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}</span> de <span className="text-[#091426]">{filteredProducts.length}</span> productos
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded border border-slate-200 text-slate-400 hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {totalPages > 0 && Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 flex items-center justify-center rounded text-[10px] font-bold transition-all cursor-pointer ${page === currentPage ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20' : 'border border-slate-200 text-slate-600 hover:bg-white'
                  }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 rounded border border-slate-200 text-slate-400 hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-[#091426] uppercase tracking-widest text-xs flex items-center gap-2">
              <History className="w-4 h-4" /> Actividad de Inventario
            </h4>
          </div>
          <div className="space-y-6">
            {activities.length > 0 ? (
              activities.map((log, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${log.color}`}></div>
                  <div>
                    <p className="text-sm font-bold text-[#091426]">{log.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{log.sub}</p>
                    <p className="text-[9px] text-slate-400 mt-2 uppercase font-black tracking-widest">{log.timeLabel}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-slate-400 text-xs italic">
                No hay actividad reciente registrada.
              </div>
            )}
          </div>
        </div>
        <div className="bg-brand-navy text-white rounded-xl p-8 flex flex-col justify-between shadow-xl relative overflow-hidden group">
          <div className="relative z-10">
            <h4 className="text-lg font-black tracking-tight mb-2 uppercase">Optimización RESGER</h4>
            <p className="text-xs opacity-70 leading-relaxed font-medium">
              {products.filter(p => p.stock < 10).length > 0 ? (
                <>
                  Basado en el stock actual, sugerimos reabastecer <span className="font-bold text-brand-secondary">{products.filter(p => p.stock < 10).length}</span> productos de la categoría <span className="text-brand-secondary">{products.filter(p => p.stock < 10)[0]?.categoria || 'General'}</span> para evitar quiebres de stock.
                </>
              ) : (
                <>¡Excelente! Todo tu inventario se encuentra en niveles óptimos. Haz clic abajo para revisar el análisis.</>
              )}
            </p>
          </div>
          <button 
            onClick={() => setShowOptimizationModal(true)}
            className="relative z-10 w-full bg-white text-brand-navy py-3.5 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group active:scale-95 duration-200 shadow-lg cursor-pointer"
          >
            Ver Recomendaciones de Compra
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        </div>
      </div>

      {/* Optimization & Reordering Modal */}
      {showOptimizationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-brand-navy text-white">
              <div>
                <h3 className="text-xl font-bold font-display">Optimización de Inventario</h3>
                <p className="text-xs text-white/70 mt-1">Análisis detallado de categorías y stock para reabastecimiento.</p>
              </div>
              <button 
                onClick={() => setShowOptimizationModal(false)} 
                className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              {/* 1. Categories List */}
              <div>
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <List className="w-4 h-4 text-brand-primary" /> Categorías Disponibles ({categories.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <span 
                        key={cat} 
                        className="px-3 py-1.5 bg-slate-100 text-[#091426] rounded-lg text-xs font-bold uppercase tracking-wider border border-slate-200"
                      >
                        {cat}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No hay categorías registradas.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 2. Lowest Stock Products */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500" /> Productos con Menor Stock
                  </h4>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                    {products.length > 0 ? (
                      [...products]
                        .sort((a, b) => a.stock - b.stock)
                        .slice(0, 5)
                        .map((prod) => (
                          <div key={prod.id} className="flex justify-between items-center text-sm">
                            <span className="font-medium text-[#091426] truncate max-w-[150px]">{prod.nombre}</span>
                            <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                              prod.stock === 0 ? 'bg-rose-100 text-rose-700' :
                              prod.stock < 10 ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {prod.stock} u.
                            </span>
                          </div>
                        ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No hay productos cargados.</p>
                    )}
                  </div>
                </div>

                {/* 3. Most Sold Products */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-500" /> Productos Más Vendidos
                  </h4>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                    {mostSoldProducts.length > 0 ? (
                      mostSoldProducts.map((prod) => (
                        <div key={prod.id} className="flex justify-between items-center text-sm">
                          <span className="font-medium text-[#091426] truncate max-w-[150px]">{prod.nombre}</span>
                          <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-xs">
                            {prod.cantidad} vendidas
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">Aún no se registran ventas para este negocio.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowOptimizationModal(false)}
                className="px-6 py-2.5 bg-brand-navy text-white font-bold text-xs uppercase rounded-lg hover:opacity-90 transition-all cursor-pointer shadow-md"
              >
                Cerrar Análisis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
