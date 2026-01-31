import React, { useState } from 'react';
import Layout from './components/Layout';
import DashboardModule from './modules/Dashboard';
import ReceptionModule from './modules/Reception';
import PatientModule from './modules/Patients';
import BillingModule from './modules/Billing';
import PayrollModule from './modules/Payroll';
import InventoryModule from './modules/Inventory';
import FinanceModule from './modules/Finance';
import SetupModule from './modules/Setup';
import UsersModule from './modules/Users';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

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
      {renderModule()}
    </Layout>
  );
};

export default App;