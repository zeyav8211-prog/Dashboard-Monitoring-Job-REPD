
import React, { useState } from 'react';
import { LOGO_URL } from '../constants';
import { User } from '../types';
import { LogIn, Lock, User as UserIcon, Send, ArrowLeft, Mail, CheckCircle, AlertTriangle, Copy } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
  onResetPassword: (email: string) => Promise<{ success: boolean; token?: string; isMock?: boolean; errorMessage?: string }>;
}

export const Login: React.FC<LoginProps> = ({ onLogin, users, onResetPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);
  
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{token?: string, isMock?: boolean, errorMessage?: string} | null>(null);

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
    setSuccessMsg(false);
    setResetLoading(true);
    setResetResult(null);

    try {
        const result = await onResetPassword(email);
        if (result.success) {
            setResetResult(result);
            setSuccessMsg(true);
        } else {
            setError('Email tidak ditemukan dalam sistem.');
        }
    } catch (err) {
        setError('Terjadi kesalahan koneksi.');
    } finally {
        setResetLoading(false);
    }
  };

  const handleBackToLogin = () => {
      setIsResetMode(false); 
      setSuccessMsg(false); 
      setError(''); 
      setPassword('');
      setEmail('');
      setResetResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border-t-4 border-[#EE2E24]">
        <div className="flex flex-col items-center mb-8">
          <img 
            src={LOGO_URL} 
            alt="JNE Logo" 
            className="h-16 object-contain mb-4"
          />
          <h2 className="text-2xl font-bold text-[#002F6C]">
            {isResetMode ? (successMsg ? 'Permintaan Diproses' : 'Lupa Password?') : 'Job Dashboard'}
          </h2>
          {!successMsg && (
              <p className="text-gray-500 text-sm text-center mt-2">
                {isResetMode 
                    ? 'Masukkan email untuk menerima password baru.' 
                    : 'Silakan login untuk melanjutkan'}
              </p>
          )}
        </div>

        {isResetMode ? (
            successMsg ? (
                <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
                        <Mail className="w-10 h-10 text-green-600" />
                        <div className="absolute ml-8 mt-8 bg-white rounded-full p-1">
                            <CheckCircle className="w-5 h-5 text-green-500 fill-current" />
                        </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Password Baru Dibuat!</h3>
                    
                    {resetResult?.isMock ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
                           <div className="flex items-start gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-yellow-800 font-bold">
                                  {resetResult.errorMessage ? "Pengiriman Email Gagal" : "Konfigurasi Email Belum Lengkap"}
                                </p>
                           </div>
                           <p className="text-xs text-yellow-700 mb-3 leading-relaxed">
                             {resetResult.errorMessage ? (
                                <>
                                  Sistem menolak pengiriman email. Detail error:<br/>
                                  <span className="font-mono bg-yellow-100 px-1 rounded font-bold text-red-600 break-all">
                                    {resetResult.errorMessage}
                                  </span>
                                  <br/><br/>
                                  Password tetap dibuat agar Anda bisa login:
                                </>
                             ) : (
                                <>
                                  Sistem tidak dapat mengirim email karena <strong>Template ID</strong> atau <strong>Public Key</strong> belum diisi di kode program.
                                  <br/>Silakan gunakan password berikut untuk login:
                                </>
                             )}
                           </p>
                           <div className="bg-white border border-gray-300 border-dashed p-3 rounded text-center relative group">
                             <span className="font-mono font-bold text-xl text-gray-800 tracking-widest select-all">
                               {resetResult.token}
                             </span>
                           </div>
                        </div>
                    ) : (
                        <p className="text-gray-600 text-sm mb-8 leading-relaxed">
                            Kami telah mengirimkan <strong>Password Baru</strong> ke email <strong>{email}</strong>. 
                            <br/><br/>
                            Silakan periksa kotak masuk (Inbox) atau folder Spam Anda, lalu login menggunakan password tersebut.
                        </p>
                    )}

                    <button
                        onClick={handleBackToLogin}
                        className="w-full flex items-center justify-center py-3 px-4 bg-[#002F6C] hover:bg-blue-900 text-white font-bold rounded-lg transition-colors shadow-md"
                    >
                        Kembali ke Halaman Login
                    </button>
                </div>
            ) : (
                <form onSubmit={handleResetSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email JNE
                        </label>
                        <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="email"
                            id="reset-email"
                            required
                            placeholder="nama@jne.co.id"
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE2E24] focus:border-[#EE2E24] outline-none transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center animate-pulse">
                            <span className="font-medium mr-1">Error:</span> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={resetLoading}
                        className="w-full flex items-center justify-center py-3 px-4 bg-[#EE2E24] hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-red-200 disabled:opacity-50"
                    >
                        {resetLoading ? (
                            <>Mengirim...</>
                        ) : (
                            <>
                                <Send className="w-5 h-5 mr-2" />
                                Kirim Password Baru
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleBackToLogin}
                        className="w-full flex items-center justify-center py-2 text-sm text-gray-500 hover:text-[#002F6C] transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Login
                    </button>
                </form>
            )
        ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email JNE
                </label>
                <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="email"
                    id="email"
                    required
                    placeholder="nama@jne.co.id"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE2E24] focus:border-[#EE2E24] outline-none transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                </div>
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
                </label>
                <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="password"
                    id="password"
                    required
                    placeholder="Password Anda"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE2E24] focus:border-[#EE2E24] outline-none transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                </div>
                <div className="flex justify-end mt-1">
                    <button 
                        type="button" 
                        onClick={() => setIsResetMode(true)}
                        className="text-xs text-[#002F6C] hover:underline"
                    >
                        Lupa Password?
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center animate-pulse">
                <span className="font-medium mr-1">Error:</span> {error}
                </div>
            )}

            <button
                type="submit"
                className="w-full flex items-center justify-center py-3 px-4 bg-[#EE2E24] hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-red-200"
            >
                <LogIn className="w-5 h-5 mr-2" />
                Masuk Dashboard
            </button>
            </form>
        )}

        <div className="mt-8 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} JNE Express. All rights reserved.
        </div>
      </div>
    </div>
  );
};
