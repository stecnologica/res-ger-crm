import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Product, Client } from '../types';
import { useCompany } from '../context/CompanyContext';
import { formatCOP } from '../lib/formatCurrency';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';
import { AnimatePresence, motion } from 'motion/react';

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
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
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

  // Mostrador manual fields (just for this sale)
  const [clientAssignMode, setClientAssignMode] = useState<'registered' | 'mostrador'>('registered');
  const [counterName, setCounterName] = useState('');
  const [isCounterConfirmed, setIsCounterConfirmed] = useState(false);
  const [manualPhone, setManualPhone] = useState('');
  const [manualAddress, setManualAddress] = useState('');

  // Payment configuration
  const [discountPercent, setDiscountPercent] = useState(0); // 0, 5, 10, 15, 20
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [observaciones, setObservaciones] = useState('');

  // Tax / IVA settings state
  const [applyIva] = useState(localStorage.getItem('resger_iva_enabled') !== 'false');
  const ivaRate = Number(localStorage.getItem('resger_iva_rate') || '19');

  // Receipt Modal
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cartRef = useRef<HTMLDivElement>(null);
  const [isCartVisible, setIsCartVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCartVisible(entry.isIntersecting);
      },
      { threshold: 0 } // Se activa de inmediato cuando cualquier píxel entra en el viewport
    );

    if (cartRef.current) {
      observer.observe(cartRef.current);
    }

    return () => {
      if (cartRef.current) {
        observer.unobserve(cartRef.current);
      }
    };
  }, []);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
    setManualPhone('');
    setManualAddress('');
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
      // Determine final customer details
      let finalCustomerName = 'Mostrador';
      let finalCustomerPhone: string | null = null;
      let finalCustomerAddress: string | null = null;

      if (selectedClient) {
        finalCustomerName = selectedClient.nombre;
        finalCustomerPhone = selectedClient.telefono || null;
        finalCustomerAddress = selectedClient.direccion || null;
      } else if (isCounterConfirmed && counterName.trim()) {
        finalCustomerName = counterName.trim();
        finalCustomerPhone = manualPhone.trim() || null;
        finalCustomerAddress = manualAddress.trim() || null;
      } else if (clientSearchText.trim()) {
        finalCustomerName = clientSearchText.trim();
        finalCustomerPhone = manualPhone.trim() || null;
        finalCustomerAddress = manualAddress.trim() || null;
      }

      // 1. Insert Sale
      const salePayload = {
        cliente_id: selectedClient ? selectedClient.id : null,
        total: totals.total,
        user_id: user.id,
        company_id: activeCompany.id,
        manual_name: selectedClient ? null : finalCustomerName,
        manual_phone: selectedClient ? null : finalCustomerPhone,
        manual_address: selectedClient ? null : finalCustomerAddress,
        notas: observaciones.trim() || null,
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
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone,
        customerAddress: finalCustomerAddress,
        observaciones: observaciones.trim(),
        paymentMethod,
      });

      // Reset
      setCart([]);
      setDiscountPercent(0);
      setSelectedClient(null);
      setClientSearchText('');
      setCounterName('');
      setIsCounterConfirmed(false);
      setManualPhone('');
      setManualAddress('');
      setObservaciones('');
      setPaymentMethod('efectivo');
      setObservaciones('');
      setPaymentMethod('efectivo');

    } catch (err: any) {
      console.error('Checkout error:', err);
      alert('Error al registrar la venta: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToCart = () => {
    setIsCartVisible(true);
    const cartElement = document.getElementById('cart-sidebar-section');
    if (cartElement) {
      cartElement.scrollIntoView({ behavior: 'smooth' });
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

  const handlePrintPDF = async () => {
    if (!completedSale || !activeCompany) return;
    
    try {
      // Usamos jsPDF para dibujar exactamente el diseño del ticket, sin depender de librerías de canvas que fallan con CSS moderno.
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200] // Formato ticket (80mm ancho x 200mm alto)
      });
      
      const width = doc.internal.pageSize.getWidth();
      let y = 0;

      // 1. Barra superior verde oscuro
      doc.setFillColor(0, 108, 75); // #006c4b
      doc.rect(0, y, width, 4, 'F');
      y += 12;

      // 2. Icono Check (Simulado con un círculo y texto)
      doc.setDrawColor(0, 108, 75);
      doc.setFillColor(255, 255, 255);
      doc.setLineWidth(0.7);
      doc.circle(width / 2, y, 4, 'FD');
      doc.setTextColor(0, 108, 75);
      doc.setFontSize(8);
      doc.text('v', width / 2 - 1, y + 1.5); // check symbol aproximado
      y += 10;

      // 3. Título Principal
      doc.setTextColor(25, 27, 37); // #191b25
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('¡Cobro Exitoso!', width / 2, y, { align: 'center' });
      y += 5;

      // 4. Subtítulo
      doc.setTextColor(115, 118, 136); // text-gray-500
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Transacción registrada en la base de datos', width / 2, y, { align: 'center' });
      y += 8;

      // Línea punteada
      const drawDashedLine = (yPos: number) => {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(5, yPos, width - 5, yPos);
        doc.setLineDashPattern([], 0); // reset
      };
      
      drawDashedLine(y);
      y += 8;

      // 5. Datos de la empresa y ticket
      doc.setTextColor(0, 0, 0);
      doc.setFont('courier', 'bold');
      doc.setFontSize(12);
      doc.text((activeCompany.nombre || 'MI NEGOCIO').toUpperCase(), width / 2, y, { align: 'center' });
      y += 5;
      
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.text(`Fecha: ${completedSale.date}`, width / 2, y, { align: 'center' });
      y += 4;
      doc.text(`Ticket: #${completedSale.id.substring(0,8)}...`, width / 2, y, { align: 'center' });
      y += 8;

      drawDashedLine(y);
      y += 6;

      // 6. Encabezados de Tabla
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.text('DESCRIPCIÓN', 5, y);
      doc.text('CANT x PRECIO = TOTAL', width - 5, y, { align: 'right' });
      y += 5;

      // 7. Ítems
      doc.setFont('courier', 'normal');
      completedSale.items.forEach((item: any) => {
        // Truncar nombre si es muy largo
        let name = item.name;
        if (name.length > 15) name = name.substring(0, 15) + '...';
        
        doc.text(name, 5, y);
        const calc = `${item.quantity} x ${formatCOP(item.price)} = ${formatCOP(item.total)}`;
        doc.text(calc, width - 5, y, { align: 'right' });
        y += 5;
      });

      y += 3;
      drawDashedLine(y);
      y += 6;

      // 8. Totales
      doc.setFont('courier', 'bold');
      
      doc.setTextColor(100, 100, 100);
      doc.text('Subtotal:', 5, y);
      doc.setTextColor(0, 0, 0);
      doc.text(formatCOP(completedSale.subtotal), width - 5, y, { align: 'right' });
      y += 5;
      
      if (applyIva) {
        doc.setTextColor(100, 100, 100);
        doc.text(`IVA (${ivaRate}%):`, 5, y);
        doc.setTextColor(0, 0, 0);
        doc.text(formatCOP(completedSale.taxes), width - 5, y, { align: 'right' });
        y += 5;
      }
      
      if (completedSale.discount > 0) {
        doc.setTextColor(100, 100, 100);
        doc.text(`Descuento (${completedSale.discount}%):`, 5, y);
        doc.setTextColor(186, 26, 26); // text-[#ba1a1a]
        doc.text(`-${formatCOP(completedSale.discountAmount)}`, width - 5, y, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        y += 5;
      }
      
      y += 2;
      doc.setFontSize(10);
      doc.text('TOTAL PAGADO:', 5, y);
      doc.text(formatCOP(completedSale.total), width - 5, y, { align: 'right' });
      y += 10;
      
      // 9. Info Final (Cliente, Dirección, Teléfono, Observaciones, Pago)
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 50);

      doc.text(`Cliente: ${completedSale.customerName}`, width / 2, y, { align: 'center' });
      y += 4;
      if (completedSale.customerPhone) {
        doc.text(`Teléfono: ${completedSale.customerPhone}`, width / 2, y, { align: 'center' });
        y += 4;
      }
      if (completedSale.customerAddress) {
        const splitAddr = doc.splitTextToSize(`Dirección: ${completedSale.customerAddress}`, width - 10);
        doc.text(splitAddr, width / 2, y, { align: 'center' });
        y += (splitAddr.length * 4);
      }

      if (completedSale.observaciones) {
        y += 2;
        doc.setFont('courier', 'bold');
        doc.text('Obs:', 5, y);
        doc.setFont('courier', 'normal');
        const splitObs = doc.splitTextToSize(completedSale.observaciones, width - 18);
        doc.text(splitObs, 15, y);
        y += (splitObs.length * 3.5) + 2;
      }

      y += 2;
      doc.text(`PAGO EN: ${completedSale.paymentMethod.toUpperCase()}`, width / 2, y, { align: 'center' });
      y += 8;
      
      doc.setFont('courier', 'bold');
      doc.text('*** GRACIAS POR SU COMPRA ***', width / 2, y, { align: 'center' });

      doc.save(`Factura_${completedSale.id.substring(0,8)}.pdf`);
    } catch (error) {
      console.error("Error generating PDF", error);
      alert("Hubo un error al generar el PDF.");
    }
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-2 min-h-[400px] content-start">
            {paginatedProducts.map(prod => {
              const pStock = prod.stock || 0;
              const pMinStock = prod.stock_minimo || 10;
              const isOutOfStock = pStock <= 0;
              const isLowStock = pStock <= pMinStock && pStock > 0;
              
              const qtyInCart = cart.find(ci => ci.product.id === prod.id)?.quantity || 0;
              
              return (
                <div 
                  key={prod.id}
                  onClick={() => !isOutOfStock && handleAddToCart(prod)}
                  className={`rounded-xl border p-4 flex flex-col justify-between h-44 cursor-pointer transition-all active:scale-95 duration-100 ${
                    isOutOfStock 
                      ? 'bg-white opacity-60 border-gray-200 cursor-not-allowed' 
                      : qtyInCart > 0
                        ? 'bg-[#003ec7]/5 border-[#003ec7] shadow-sm ring-1 ring-[#003ec7]/20'
                        : 'bg-white border-[#c3c5d9]/30 hover:border-[#003ec7] hover:shadow-md'
                  }`}
                >
                  <div className="space-y-1 text-left">
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-[9px] uppercase font-bold text-gray-400 font-display tracking-wider truncate">{prod.categoria || 'General'}</span>
                      <div className="flex gap-1 items-center shrink-0">
                        {qtyInCart > 0 && (
                          <span className="bg-[#003ec7] text-white text-[8px] font-black px-2 py-0.5 rounded-full font-display">
                            {qtyInCart} en carrito
                          </span>
                        )}
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
                    </div>
                    <h3 className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">{prod.nombre}</h3>
                    <p className="text-[10px] text-[#434656] line-clamp-2 leading-relaxed">{prod.descripcion}</p>
                  </div>
                  
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#c3c5d9]/10">
                    <span className="font-display font-black text-sm text-[#003ec7]">{formatCOP(prod.precio)}</span>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isOutOfStock 
                        ? 'bg-gray-100 text-gray-400' 
                        : qtyInCart > 0
                          ? 'bg-[#003ec7] text-white'
                          : 'bg-[#003ec7]/10 text-[#003ec7] hover:bg-[#003ec7] hover:text-white'
                    }`}>
                      <span className="material-symbols-outlined text-sm">
                        {qtyInCart > 0 ? 'done' : 'add_shopping_cart'}
                      </span>
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-2 bg-white p-3 rounded-xl border border-[#c3c5d9]/30">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-50 border border-slate-200 text-[#434656] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
                Anterior
              </button>
              <span className="text-xs font-bold text-[#434656] bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                Página {currentPage} de {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-50 border border-slate-200 text-[#434656] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
              >
                Siguiente
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Active Cart Checkout Panel (5 cols) */}
        <div id="cart-sidebar-section" ref={cartRef} className="lg:col-span-5 bg-white rounded-xl border border-[#c3c5d9]/30 shadow-xs p-5 flex flex-col justify-between min-h-[500px]">
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

            {/* Customer Search & Assignment Section */}
            <div className="pt-2 border-t border-[#c3c5d9]/10 relative">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] uppercase font-bold text-[#434656] font-display">Asignar Cliente</label>
                {clientAssignMode === 'registered' && !selectedClient && !isCounterConfirmed && (
                  <button 
                    type="button"
                    onClick={() => setShowNewCustomerModal(true)}
                    className="text-[10px] text-[#003ec7] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[11px]">add</span>
                    Nuevo Cliente
                  </button>
                )}
              </div>

              {selectedClient ? (
                /* Card: Registered Client Confirmed */
                <div className="bg-[#003ec7]/5 border border-[#003ec7]/20 p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-[#003ec7] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      <span className="material-symbols-outlined text-base">person</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{selectedClient.nombre}</p>
                      <p className="text-[10px] text-gray-500 truncate">{selectedClient.telefono || selectedClient.email || 'Cliente Registrado'}</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => { setSelectedClient(null); setClientSearchText(''); }}
                    className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-white transition-all shrink-0 cursor-pointer"
                    title="Cambiar cliente"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ) : isCounterConfirmed ? (
                /* Card: Counter Client Confirmed */
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      <span className="material-symbols-outlined text-base">storefront</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{counterName || 'Cliente Mostrador'}</p>
                      <p className="text-[10px] text-amber-900 truncate">
                        {manualPhone ? `Tel: ${manualPhone}` : ''} {manualAddress ? `| Dir: ${manualAddress}` : ''} {!manualPhone && !manualAddress ? 'Venta Mostrador Confirmada' : ''}
                      </p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => { setIsCounterConfirmed(false); }}
                    className="p-1 text-gray-400 hover:text-amber-800 rounded-lg hover:bg-white transition-all shrink-0 cursor-pointer"
                    title="Editar cliente mostrador"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                </div>
              ) : (
                /* Client Assignment Form with Mode Tabs */
                <div className="space-y-3">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setClientAssignMode('registered')}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        clientAssignMode === 'registered' ? 'bg-white text-[#003ec7] shadow-xs font-black' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">search</span>
                      Buscar Registrado
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientAssignMode('mostrador')}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        clientAssignMode === 'mostrador' ? 'bg-white text-amber-700 shadow-xs font-black' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">storefront</span>
                      Venta Mostrador
                    </button>
                  </div>

                  {clientAssignMode === 'registered' ? (
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737688] text-lg">person</span>
                      <input 
                        type="text" 
                        value={clientSearchText}
                        onChange={(e) => {
                          setClientSearchText(e.target.value);
                          setShowClientDropdown(true);
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        placeholder="Buscar cliente registrado por nombre..."
                        className="w-full bg-[#fbf8ff] border border-[#c3c5d9] rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-[#003ec7] transition-all font-medium text-[#191b25]"
                      />

                      {showClientDropdown && clientSearchText && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto custom-scrollbar">
                          {clientSuggestions.length > 0 ? (
                            clientSuggestions.map(c => (
                              <div 
                                key={c.id} 
                                onClick={() => {
                                  handleSelectClient(c);
                                  setShowClientDropdown(false);
                                }}
                                className="px-3 py-2 text-xs hover:bg-slate-50 cursor-pointer border-b border-gray-50 last:border-0"
                              >
                                <div className="font-bold text-gray-900">{c.nombre}</div>
                                <div className="text-[10px] text-gray-500">{c.telefono || c.email}</div>
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-[10px] text-gray-500 text-center">
                              No se encontraron clientes registrados.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Mostrador Form */
                    <div className="space-y-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#434656] font-display mb-1">Nombre Cliente Mostrador *</label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737688] text-sm">badge</span>
                          <input 
                            type="text" 
                            value={counterName}
                            onChange={(e) => setCounterName(e.target.value)}
                            placeholder="Ej: Carlos Ruiz / Cliente Anónimo"
                            className="w-full bg-white border border-[#c3c5d9]/60 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#003ec7] transition-all font-medium text-[#191b25]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Teléfono (Opcional)</label>
                          <input
                            type="text"
                            value={manualPhone}
                            onChange={(e) => setManualPhone(e.target.value)}
                            placeholder="Para la factura..."
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#003ec7]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Dirección (Opcional)</label>
                          <input
                            type="text"
                            value={manualAddress}
                            onChange={(e) => setManualAddress(e.target.value)}
                            placeholder="Para entrega..."
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#003ec7]"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!counterName.trim()) setCounterName('Cliente Mostrador');
                          setIsCounterConfirmed(true);
                        }}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 mt-1"
                      >
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Confirmar Cliente Mostrador
                      </button>
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

            {/* Observaciones / Notas */}
            <div className="pt-2 border-t border-[#c3c5d9]/10">
              <label className="block text-[10px] uppercase font-bold text-[#434656] mb-1.5 font-display">Observaciones / Notas de la Venta</label>
              <textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: Entregar después de las 2 PM, o notas de entrega..."
                className="w-full bg-[#fbf8ff] border border-[#c3c5d9]/50 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#003ec7] transition-all text-[#191b25] placeholder:text-[#737688]/60"
              />
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
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#c3c5d9]/40 relative overflow-hidden flex flex-col">
              
              {/* Contenido a imprimir (ocultamos sombra aquí para el canvas) */}
              <div id="receipt-content-to-print" className="bg-white relative">
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
                  <div className="font-bold text-gray-800 uppercase text-[10px]">Datos del Cliente</div>
                  <div><span className="font-semibold">Cliente:</span> {completedSale.customerName}</div>
                  {completedSale.customerPhone && <div><span className="font-semibold">Teléfono:</span> {completedSale.customerPhone}</div>}
                  {completedSale.customerAddress && <div><span className="font-semibold">Dirección:</span> {completedSale.customerAddress}</div>}
                  
                  {completedSale.observaciones && (
                    <div className="text-left bg-slate-50 p-2 rounded-lg border border-slate-200 mt-2">
                      <span className="font-bold text-gray-700 block">Observaciones:</span>
                      <span className="text-gray-600 italic whitespace-pre-wrap">{completedSale.observaciones}</span>
                    </div>
                  )}

                  <div className="uppercase pt-2">Pago en: {completedSale.paymentMethod}</div>
                  <div className="font-bold tracking-wider pt-2 text-black">*** GRACIAS POR SU COMPRA ***</div>
                </div>
              </div>
              {/* Fin de contenido a imprimir */}
              </div>

              <div className="flex flex-col gap-2 mt-4">
                <button 
                  onClick={() => {
                    handlePrintPDF();
                    setCompletedSale(null);
                    onFinish();
                  }}
                  className="w-full py-3 bg-[#003ec7] hover:bg-[#0052ff] text-white rounded-lg text-sm font-black hover:shadow transition-all text-center cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  Cerrar e Imprimir Factura (PDF)
                </button>
                <button 
                  onClick={() => {
                    setCompletedSale(null);
                    onFinish();
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                >
                  Solo Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Cart Bar (Visible only on mobile/tablet, hidden on desktop and when cart checkout panel is visible) */}
        {cart.length > 0 && !isCartVisible && (
          <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden transition-all duration-300">
            <div 
              onClick={scrollToCart}
              className="bg-[#091426] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between border border-white/10 cursor-pointer hover:bg-slate-900 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#003ec7] flex items-center justify-center relative shrink-0">
                  <span className="material-symbols-outlined text-sm text-white font-bold">shopping_cart</span>
                  <span className="absolute -top-1.5 -right-1.5 bg-[#ba1a1a] text-[9px] font-black text-white w-4.5 h-4.5 rounded-full flex items-center justify-center">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Carrito de Compra</p>
                  <p className="text-xs font-black text-white">{formatCOP(totals.total)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1 text-[#003ec7] font-black text-[10px] uppercase tracking-wider bg-white px-3 py-1.5 rounded-xl font-display shadow-xs shrink-0">
                Ver Carrito
                <span className="material-symbols-outlined text-xs">arrow_downward</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
