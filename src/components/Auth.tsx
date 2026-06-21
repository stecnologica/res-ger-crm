import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, User, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import logoImg from '../assets/logo.png';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isResettingPassword) {
        if (!email) throw new Error('Por favor ingresa tu email');
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`,
        });
        if (error) throw error;
        setSuccessMessage('Si el correo está registrado, recibirás un enlace para recuperar tu contraseña.');
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        } else {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Ensure confirmation email redirects to the current origin (production domain)
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;

        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error('El correo electrónico ya se encuentra registrado. Intenta iniciar sesión.');
        }

        // No se crean company ni membership desde el frontend (evita errores por token faltante)
        if (data.user && !data.session) {
          setSuccessMessage('¡Registro exitoso! Por favor revisa tu email para confirmar tu cuenta.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (isResettingPassword) return 'Recuperar Contraseña';
    return isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta';
  };

  const getSubtitle = () => {
    if (isResettingPassword) return 'Ingresa tu email para recibir un enlace de recuperación';
    return isLogin 
      ? 'Ingresa tus credenciales para acceder a RESGER' 
      : 'Empieza a gestionar tus clientes y ventas hoy mismo';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/10 rounded-full blur-[120px] opacity-60" />
      <div className="absolute bottom-[-10%] rigitght-[-10%] w-[40%] h-[40%] bg-brand-tertiary/10 rounded-full blur-[120px] opacity-60" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="glass-panel rounded-xl overflow-hidden shadow-lg shadow-brand-navy/5">
          <div className="p-8 pb-4">
            <div className="flex justify-center mb-8 relative">
              {isResettingPassword && (
                <button 
                  onClick={() => {
                    setIsResettingPassword(false);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 p-2 text-brand-navy/50 hover:text-brand-primary hover:bg-surface-dim rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <img src={logoImg} alt="RESGER CRM" className="h-16 object-contain drop-shadow-md" />
            </div>
            
            <h1 className="text-2xl font-bold text-brand-navy text-center mb-2">
              {getTitle()}
            </h1>
            <p className="text-outline text-center text-sm mb-8">
              {getSubtitle()}
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
              {successMessage && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 p-4 bg-brand-secondary/10 border border-brand-secondary/20 rounded-lg flex items-start gap-3"
                >
                  <AlertCircle className="text-brand-secondary w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm text-brand-secondary font-medium">{successMessage}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleAuth} className="space-y-5">
              {!isLogin && !isResettingPassword && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-brand-navy ml-1 uppercase tracking-wider">Nombre Completo</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Juan Pérez"
                        className="w-full pl-11 pr-4 py-3 bg-[#F1F5F9] border-b border-b-[#E2E8F0] focus:border-b-brand-primary rounded-t-md focus:outline-none transition-all text-brand-navy placeholder:text-outline/50"
                        required={!isLogin && !isResettingPassword}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-navy ml-1 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="w-full pl-11 pr-4 py-3 bg-[#F1F5F9] border-b border-b-[#E2E8F0] focus:border-b-brand-primary rounded-t-md focus:outline-none transition-all text-brand-navy placeholder:text-outline/50"
                    required
                  />
                </div>
              </div>

              {!isResettingPassword && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center ml-1 mb-1">
                    <label className="text-xs font-semibold text-brand-navy uppercase tracking-wider">Contraseña</label>
                    {isLogin && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsResettingPassword(true);
                          setError(null);
                          setSuccessMessage(null);
                        }}
                        className="text-[11px] font-semibold text-brand-primary hover:text-brand-tertiary transition-colors"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3 bg-[#F1F5F9] border-b border-b-[#E2E8F0] focus:border-b-brand-primary rounded-t-md focus:outline-none transition-all text-brand-navy placeholder:text-outline/50"
                      required={!isResettingPassword}
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
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-brand-primary to-brand-tertiary hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-md shadow-lg shadow-brand-primary/20 transition-all flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isResettingPassword ? 'Enviar Enlace' : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                    <motion.div
                      animate={{ x: [0, 4, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      {isResettingPassword ? <Mail className="w-4 h-4" /> : isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    </motion.div>
                  </>
                )}
              </button>
            </form>
          </div>

          {!isResettingPassword && (
            <div className="p-5 bg-surface-container/50 border-t border-brand-navy/5 flex justify-center backdrop-blur-sm">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-sm font-medium text-brand-navy/70 hover:text-brand-primary transition-colors"
              >
                {isLogin 
                  ? '¿No tienes una cuenta? Regístrate' 
                  : '¿Ya tienes una cuenta? Inicia sesión'}
              </button>
            </div>
          )}
        </div>
        
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-center text-outline text-[11px] font-medium tracking-wide">
            © 2026 RESGER. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-outline/65 font-mono uppercase tracking-widest">
            <span>Desarrollado por</span>
            <span className="text-brand-primary font-bold">SoftBootDev</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-outline/50">
            <a 
              href="https://www.facebook.com/profile.php?id=61590511572273" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-brand-primary transition-colors hover:underline"
            >
              Facebook
            </a>
            <span>•</span>
            <a 
              href="https://www.instagram.com/softbootdev/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-brand-primary transition-colors hover:underline"
            >
              Instagram
            </a>
            <span>•</span>
            <a 
              href="https://www.youtube.com/@softbootdev" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-brand-primary transition-colors hover:underline"
            >
              YouTube
            </a>
            <span>•</span>
            <a 
              href="https://www.linkedin.com/in/soluciones-tecnologicas-1b0830415/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-brand-primary transition-colors hover:underline"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
