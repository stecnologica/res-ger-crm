import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  ChevronRight, 
  Search, 
  Barcode, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Building2,
  Info,
  ShieldCheck,
  Plus,
  Minus,
  ShoppingCart,
  Package,
  Printer,
  Download,
  CheckCircle2,
  X,
  Loader2,
  UserPlus
} from 'lucide-react';
import { Product, Client } from '../types';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

import { useCompany } from '../context/CompanyContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

interface NewSaleProps {
  onCancel: () => void;
  onFinish: () => void;
  onCreateClient?: () => void;
  user: User;
}

interface CartItem extends Product {
  quantity: number;
}

type PaymentMethod = 'card' | 'cash' | 'transfer';

export const NewSale: React.FC<NewSaleProps> = ({ onCancel, onFinish, onCreateClient, user }) => {
  const { activeCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('card');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [showInvoice, setShowInvoice] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (activeCompany) {
      fetchData();
    }
  }, [activeCompany]);

  const fetchData = async () => {
    if (!activeCompany) return;
    const [clientsRes, productsRes] = await Promise.all([
      supabase.from('clientes').select('*').eq('company_id', activeCompany.id).order('nombre'),
      supabase.from('productos').select('*').eq('company_id', activeCompany.id).order('nombre')
    ]);

    if (clientsRes.data) setClients(clientsRes.data);
    if (productsRes.data) setProducts(productsRes.data);
    if (clientsRes.data?.[0]) setSelectedClientId(clientsRes.data[0].id);
  };

  const selectedClient = useMemo(() => 
    clients.find(c => c.id === selectedClientId) || clients[0]
  , [selectedClientId, clients]);

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients.slice(0, 5);
    return clients.filter(c => 
      c.nombre.toLowerCase().includes(clientSearch.toLowerCase()) || 
      c.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (c.telefono && c.telefono.includes(clientSearch))
    );
  }, [clientSearch, clients]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.nombre.toLowerCase().includes(productSearch.toLowerCase());
      const matchesCategory = selectedCategory ? p.categoria === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [productSearch, selectedCategory, products]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.categoria).filter(c => c))) as string[];
  }, [products]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + (item.precio * item.quantity), 0);
    const taxes = subtotal * 0.19;
    const total = subtotal + taxes;
    return { subtotal, taxes, total };
  }, [cart]);

  const handleFinish = async () => {
    if (!activeCompany || cart.length === 0 || !selectedClientId) return;
    setLoading(true);

    try {
      // 1. Insert sale
      const { data: saleData, error: saleError } = await supabase
        .from('ventas')
        .insert([
          {
            cliente_id: isGuestMode ? null : selectedClientId,
            total: totals.total,
            user_id: user.id,
            company_id: activeCompany.id,
            manual_name: isGuestMode ? manualName : null,
            manual_address: isGuestMode ? manualAddress : null,
            manual_phone: isGuestMode ? manualPhone : null,
            notas: notes
          }
        ])
        .select()
        .single();

      if (saleError) throw saleError;

      // 2. Insert sale items
      const saleItems = cart.map(item => ({
        venta_id: saleData.id,
        producto_id: item.id,
        cantidad: item.quantity,
        precio_unitario: item.precio
      }));

      const { error: itemsError } = await supabase
        .from('venta_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // 3. Update product stock (simple way)
      for (const item of cart) {
        await supabase
          .from('productos')
          .update({ stock: item.stock - item.quantity })
          .eq('id', item.id);
      }

      setShowInvoice(true);
    } catch (err) {
      console.error('Error processing sale:', err);
      alert('Error al procesar la venta');
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoicePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(9, 20, 38);
    const companyName = activeCompany?.nombre || 'Factura';
    doc.text(companyName, 14, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('FACTURA', 14, 32);
    
    // Right side header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(9, 20, 38);
    const invoiceNum = `#TX-${Math.floor(Math.random() * 9999)}`;
    doc.text(invoiceNum, pageWidth - 14, 25, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(new Date().toLocaleString(), pageWidth - 14, 32, { align: 'right' });

    // Client Info Box
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(14, 42, pageWidth - 28, 40, 3, 3, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(148, 163, 184); 
    doc.text('FACTURAR A:', 20, 50);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(9, 20, 38);
    const clientName = isGuestMode ? manualName : (selectedClient?.nombre || 'Venta Rápida');
    doc.text(clientName || 'Cliente No Especificado', 20, 57);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105); 
    
    let currentY = 63;
    const email = isGuestMode ? '' : selectedClient?.email;
    if (email) { doc.text(`Email: ${email}`, 20, currentY); currentY += 5; }
    
    const address = isGuestMode ? manualAddress : selectedClient?.direccion;
    if (address) { doc.text(`Dir: ${address}`, 20, currentY); currentY += 5; }
    
    const phone = isGuestMode ? manualPhone : selectedClient?.telefono;
    if (phone) { doc.text(`Tel: ${phone}`, 20, currentY); }

    // Payment Info inside Box
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(148, 163, 184);
    doc.text('MÉTODO DE PAGO:', pageWidth - 20, 50, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    const paymentText = selectedPayment === 'card' ? 'Tarjeta de Crédito' : selectedPayment === 'cash' ? 'Efectivo' : 'Transferencia';
    
    doc.setFillColor(9, 20, 38); 
    const textWidth = doc.getTextWidth(paymentText.toUpperCase());
    doc.roundedRect(pageWidth - 20 - textWidth - 6, 53, textWidth + 6, 7, 3, 3, 'F');
    doc.text(paymentText.toUpperCase(), pageWidth - 20 - 3, 58, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Vendedor: ${user.user_metadata?.full_name || user.email || 'Admin'}`, pageWidth - 20, 68, { align: 'right' });

    // Table
    autoTable(doc, {
      startY: 90,
      head: [['Descripción', 'Cant.', 'Precio', 'Total']],
      body: cart.map(item => [
        item.nombre,
        item.quantity.toString(),
        `$${item.precio.toLocaleString('es-CO')}`,
        `$${(item.precio * item.quantity).toLocaleString('es-CO')}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [248, 250, 252], textColor: [9, 20, 38], fontStyle: 'bold', lineColor: [226, 232, 240] },
      bodyStyles: { textColor: [71, 85, 105], lineColor: [226, 232, 240] },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 6 },
      columnStyles: {
        0: { cellWidth: 'auto', fontStyle: 'bold', textColor: [9, 20, 38] },
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold', textColor: [9, 20, 38] }
      }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Observations
    if (notes) {
      doc.setDrawColor(253, 230, 138); // amber-200
      doc.setFillColor(255, 251, 235); // amber-50
      doc.roundedRect(14, finalY, 100, 30, 3, 3, 'FD');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(146, 64, 14); // amber-900
      doc.text('Observaciones del Pedido:', 18, finalY + 6);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      const splitNotes = doc.splitTextToSize(notes, 92);
      doc.text(splitNotes, 18, finalY + 12);
    }
    
    // Totals Box
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(pageWidth - 80, finalY, 66, 35, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Subtotal', pageWidth - 75, finalY + 8);
    doc.setTextColor(9, 20, 38);
    doc.text(`$${totals.subtotal.toLocaleString('es-CO')}`, pageWidth - 18, finalY + 8, { align: 'right' });
    
    doc.setTextColor(100, 116, 139);
    doc.text('IVA (19%)', pageWidth - 75, finalY + 15);
    doc.setTextColor(9, 20, 38);
    doc.text(`$${totals.taxes.toLocaleString('es-CO')}`, pageWidth - 18, finalY + 15, { align: 'right' });
    
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(pageWidth - 75, finalY + 20, pageWidth - 18, finalY + 20);
    
    doc.setFontSize(11);
    doc.text('Total Pago', pageWidth - 75, finalY + 28);
    doc.setFontSize(14);
    doc.text(`$${totals.total.toLocaleString('es-CO')}`, pageWidth - 18, finalY + 28, { align: 'right' });

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Gracias por su compra. Documento generado para ${companyName}.`, pageWidth / 2, 280, { align: 'center' });

    doc.save(`Factura_Venta_${Date.now()}.pdf`);
  };

  const printInvoice = () => {
    const printContent = document.getElementById('invoice-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes (pop-ups) para imprimir.');
      return;
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(style => style.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Factura de Venta</title>
          ${styles}
          <style>
            @media print {
              @page { margin: 1cm; }
              body { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
                background-color: white !important;
              }
            }
            body { background: white; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="max-w-[800px] mx-auto bg-white">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto mt-16 pb-20">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-slate-500 text-xs mb-2 uppercase font-bold tracking-widest">
          <span>Sales History</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#091426]">New Transaction</span>
        </div>
        <h2 className="text-3xl font-black text-[#091426] tracking-tight">Nueva Venta</h2>
        <p className="text-slate-500 font-medium">Complete los pasos para procesar una nueva orden de venta.</p>
      </header>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Step 1 */}
          <motion.section 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-black">1</span>
                <h3 className="font-bold text-slate-900">Selección de Cliente</h3>
              </div>
              <button 
                onClick={() => setIsGuestMode(!isGuestMode)}
                className={`text-[10px] font-black px-3 py-1.5 rounded-full transition-all tracking-widest border ${
                  isGuestMode 
                    ? 'bg-brand-navy text-white border-brand-navy shadow-lg shadow-brand-navy/20' 
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {isGuestMode ? '✓ CLIENTE NO REGISTRADO' : '+ VENTOR SIN REGISTRO'}
              </button>
            </div>
            <div className="p-6">
              {!isGuestMode ? (
                <>
                  <div className="flex gap-2 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input 
                        type="text" 
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Buscar por nombre, teléfono o correo..."
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-sm focus:border-[#091426] focus:ring-4 focus:ring-[#091426]/5 transition-all outline-none"
                      />
                    </div>
                    {onCreateClient && (
                      <button
                        onClick={onCreateClient}
                        className="px-4 py-3 bg-brand-primary text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md shadow-brand-primary/20 hover:opacity-90 transition-colors flex items-center gap-2"
                        title="Crear un nuevo cliente"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">Nuevo</span>
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {filteredClients.map((client) => (
                      <label 
                        key={client.id}
                        onClick={() => setSelectedClientId(client.id)}
                        className={`flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                          selectedClientId === client.id 
                            ? 'border-[#091426] bg-slate-50' 
                            : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="customer" 
                          checked={selectedClientId === client.id}
                          readOnly
                          className="text-[#091426] focus:ring-[#091426] h-4 w-4" 
                        />
                        <div className="ml-4">
                          <p className={`text-sm font-black ${selectedClientId === client.id ? 'text-[#091426]' : 'text-slate-700'}`}>{client.nombre}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">ID: {client.id.slice(0,8)} | {client.email}</p>
                        </div>
                        {selectedClientId === client.id && (
                          <span className="ml-auto text-[9px] font-black text-[#091426] uppercase tracking-widest bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">Seleccionado</span>
                        )}
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100 mb-2">
                    <Info className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-800 font-medium leading-relaxed">
                      Estás en modo <strong>Cliente No Registrado</strong>. Los datos de contacto se guardarán solo para esta venta.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre del Cliente</label>
                      <input 
                        type="text" 
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="Ej: Juan Pérez"
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:border-[#091426] focus:ring-4 focus:ring-[#091426]/5 transition-all outline-none bg-slate-50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Dirección Manual</label>
                      <input 
                        type="text" 
                        value={manualAddress}
                        onChange={(e) => setManualAddress(e.target.value)}
                        placeholder="Calle, Número, Depto..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:border-[#091426] focus:ring-4 focus:ring-[#091426]/5 transition-all outline-none bg-slate-50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Teléfono de Contacto</label>
                      <input 
                        type="text" 
                        value={manualPhone}
                        onChange={(e) => setManualPhone(e.target.value)}
                        placeholder="Ej: +56 9 1234 5678"
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:border-[#091426] focus:ring-4 focus:ring-[#091426]/5 transition-all outline-none bg-slate-50"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Observaciones / Notas del Pedido</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Entregar por la puerta trasera, requiere factura, etc..."
                    rows={2}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:border-[#091426] focus:ring-4 focus:ring-[#091426]/5 transition-all outline-none bg-slate-50 resize-none"
                  />
                </div>
              </div>
            </div>
          </motion.section>

          {/* Step 2 */}
          <motion.section 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-black">2</span>
                <h3 className="font-bold text-slate-900">Selección de Productos</h3>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <ShoppingCart className="w-3 h-3" />
                <span>{cart.length} items</span>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Product Search & Card Slider */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="text" 
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar producto por nombre o SKU..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#091426] focus:ring-4 focus:ring-[#091426]/5 transition-all outline-none"
                  />
                </div>

                {uniqueCategories.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2 mask-linear">
                    <button 
                      onClick={() => setSelectedCategory('')}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                        selectedCategory === '' 
                          ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20' 
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      Todos
                    </button>
                    {uniqueCategories.map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                          selectedCategory === cat 
                            ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2 mask-linear">
                  {filteredProducts.map((product) => (
                    <motion.div
                      layout
                      key={product.id}
                      onClick={() => addToCart(product)}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      className="min-w-[180px] w-[180px] flex-shrink-0 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:border-[#091426] hover:shadow-xl hover:shadow-[#091426]/5 cursor-pointer transition-all group">
                        <div className="w-full aspect-square bg-slate-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden border border-slate-50">
                        {product.imagen_url ? (
                          <img 
                            src={product.imagen_url} 
                            alt={product.nombre} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement?.classList.add('flex-col');
                            }}
                          />
                        ) : (
                          <Package className="w-10 h-10 text-slate-200" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-brand-tertiary uppercase tracking-widest leading-none">{product.categoria || 'Producto'}</p>
                        <h4 className="text-xs font-bold text-[#091426] truncate">{product.nombre}</h4>
                        <div className="flex items-center justify-between mt-2">
                           <span className="text-sm font-black text-[#091426] font-mono tracking-tight">${product.precio.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                          <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-brand-navy group-hover:bg-brand-primary group-hover:text-white transition-colors shadow-sm">
                            <Plus className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="w-full py-10 flex flex-col items-center justify-center text-slate-400 gap-2 border-2 border-dashed border-slate-100 rounded-2xl">
                      <Search className="w-8 h-8 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">No se encontraron productos</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="overflow-hidden border border-slate-100 rounded-xl">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Producto', 'Cantidad', 'Precio Un.', 'Subtotal', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center first:text-left last:text-right">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {cart.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic text-xs">
                          El carrito está vacío. Selecciona productos arriba.
                        </td>
                      </tr>
                    )}
                    {cart.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors text-slate-700">
                        <td className="px-4 py-4">
                          <p className="font-bold text-[#091426]">{item.nombre}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-3">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-[#091426] font-bold transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono font-bold w-6 text-center text-sm">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-[#091426] font-bold transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center font-mono text-slate-600 tracking-tight">${item.precio.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-4 text-center font-mono font-black text-[#091426] tracking-tight">${(item.precio * item.quantity).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-4 text-right">
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.section>

          {/* Step 3 */}
          <motion.section 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 gap-3 flex items-center">
              <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-black">3</span>
              <h3 className="font-bold text-slate-900">Método de Pago</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'card' as PaymentMethod, icon: CreditCard, label: 'Tarjeta' },
                  { id: 'cash' as PaymentMethod, icon: Banknote, label: 'Efectivo' },
                  { id: 'transfer' as PaymentMethod, icon: Building2, label: 'Transferencia' },
                ].map((m) => (
                  <label 
                    key={m.id} 
                    onClick={() => setSelectedPayment(m.id)}
                    className={`relative flex flex-col items-center justify-center p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      selectedPayment === m.id 
                        ? 'border-[#091426] bg-slate-50 shadow-sm' 
                        : 'border-slate-100 hover:border-slate-300 shadow-none'
                    }`}
                  >
                    <input type="radio" name="payment" checked={selectedPayment === m.id} onChange={() => {}} className="hidden" />
                    <m.icon className={`w-8 h-8 mb-2 ${selectedPayment === m.id ? 'text-[#091426]' : 'text-slate-400'}`} />
                    <span className={`text-xs font-black uppercase tracking-widest ${selectedPayment === m.id ? 'text-[#091426]' : 'text-slate-500'}`}>{m.label}</span>
                    {selectedPayment === m.id && (
                      <div className="absolute top-2 right-2">
                        <ShieldCheck className="w-4 h-4 text-[#091426]" />
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </motion.section>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <div className="sticky top-24 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-sm font-black text-[#091426] uppercase tracking-widest">Resumen de Venta</h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-bold font-mono">
                    <span className="text-slate-500 uppercase tracking-tighter">Subtotal</span>
                    <span className="text-[#091426]">${totals.subtotal.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold font-mono">
                    <span className="text-slate-500 uppercase tracking-tighter">Impuestos (IVA 19%)</span>
                    <span className="text-[#091426] font-black">${totals.taxes.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold font-mono">
                    <span className="text-slate-500 uppercase tracking-tighter">Descuento</span>
                    <span className="text-emerald-600">-$0.00</span>
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total a Pagar</span>
                    <span className="text-3xl font-black text-[#091426] font-mono tracking-tighter">${totals.total.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Notas de la Venta</span>
                  </div>
                  <textarea 
                    className="w-full bg-white border-slate-200 rounded-lg text-xs p-3 focus:ring-4 focus:ring-[#091426]/10 h-24 resize-none outline-none border transition-all" 
                    placeholder="Añadir comentarios internos o para el cliente..."
                  ></textarea>
                </div>
                <div className="space-y-3 pt-2">
                  <button 
                    disabled={cart.length === 0 || loading}
                    onClick={handleFinish}
                    className="w-full bg-gradient-to-r from-brand-primary to-brand-tertiary text-white py-4 rounded-lg font-black text-xs uppercase tracking-widest shadow-xl hover:shadow-brand-primary/20 hover:translate-y-[-2px] transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Finalizar Venta
                      </>
                    )}
                  </button>
                  <button 
                    onClick={onCancel}
                    className="w-full bg-white text-slate-500 py-3 rounded-lg font-bold text-xs uppercase tracking-widest border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar y Limpiar
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-slate-400">
                <p className="text-[9px] font-bold text-center uppercase leading-relaxed tracking-widest">
                  ESTA TRANSACCIÓN SERÁ REGISTRADA PARA {activeCompany?.nombre?.toUpperCase() || 'LA EMPRESA'} EL {new Date().toLocaleDateString()}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      <AnimatePresence>
        {showInvoice && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setShowInvoice(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-[800px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-black text-[#091426] uppercase tracking-widest text-sm">Venta Procesada con Éxito</h3>
                </div>
                <button onClick={() => setShowInvoice(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div id="invoice-content" className="flex-1 overflow-y-auto p-10 bg-white">
                <div className="flex justify-between items-start mb-12">
                  <div>
                    <h2 className="text-3xl font-black text-[#091426]">{activeCompany?.nombre || 'Factura'}</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Invoice / Factura Proforma</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-[#091426]">#TX-{(Math.random() * 9999).toFixed(0)}</p>
                    <p className="text-xs text-slate-500 font-medium">{new Date().toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-12">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Facturar a:</h4>
                    <p className="text-lg font-black text-[#091426]">{selectedClient?.nombre}</p>
                    <p className="text-sm text-slate-600 font-medium">{selectedClient?.email}</p>
                    <p className="text-xs text-slate-500 mt-1">{selectedClient?.direccion}</p>
                    <p className="text-xs text-slate-500">{selectedClient?.telefono}</p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Método de Pago:</h4>
                    <div className="flex flex-col items-end gap-1">
                      <span className="px-3 py-1 bg-brand-navy text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                        {selectedPayment === 'card' ? 'Tarjeta de Crédito' : selectedPayment === 'cash' ? 'Efectivo' : 'Transferencia'}
                      </span>
                      <p className="text-[10px] text-brand-secondary font-bold uppercase mt-1">Transacción Verificada</p>
                    </div>
                  </div>
                </div>

                <table className="w-full mb-12 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Descripción</th>
                      <th className="py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Cant.</th>
                      <th className="py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Precio</th>
                      <th className="py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((item) => (
                      <tr key={item.id}>
                        <td className="py-4">
                          <p className="text-sm font-bold text-[#091426]">{item.nombre}</p>
                        </td>
                        <td className="py-4 text-center text-sm font-bold text-slate-600">{item.quantity}</td>
                        <td className="py-4 text-right text-sm font-mono text-slate-600">${item.precio.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                        <td className="py-4 text-right text-sm font-mono font-bold text-[#091426]">${(item.precio * item.quantity).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end pt-8 border-t border-slate-200">
                  <div className="w-full max-w-[240px] space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-bold uppercase tracking-widest">Subtotal</span>
                      <span className="font-mono font-black text-[#091426]">${totals.subtotal.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-bold uppercase tracking-widest">IVA (19%)</span>
                      <span className="font-mono font-black text-[#091426]">${totals.taxes.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t-2 border-slate-900">
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Total Pago</span>
                      <span className="text-xl font-black text-[#091426] font-mono tracking-tight">${totals.total.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-16 pt-8 border-t border-slate-100">
                  <p className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-[0.2em] leading-relaxed">
                    Gracias por confiar en {activeCompany?.nombre || 'nosotros'}. 
                  </p>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex gap-4">
                  <button 
                    onClick={printInvoice}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                  <button 
                    onClick={downloadInvoicePDF}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Guardar PDF
                  </button>
                </div>
                <button 
                  onClick={() => {
                    downloadInvoicePDF();
                    onFinish();
                  }}
                  className="px-10 py-3 bg-gradient-to-r from-brand-primary to-brand-tertiary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:shadow-brand-primary/20 transition-all"
                >
                  Confirmar y Finalizar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

