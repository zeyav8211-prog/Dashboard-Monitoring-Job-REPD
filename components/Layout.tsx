
import React, { useState } from 'react';
import { Menu, ChevronDown, ChevronRight, LayoutDashboard, Briefcase, LogOut, Lock, X, Eye, EyeOff } from 'lucide-react';
import { MENU_STRUCTURE, LOGO_URL } from '../constants';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeCategory: string | null;
  activeSubCategory: string | null;
  onNavigate: (category: string | null, subCategory: string | null) => void;
  user: User | null;
  onLogout: () => void;
  onChangePassword: (oldPass: string, newPass: string) => boolean;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeCategory, 
  activeSubCategory, 
  onNavigate,
  user,
  onLogout,
  onChangePassword
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    "Penyesuaian": true,
    "Request Data": false,
    "Problem": false,
    "Produksi Master Data": false
  });
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMessage, setPassMessage] = useState({ type: '', text: '' });
  
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const toggleMenu = (menu: string) => {
    setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const handleNavClick = (cat: string | null, sub: string | null) => {
    onNavigate(cat, sub);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 4) {
      setPassMessage({ type: 'error', text: 'Password baru minimal 4 karakter.' });
      return;
    }
    
    const success = onChangePassword(oldPass, newPass);
    if (success) {
      setPassMessage({ type: 'success', text: 'Password berhasil diubah!' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setOldPass('');
        setNewPass('');
        setShowOldPass(false);
        setShowNewPass(false);
        setPassMessage({ type: '', text: '' });
      }, 1500);
    } else {
      setPassMessage({ type: 'error', text: 'Password lama salah.' });
    }
  };

  return (
    <div className="flex h-screen bg-[#F0F4F8] overflow-hidden font-sans">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-gray-200 shadow-xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="h-24 flex items-center justify-center p-6 border-b border-gray-100 bg-white">
            <img 
              src={LOGO_URL} 
              alt="JNE Logo" 
              className="h-10 object-contain hover:scale-105 transition-transform"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>

          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 scrollbar-hide">
            <div className="mb-6">
                <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Dashboard
                </p>
                <button
                onClick={() => handleNavClick(null, null)}
                className={`flex items-center w-full px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                    activeCategory === null 
                    ? 'bg-gradient-to-r from-[#002F6C] to-[#004085] text-white shadow-md shadow-blue-200' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-blue-700'
                }`}
                >
                <LayoutDashboard className={`w-5 h-5 mr-3 ${activeCategory === null ? 'text-blue-200' : 'text-gray-400'}`} />
                Monitoring Dashboard
                </button>
            </div>

            <div className="mb-2">
              <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Manajemen Data
              </p>
              {Object.values(MENU_STRUCTURE).map((menu) => (
                <div key={menu.name} className="mb-1">
                    <button
                    onClick={() => toggleMenu(menu.name)}
                    className={`flex items-center justify-between w-full px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                        activeCategory === menu.name ? 'text-blue-800 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    >
                    <div className="flex items-center">
                        <Briefcase className={`w-5 h-5 mr-3 ${activeCategory === menu.name ? 'text-blue-600' : 'text-gray-400'}`} />
                        {menu.name}
                    </div>
                    {expandedMenus[menu.name] ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    </button>

                    {expandedMenus[menu.name] && (
                    <div className="mt-1 ml-4 space-y-1 pl-2 border-l-2 border-gray-100">
                        {menu.submenus.map((sub) => (
                        <button
                            key={sub}
                            onClick={() => handleNavClick(menu.name, sub)}
                            className={`flex items-center w-full px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
                            activeCategory === menu.name && activeSubCategory === sub
                                ? 'text-[#EE2E24] bg-red-50'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full mr-3 ${activeCategory === menu.name && activeSubCategory === sub ? 'bg-[#EE2E24]' : 'bg-gray-300'}`}></span>
                            {sub}
                        </button>
                        ))}
                    </div>
                    )}
                </div>
              ))}
            </div>
          </nav>

          <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 shadow-sm group hover:border-blue-200 transition-colors">
              <div 
                className="flex items-center overflow-hidden cursor-pointer flex-1"
                onClick={() => setShowPasswordModal(true)}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#002F6C] to-[#00509E] flex-shrink-0 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white shadow-sm">
                  {user?.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="ml-3 overflow-hidden">
                  <p className="text-sm font-bold text-gray-800 truncate group-hover:text-blue-700">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.role}</p>
                </div>
              </div>
              <button 
                onClick={onLogout}
                className="ml-2 p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
        <header className="md:hidden bg-white h-16 border-b border-gray-200 flex items-center justify-between px-4 z-10 sticky top-0">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <img src={LOGO_URL} alt="JNE" className="h-8 ml-3" />
          </div>
          <div className="flex items-center">
             <div 
              onClick={() => setShowPasswordModal(true)}
              className="w-8 h-8 rounded-full bg-[#002F6C] flex items-center justify-center text-white font-bold text-xs cursor-pointer"
             >
                {user?.name.substring(0, 2).toUpperCase()}
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 scroll-smooth">
          {children}
        </div>
      </main>

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 transition-all">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Keamanan Akun</h3>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handlePasswordSubmit} className="p-5 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Password Lama</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type={showOldPass ? "text" : "password"}
                      required
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
                      value={oldPass}
                      onChange={(e) => setOldPass(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => setShowOldPass(!showOldPass)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                        {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Password Baru</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type={showNewPass ? "text" : "password"}
                      required
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
              </div>

              {passMessage.text && (
                <div className={`text-sm p-3 rounded-lg font-medium ${passMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {passMessage.text}
                </div>
              )}

              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full py-3 bg-[#002F6C] text-white rounded-xl hover:bg-blue-900 transition-all font-bold shadow-lg shadow-blue-900/20"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

