import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Package, ChevronLeft, Save, X, Tag, Layers, DollarSign, Database, Loader2, Image as ImageIcon, Upload } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

import { useCompany } from '../context/CompanyContext';

interface EditProductProps {
  product: Product;
  onCancel: () => void;
  onSave: () => void;
  user: User;
}

export const EditProduct: React.FC<EditProductProps> = ({ product, onCancel, onSave, user }) => {
  const { activeCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState(product.nombre);
  const [descripcion, setDescripcion] = useState(product.descripcion || '');
  const [precio, setPrecio] = useState(product.precio.toString());
  const [stock, setStock] = useState(product.stock.toString());
  const [categoria, setCategoria] = useState(product.categoria || '');
  const [imagenUrl, setImagenUrl] = useState(product.imagen_url || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(product.imagen_url || '');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpdate = async () => {
    if (!activeCompany) return;
    if (!nombre || !precio || !stock) {
      alert('Nombre, precio y stock son obligatorios');
      return;
    }

    setLoading(true);
    let finalImageUrl = imagenUrl;

    try {
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${activeCompany.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
        
        finalImageUrl = publicUrl;
      }

      const { error } = await supabase
        .from('productos')
        .update({ 
          nombre, 
          descripcion, 
          precio: parseFloat(precio), 
          stock: parseInt(stock),
          categoria: categoria || null,
          imagen_url: finalImageUrl || null
        })
        .eq('id', product.id);

      if (error) throw error;
      onSave();
    } catch (error: any) {
      console.error('Error updating product:', error);
      alert(error.message || 'Error al actualizar el producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-[800px] mx-auto mt-16 pb-20">
      <header className="mb-8">
        <button 
          onClick={onCancel}
          className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-[#091426] transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver a Inventario
        </button>
        <h2 className="text-3xl font-black text-[#091426] tracking-tight">Editar Producto</h2>
        <p className="text-slate-500 font-medium mt-1">Modifica las especificaciones o el inventario del producto seleccionado.</p>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden"
      >
        <div className="p-8 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Package className="w-4 h-4 text-blue-600" />
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Información Principal</h3>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Tag className="w-3 h-3 text-slate-400" /> Nombre del Producto
              </label>
              <input 
                type="text" 
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Sonic Pro X200"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-[#091426]/5 focus:border-[#091426] outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Layers className="w-3 h-3 text-slate-400" /> Descripción
              </label>
              <textarea 
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción del producto..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-[#091426]/5 focus:border-[#091426] outline-none transition-all min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Tag className="w-3 h-3 text-slate-400" /> Categoría
              </label>
              <input 
                type="text" 
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ej: Bebidas, Entradas, Postres"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precios y Existencias</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <DollarSign className="w-3 h-3 text-slate-400" /> Precio Unitario
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-[#091426]/5 focus:border-[#091426] outline-none transition-all font-mono"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Database className="w-3 h-3 text-slate-400" /> Stock Actual
                </label>
                <input 
                  type="number" 
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-[#091426]/5 focus:border-[#091426] outline-none transition-all font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Multimedia (Opcional)</h3>
              </div>
              
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  Imagen del Producto
                </label>
                
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="w-full md:w-48 aspect-square rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden group hover:border-[#091426] transition-all relative">
                    {previewUrl ? (
                      <>
                        <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                        <button 
                          onClick={() => { setImageFile(null); setPreviewUrl(''); setImagenUrl(''); }}
                          className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2 group-hover:text-[#091426] transition-colors" />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-[#091426]">Subir Nueva Foto</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 space-y-2 pt-2">
                    <p className="text-sm font-bold text-[#091426]">Recomendaciones:</p>
                    <ul className="text-[11px] text-slate-500 space-y-1 font-medium">
                      <li>• Formato cuadrado (1:1) preferiblemente.</li>
                      <li>• Tamaño máximo: 5MB.</li>
                      <li>• Si no subes una nueva, se mantendrá la actual.</li>
                    </ul>
                  </div>
                </div>
              </div>
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
            onClick={handleUpdate}
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-brand-primary to-brand-tertiary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Actualizar Producto
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
