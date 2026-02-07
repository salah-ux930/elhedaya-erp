
import React, { useState } from 'react';
import { AR } from '../constants';
import { 
  LayoutDashboard, Users, CreditCard, Users2, Package, 
  Wallet, Settings, LogOut, Menu, X, Bell, UserCheck, Stethoscope, FlaskConical
} from 'lucide-react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-6 py-4 transition-all ${
      active 
        ? 'bg-primary-600 text-white shadow-lg' 
        : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'
    }`}
  >
    {icon}
    <span className="font-medium text-lg">{label}</span>
  </button>
);

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: AR.dashboard, icon: <LayoutDashboard size={22} /> },
    { id: 'reception', label: AR.reception, icon: <Stethoscope size={22} /> },
    { id: 'patients', label: AR.patients, icon: <Users size={22} /> },
    { id: 'lab', label: AR.lab, icon: <FlaskConical size={22} /> },
    { id: 'billing', label: AR.billing, icon: <CreditCard size={22} /> },
    { id: 'employees', label: AR.employees, icon: <Users2 size={22} /> },
    { id: 'inventory', label: AR.inventory, icon: <Package size={22} /> },
    { id: 'finance', label: AR.finance, icon: <Wallet size={22} /> },
    { id: 'users', label: AR.users, icon: <UserCheck size={22} /> },
    { id: 'setup', label: AR.setup, icon: <Settings size={22} /> },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 font-cairo" dir="rtl">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-l border-gray-200 shadow-sm fixed h-full z-20">
        <div className="p-8 border-b border-gray-100 flex items-center gap-2">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">هـ</div>
          <h1 className="text-xl font-bold text-primary-900 tracking-tight">مركز الهدايه الطبى</h1>
        </div>
        <nav className="flex-1 mt-4 overflow-y-auto">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
            />
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button className="flex items-center gap-3 px-6 py-4 text-red-600 hover:bg-red-50 rounded-lg w-full transition-colors">
            <LogOut size={22} />
            <span className="font-medium">{AR.logout}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:mr-72 min-h-screen transition-all duration-300">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-6 h-20 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-bold text-gray-800">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer text-gray-600 hover:text-primary-600 transition-colors p-2">
              <Bell size={24} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border border-primary-200">
              أ
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div 
            className="w-72 h-full bg-white shadow-2xl relative" 
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b flex justify-between items-center">
              <h1 className="text-xl font-bold">مركز الهدايه الطبى</h1>
              <button onClick={() => setIsMobileMenuOpen(false)}>
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            <nav className="p-4">
              {menuItems.map((item) => (
                <SidebarItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={activeTab === item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                />
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
