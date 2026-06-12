import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, AlertCircle, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import logoImg from '../assets/logo.png';

interface ResetPasswordProps {
  onSuccess: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/10 rounded-full blur-[120px] opacity-60" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-tertiary/10 rounded-full blur-[120px] opacity-60" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="glass-panel rounded-xl overflow-hidden shadow-lg shadow-brand-navy/5">
          <div className="p-8 pb-8">
            <div className="flex justify-center mb-8 relative">
              <img src={logoImg} alt="RESGER CRM" className="h-16 object-contain drop-shadow-md" />
            </div>
            
            <h1 className="text-2xl font-bold text-brand-navy text-center mb-2">
              Nueva Contraseña
            </h1>
            <p className="text-outline text-center text-sm mb-8">
              Ingresa tu nueva contraseña para acceder a tu cuenta
            </p>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3"
                >
                  <AlertCircle className="text-red-500 w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </motion.div>
              )}
              {success && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-lg flex items-start gap-3"
                >
                  <CheckCircle2 className="text-emerald-500 w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-600 font-medium">Contraseña actualizada exitosamente. Redirigiendo...</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleReset} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-navy ml-1 uppercase tracking-wider">Nueva Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 bg-[#F1F5F9] border-b border-b-[#E2E8F0] focus:border-b-brand-primary rounded-t-md focus:outline-none transition-all text-brand-navy placeholder:text-outline/50"
                    required
                    disabled={success}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-brand-primary transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-navy ml-1 uppercase tracking-wider">Confirmar Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 bg-[#F1F5F9] border-b border-b-[#E2E8F0] focus:border-b-brand-primary rounded-t-md focus:outline-none transition-all text-brand-navy placeholder:text-outline/50"
                    required
                    disabled={success}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-brand-primary transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || success}
                className="w-full py-3.5 bg-gradient-to-r from-brand-primary to-brand-tertiary hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-md shadow-lg shadow-brand-primary/20 transition-all flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Actualizar Contraseña'
                )}
              </button>
            </form>
          </div>
        </div>
        
        <p className="mt-8 text-center text-outline text-xs">
          © 2026 RESGER. Todos los derechos reservados.
        </p>
      </motion.div>
    </div>
  );
};
