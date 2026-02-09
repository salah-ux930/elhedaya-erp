
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout.tsx';
import DashboardModule from './modules/Dashboard.tsx';
import NotificationsModule from './modules/Notifications.tsx';
import ReceptionModule from './modules/Reception.tsx';
import PatientModule from './modules/Patients.tsx';
import ActivePatients from './modules/ActivePatients.tsx';
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

const INACTIVITY_LIMIT = 60 * 60 * 1000;

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
    const resetTimer = () => { lastActivityRef.current = Date.now(); };
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    const interval = setInterval(() => { if (Date.now() - lastActivityRef.current > INACTIVITY_LIMIT) handleLogout(); }, 10000);
    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) return <LoginModule onLoginSuccess={handleLoginSuccess} />;

  const tabPermissions: Record<string, Permission> = {
    dashboard: 'VIEW_DASHBOARD',
    notifications: 'VIEW_NOTIFICATIONS',
    activePatients: 'MANAGE_RECEPTION',
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

  const hasPermission = (tab: string) => currentUser?.permissions?.includes(tabPermissions[tab]);

  const renderModule = () => {
    if (!hasPermission(activeTab)) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-red-100">
           <ShieldAlert size={64} className="text-red-500 mb-6" />
           <h3 className="text-2xl font-bold text-gray-800">لا تملك صلاحية الوصول</h3>
           <p className="text-gray-500 mt-2">يرجى مراجعة الإدارة لمنحك صلاحية ({tabPermissions[activeTab]}).</p>
           <button onClick={() => setActiveTab('dashboard')} className="mt-8 px-10 py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg">العودة للرئيسية</button>
        </div>
      );
    }
    switch (activeTab) {
      case 'dashboard': return <DashboardModule />;
      case 'notifications': return <NotificationsModule />;
      case 'activePatients': return <ActivePatients />;
      case 'reception': return <ReceptionModule />;
      case 'patients': return <PatientModule setTab={setActiveTab} />;
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
      {renderModule()}
    </Layout>
  );
};

export default App;
