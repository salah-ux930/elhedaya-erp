
import React, { useState, useEffect } from 'react';
import { AR } from '../constants';
import { DB } from '../store';
import { Service, Store, Product, FundingEntity, FinancialAccount } from '../types';
import { 
  Package, Store as StoreIcon, CreditCard, Tag, Plus, Trash2, X, 
  Loader2, Wallet, Layers, Info, Barcode, AlertCircle, CheckCircle, 
  Database, Copy, Terminal, RefreshCw
} from 'lucide-react';

const SetupModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'services' | 'stores' | 'products' | 'funding' | 'accounts'>('services');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSchemaError, setIsSchemaError] = useState(false);
  
  const [services, setServices] = useState<Service[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [funding, setFunding] = useState<FundingEntity[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setSubmitError(null);
    setIsSchemaError(false);
    try {
      if (activeTab === 'services') setServices(await DB.getServices());
      if (activeTab === 'stores') setStores(await DB.getStores());
      if (activeTab === 'products') setProducts(await DB.getProducts());
      if (activeTab === 'funding') setFunding(await DB.getFundingEntities());
      if (activeTab === 'accounts') setAccounts(await DB.getAccounts());
    } catch (err: any) {
      console.error("Setup Load Error:", err);
      if (err.message?.includes('SCHEMA_ERROR')) {
        setIsSchemaError(true);
      } else {
        setSubmitError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    setLoading(true);
    setSubmitError(null);
    
    try {
      if (activeTab === 'services') {
        await DB.addService({ 
          name: target.name.value, 
          price: parseFloat(target.price.value) || 0, 
          category: target.category.value 
        });
      } else if (activeTab === 'stores') {
        await DB.addStore({ 
          name: target.name.value, 
          is_main: target.is_main.checked 
        });
      } else if (activeTab === 'products') {
        await DB.addProduct({ 
          name: target.name.value, 
          unit: target.unit.value, 
          min_stock: parseInt(target.min_stock.value) || 0, 
          price: parseFloat(target.price.value) || 0,
          category: target.category.value,
          barcode: target.barcode.value,
          description: target.description.value
        });
      } else if (activeTab === 'funding') {
        await DB.addFundingEntity(target.name.value);
      } else if (activeTab === 'accounts') {
        await DB.addAccount({ 
          name: target.name.value, 
          type: target.type.value, 
          balance: 0 
        });
      }
      
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      console.error("Setup Submit Error:", err);
      setSubmitError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(AR.confirmation)) return;
    try {
      if (activeTab === 'services') await DB.deleteService(id);
      if (activeTab === 'stores') await DB.deleteStore(id);
      if (activeTab === 'products') await DB.deleteProduct(id);
      if (activeTab === 'funding') await DB.deleteFundingEntity(id);
      if (activeTab === 'accounts') await DB.deleteAccount(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء الحذف");
    }
  };

  const sqlCode = `-- 1. حذف الجداول القديمة تماماً لضمان البناء الصحيح
DROP TABLE IF EXISTS stock_transactions CASCADE;
DROP TABLE IF EXISTS transfer_requests CASCADE;
DROP TABLE IF EXISTS lab_tests CASCADE;
DROP TABLE IF EXISTS lab_test_definitions CASCADE;
DROP TABLE IF EXISTS dialysis_sessions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS shift_records CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS financial_accounts CASCADE;
DROP TABLE IF EXISTS funding_entities CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS system_users CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- 2. تفعيل إضافات UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. إنشاء الجداول بأسماء حقول مطابقة للكود (snake_case)
CREATE TABLE funding_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE financial_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  linked_employee_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  is_main BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  unit TEXT,
  min_stock NUMERIC DEFAULT 0,
  price NUMERIC(10,2) DEFAULT 0,
  category TEXT,
  barcode TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE stock_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  store_id UUID REFERENCES stores(id),
  type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  target_store_id UUID REFERENCES stores(id),
  date DATE DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE transfer_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_store_id UUID REFERENCES stores(id),
  to_store_id UUID REFERENCES stores(id),
  items JSONB NOT NULL,
  status TEXT DEFAULT 'PENDING',
  requested_by TEXT,
  note TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  national_id TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  blood_type TEXT,
  date_of_birth DATE,
  funding_entity_id UUID REFERENCES funding_entities(id),
  emergency_contact JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE dialysis_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id),
  date DATE DEFAULT CURRENT_DATE,
  start_time TIME,
  end_time TIME,
  weight_before NUMERIC(5,2),
  weight_after NUMERIC(5,2),
  blood_pressure TEXT,
  room TEXT,
  machine_id TEXT,
  status TEXT DEFAULT 'WAITING',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price NUMERIC(10,2) DEFAULT 0,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES financial_accounts(id),
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  category TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE system_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  permissions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE lab_test_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT,
  sample_type TEXT,
  normal_range_male TEXT,
  normal_range_female TEXT,
  normal_range_child TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE lab_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id),
  test_definition_id UUID REFERENCES lab_test_definitions(id),
  result TEXT,
  status TEXT DEFAULT 'PENDING',
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  bank_account TEXT,
  shift_price NUMERIC DEFAULT 0,
  type TEXT DEFAULT 'PERMANENT',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE shift_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id),
  date DATE DEFAULT CURRENT_DATE,
  count NUMERIC DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT,
  action TEXT,
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. إضافة المستخدم المدير الافتراضي بكافة الصلاحيات
INSERT INTO system_users (name, username, password, permissions) 
VALUES ('المدير العام', 'admin', 'admin123', 
ARRAY['VIEW_DASHBOARD', 'VIEW_NOTIFICATIONS', 'MANAGE_RECEPTION', 'MANAGE_PATIENTS', 'MANAGE_LAB', 'MANAGE_BILLING', 'MANAGE_PAYROLL', 'MANAGE_INVENTORY', 'MANAGE_FINANCE', 'MANAGE_USERS', 'SYSTEM_SETUP']);

-- 5. تحديث كاش PostgREST
NOTIFY pgrst, 'reload schema';`;

  if (isSchemaError) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in zoom-in-95">
        <div className="bg-red-50 border-2 border-red-200 p-8 rounded-[2.5rem] text-center shadow-xl shadow-red-500/5">
          <div className="bg-red-100 text-red-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg">
            <Database size={48} />
          </div>
          <h2 className="text-3xl font-black text-red-700 mb-4">قاعدة البيانات غير مكتملة!</h2>
          <p className="text-red-600 max-w-2xl mx-auto font-bold text-lg mb-8 leading-relaxed">
            يوجد نقص في جداول النظام (خاصة جداول المخازن). يرجى نسخ كود SQL التالي وتشغيله في 
            <span className="bg-red-100 px-2 py-0.5 rounded mx-1 font-bold italic">Supabase SQL Editor</span> 
            لإعادة بناء المخطط بشكل صحيح.
          </p>
          
          <div className="bg-gray-900 rounded-3xl p-6 text-right relative group">
             <div className="absolute top-4 left-4 flex gap-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(sqlCode);
                    alert("تم نسخ الكود بنجاح!");
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all flex items-center gap-2 text-xs"
                >
                  <Copy size={16} /> نسخ الكود
                </button>
             </div>
             <div className="flex items-center gap-2 text-primary-400 mb-4 font-mono text-sm border-b border-white/10 pb-2">
                <Terminal size={16} /> Supabase SQL Editor Script
             </div>
             <pre className="text-gray-300 font-mono text-[10px] overflow-x-auto text-left whitespace-pre-wrap max-h-60 custom-scrollbar">
               {sqlCode}
             </pre>
          </div>

          <button 
            onClick={() => window.location.reload()} 
            className="mt-10 px-12 py-5 bg-red-600 text-white rounded-2xl font-black shadow-2xl shadow-red-600/30 hover:bg-red-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 mx-auto text-lg"
          >
            <RefreshCw size={24} /> إعادة محاولة الاتصال بعد تشغيل الكود
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 p-1 bg-gray-200/50 rounded-xl w-fit no-print">
        <button onClick={() => setActiveTab('services')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'services' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
          <Tag size={18} /> {AR.services}
        </button>
        <button onClick={() => setActiveTab('stores')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'stores' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
          <StoreIcon size={18} /> {AR.stores}
        </button>
        <button onClick={() => setActiveTab('products')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'products' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
          <Package size={18} /> {AR.products}
        </button>
        <button onClick={() => setActiveTab('funding')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'funding' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
          <CreditCard size={18} /> {AR.funding}
        </button>
        <button onClick={() => setActiveTab('accounts')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'accounts' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
          <Wallet size={18} /> الخزائن والبنك
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50/20">
          <h3 className="font-bold text-lg">
            {activeTab === 'services' && 'إدارة الخدمات والأسعار'}
            {activeTab === 'stores' && 'إدارة المخازن'}
            {activeTab === 'products' && 'دليل الأصناف الطبي'}
            {activeTab === 'funding' && 'جهات التعاقد'}
            {activeTab === 'accounts' && 'تعريف الخزائن والحسابات'}
          </h3>
          <button onClick={() => { setSubmitError(null); setShowModal(true); }} className="bg-primary-600 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-primary-700 transition-colors">
            <Plus size={16} /> {AR.add}
          </button>
        </div>

        <div className="p-6">
          {loading && !showModal ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-600" size={40} /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTab === 'accounts' && accounts.map(acc => (
                <div key={acc.id} className="p-4 border rounded-xl flex justify-between items-center bg-white group hover:border-primary-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Wallet size={20} /></div>
                    <div>
                      <div className="font-bold text-gray-800">{acc.name}</div>
                      <div className="text-[10px] text-gray-400 uppercase">{acc.type === 'CASH' ? 'خزينة نقدية' : 'حساب بنكي'}</div>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(acc.id)} className="p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                </div>
              ))}
              {activeTab === 'services' && services.map(s => (
                <div key={s.id} className="p-4 border rounded-xl flex justify-between items-center bg-white group hover:border-primary-300">
                  <div><div className="font-bold">{s.name}</div><div className="text-sm text-primary-600 font-bold">{s.price} ج.م</div></div>
                  <button onClick={() => handleDelete(s.id)} className="p-2 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                </div>
              ))}
              {activeTab === 'stores' && stores.map(st => (
                <div key={st.id} className="p-4 border rounded-xl flex justify-between items-center bg-white group hover:border-primary-300">
                  <div><div className="font-bold">{st.name}</div><div className="text-xs text-gray-400">{st.is_main ? 'مخزن رئيسي' : 'مخزن فرعي'}</div></div>
                  <button onClick={() => handleDelete(st.id)} className="p-2 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                </div>
              ))}
              {activeTab === 'products' && products.map(p => (
                <div key={p.id} className="p-4 border rounded-xl flex justify-between items-center bg-white group shadow-sm hover:shadow-md transition-all hover:border-primary-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Layers size={20} /></div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-800">{p.name}</div>
                      <div className="text-[10px] text-gray-400 font-bold">الوحدة: {p.unit} | التصنيف: {p.category || 'غير محدد'}</div>
                      <div className="text-[9px] text-primary-600">الباركود: {p.barcode || '---'}</div>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                </div>
              ))}
              {activeTab === 'funding' && funding.map(f => (
                <div key={f.id} className="p-4 border rounded-xl flex justify-between items-center bg-white group hover:border-primary-300">
                  <div className="font-bold text-gray-800">{f.name}</div>
                  <button onClick={() => handleDelete(f.id)} className="p-2 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl animate-in zoom-in-95 overflow-hidden">
            <div className="p-6 bg-primary-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2"><Plus size={22} /> إضافة جديد</h3>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            {submitError && (
              <div className="p-4 bg-red-50 text-red-700 text-xs font-bold border-b border-red-100 flex items-center gap-2">
                <AlertCircle size={16} /> {submitError}
              </div>
            )}
            <form onSubmit={handleAddItem} className="p-8 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {activeTab === 'accounts' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 mr-2">اسم الخزينة أو البنك</label>
                    <input name="name" required className="w-full border rounded-xl p-3 bg-gray-50 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 mr-2">نوع الحساب</label>
                    <select name="type" className="w-full border rounded-xl p-3 bg-gray-50 outline-none">
                      <option value="CASH">خزينة نقدية</option>
                      <option value="BANK">حساب بنكي</option>
                    </select>
                  </div>
                </>
              ) : activeTab === 'services' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 mr-2">اسم الخدمة</label>
                    <input name="name" required className="w-full border rounded-xl p-3 bg-gray-50 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 mr-2">السعر (ج.م)</label>
                    <input name="price" type="number" step="0.01" required className="w-full border rounded-xl p-3 bg-gray-50 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 mr-2">التصنيف</label>
                    <select name="category" className="w-full border rounded-xl p-3 bg-gray-50 outline-none">
                      <option value="DIALYSIS">جلسة غسيل</option>
                      <option value="LAB">تحاليل</option>
                      <option value="PHARMACY">صيدلية</option>
                      <option value="OTHER">أخرى</option>
                    </select>
                  </div>
                </>
              ) : activeTab === 'stores' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 mr-2">اسم المخزن</label>
                    <input name="name" required className="w-full border rounded-xl p-3 bg-gray-50 outline-none" />
                  </div>
                  <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer">
                    <input name="is_main" type="checkbox" className="w-5 h-5 accent-primary-600" />
                    <span className="font-bold text-gray-700 text-sm">مخزن رئيسي؟</span>
                  </label>
                </>
              ) : activeTab === 'products' ? (
                <div className="space-y-4">
                  <input name="name" required placeholder="الاسم العلمي / التجاري" className="w-full border rounded-xl p-3 bg-gray-50 outline-none font-bold" />
                  <div className="grid grid-cols-2 gap-4">
                    <input name="unit" required placeholder="الوحدة" className="w-full border rounded-xl p-3 bg-gray-50 outline-none" />
                    <select name="category" className="w-full border rounded-xl p-3 bg-gray-50 outline-none">
                      <option value="MEDICINE">أدوية</option>
                      <option value="CONSUMABLE">مستهلكات طبية</option>
                      <option value="FLUID">محاليل</option>
                      <option value="OTHER">أخرى</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input name="min_stock" type="number" placeholder="حد الطلب" className="w-full border rounded-xl p-3 bg-gray-50 outline-none" />
                    <input name="price" type="number" step="0.01" placeholder="سعر الشراء" className="w-full border rounded-xl p-3 bg-gray-50 outline-none" />
                  </div>
                  <input name="barcode" placeholder="الباركود" className="w-full border rounded-xl p-3 bg-gray-50 outline-none" />
                  <textarea name="description" placeholder="وصف إضافي" className="w-full border rounded-xl p-3 bg-gray-50 outline-none h-20 resize-none"></textarea>
                </div>
              ) : (
                <input name="name" required placeholder="الاسم" className="w-full border rounded-xl p-3 bg-gray-50 outline-none" />
              )}
              <div className="flex gap-3 pt-6 border-t mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-white border border-gray-200 rounded-xl font-bold">إلغاء</button>
                <button type="submit" disabled={loading} className="flex-1 py-4 bg-primary-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg">
                   {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                   {loading ? "جاري الحفظ..." : "حفظ البيانات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #0284c7; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default SetupModule;
