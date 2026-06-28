import React, { useState, useMemo, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Product, Client } from '../types';
import { useCompany } from '../context/CompanyContext';
import { formatCOP } from '../lib/formatCurrency';

interface NewSaleProps {
  onCancel: () => void;
  onFinish: () => void;
  onCreateClient?: () => void;
  user: User;
}

interface CartItem {
  product: Product;
  quantity: number;
}

type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';

export const NewSale: React.FC<NewSaleProps> = ({ onCancel, onFinish, user }) => {
  const { activeCompany } = useCompany();
  
  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // POS States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  
  // Client selection with search text
  const [clientSearchText, setClientSearchText] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // New Customer Modal
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Payment configuration
  const [discountPercent, setDiscountPercent] = useState(0); // 0, 5, 10, 15, 20
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');

  // Tax / IVA settings state
  const [applyIva] = useState(localStorage.getItem('resger_iva_enabled') !== 'false');
  const ivaRate = Number(localStorage.getItem('resger_iva_rate') || '19');

  // Receipt Modal
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeCompany) {
      fetchData();
    }
  }, [activeCompany]);

  const fetchData = async () => {
    if (!activeCompany) return;
    setLoading(true);
    const [clientsRes, productsRes] = await Promise.all([
      supabase.from('clientes').select('*').eq('company_id', activeCompany.id).order('nombre'),
      supabase.from('productos').select('*').eq('company_id', activeCompany.id).order('nombre')
    ]);

    if (clientsRes.data) setClients(clientsRes.data);
    if (productsRes.data) setProducts(productsRes.data);
    setLoading(false);
  };

  // 1. Get Categories
  const categories = useMemo(() => {
    const list = new Set<string>();
    products.forEach(p => { if (p.categoria) list.add(p.categoria); });
    return ['Todos', ...Array.from(list)];
  }, [products]);

  // 2. Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'Todos' || p.categoria === selectedCategory;
      const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.categoria && p.categoria.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // 3. Client Search Dropdown
  const clientSuggestions = useMemo(() => {
    if (!clientSearchText.trim()) return [];
    return clients.filter(c => 
      c.nombre.toLowerCase().includes(clientSearchText.toLowerCase()) ||
      (c.telefono && c.telefono.includes(clientSearchText)) ||
      (c.email && c.email.toLowerCase().includes(clientSearchText.toLowerCase()))
    ).slice(0, 5);
  }, [clientSearchText, clients]);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientSearchText(client.nombre);
    setShowClientDropdown(false);
  };

  // 4. Cart Operations
  const handleAddToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty >= product.stock) {
      alert(`Lo sentimos, solo quedan ${product.stock} unidades disponibles de este producto.`);
      return;
    }

    if (existing) {
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      setCart(cart.filter(i => i.product.id !== productId));
      return;
    }

    if (delta > 0 && newQty > item.product.stock) {
      alert(`Límite de inventario alcanzado. Solo hay ${item.product.stock} unidades en stock.`);
      return;
    }

    setCart(cart.map(i => 
      i.product.id === productId 
        ? { ...i, quantity: newQty } 
        : i
    ));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountPercent(0);
    setSelectedClient(null);
    setClientSearchText('');
  };

  // 5. Cart Financial Summary
  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + (item.product.precio * item.quantity), 0);
    const taxes = applyIva ? subtotal * (ivaRate / 100) : 0;
    const preDiscountTotal = subtotal + taxes;
    const discountAmount = (preDiscountTotal * discountPercent) / 100;
    const total = preDiscountTotal - discountAmount;

    return { subtotal, taxes, discountAmount, total };
  }, [cart, discountPercent, applyIva, ivaRate]);

  // 6. Checkout
  const handleCheckout = async () => {
    if (cart.length === 0 || !activeCompany) return;

    // Verify stock
    for (const item of cart) {
      const dbProd = products.find(p => p.id === item.product.id);
      if (!dbProd || dbProd.stock < item.quantity) {
        alert(`Error: El producto '${item.product.nombre}' ya no cuenta con suficiente stock (${dbProd?.stock || 0} disponibles).`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Insert Sale
      const salePayload = {
        cliente_id: selectedClient ? selectedClient.id : null,
        total: totals.total,
        user_id: user.id,
        company_id: activeCompany.id,
        manual_name: selectedClient ? null : clientSearchText || 'Mostrador',
        metodo_pago: paymentMethod,
        descuento: totals.discountAmount,
      };

      const { data: saleData, error: saleError } = await supabase
        .from('ventas')
        .insert([salePayload])
        .select()
        .single();

      if (saleError) throw saleError;

      // 2. Insert Sale Items
      const saleItems = cart.map(item => ({
        venta_id: saleData.id,
        producto_id: item.product.id,
        cantidad: item.quantity,
        precio_unitario: item.product.precio
      }));

      const { error: itemsError } = await supabase
        .from('venta_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // 3. Update stock in DB & local state
      for (const item of cart) {
        await supabase
          .from('productos')
          .update({ stock: item.product.stock - item.quantity })
          .eq('id', item.product.id)
          .eq('company_id', activeCompany.id);
      }

      setProducts(products.map(p => {
        const cartItem = cart.find(ci => ci.product.id === p.id);
        if (cartItem) return { ...p, stock: p.stock - cartItem.quantity };
        return p;
      }));

      // 4. Show completed sale receipt
      setCompletedSale({
        id: saleData.id,
        date: new Date().toISOString().split('T')[0],
        items: cart.map(i => ({ name: i.product.nombre, quantity: i.quantity, price: i.product.precio, total: i.product.precio * i.quantity })),
        subtotal: totals.subtotal,
        taxes: totals.taxes,
        discount: discountPercent,
        discountAmount: totals.discountAmount,
        total: totals.total,
        customerName: selectedClient ? selectedClient.nombre : (clientSearchText || 'Venta Mostrador'),
        paymentMethod
      });

      // Reset
      setCart([]);
      setDiscountPercent(0);
      setSelectedClient(null);
      setClientSearchText('');
      setPaymentMethod('efectivo');

    } catch (err: any) {
      console.error('Checkout error:', err);
      alert('Error al registrar la venta: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Fast Inline Customer Creation
  const handleQuickCustomerCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim() || !newCustAddress.trim() || !activeCompany) {
      alert('El nombre, teléfono y dirección son obligatorios');
      return;
    }

    setIsSubmitting(true);
    const cleanEmail = newCustEmail.trim().toLowerCase() || null;
    const cleanTelefono = newCustPhone.trim() || null;

    const payload = {
      nombre: newCustName.trim(),
      email: cleanEmail,
      telefono: cleanTelefono,
      direccion: newCustAddress.trim(),
      company_id: activeCompany.id,
      user_id: user.id
    };

    const { data, error } = await supabase
      .from('clientes')
      .insert([payload])
      .select();

    if (error) {
      if (error.code === '23505') alert("Error: Teléfono o correo ya registrado.");
      else alert('Error al crear el cliente: ' + error.message);
    } else if (data) {
      const newClient = data[0];
      setClients([...clients, newClient]);
      handleSelectClient(newClient);
      
      setNewCustName('');
      setNewCustEmail('');
      setNewCustPhone('');
      setNewCustAddress('');
      setShowNewCustomerModal(false);
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return <div className="p-10 text-center text-[#434656] mt-16">Cargando catálogo...</div>;
  }

  return (
    <div className="p-8 max-w-[1440px] mx-auto mt-16 bg-[#f8f9fc] min-h-screen">
      
      {/* HEADER */}
      <div className="flex items-center gap-2 mb-6 cursor-pointer" onClick={onCancel}>
        <span className="material-symbols-outlined text-gray-500">arrow_back</span>
        <h1 className="font-display text-xl font-black text-[#191b25]">Nueva Venta</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT: Products Selection Grid (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Search & Category Selector */}
          <div className="bg-white p-4 rounded-xl border border-[#c3c5d9]/30 shadow-xs space-y-3">
            <div className="relative">
              <span className="material-symbols-outlined text-[#737688] absolute left-3 top-2.5 text-lg">search</span>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto por nombre o categoría..."
                className="w-full bg-[#fbf8ff] border border-[#c3c5d9]/50 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#003ec7] transition-all"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-display whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat 
                      ? 'bg-[#003ec7] text-white' 
                      : 'bg-slate-100 text-[#434656] hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 custom-scrollbar max-h-[600px] overflow-y-auto pr-1 pb-4">
            {filteredProducts.map(prod => {
              const pStock = prod.stock || 0;
              const pMinStock = prod.stock_minimo || 10;
              const isOutOfStock = pStock <= 0;
              const isLowStock = pStock <= pMinStock && pStock > 0;
              
              return (
                <div 
                  key={prod.id}
                  onClick={() => !isOutOfStock && handleAddToCart(prod)}
                  className={`bg-white rounded-xl border p-4 flex flex-col justify-between h-44 cursor-pointer transition-all ${
                    isOutOfStock 
                      ? 'opacity-60 border-gray-200 cursor-not-allowed' 
                      : 'border-[#c3c5d9]/30 hover:border-[#003ec7] hover:shadow-md'
                  }`}
                >
                  <div className="space-y-1 text-left">
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-[9px] uppercase font-bold text-gray-400 font-display tracking-wider truncate">{prod.categoria || 'General'}</span>
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full font-display whitespace-nowrap ${
                        isOutOfStock 
                          ? 'bg-gray-100 text-gray-500' 
                          : isLowStock 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isOutOfStock ? 'Agotado' : isLowStock ? `Stock: ${pStock}` : `${pStock} u.`}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">{prod.nombre}</h3>
                    <p className="text-[10px] text-[#434656] line-clamp-2 leading-relaxed">{prod.descripcion}</p>
                  </div>
                  
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#c3c5d9]/10">
                    <span className="font-display font-black text-sm text-[#003ec7]">{formatCOP(prod.precio)}</span>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isOutOfStock 
                        ? 'bg-gray-100 text-gray-400' 
                        : 'bg-[#003ec7]/10 text-[#003ec7] hover:bg-[#003ec7] hover:text-white'
                    }`}>
                      <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full bg-white p-12 text-center border border-dashed border-[#c3c5d9] rounded-2xl">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">search_off</span>
                <p className="text-xs text-[#434656] font-bold">No se encontraron productos</p>
                <p className="text-[10px] text-gray-400 mt-1">Prueba cambiando la categoría o término de búsqueda.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Active Cart Checkout Panel (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#c3c5d9]/30 shadow-xs p-5 flex flex-col justify-between min-h-[500px]">
          <div className="space-y-4">
            
            {/* Header configuration */}
            <div className="pb-3 border-b border-[#c3c5d9]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-400 font-display tracking-wider">Punto de Venta</span>
                <h2 className="font-display font-black text-sm text-gray-900 leading-tight">Carrito de Compras</h2>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="space-y-3 custom-scrollbar max-h-48 overflow-y-auto pr-1">
              {cart.length > 0 ? (
                cart.map(item => (
                  <div key={item.product.id} className="flex items-center justify-between p-2 bg-[#fbf8ff] rounded-lg border border-gray-100">
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="text-xs font-bold text-gray-900 truncate">{item.product.nombre}</h4>
                      <span className="text-[10px] text-gray-500">{formatCOP(item.product.precio)} x {item.quantity}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-[#c3c5d9]/40 bg-white rounded-lg">
                        <button 
                          onClick={() => handleUpdateQty(item.product.id, -1)}
                          className="px-2 py-0.5 text-xs font-bold text-gray-600 hover:bg-slate-50 border-r border-gray-100 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2.5 text-xs font-black text-gray-800">{item.quantity}</span>
                        <button 
                          onClick={() => handleUpdateQty(item.product.id, 1)}
                          className="px-2 py-0.5 text-xs font-bold text-gray-600 hover:bg-slate-50 border-l border-gray-100 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right w-14 font-display font-black text-xs text-gray-900">
                        {formatCOP(item.product.precio * item.quantity)}
                      </div>

                      <button 
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-gray-300 mb-1">shopping_cart</span>
                  <p className="text-xs text-gray-400 font-bold">El carrito está vacío</p>
                  <p className="text-[10px] text-gray-400 max-w-[180px] mt-1">Haz clic en los productos para agregarlos.</p>
                </div>
              )}
            </div>

            {/* Customer Search (Dynamic) */}
            <div className="pt-2 border-t border-[#c3c5d9]/10 relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] uppercase font-bold text-[#434656] font-display">Asignar Cliente</label>
                <button 
                  onClick={() => setShowNewCustomerModal(true)}
                  className="text-[10px] text-[#003ec7] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[11px]">add</span>
                  Nuevo Cliente
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined text-gray-400 absolute left-2.5 top-2 text-sm">person_search</span>
                <input 
                  type="text"
                  placeholder="Escribe nombre o elige Mostrador..."
                  value={clientSearchText}
                  onChange={(e) => {
                    setClientSearchText(e.target.value);
                    setSelectedClient(null); // Clear selection if typing again
                    setShowClientDropdown(true);
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  className="w-full bg-[#fbf8ff] border border-[#c3c5d9]/40 rounded-lg pl-8 pr-8 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#003ec7] transition-all"
                />
                {selectedClient && (
                  <button 
                    onClick={() => { setSelectedClient(null); setClientSearchText(''); }}
                    className="absolute right-2 top-1.5 text-gray-400 hover:text-red-500 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>

              {showClientDropdown && clientSearchText && !selectedClient && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto custom-scrollbar">
                  {clientSuggestions.length > 0 ? (
                    clientSuggestions.map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => handleSelectClient(c)}
                        className="px-3 py-2 text-xs hover:bg-slate-50 cursor-pointer border-b border-gray-50 last:border-0"
                      >
                        <div className="font-bold text-gray-900">{c.nombre}</div>
                        <div className="text-[10px] text-gray-500">{c.telefono || c.email}</div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-[10px] text-gray-500 text-center">
                      No se encontraron clientes. Usa "Nuevo Cliente".
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="pt-2 border-t border-[#c3c5d9]/10">
              <label className="block text-[10px] uppercase font-bold text-[#434656] mb-1.5 font-display">Método de Pago</label>
              <div className="grid grid-cols-3 gap-2">
                {(['efectivo', 'tarjeta', 'transferencia'] as PaymentMethod[]).map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-display capitalize flex items-center justify-center gap-1 border ${
                      paymentMethod === method 
                        ? 'bg-[#003ec7] text-white border-[#003ec7]' 
                        : 'bg-white text-[#434656] border-[#c3c5d9]/50 hover:bg-slate-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {method === 'efectivo' ? 'payments' : method === 'tarjeta' ? 'credit_card' : 'account_balance'}
                    </span>
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Discount Selector */}
            <div className="pt-2 border-t border-[#c3c5d9]/10">
              <label className="block text-[10px] uppercase font-bold text-[#434656] mb-1.5 font-display">Aplicar Descuento</label>
              <div className="grid grid-cols-5 gap-1.5">
                {[0, 5, 10, 15, 20].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setDiscountPercent(pct)}
                    className={`py-1 rounded text-xs font-bold transition-all cursor-pointer font-display ${
                      discountPercent === pct 
                        ? 'bg-[#003ec7] text-white' 
                        : 'bg-slate-100 text-[#434656] hover:bg-slate-200'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Totals Summary and Checkout Actions */}
          <div className="mt-6 pt-4 border-t border-[#c3c5d9]/20 space-y-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-xs text-[#434656]">
                <span>Subtotal:</span>
                <span>{formatCOP(totals.subtotal)}</span>
              </div>
              {applyIva && (
                <div className="flex justify-between text-xs text-[#434656]">
                  <span>IVA ({ivaRate}%):</span>
                  <span>{formatCOP(totals.taxes)}</span>
                </div>
              )}
              {discountPercent > 0 && (
                <div className="flex justify-between text-xs text-[#ba1a1a] font-medium">
                  <span>Descuento ({discountPercent}%):</span>
                  <span>-{formatCOP(totals.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-gray-900 border-t border-dashed border-[#c3c5d9]/20 pt-1.5">
                <span>Total a Pagar:</span>
                <span className="text-[#003ec7]">{formatCOP(totals.total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleClearCart}
                disabled={cart.length === 0}
                className="py-3 px-4 border border-[#c3c5d9] rounded-xl text-xs font-bold text-[#434656] hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Limpiar
              </button>
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isSubmitting}
                className="py-3 px-4 bg-[#003ec7] hover:bg-[#0052ff] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                {isSubmitting ? 'Procesando...' : (
                  <>
                    <span className="material-symbols-outlined text-sm">receipt</span>
                    Cobrar Venta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* MODAL: Add New Customer Quick Form */}
        {showNewCustomerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#c3c5d9]/40 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-display font-extrabold text-gray-900 text-base">Crear Nuevo Cliente</h3>
                    <p className="text-xs text-slate-500 mt-1">Completa los datos para registrar un nuevo cliente y seguir con la venta.</p>
                  </div>
                  <button 
                    onClick={() => setShowNewCustomerModal(false)}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleQuickCustomerCreate} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-[10px] font-semibold text-[#434656] uppercase tracking-widest font-display">Nombre Completo *</label>
                    <input 
                      type="text"
                      required
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      placeholder="Ej: Juan Carlos Pérez"
                      className="w-full bg-[#fbf8ff] border border-[#c3c5d9]/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#003ec7]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-semibold text-[#434656] uppercase tracking-widest font-display">Teléfono *</label>
                    <input 
                      type="tel"
                      required
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      placeholder="Ej: 555-0123"
                      className="w-full bg-[#fbf8ff] border border-[#c3c5d9]/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#003ec7]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-semibold text-[#434656] uppercase tracking-widest font-display">Correo Electrónico</label>
                    <input 
                      type="email"
                      value={newCustEmail}
                      onChange={(e) => setNewCustEmail(e.target.value)}
                      placeholder="Ej: juan.perez@correo.com"
                      className="w-full bg-[#fbf8ff] border border-[#c3c5d9]/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#003ec7]"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-[10px] font-semibold text-[#434656] uppercase tracking-widest font-display">Dirección *</label>
                    <input 
                      type="text"
                      required
                      value={newCustAddress}
                      onChange={(e) => setNewCustAddress(e.target.value)}
                      placeholder="Ej: Calle Gran Vía 12, Madrid"
                      className="w-full bg-[#fbf8ff] border border-[#c3c5d9]/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#003ec7]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3 border-t border-slate-100 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowNewCustomerModal(false)}
                    disabled={isSubmitting}
                    className="w-1/2 py-2.5 border border-[#c3c5d9] text-[#434656] rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-1/2 py-2.5 bg-[#003ec7] hover:bg-[#0052ff] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">save</span>
                    Guardar Cliente
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Printable Receipt Simulator */}
        {completedSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#c3c5d9]/40 relative overflow-hidden">
              
              {/* Header Success Accent banner */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-[#006c4b]"></div>

              <div className="text-center pb-4 border-b border-dashed border-[#c3c5d9]/30">
                <span className="material-symbols-outlined text-4xl text-[#006c4b] mb-1">check_circle</span>
                <h3 className="font-display font-black text-[#191b25] text-base leading-tight">¡Cobro Exitoso!</h3>
                <p className="text-[10px] text-gray-500 mt-1">Transacción registrada en la base de datos</p>
              </div>

              {/* Simulated Ticket layout */}
              <div className="py-4 font-mono text-xs text-gray-800 space-y-4">
                <div className="text-center space-y-1">
                  <div className="font-bold text-sm tracking-widest text-black uppercase">{activeCompany?.nombre || 'Mi Negocio'}</div>
                  <div className="text-[9px] text-[#434656]">Fecha: {completedSale.date}</div>
                  <div className="text-[9px] text-[#434656]">Ticket: #{completedSale.id.substring(0,8)}...</div>
                </div>

                <div className="space-y-1 text-[10px] border-y border-dashed border-[#c3c5d9]/30 py-2">
                  <div className="flex justify-between font-bold text-gray-900 mb-1">
                    <span>DESCRIPCIÓN</span>
                    <span>CANT x PRECIO = TOTAL</span>
                  </div>
                  {completedSale.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-gray-700">
                      <span className="truncate pr-2 max-w-[150px]">{item.name}</span>
                      <span className="shrink-0">{item.quantity} x {formatCOP(item.price)} = {formatCOP(item.total)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 text-right text-[11px] font-bold">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal:</span>
                    <span>{formatCOP(completedSale.subtotal)}</span>
                  </div>
                  {applyIva && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">IVA ({ivaRate}%):</span>
                      <span>{formatCOP(completedSale.taxes)}</span>
                    </div>
                  )}
                  {completedSale.discount > 0 && (
                    <div className="flex justify-between text-[#ba1a1a]">
                      <span>Descuento ({completedSale.discount}%):</span>
                      <span>-{formatCOP(completedSale.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-black text-xs pt-1.5 border-t border-dashed border-[#c3c5d9]/30 font-black">
                    <span>TOTAL PAGADO:</span>
                    <span>{formatCOP(completedSale.total)}</span>
                  </div>
                </div>

                <div className="text-center text-[9px] text-[#434656] pt-2 space-y-1">
                  <div>Cliente: {completedSale.customerName}</div>
                  <div className="uppercase">Pago en: {completedSale.paymentMethod}</div>
                  <div className="font-bold tracking-wider pt-2">*** GRACIAS POR SU COMPRA ***</div>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button 
                  onClick={() => {
                    alert("Se ha enviado el ticket a la impresora configurada.");
                  }}
                  className="w-1/2 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  Imprimir
                </button>
                <button 
                  onClick={() => {
                    setCompletedSale(null);
                    onFinish(); // Go to history or clear view
                  }}
                  className="w-1/2 py-2 bg-[#003ec7] hover:bg-[#0052ff] text-white rounded-lg text-xs font-bold hover:shadow transition-all text-center cursor-pointer"
                >
                  Cerrar Ticket
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
