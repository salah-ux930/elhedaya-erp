
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout.tsx';
import DashboardModule from './modules/Dashboard.tsx';
import ReceptionModule from './modules/Reception.tsx';
import PatientModule from './modules/Patients.tsx';
import LabModule from './modules/Lab.tsx';
import BillingModule from './modules/Billing.tsx';
import PayrollModule from './modules/Payroll.tsx';
import InventoryModule from './modules/Inventory.tsx';
import FinanceModule from './modules/Finance.tsx';
import SetupModule from './modules/Setup.tsx';
import UsersModule from './modules/Users.tsx';
import LoginModule from './modules/Login.tsx';
import { Permission } from './types.ts';
import { ShieldAlert } from 'lucide-react';

const INACTIVITY_LIMIT = 60 * 60 * 1000; // ساعة واحدة من عدم النشاط

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const lastActivityRef = useRef<number>(Date.now());
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('dialysis_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem('dialysis_user');
      }
    }
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('dialysis_user');
    localStorage.removeItem('last_activity');
  };

  const handleLoginSuccess = (user: any) => {
    localStorage.setItem('dialysis_user', JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      localStorage.setItem('last_activity', lastActivityRef.current.toString());
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastActivityRef.current > INACTIVITY_LIMIT) {
        handleLogout(); 
      }
    }, 10000);

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginModule onLoginSuccess={handleLoginSuccess} />;
  }

  // مصفوفة الصلاحيات المطلوبة لكل موديول
  const tabPermissions: Record<string, Permission | 'PUBLIC'> = {
    dashboard: 'PUBLIC', // متاح للجميع
    reception: 'MANAGE_RECEPTION',
    patients: 'MANAGE_PATIENTS',
    lab: 'MANAGE_LAB',
    billing: 'MANAGE_BILLING',
    employees: 'MANAGE_PAYROLL',
    inventory: 'MANAGE_INVENTORY',
    finance: 'MANAGE_FINANCE',
    users: 'MANAGE_USERS',
    setup: 'SYSTEM_SETUP'
  };

  const hasPermission = (tab: string) => {
    const required = tabPermissions[tab];
    if (required === 'PUBLIC') return true;
    return currentUser?.permissions?.includes(required);
  };

  const renderModule = () => {
    if (!hasPermission(activeTab)) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-red-100 animate-in fade-in zoom-in">
           <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100">
              <ShieldAlert size={48} />
           </div>
           <h3 className="text-2xl font-bold text-gray-800">عذراً، لا تملك صلاحية الوصول لهذه الصفحة</h3>
           <p className="text-gray-500 mt-2 max-w-md text-center">يرجى مراجعة مسؤول النظام لمنحك الصلاحيات المطلوبة للوصول إلى وحدة ({tabPermissions[activeTab]}).</p>
           <button 
             onClick={() => setActiveTab('dashboard')}
             className="mt-8 px-10 py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg hover:bg-primary-700 transition-all active:scale-95"
           >
             العودة للرئيسية
           </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard': return <DashboardModule />;
      case 'reception': return <ReceptionModule />;
      case 'patients': return <PatientModule />;
      case 'lab': return <LabModule />;
      case 'billing': return <BillingModule />;
      case 'employees': return <PayrollModule />;
      case 'inventory': return <InventoryModule />;
      case 'finance': return <FinanceModule />;
      case 'users': return <UsersModule />;
      case 'setup': return <SetupModule />;
      default: return <DashboardModule />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} onLogout={handleLogout}>
      <div className="flex justify-between items-center mb-6 no-print">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          <div className="text-gray-500 text-sm font-medium">
            مرحباً بك مجدداً، <span className="text-primary-600 font-bold">{currentUser?.name}</span>
          </div>
        </div>
      </div>
      {renderModule()}
    </Layout>
  );
};

export default App;
