
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

const INACTIVITY_LIMIT = 3 * 60 * 1000; // 3 دقائق بالملي ثانية

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const lastActivityRef = useRef<number>(Date.now());
  
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('dialysis_user');
    const lastActivity = localStorage.getItem('last_activity');
    
    // التحقق عند التحميل الأولي: إذا مر أكثر من 3 دقائق، لا تسجل الدخول
    if (saved && lastActivity) {
      if (Date.now() - parseInt(lastActivity) > INACTIVITY_LIMIT) {
        localStorage.removeItem('dialysis_user');
        localStorage.removeItem('last_activity');
        return null;
      }
    }
    return saved ? JSON.parse(saved) : null;
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem('dialysis_user');
    const lastActivity = localStorage.getItem('last_activity');
    if (saved && lastActivity) {
      return (Date.now() - parseInt(lastActivity)) <= INACTIVITY_LIMIT;
    }
    return false;
  });

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('dialysis_user');
    localStorage.removeItem('last_activity');
  };

  // مراقبة النشاط
  useEffect(() => {
    if (!isAuthenticated) return;

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      localStorage.setItem('last_activity', lastActivityRef.current.toString());
    };

    // قائمة الأحداث التي تعتبر نشاطاً للمستخدم
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // فحص دوري كل ثانية للتأكد من وقت الخمول
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastActivityRef.current > INACTIVITY_LIMIT) {
        console.log("Inactivity logout triggered");
        handleLogout();
      }
    }, 1000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    const now = Date.now();
    lastActivityRef.current = now;
    localStorage.setItem('dialysis_user', JSON.stringify(user));
    localStorage.setItem('last_activity', now.toString());
  };

  if (!isAuthenticated) {
    return <LoginModule onLoginSuccess={handleLoginSuccess} />;
  }

  const renderModule = () => {
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
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="flex justify-between items-center mb-6 no-print">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          <div className="text-gray-500 text-sm font-medium">
            مرحباً، <span className="text-primary-600 font-bold">{currentUser?.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[10px] text-gray-400 font-bold bg-gray-100 px-2 py-1 rounded border">
            تنتهي الجلسة تلقائياً عند الخمول
          </div>
          <button 
            onClick={handleLogout}
            className="text-red-500 text-xs font-bold hover:bg-red-50 px-3 py-1 rounded-lg border border-red-100 transition-colors"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
      {renderModule()}
    </Layout>
  );
};

export default App;
