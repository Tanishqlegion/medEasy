import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Activity, ShieldCheck, HeartPulse, Loader2, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch("http://127.0.0.1:5002/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.msg || "Login failed");

      login(data.user, data.token);
      navigate(data.user.role === 'doctor' ? '/hospital-dashboard' : '/patient-dashboard');
    } catch (err) {
      if (err.message.includes('Failed to fetch')) {
        setError("Network Error: Backend unreachable (Port 5002)");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full flex items-center justify-center p-4 bg-mesh relative overflow-hidden">
      {/* Background Blobs */}
      <div className="blob w-[600px] h-[600px] bg-cyan-500/10 -top-20 -left-20 animate-float-slow" />
      <div className="blob w-[400px] h-[400px] bg-purple-500/10 -bottom-20 -right-20 animate-float-slow [animation-delay:2s]" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md glass-panel p-6 md:px-8 rounded-[30px] relative z-10 border-white/20 shadow-[-10px_-10px_30px_rgba(255,255,255,0.1),10px_10px_30px_rgba(0,0,0,0.1)]"
      >
        <div className="text-center mb-4">
          <motion.div
            initial={{ rotate: -10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", damping: 12 }}
            className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-2xl shadow-cyan-500/30 ring-8 ring-cyan-500/5"
          >
            <Activity className="w-6 h-6 text-white" />
          </motion.div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Secure Authentication
          </div>

          <h1 className="text-3xl font-black tracking-tight mb-1 text-[var(--text-main)]">Welcome Back</h1>
          <p className="text-sm text-[var(--text-muted)] font-medium">Access your personalized health terminal</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-rose-500 text-sm font-bold mb-4 text-center"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-2">Clinical Identifier</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-cyan-500 transition-colors duration-300" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/5 transition-all text-sm font-bold placeholder:text-[var(--text-muted)]/40"
                placeholder="email@clinical.org"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-2">Security Key</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-cyan-500 transition-colors duration-300" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/5 transition-all text-sm font-bold"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 px-2 pt-1">
            <input
              type="checkbox"
              id="terms"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 rounded-md bg-white/5 border border-white/10 text-cyan-500 focus:ring-offset-0 focus:ring-cyan-500/50 cursor-pointer transition-all"
            />
            <label htmlFor="terms" className="text-[10px] font-bold text-[var(--text-muted)] cursor-pointer select-none">
              I agree to the <span className="text-cyan-400">Terms of Service</span> & <span className="text-cyan-400">Privacy Protocol</span>
            </label>
          </div>

          <Button
            type="submit"
            disabled={loading || !agreed}
            className="w-full h-12 rounded-xl button-premium transition-all flex items-center justify-center gap-2 font-black uppercase tracking-[0.2em] text-[11px] mt-4 shadow-xl shadow-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <>Initiate Login <ArrowRight className="w-4 h-4" /></>
            )}
          </Button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-white/5 space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            New to the network?{' '}
            <Link to="/signup" className="text-cyan-500 hover:text-cyan-400 transition-colors ml-1">Initialize Account</Link>
          </p>
          <div className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] opacity-50 flex items-center justify-center gap-2">
            <ShieldCheck className="w-3 h-3" /> E2E Encrypted Protocol
          </div>

          <Link to="/lab-login" className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 text-[10px] font-black uppercase tracking-widest text-emerald-500 transition-all w-full mt-4">
            <Activity className="w-3 h-3" /> Diagnostic Lab Access
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
