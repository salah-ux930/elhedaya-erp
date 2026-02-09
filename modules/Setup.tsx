
import React, { useState, useEffect } from 'react';
import { AR } from '../constants';
import { DB } from '../store';
import { Service, Store, Product, FundingEntity, FinancialAccount } from '../types';
import { Package, Store as StoreIcon, CreditCard, Tag, Plus, Trash2, X, Loader2, Wallet } from 'lucide-react';

const SetupModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'services' | 'stores' | 'products' | 'funding' | 'accounts'>('services');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
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
    try {
      if (activeTab === 'services') setServices(await DB.getServices());
      if (activeTab === 'stores') setStores(await DB.getStores());
      if (activeTab === 'products') setProducts(await DB.getProducts());
      if (activeTab === 'funding') setFunding(await DB.getFundingEntities());
      if (activeTab === 'accounts') setAccounts(await DB.getAccounts());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    setLoading(true);
    try {
      if (activeTab === 'services') {
        await DB.addService({ name: target.name.value, price: parseFloat(target.price.value), category: target.category.value });
      } else if (activeTab === 'stores') {
        await DB.addStore({ name: target.name.value, isMain: target.isMain.checked });
      } else if (activeTab === 'products') {
        await DB.addProduct({ name: target.name.value, unit: target.unit.value, minStock: parseInt(target.minStock.value), price: parseFloat(target.price.value) });
      } else if (activeTab === 'funding') {
        await DB.addFundingEntity(target.name.value);
      } else if (activeTab === 'accounts') {
        await DB.addAccount({ name: target.name.value, type: target.type.value, balance: 0 });
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      alert("حدث خطأ أثناء الحفظ. تأكد من تشغيل كود SQL في Supabase.");
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
    } catch (err) {
      alert("حدث خطأ أثناء الحذف");
    }
  };

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
            {activeTab === 'products' && 'دليل الأصناف'}
            {activeTab === 'funding' && 'جهات التعاقد'}
            {activeTab === 'accounts' && 'تعريف الخزائن والحسابات'}
          </h3>
          <button onClick={() => setShowModal(true)} className="bg-primary-600 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
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
              {/* بقية الأكواد للتبويبات الأخرى (services, stores, etc.) مشابهة لما سبق */}
              {activeTab === 'services' && services.map(s => (
                <div key={s.id} className="p-4 border rounded-xl flex justify-between items-center bg-white group">
                  <div><div className="font-bold">{s.name}</div><div className="text-sm text-primary-600 font-bold">{s.price} ج.م</div></div>
                  <button onClick={() => handleDelete(s.id)} className="p-2 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                </div>
              ))}
              {activeTab === 'stores' && stores.map(st => (
                <div key={st.id} className="p-4 border rounded-xl flex justify-between items-center bg-white group">
                  <div><div className="font-bold">{st.name}</div><div className="text-xs text-gray-400">{st.isMain ? 'مخزن رئيسي' : 'مخزن فرعي'}</div></div>
                  <button onClick={() => handleDelete(st.id)} className="p-2 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                </div>
              ))}
              {activeTab === 'products' && products.map(p => (
                <div key={p.id} className="p-4 border rounded-xl flex justify-between items-center bg-white group">
                  <div><div className="font-bold">{p.name}</div><div className="text-xs text-gray-400">{p.unit}</div></div>
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95">
            <div className="p-6 bg-primary-600 text-white flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold flex items-center gap-2"><Plus size={22} /> إضافة جديد</h3>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleAddItem} className="p-8 space-y-4">
              {activeTab === 'accounts' ? (
                <>
                  <input name="name" required placeholder="اسم الخزينة أو البنك" className="w-full border rounded-xl p-3 bg-gray-50 outline-none" />
                  <select name="type" className="w-full border rounded-xl p-3 bg-gray-50 outline-none">
                    <option value="CASH">خزينة نقدية</option>
                    <option value="BANK">حساب بنكي</option>
                  </select>
                </>
              ) : activeTab === 'services' ? (
                <>
                  <input name="name" required placeholder="اسم الخدمة" className="w-full border rounded-xl p-3 bg-gray-50 outline-none" />
                  <input name="price" type="number" required placeholder="السعر" className="w-full border rounded-xl p-3 bg-gray-50 outline-none" />
                  <select name="category" className="w-full border rounded-xl p-3 bg-gray-50 outline-none">
                    <option value="DIALYSIS">جلسة غسيل</option>
                    <option value="LAB">تحاليل</option>
                    <option value="OTHER">أخرى</option>
                  </select>
                </>
              ) : activeTab === 'stores' ? (
                <>
                  <input name="name" required placeholder="اسم المخزن" className="w-full border rounded-xl p-3 bg-gray-50 outline-none" />
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                    <input name="isMain" type="checkbox" className="w-5 h-5 accent-primary-600" />
                    <span className="font-bold text-gray-600 text-sm">مخزن رئيسي؟</span>
                  </label>
                </>
              ) : (
                <input name="name" required placeholder="الاسم" className="w-full border rounded-xl p-3 bg-gray-50 outline-none" />
              )}
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">إلغاء</button>
                <button type="submit" disabled={loading} className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg">
                   {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'حفظ البيانات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupModule;
