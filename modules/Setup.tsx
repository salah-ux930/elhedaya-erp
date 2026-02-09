
import React, { useState, useEffect } from 'react';
import { AR } from '../constants';
import { DB } from '../store';
import { Service, Store, Product, FinancialAccount } from '../types';
import { 
  Package, Store as StoreIcon, Tag, Plus, Trash2, X, 
  Loader2, Wallet, Layers, Database, Copy, Terminal, RefreshCw,
  PlusCircle, Trash, Settings
} from 'lucide-react';

const SetupModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'services' | 'stores' | 'products' | 'accounts'>('services');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSchemaError, setIsSchemaError] = useState(false);
  
  const [services, setServices] = useState<Service[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

  // Service Config States
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [linkedProducts, setLinkedProducts] = useState<{product_id: string, quantity: number}[]>([]);

  useEffect(() => { loadData(); }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setIsSchemaError(false);
    try {
      if (activeTab === 'services') setServices(await DB.getServices());
      if (activeTab === 'stores') setStores(await DB.getStores());
      if (activeTab === 'products') setProducts(await DB.getProducts());
      if (activeTab === 'accounts') setAccounts(await DB.getAccounts());
    } catch (err: any) {
      if (err.message?.includes('SCHEMA_ERROR')) setIsSchemaError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    setLoading(true);
    try {
      await DB.addService({
        name: target.name.value,
        price: parseFloat(target.price.value),
        category: target.category.value,
        config: {
          required_fields: customFields,
          consumables: linkedProducts
        }
      });
      setShowModal(false);
      setCustomFields([]);
      setLinkedProducts([]);
      await loadData();
    } catch (err) { alert("خطأ في الحفظ"); } finally { setLoading(false); }
  };

  const sqlCode = `-- كود SQL المحدث لبناء الجداول بالخصائص الجديدة
DROP TABLE IF EXISTS stock_transactions CASCADE;
DROP TABLE IF EXISTS dialysis_sessions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS shift_records CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS financial_accounts CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS system_users CASCADE;

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  category TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_main BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT,
  min_stock NUMERIC DEFAULT 0,
  price NUMERIC DEFAULT 0,
  barcode TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  store_id UUID REFERENCES stores(id),
  type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  note TEXT
);

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  national_id TEXT UNIQUE NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE dialysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  service_id UUID REFERENCES services(id),
  status TEXT DEFAULT 'ACTIVE',
  weight_before NUMERIC,
  blood_pressure TEXT,
  room TEXT,
  custom_data JSONB,
  date DATE DEFAULT CURRENT_DATE,
  start_time TIME DEFAULT CURRENT_TIME
);

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  shift_price NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE shift_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  count NUMERIC DEFAULT 1,
  date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  balance NUMERIC DEFAULT 0
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES financial_accounts(id),
  amount NUMERIC,
  type TEXT,
  date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE system_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  permissions TEXT[]
);

INSERT INTO system_users (name, username, password, permissions) VALUES 
('المدير العام', 'admin', 'admin123', ARRAY['VIEW_DASHBOARD', 'MANAGE_PAYROLL', 'MANAGE_INVENTORY', 'MANAGE_FINANCE', 'MANAGE_USERS', 'SYSTEM_SETUP', 'MANAGE_RECEPTION', 'MANAGE_PATIENTS']);
`;

  if (isSchemaError) {
    return (
      <div className="max-w-4xl mx-auto p-10 bg-white rounded-[2.5rem] shadow-xl text-center">
        <Database className="mx-auto text-red-500 mb-6" size={64} />
        <h2 className="text-2xl font-black text-red-600 mb-4">يوجد نقص في جداول قاعدة البيانات</h2>
        <p className="text-gray-500 mb-8 font-bold">يرجى تشغيل كود SQL التالي في محرّر Supabase لإصلاح المشكلة.</p>
        <div className="bg-gray-900 rounded-2xl p-6 text-left relative overflow-hidden">
          <button onClick={() => navigator.clipboard.writeText(sqlCode)} className="absolute top-4 left-4 bg-white/10 text-white p-2 rounded-lg hover:bg-white/20 transition-all flex items-center gap-2 text-xs"><Copy size={14}/> نسخ الكود</button>
          <pre className="text-gray-300 font-mono text-[10px] overflow-x-auto max-h-60 text-left">{sqlCode}</pre>
        </div>
        <button onClick={() => window.location.reload()} className="mt-8 px-10 py-4 bg-primary-600 text-white rounded-xl font-black flex items-center justify-center gap-3 mx-auto shadow-lg"><RefreshCw size={20}/> تحديث الصفحة بعد التشغيل</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-gray-200/50 rounded-xl w-fit">
        <button onClick={() => setActiveTab('services')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'services' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}>الخدمات المتقدمة</button>
        <button onClick={() => setActiveTab('stores')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'stores' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}>المخازن</button>
        <button onClick={() => setActiveTab('products')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'products' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}>دليل الأصناف</button>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border">
        <div className="flex justify-between items-center mb-8">
           <h3 className="text-xl font-black text-gray-800">إدارة {activeTab === 'services' ? 'الخدمات الطبية والذكية' : 'الموارد'}</h3>
           <button onClick={() => setShowModal(true)} className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg"><Plus size={20}/> إضافة جديد</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {activeTab === 'services' && services.map(s => (
             <div key={s.id} className="p-6 border rounded-2xl bg-gray-50 hover:border-primary-300 transition-all group">
                <div className="flex justify-between items-start mb-4">
                   <div className="p-3 bg-white rounded-xl text-primary-600 shadow-sm"><Tag size={20}/></div>
                   <button onClick={() => DB.deleteService(s.id).then(loadData)} className="p-2 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                </div>
                <div className="font-black text-gray-800 text-lg mb-1">{s.name}</div>
                <div className="text-primary-600 font-bold mb-4">{s.price} ج.م</div>
                <div className="flex flex-wrap gap-1">
                   {s.config?.consumables?.length ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">خصم مخزني تلقائي</span> : null}
                   {s.config?.required_fields?.length ? <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">نموذج مخصص</span> : null}
                </div>
             </div>
           ))}
        </div>
      </div>

      {showModal && activeTab === 'services' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
             <div className="p-8 bg-primary-600 text-white flex justify-between items-center rounded-t-[3rem]">
                <h3 className="text-2xl font-black">تعريف خدمة طبية ذكية</h3>
                <button onClick={() => setShowModal(false)}><X size={32}/></button>
             </div>
             
             <form onSubmit={handleAddService} className="p-10 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1">
                      <label className="text-xs font-black text-gray-400 mr-2">اسم الخدمة</label>
                      <input name="name" required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs font-black text-gray-400 mr-2">السعر (ج.م)</label>
                      <input name="price" type="number" required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-black outline-none" />
                   </div>
                   <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-black text-gray-400 mr-2">التصنيف</label>
                      <select name="category" className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none">
                         <option value="DIALYSIS">جلسة غسيل</option>
                         <option value="LAB">تحاليل</option>
                         <option value="PHARMACY">صيدلية</option>
                      </select>
                   </div>
                </div>

                <div className="space-y-4 pt-6 border-t">
                   <h4 className="font-black text-indigo-600 flex items-center gap-2"><Settings size={20}/> الحقول المطلوبة عند التنفيذ</h4>
                   <div className="flex gap-2">
                      <input id="newFieldName" placeholder="مثلاً: درجة الحرارة، ضغط الدم..." className="flex-1 border-2 border-gray-100 rounded-xl p-3 outline-none" />
                      <button type="button" onClick={() => {
                        const name = (document.getElementById('newFieldName') as HTMLInputElement).value;
                        if(name) setCustomFields([...customFields, name]);
                        (document.getElementById('newFieldName') as HTMLInputElement).value = '';
                      }} className="bg-indigo-600 text-white px-4 rounded-xl"><Plus size={20}/></button>
                   </div>
                   <div className="flex flex-wrap gap-2">
                      {customFields.map((f, i) => (
                        <span key={i} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-100 flex items-center gap-2">
                          {f} <button type="button" onClick={() => setCustomFields(customFields.filter((_, idx) => idx !== i))}><X size={12}/></button>
                        </span>
                      ))}
                   </div>
                </div>

                <div className="space-y-4 pt-6 border-t">
                   <h4 className="font-black text-emerald-600 flex items-center gap-2"><Package size={20}/> الأصناف المستهلكة (الخصم التلقائي)</h4>
                   <div className="grid grid-cols-12 gap-2">
                      <select id="prodSelect" className="col-span-7 border-2 border-gray-100 rounded-xl p-3 outline-none">
                         {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input id="prodQty" type="number" placeholder="الكمية" className="col-span-3 border-2 border-gray-100 rounded-xl p-3 outline-none" />
                      <button type="button" onClick={() => {
                        const pid = (document.getElementById('prodSelect') as HTMLSelectElement).value;
                        const qty = parseFloat((document.getElementById('prodQty') as HTMLInputElement).value);
                        if(pid && qty) setLinkedProducts([...linkedProducts, {product_id: pid, quantity: qty}]);
                      }} className="col-span-2 bg-emerald-600 text-white rounded-xl flex items-center justify-center"><PlusCircle size={20}/></button>
                   </div>
                   <div className="space-y-2">
                      {linkedProducts.map((lp, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                           <span className="text-xs font-bold text-emerald-800">{products.find(p => p.id === lp.product_id)?.name}</span>
                           <div className="flex items-center gap-3">
                              <span className="font-black text-emerald-600">{lp.quantity}</span>
                              <button type="button" onClick={() => setLinkedProducts(linkedProducts.filter((_, idx) => idx !== i))} className="text-red-400"><Trash size={14}/></button>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <button type="submit" className="w-full py-5 bg-primary-600 text-white rounded-2xl font-black shadow-xl">حفظ الخدمة وتفعيل الربط المخزني</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupModule;
