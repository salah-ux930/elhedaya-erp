import React, { useState, useEffect } from 'react';
import { AR } from '../constants';
import { DB } from '../store';
import { Service, Store, Product, FinancialAccount, FundingEntity } from '../types';
import { 
  Package, Store as StoreIcon, Tag, Plus, Trash2, X, 
  Loader2, Wallet, CreditCard, Lock, Eye, ShieldCheck, Info
} from 'lucide-react';
import {
  canViewAccount,
  canManageAccount,
  canManageStore,
  canPerformCrud,
  getCurrentStoredUser,
  CLIENT_GUARD_SECURITY_NOTICE
} from '../utils/permissions.ts';

const SetupModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'services' | 'stores' | 'products' | 'accounts' | 'funding'>('services');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  
  const [services, setServices] = useState<Service[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [funding, setFunding] = useState<FundingEntity[]>([]);

  const [customFields, setCustomFields] = useState<string[]>([]);
  const [linkedProducts, setLinkedProducts] = useState<{product_id: string, quantity: number}[]>([]);

  const currentUser = getCurrentStoredUser();

  useEffect(() => { loadData(); }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'services') setServices(await DB.getServices());
      if (activeTab === 'stores') setStores(await DB.getStores());
      if (activeTab === 'products') setProducts(await DB.getProducts());
      if (activeTab === 'accounts') setAccounts(await DB.getAccounts());
      if (activeTab === 'funding') setFunding(await DB.getFundingEntities());
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const canCreateCurrentTab = () => {
    if (activeTab === 'accounts') return canPerformCrud(currentUser, 'financial_accounts', 'create');
    if (activeTab === 'stores') return canPerformCrud(currentUser, 'stores', 'create');
    return canPerformCrud(currentUser, 'setup', 'create');
  };

  const handleOpenModal = (item: any = null) => {
    if (!canCreateCurrentTab()) {
      alert('عذراً، لا تملك صلاحية الإضافة أو التعديل في هذا القسم.');
      return;
    }
    setEditItem(item);
    if (activeTab === 'services') {
      setCustomFields(item?.config?.required_fields || []);
      setLinkedProducts(item?.config?.consumables || []);
    } else {
      setCustomFields([]);
      setLinkedProducts([]);
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    setLoading(true);
    try {
      if (activeTab === 'services') {
        const payload = {
          name: target.name.value,
          price: parseFloat(target.price.value),
          category: target.category.value,
          config: { required_fields: customFields, consumables: linkedProducts }
        };
        if (editItem) await DB.updateService(editItem.id, payload);
        else await DB.addService(payload);
      } else if (activeTab === 'stores') {
        const payload = { name: target.name.value, is_main: target.is_main?.checked || false };
        if (editItem) await DB.updateStore(editItem.id, payload);
        else await DB.addStore(payload);
      } else if (activeTab === 'products') {
        const payload = {
          name: target.name.value,
          unit: target.unit?.value || 'وحدة',
          min_stock: parseFloat(target.min_stock?.value || '10'),
          price: parseFloat(target.price?.value || '0'),
          category: target.category?.value || 'عام'
        };
        if (editItem) await DB.updateProduct(editItem.id, payload);
        else await DB.addProduct(payload);
      } else if (activeTab === 'accounts') {
        const payload = {
          name: target.name.value,
          type: target.type.value,
          balance: parseFloat(target.balance?.value || editItem?.balance || '0')
        };
        if (editItem) await DB.updateFinancialAccount(editItem.id, payload);
        else await DB.addFinancialAccount(payload);
      } else if (activeTab === 'funding') {
        await DB.addFundingEntity({ name: target.name.value });
      }
      
      setShowModal(false);
      await loadData();
    } catch (err) { 
      alert("خطأ: " + (err as Error).message); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-gray-200/50 rounded-xl w-fit flex-wrap">
        <button onClick={() => setActiveTab('services')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'services' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}>الخدمات</button>
        <button onClick={() => setActiveTab('stores')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'stores' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}>المخازن</button>
        <button onClick={() => setActiveTab('products')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'products' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}>الأصناف</button>
        <button onClick={() => setActiveTab('accounts')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'accounts' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}>الحسابات</button>
        <button onClick={() => setActiveTab('funding')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'funding' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}>جهات التعاقد</button>
      </div>

      {activeTab === 'accounts' && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs font-bold leading-relaxed">
          <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-black">سياسة أمان الخزن والحسابات المالية: </span>
            <span>
              صلاحية «تعريف الخزن» أو «إعدادات النظام» تسمح بتعريف هيكل الحسابات، لكنها لا تمنح تلقائياً كشف أرصدة أو حذف الخزن غير المخصصة لحسابك. لعرض الرصيد أو التحكم في خزينة معينة، يجب أن تكون مخصصة لك عبر (ACCOUNT_VIEW / ACCOUNT_MANAGE).
            </span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border">
        <div className="flex justify-between items-center mb-8">
           <h3 className="text-xl font-black text-gray-800">إدارة الإعدادات والتعريفات</h3>
           <button
             disabled={!canCreateCurrentTab()}
             onClick={() => handleOpenModal()}
             className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-primary-700 disabled:opacity-50 transition-all"
           >
             <Plus size={20}/> إضافة جديد
           </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-600" size={48} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {activeTab === 'services' && services.map(s => (
               <div key={s.id} className="p-6 border rounded-3xl bg-gray-50 hover:bg-white hover:shadow-xl hover:border-primary-200 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                     <div className="p-3 bg-primary-100 text-primary-600 rounded-2xl"><Tag size={20}/></div>
                     {canPerformCrud(currentUser, 'setup', 'delete') && (
                       <button onClick={() => { if(confirm('حذف الخدمة؟')) DB.deleteService(s.id).then(loadData); }} className="p-2 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                     )}
                  </div>
                  <div className="font-black text-gray-800 text-lg mb-1">{s.name}</div>
                  <div className="text-primary-600 font-bold">{s.price} ج.م</div>
               </div>
             ))}

             {activeTab === 'stores' && stores.map(s => {
               const canDeleteStore = canPerformCrud(currentUser, 'stores', 'delete', s.id);
               const isStoreManageable = canManageStore(currentUser, s.id);
               return (
                 <div key={s.id} className="p-6 border rounded-3xl bg-gray-50 hover:bg-white hover:shadow-xl hover:border-indigo-200 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                       <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl"><StoreIcon size={20}/></div>
                       {canDeleteStore ? (
                         <button onClick={() => { if(confirm('حذف المخزن؟')) DB.deleteStore(s.id).then(loadData); }} className="p-2 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                       ) : (
                         <span className="text-[10px] px-2 py-1 rounded-lg bg-slate-200/70 text-slate-600 font-bold flex items-center gap-1" title="غير مخصص لك صلاحية إدارة هذا المخزن">
                           <Lock size={11} /> غير مخصص للإدارة
                         </span>
                       )}
                    </div>
                    <div className="font-black text-gray-800 text-lg mb-1">{s.name}</div>
                    <div className="flex items-center gap-2 mt-2">
                      {s.is_main && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold">المخزن الرئيسي</span>}
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${isStoreManageable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {isStoreManageable ? 'مخصص لك (إدارة)' : 'غير مخصص للإدارة'}
                      </span>
                    </div>
                 </div>
               );
             })}

             {activeTab === 'products' && products.map(p => (
               <div key={p.id} className="p-6 border rounded-3xl bg-gray-50 hover:bg-white hover:shadow-xl hover:border-primary-200 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                     <div className="p-3 bg-primary-100 text-primary-600 rounded-2xl"><Package size={20}/></div>
                  </div>
                  <div className="font-black text-gray-800 text-lg mb-1">{p.name}</div>
                  <div className="text-xs text-gray-500 font-bold">الوحدة: {p.unit} | الحد الأدنى: {p.min_stock}</div>
               </div>
             ))}
             
             {activeTab === 'accounts' && accounts.map(a => {
               const canViewThis = canViewAccount(currentUser, a.id);
               const canManageThis = canManageAccount(currentUser, a.id);
               const canDeleteThis = canPerformCrud(currentUser, 'financial_accounts', 'delete', a.id);

               return (
                 <div key={a.id} className="p-6 border rounded-3xl bg-gray-50 hover:bg-white hover:shadow-xl hover:border-primary-200 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                       <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><Wallet size={20}/></div>
                       {canDeleteThis ? (
                         <button
                           onClick={() => { if(confirm('حذف الحساب؟')) DB.deleteFinancialAccount(a.id).then(loadData).catch(e => alert(e.message)); }}
                           className="p-2 text-red-400 opacity-0 group-hover:opacity-100"
                           title="حذف الحساب المالي"
                         >
                           <Trash2 size={18}/>
                         </button>
                       ) : (
                         <span
                           className="text-[10px] px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold flex items-center gap-1"
                           title="حساب غير مخصص لك بصلاحية إدارة (ACCOUNT_MANAGE)"
                         >
                           <Lock size={11} /> {canViewThis ? 'مشاهدة فقط' : 'حساب غير مخصص لك'}
                         </span>
                       )}
                    </div>
                    <div className="font-black text-gray-800 text-lg mb-1">{a.name}</div>
                    <div className="text-sm text-gray-500 font-bold mb-2">
                      {a.type === 'CASH' ? 'خزينة نقدية' : 'حساب بنكي'}
                    </div>
                    {canViewThis ? (
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xl font-black text-primary-600">{Number(a.balance).toLocaleString()} ج.م</div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${canManageThis ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {canManageThis ? <><ShieldCheck size={11}/> مخصص (إدارة)</> : <><Eye size={11}/> مخصص (مشاهدة)</>}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                        <Lock size={13} className="text-rose-500 shrink-0" />
                        <span>الرصيد محجوب — هذا الحساب المالي غير مخصص لحسابك (ACCOUNT_VIEW)</span>
                      </div>
                    )}
                 </div>
               );
             })}

             {activeTab === 'funding' && funding.map(fe => (
               <div key={fe.id} className="p-6 border rounded-3xl bg-gray-50 hover:bg-white hover:shadow-xl hover:border-emerald-200 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                     <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><CreditCard size={20}/></div>
                     {canPerformCrud(currentUser, 'setup', 'delete') && (
                       <button onClick={() => { if(confirm('حذف جهة التعاقد؟')) DB.deleteFundingEntity(fe.id).then(loadData); }} className="p-2 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                     )}
                  </div>
                  <div className="font-black text-gray-800 text-lg mb-1">{fe.name}</div>
                  {fe.created_at && (
                    <div className="text-[10px] text-gray-400 font-bold uppercase mt-2">
                      تاريخ الإضافة: {new Date(fe.created_at).toLocaleDateString()}
                    </div>
                  )}
               </div>
             ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black">إضافة جديد</h3>
                <button onClick={() => setShowModal(false)}><X size={32}/></button>
             </div>
             
             <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-1">
                   <label className="text-xs font-black text-gray-400 mr-2 uppercase tracking-widest">الاسم</label>
                   <input name="name" required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none" />
                </div>

                {activeTab === 'services' && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                       <label className="text-xs font-black text-gray-400 mr-2 uppercase">السعر</label>
                       <input name="price" type="number" required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-black outline-none" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-black text-gray-400 mr-2 uppercase">التصنيف</label>
                       <select name="category" className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none">
                          <option value="DIALYSIS">غسيل كلى</option>
                          <option value="LAB">تحاليل</option>
                       </select>
                    </div>
                  </div>
                )}

                {activeTab === 'products' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-400 mr-2 uppercase">الوحدة</label>
                      <input name="unit" defaultValue="وحدة" required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-400 mr-2 uppercase">الحد الأدنى للرصيد</label>
                      <input name="min_stock" type="number" defaultValue="10" required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-black outline-none" />
                    </div>
                  </div>
                )}
                
                {activeTab === 'accounts' && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                       <label className="text-xs font-black text-gray-400 mr-2 uppercase">نوع الحساب</label>
                       <select name="type" className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none">
                          <option value="CASH">خزينة نقدية</option>
                          <option value="BANK">حساب بنكي</option>
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-black text-gray-400 mr-2 uppercase">الرصيد الافتتاحي</label>
                       <input name="balance" type="number" step="0.01" defaultValue="0" required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-black outline-none" />
                    </div>
                  </div>
                )}
                
                <button type="submit" className="w-full py-5 bg-primary-600 text-white rounded-2xl font-black shadow-xl hover:bg-primary-700">تأكيد الحفظ</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupModule;
