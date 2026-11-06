
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout.tsx';
import DashboardModule from './modules/Dashboard.tsx';
import NotificationsModule from './modules/Notifications.tsx';
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
import ReportsModule from './modules/Reports.tsx';
import MedicalRecordsModule from './modules/MedicalRecords.tsx';
import ClinicsModule from './modules/Clinics.tsx';
import FamilyFilesModule from './modules/FamilyFiles.tsx';
import PharmacyModule from './modules/Pharmacy.tsx';
import { DB } from './store.ts';
import { ShieldAlert, Lock, Info } from 'lucide-react';
import {
  canAccessTab,
  getTabDenialInfo,
  getFirstAllowedTab,
  CLIENT_GUARD_SECURITY_NOTICE,
  TAB_PERMISSIONS_MAP
} from './utils/permissions.ts';

const INACTIVITY_LIMIT = 60 * 60 * 1000;

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const savedUser = localStorage.getItem('dialysis_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    const firstAllowed = getFirstAllowedTab(currentUser);
    return firstAllowed || 'dashboard';
  });
  const lastActivityRef = useRef<number>(Date.now());
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!currentUser);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      DB.ensureSupabaseAuthSession(currentUser);
    }
  }, [isAuthenticated, currentUser]);

  const handleLogout = () => {
    DB.logout();
    localStorage.removeItem('dialysis_user');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveTab('dashboard');
  };

  const handleLoginSuccess = (user: any) => {
    localStorage.setItem('dialysis_user', JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);
    DB.ensureSupabaseAuthSession(user);
    const firstAllowed = getFirstAllowedTab(user);
    setActiveTab(firstAllowed || 'dashboard');
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const resetTimer = () => { lastActivityRef.current = Date.now(); };
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    const interval = setInterval(() => { 
        if (Date.now() - lastActivityRef.current > INACTIVITY_LIMIT) {
            handleLogout();
        }
    }, 10000);
    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const hasPermission = (tab: string): boolean => {
    return canAccessTab(currentUser, tab);
  };

  const renderModule = () => {
    if (!hasPermission(activeTab)) {
      const denialInfo = getTabDenialInfo(currentUser, activeTab);
      const fallbackTab = getFirstAllowedTab(currentUser);

      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-3xl border-2 border-dashed border-red-200 max-w-3xl mx-auto my-6 text-center shadow-sm">
          <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mb-5 border border-red-100">
            <ShieldAlert size={44} className="text-red-600" />
          </div>
          <h3 className="text-2xl font-black text-slate-900">لا تملك صلاحية الوصول لهذا التبويب</h3>
          <p className="text-slate-600 font-bold mt-3 max-w-xl leading-relaxed">
            {denialInfo.reason}
          </p>

          {denialInfo.requiredPermissions.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {denialInfo.requiredPermissions.map((permKey, idx) => (
                <span
                  key={permKey}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-black"
                >
                  <Lock size={13} />
                  <span>{denialInfo.requiredLabels[idx] || permKey}</span>
                  <span className="font-mono text-[11px] opacity-75">({permKey})</span>
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs font-bold max-w-xl flex items-start gap-2.5 text-right leading-relaxed">
            <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <span>{CLIENT_GUARD_SECURITY_NOTICE}</span>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {fallbackTab && fallbackTab !== activeTab && (
              <button
                onClick={() => setActiveTab(fallbackTab)}
                className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black shadow-md transition-all cursor-pointer"
              >
                الانتقال إلى أول قسم مصرح به
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
            >
              تسجيل الدخول بحساب آخر
            </button>
          </div>
        </div>
      );
    }
    switch (activeTab) {
      case 'dashboard': return <DashboardModule />;
      case 'notifications': return <NotificationsModule />;
      case 'reception':
      case 'sessionReception':
      case 'clinicReception': return <ReceptionModule />;
      case 'patients': return <PatientModule setTab={setActiveTab} />;
      case 'lab': return <LabModule />;
      case 'billing': return <BillingModule />;
      case 'employees': return <PayrollModule />;
      case 'inventory': return <InventoryModule />;
      case 'finance': return <FinanceModule />;
      case 'users': return <UsersModule />;
      case 'setup': return <SetupModule />;
      case 'reports': return <ReportsModule />;
      case 'medicalRecords': return <MedicalRecordsModule />;
      case 'clinics': return <ClinicsModule />;
      case 'familyFiles': return <FamilyFilesModule />;
      case 'pharmacy': return <PharmacyModule />;
      default: return <DashboardModule />;
    }
  };

  if (!isAuthenticated) {
    return <LoginModule onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} onLogout={handleLogout}>
      {renderModule()}
    </Layout>
  );
};

export default App;
