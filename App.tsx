
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout.tsx';
import DashboardModule from './modules/Dashboard.tsx';
import ReceptionModule from './modules/Reception.tsx';
import PatientModule from './modules/Patients.tsx';
import BillingModule from './modules/Billing.tsx';
import PayrollModule from './modules/Payroll.tsx';
import InventoryModule from './modules/Inventory.tsx';
import FinanceModule from './modules/Finance.tsx';
import SetupModule from './modules/Setup.tsx';
import UsersModule from './modules/Users.tsx';
import LoginModule from './modules/Login.tsx';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // التحقق من حالة الجلسة عند التحميل
  useEffect(() => {
    const savedUser = localStorage.getItem('dialysis_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('dialysis_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('dialysis_user');
  };

  if (!isAuthenticated) {
    return <LoginModule onLoginSuccess={handleLoginSuccess} />;
  }

  const renderModule = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardModule />;
      case 'reception': return <ReceptionModule />;
      case 'patients': return <PatientModule />;
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
        <div className="text-gray-500 text-sm font-medium">
          مرحباً، <span className="text-primary-600 font-bold">{currentUser?.name}</span>
        </div>
        <button 
          onClick={handleLogout}
          className="text-red-500 text-xs font-bold hover:bg-red-50 px-3 py-1 rounded-lg border border-red-100 transition-colors"
        >
          تسجيل الخروج
        </button>
      </div>
      {renderModule()}
    </Layout>
  );
};

export default App;
