
import React, { useState, useEffect } from 'react';
import { AR } from '../constants';
import { DB } from '../store';
import { Service, Store, Product, FinancialAccount } from '../types';
import { 
  Package, Store as StoreIcon, Tag, Plus, Trash2, X, 
  Loader2, Wallet, Layers, Database, Copy, RefreshCw,
  PlusCircle, Trash, Settings, Edit3, Landmark, Hash, Boxes, Save
} from 'lucide-react';

const SetupModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'services' | 'stores' | 'products' | 'accounts'>('services');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSchemaError, setIsSchemaError] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  
  const [services, setServices] = useState<Service[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

  // Config States for Services
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

  const handleOpenModal = (item: any = null) => {
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
        const payload = { 
          name: target.name.value, 
          is_main: target.is_main?.checked || false 
        };
        if (editItem) await DB.updateStore(editItem.id, payload);
        else await DB.addStore(payload);
      } else if (activeTab === 'products') {
        const payload = { 
          name: target.name.value, 
          unit: target.unit.value, 
          min_stock: parseFloat(target.min_stock.value || "0"),
          price: parseFloat(target.price.value || "0"),
          category: target.category.value,
          barcode: target.barcode.value
        };
        if (editItem) await DB.updateProduct(editItem.id, payload);
        else await DB.addProduct(payload);
      } else if (activeTab === 'accounts') {
        const payload = { 
          name: target.name.value, 
          type: target.type.value, 
          balance: parseFloat(target.balance?.value || editItem?.balance || "0")
        };
        if (editItem) await DB.updateFinancialAccount(editItem.id, payload);
        else await DB.addFinancialAccount(payload);
      }
      
      setShowModal(false);
      setEditItem(null);
      await loadData();
    } catch (err) { 
      alert("خطأ في عملية الحفظ: " + (err as Error).message); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-gray-200/50 rounded-xl w-fit flex-wrap">
        <button onClick={() => setActiveTab('services')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'services' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}>الخدمات الطبية</button>
        <button onClick={() => setActiveTab('stores')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'stores' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}>المخازن</button>
        <button onClick={() => setActiveTab('products')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'products' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}>دليل الأصناف</button>
        <button onClick={() => setActiveTab('accounts')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'accounts' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}>الخزن والبنك</button>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border">
        <div className="flex justify-between items-center mb-8">
           <h3 className="text-xl font-black text-gray-800">
             {activeTab === 'services' && 'تعريف الخدمات والنماذج الطبية'}
             {activeTab === 'stores' && 'إدارة مستودعات الوحدة'}
             {activeTab === 'products' && 'دليل الأصناف والمستلزمات'}
             {activeTab === 'accounts' && 'الحسابات والخزن المالية'}
           </h3>
           <button onClick={() => handleOpenModal()} className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-primary-700 transition-all"><Plus size={20}/> إضافة جديد</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-600" size={48} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {activeTab === 'services' && services.map(s => (
               <div key={s.id} className="p-6 border rounded-3xl bg-gray-50 hover:bg-white hover:shadow-xl hover:border-primary-200 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                     <div className="p-3 bg-primary-100 text-primary-600 rounded-2xl"><Tag size={20}/></div>
                     <div className="flex gap-2">
                        <button onClick={() => handleOpenModal(s)} className="p-2 text-indigo-500 opacity-0 group-hover:opacity-100"><Edit3 size={18}/></button>
                        <button onClick={() => { if(confirm('حذف الخدمة؟')) DB.deleteService(s.id).then(loadData); }} className="p-2 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                     </div>
                  </div>
                  <div className="font-black text-gray-800 text-lg mb-1">{s.name}</div>
                  <div className="text-primary-600 font-bold mb-4">{s.price} ج.م</div>
                  <div className="flex flex-wrap gap-1">
                     {s.config?.consumables?.length ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">ربط مخزني</span> : null}
                     {s.config?.required_fields?.length ? <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">نموذج طبي</span> : null}
                  </div>
               </div>
             ))}

             {activeTab === 'stores' && stores.map(s => (
               <div key={s.id} className="p-6 border rounded-3xl bg-gray-50 hover:bg-white hover:shadow-xl hover:border-primary-200 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                     <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl"><StoreIcon size={20}/></div>
                     <div className="flex gap-2">
                        <button onClick={() => handleOpenModal(s)} className="p-2 text-indigo-500 opacity-0 group-hover:opacity-100"><Edit3 size={18}/></button>
                        <button onClick={() => { if(confirm('حذف المخزن؟')) DB.deleteStore(s.id).then(loadData); }} className="p-2 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                     </div>
                  </div>
                  <div className="font-black text-gray-800 text-lg mb-1">{s.name}</div>
                  {s.is_main && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold">المخزن الرئيسي</span>}
               </div>
             ))}

             {activeTab === 'products' && products.map(p => (
               <div key={p.id} className="p-6 border rounded-3xl bg-gray-50 hover:bg-white hover:shadow-xl hover:border-primary-200 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                     <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><Package size={20}/></div>
                     <div className="flex gap-2">
                        <button onClick={() => handleOpenModal(p)} className="p-2 text-indigo-500 opacity-0 group-hover:opacity-100"><Edit3 size={18}/></button>
                        <button onClick={() => { if(confirm('حذف الصنف؟')) DB.deleteProduct(p.id).then(loadData); }} className="p-2 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                     </div>
                  </div>
                  <div className="font-black text-gray-800 text-lg mb-1">{p.name}</div>
                  <div className="text-gray-400 text-xs font-bold mb-2">الوحدة: {p.unit} | التصنيف: {p.category || '---'}</div>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                     <div className="text-primary-600 font-black">{p.price} ج.م</div>
                     <div className="text-rose-500 text-[10px] font-bold">حد الطلب: {p.min_stock}</div>
                  </div>
               </div>
             ))}

             {activeTab === 'accounts' && accounts.map(a => (
               <div key={a.id} className="p-6 border rounded-3xl bg-gray-50 hover:bg-white hover:shadow-xl hover:border-primary-200 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                     <div className={`p-3 rounded-2xl ${a.type === 'CASH' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                        {a.type === 'CASH' ? <Wallet size={20}/> : <Landmark size={20}/>}
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => handleOpenModal(a)} className="p-2 text-indigo-500 opacity-0 group-hover:opacity-100"><Edit3 size={18}/></button>
                        <button onClick={() => { if(confirm('حذف الحساب؟')) DB.deleteFinancialAccount(a.id).then(loadData); }} className="p-2 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                     </div>
                  </div>
                  <div className="font-black text-gray-800 text-lg mb-1">{a.name}</div>
                  <div className="text-xs text-gray-400 font-bold mb-4">{a.type === 'CASH' ? 'خزينة نقدية' : 'حساب بنكي'}</div>
                  <div className="text-2xl font-black text-emerald-600">{Number(a.balance).toLocaleString()} ج.م</div>
               </div>
             ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
             <div className="p-8 bg-primary-600 text-white flex justify-between items-center rounded-t-[3rem]">
                <h3 className="text-2xl font-black">{editItem ? 'تعديل البيانات' : 'إضافة سجل جديد'}</h3>
                <button onClick={() => setShowModal(false)}><X size={32}/></button>
             </div>
             
             <form key={editItem?.id || 'new'} onSubmit={handleSave} className="p-10 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
                
                {activeTab === 'services' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <label className="text-xs font-black text-gray-400 mr-2">اسم الخدمة</label>
                          <input name="name" defaultValue={editItem?.name} required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-xs font-black text-gray-400 mr-2">السعر (ج.م)</label>
                          <input name="price" type="number" defaultValue={editItem?.price} required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-black outline-none" />
                       </div>
                       <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-black text-gray-400 mr-2">التصنيف</label>
                          <select name="category" defaultValue={editItem?.category} className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none">
                             <option value="DIALYSIS">جلسة غسيل كلى</option>
                             <option value="LAB">تحاليل طبية</option>
                             <option value="PHARMACY">أدوية ومستلزمات</option>
                             <option value="OTHER">أخرى</option>
                          </select>
                       </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t">
                       <h4 className="font-black text-indigo-600 flex items-center gap-2"><Settings size={20}/> حقول النموذج الطبي المطلوب</h4>
                       <div className="flex gap-2">
                          <input id="newFieldName" placeholder="درجة الحرارة، ضغط الدم، وزن الماكينة..." className="flex-1 border-2 border-gray-100 rounded-xl p-3 outline-none" />
                          <button type="button" onClick={() => {
                            const val = (document.getElementById('newFieldName') as HTMLInputElement).value;
                            if(val) setCustomFields([...customFields, val]);
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
                       <h4 className="font-black text-emerald-600 flex items-center gap-2"><Package size={20}/> ربط المستهلكات (الخصم التلقائي)</h4>
                       <div className="grid grid-cols-12 gap-2">
                          <select id="prodSelect" className="col-span-7 border-2 border-gray-100 rounded-xl p-3 outline-none">
                             <option value="">-- اختر صنف --</option>
                             {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <input id="prodQty" type="number" step="0.1" placeholder="الكمية" className="col-span-3 border-2 border-gray-100 rounded-xl p-3 outline-none" />
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
                                  <span className="font-black text-emerald-600">{lp.quantity} {products.find(p => p.id === lp.product_id)?.unit}</span>
                                  <button type="button" onClick={() => setLinkedProducts(linkedProducts.filter((_, idx) => idx !== i))} className="text-red-400"><Trash size={14}/></button>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                )}

                {activeTab === 'stores' && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                       <label className="text-xs font-black text-gray-400 mr-2">اسم المخزن</label>
                       <input name="name" defaultValue={editItem?.name} required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none" />
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                       <input type="checkbox" name="is_main" defaultChecked={editItem?.is_main} id="is_main" className="w-5 h-5 accent-amber-600" />
                       <label htmlFor="is_main" className="font-bold text-amber-900">اعتبار هذا المخزن هو المخزن الرئيسي للوحدة</label>
                    </div>
                  </div>
                )}

                {activeTab === 'products' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1 md:col-span-2">
                       <label className="text-xs font-black text-gray-400 mr-2">اسم الصنف / المستلزم</label>
                       <input name="name" defaultValue={editItem?.name} required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-black text-gray-400 mr-2">الوحدة (علبة، قطعة، أمبول..)</label>
                       <input name="unit" defaultValue={editItem?.unit} required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-black text-gray-400 mr-2">التصنيف</label>
                       <input name="category" defaultValue={editItem?.category} placeholder="مستهلكات، أدوية، فلاتر.." className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-black text-gray-400 mr-2">سعر الشراء (ج.م)</label>
                       <input name="price" type="number" defaultValue={editItem?.price} className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-black outline-none" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-black text-gray-400 mr-2">حد الطلب الأدنى</label>
                       <input name="min_stock" type="number" defaultValue={editItem?.min_stock} className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-black outline-none" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                       <label className="text-xs font-black text-gray-400 mr-2 flex items-center gap-2"><Hash size={12}/> باركود الصنف (اختياري)</label>
                       <input name="barcode" defaultValue={editItem?.barcode} className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-mono outline-none" />
                    </div>
                  </div>
                )}

                {activeTab === 'accounts' && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                       <label className="text-xs font-black text-gray-400 mr-2">اسم الحساب / الخزينة</label>
                       <input name="name" defaultValue={editItem?.name} required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-black text-gray-400 mr-2">نوع الحساب</label>
                       <select name="type" defaultValue={editItem?.type} className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none">
                          <option value="CASH">خزينة نقدية (كاش)</option>
                          <option value="BANK">حساب بنكي</option>
                       </select>
                    </div>
                    {!editItem && (
                      <div className="space-y-1">
                         <label className="text-xs font-black text-gray-400 mr-2">الرصيد الافتتاحي (ج.م)</label>
                         <input name="balance" type="number" step="0.01" className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-black outline-none text-emerald-600" placeholder="0.00" />
                      </div>
                    )}
                  </div>
                )}

                <button type="submit" disabled={loading} className="w-full py-5 bg-primary-600 text-white rounded-2xl font-black shadow-xl hover:bg-primary-700 transition-all flex items-center justify-center gap-3">
                  {loading ? <Loader2 className="animate-spin" size={24}/> : <Save size={24}/>}
                  {editItem ? 'تحديث البيانات' : 'إضافة وحفظ السجل'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupModule;
