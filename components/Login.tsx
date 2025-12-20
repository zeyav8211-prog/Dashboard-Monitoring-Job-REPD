
import React, { useState } from 'react';
import { LOGO_URL } from '../constants';
import { User } from '../types';
import { LogIn, Lock, User as UserIcon, Eye, EyeOff, RefreshCw, ArrowLeft } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
  onResetPassword: (email: string) => Promise<boolean>;
}

export const Login: React.FC<LoginProps> = ({ onLogin, users, onResetPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = users.find(
      u => u.email.toLowerCase() === email.toLowerCase()
    );

    if (user) {
      if (user.password === password) {
        onLogin(user);
      } else {
        setError('Password salah.');
      }
    } else {
      setError('Email tidak terdaftar dalam sistem.');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setResetLoading(true);

    try {
        const success = await onResetPassword(email);
        if (success) {
            setSuccessMsg('Password berhasil direset menjadi "000000". Silakan login.');
            setTimeout(() => {
                setIsResetMode(false);
                setSuccessMsg('');
                setPassword('');
            }, 3000);
        } else {
            setError('Email tidak ditemukan dalam sistem.');
        }
    } catch (err) {
        setError('Terjadi kesalahan koneksi.');
    } finally {
        setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-transparent">
      <div className="w-full max-w-[440px] flex flex-col items-center">
        {/* Logo Section */}
        <div className="mb-8">
          <img 
            src={LOGO_URL} 
            alt="JNE Logo" 
            className="h-20 object-contain drop-shadow-sm"
          />
        </div>

        {/* Header Title */}
        <div className="text-center mb-10">
          <h1 className="text-[32px] font-extrabold text-[#002F6C] tracking-tight leading-none mb-2">
            Job Dashboard
          </h1>
          <p className="text-[#64748b] text-base font-medium">
            Silakan login untuk melanjutkan
          </p>
        </div>

        <div className="w-full bg-white/40 backdrop-blur-xl p-2 rounded-[2.5rem]">
          <div className="bg-white p-8 md:p-10 rounded-[2.3rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/60">
            {isResetMode ? (
              <form onSubmit={handleResetSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="reset-email" className="block text-sm font-bold text-[#334155] ml-1">
                    Email JNE
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-[#94a3b8] group-focus-within:text-[#002F6C] transition-colors" />
                    </div>
                    <input
                      type="email"
                      id="reset-email"
                      required
                      placeholder="nama@jne.co.id"
                      className="w-full pl-14 pr-5 py-4 bg-white border border-[#e2e8f0] rounded-2xl focus:ring-4 focus:ring-[#002F6C]/5 focus:border-[#002F6C] outline-none transition-all font-medium text-[#1e293b]"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 text-xs p-4 rounded-2xl flex items-center border border-red-100">
                    <span className="font-bold mr-2 uppercase tracking-tighter">Error:</span> {error}
                  </div>
                )}

                {successMsg && (
                  <div className="bg-green-50 text-green-600 text-xs p-4 rounded-2xl flex items-center border border-green-100">
                    <span className="font-bold mr-2 uppercase tracking-tighter">Success:</span> {successMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full flex items-center justify-center py-4 bg-[#EE2E24] hover:bg-red-600 text-white font-bold text-lg rounded-2xl transition-all shadow-lg shadow-red-200 active:scale-[0.98] disabled:opacity-50"
                >
                  {resetLoading ? 'Memproses...' : 'Reset Password'}
                </button>

                <button
                  type="button"
                  onClick={() => { setIsResetMode(false); setError(''); setSuccessMsg(''); }}
                  className="w-full py-2 text-sm font-bold text-[#64748b] hover:text-[#002F6C] transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={16} /> Kembali ke Login
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-bold text-[#334155] ml-1">
                    Email JNE
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-[#94a3b8] group-focus-within:text-[#002F6C] transition-colors" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      required
                      placeholder="nama@jne.co.id"
                      className="w-full pl-14 pr-5 py-4 bg-white border border-[#e2e8f0] rounded-2xl focus:ring-4 focus:ring-[#002F6C]/5 focus:border-[#002F6C] outline-none transition-all font-medium text-[#1e293b] placeholder:text-[#cbd5e1]"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-bold text-[#334155] ml-1">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-[#94a3b8] group-focus-within:text-[#002F6C] transition-colors" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      required
                      placeholder="Password Anda"
                      className="w-full pl-14 pr-12 py-4 bg-white border border-[#e2e8f0] rounded-2xl focus:ring-4 focus:ring-[#002F6C]/5 focus:border-[#002F6C] outline-none transition-all font-medium text-[#1e293b] placeholder:text-[#cbd5e1]"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-5 flex items-center text-[#94a3b8] hover:text-[#002F6C]"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <div className="flex justify-end mt-1">
                    <button 
                      type="button" 
                      onClick={() => setIsResetMode(true)}
                      className="text-xs font-bold text-[#002F6C] hover:text-[#EE2E24] transition-colors"
                    >
                      Lupa Password?
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 text-xs p-4 rounded-2xl border border-red-100 animate-pulse">
                    <span className="font-bold mr-2 uppercase tracking-tighter">Akses Ditolak:</span> {error}
                  </div>
                )}

                {/* Login Button */}
                <button
                  type="submit"
                  className="w-full flex items-center justify-center py-4 bg-[#EE2E24] hover:bg-red-600 text-white font-bold text-lg rounded-2xl transition-all shadow-xl shadow-red-100 active:scale-[0.98] group"
                >
                  <LogIn className="w-6 h-6 mr-3 group-hover:translate-x-1 transition-transform" />
                  Masuk Dashboard
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-[#94a3b8] text-sm font-medium tracking-tight">
            &copy; {new Date().getFullYear()} JNE Express. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
