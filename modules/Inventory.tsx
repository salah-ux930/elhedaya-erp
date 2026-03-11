
import React, { useState, useEffect } from 'react';
import { AR } from '../constants.ts';
import { DB } from '../store.ts';
import { Product, Store, StockTransaction, TransferRequest } from '../types.ts';
import { 
  Package, ArrowLeftRight, TrendingUp, TrendingDown, ClipboardList, 
  Plus, ArrowRightLeft, Loader2, X, CheckCircle, FileText, ShoppingCart, 
  Hash, Trash2, MapPin, AlertTriangle, ShieldX, Clock, Ban, CheckCircle2,
  ChevronRight, AlertCircle
} from 'lucide-react';

const InventoryModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'requests'>('stock');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveType, setMoveType] = useState<'ADD' | 'DEDUCT' | 'REQUEST'>('ADD');
  
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  
  const [voucherItems, setVoucherItems] = useState<{ productId: string, quantity: number }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  
  const [voucherNote, setVoucherNote] = useState('');
  const [targetStoreId, setTargetStoreId] = useState('');
  const [sourceStoreId, setSourceStoreId] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('dialysis_user') || '{}');
  const userPerms = currentUser.permissions || [];

  useEffect(() => { loadData(); }, [activeSubTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, s, r, tx] = await Promise.all([
        DB.getProducts(), 
        DB.getStores(), 
        DB.getTransferRequests(),
        DB.getStockTransactions()
      ]);
      setProducts(p || []);
      setStores(s || []);
      setRequests(r || []);
      setStockTransactions(tx || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStock = (productId: string, storeId: string) => {
    let balance = 0;
    stockTransactions.forEach(tx => {
      if (tx.product_id !== productId) return;
      if (tx.type === 'ADD' && tx.store_id === storeId) balance += tx.quantity;
      else if (tx.type === 'DEDUCT' && tx.store_id === storeId) balance -= tx.quantity;
      else if (tx.type === 'TRANSFER') {
        if (tx.store_id === storeId) balance -= tx.quantity;
        if (tx.target_store_id === storeId) balance += tx.quantity;
      }
    });
    return balance;
  };

  const calculateTotalStock = (productId: string) => {
    return stores.reduce((acc, store) => acc + calculateStock(productId, store.id), 0);
  };

  const visibleStores = stores.filter(s => 
    userPerms.includes('MANAGE_INVENTORY') || 
    userPerms.includes('SYSTEM_SETUP') ||
    userPerms.includes(`STORE_VIEW:${s.id}`) || 
    userPerms.includes(`STORE_MANAGE:${s.id}`)
  );

  const manageableStores = stores.filter(s => 
    userPerms.includes('MANAGE_INVENTORY') || 
    userPerms.includes('SYSTEM_SETUP') ||
    userPerms.includes(`STORE_MANAGE:${s.id}`)
  );

  const handleVoucherAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (voucherItems.length === 0) return alert("يرجى إضافة أصناف أولاً");
    
    const storeId = sourceStoreId;
    const canManage = userPerms.includes('MANAGE_INVENTORY') || 
                      userPerms.includes('SYSTEM_SETUP') ||
                      userPerms.includes(`STORE_MANAGE:${storeId}`);

    if (!canManage) return alert("عذراً، لا تملك صلاحية الإدارة على هذا المخزن.");

    setLoading(true);
    try {
      if (moveType === 'REQUEST') {
        if (!sourceStoreId || !targetStoreId) throw new Error("يرجى اختيار المخزن المصدر والوجهة");
        await DB.addTransferRequest({
          from_store_id: sourceStoreId,
          to_store_id: targetStoreId,
          items: voucherItems.map(i => ({ product_id: i.productId, quantity: i.quantity })),
          status: 'PENDING',
          requested_by: currentUser.name,
          note: voucherNote,
          date: new Date().toISOString().split('T')[0]
        });
        alert("تم إرسال طلب التحويل. بانتظار موافقة أمين المخزن الرئيسي.");
      } else {
        const storeId = sourceStoreId;
        for (const item of voucherItems) {
          await DB.addStockTransaction({
            product_id: item.productId,
            store_id: storeId,
            type: moveType,
            quantity: item.quantity,
            date: new Date().toISOString().split('T')[0],
            note: voucherNote
          });
        }
        alert("تم تنفيذ العملية وتحديث الأرصدة.");
      }
      setShowMoveModal(false);
      loadData();
    } catch (err: any) {
      alert("خطأ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestStatus = async (id: string, status: 'APPROVED' | 'REJECTED' | 'COMPLETED') => {
    const actionText = status === 'APPROVED' ? 'الموافقة على' : status === 'COMPLETED' ? 'تأكيد استلام' : 'رفض';
    if (!confirm(`هل أنت متأكد من ${actionText} هذا الطلب؟`)) return;
    
    setLoading(true);
    try {
      await DB.updateTransferStatus(id, status);
      alert("تم تحديث حالة الطلب بنجاح.");
      loadData();
    } catch (err: any) {
      alert("خطأ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="flex gap-2 p-1 bg-gray-200/50 rounded-[1.2rem] w-fit">
          <button onClick={() => setActiveSubTab('stock')} className={`px-6 py-3 rounded-[1rem] font-black transition-all ${activeSubTab === 'stock' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}>أرصدة الأصناف</button>
          <button onClick={() => setActiveSubTab('requests')} className={`px-6 py-3 rounded-[1rem] font-black transition-all ${activeSubTab === 'requests' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}>إدارة التحويلات ({requests.filter(r => r.status === 'PENDING' || r.status === 'APPROVED').length})</button>
        </div>

        <div className="flex gap-2">
           <button onClick={() => { setMoveType('REQUEST'); setVoucherItems([]); setShowMoveModal(true); }} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
             <ArrowLeftRight size={20} /> طلب تحويل
           </button>
           <button onClick={() => { setMoveType('DEDUCT'); setVoucherItems([]); setShowMoveModal(true); }} className="bg-orange-600 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all">
             <TrendingDown size={20} /> إذن صـــرف
           </button>
           <button onClick={() => { setMoveType('ADD'); setVoucherItems([]); setShowMoveModal(true); }} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">
             <TrendingUp size={20} /> إذن تــوريد
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4 text-gray-400">
             <Loader2 className="animate-spin text-primary-600" size={48} />
             <p className="font-black">جاري مزامنة المخزون...</p>
          </div>
        ) : activeSubTab === 'stock' ? (
          <div className="p-8 overflow-x-auto">
             <table className="w-full text-right">
                <thead className="bg-gray-50/50 border-b">
                  <tr>
                    <th className="px-6 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">الصنف والوحدة</th>
                    <th className="px-6 py-5 font-black text-gray-400 text-xs uppercase tracking-widest text-center">الإجمالي العام</th>
                    {visibleStores.map(s => <th key={s.id} className="px-6 py-5 font-black text-gray-400 text-xs uppercase tracking-widest text-center">{s.name}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map(p => {
                    const total = visibleStores.reduce((acc, store) => acc + calculateStock(p.id, store.id), 0);
                    const isLow = total < (p.min_stock || 10);
                    return (
                      <tr key={p.id} className={`hover:bg-primary-50/20 transition-all group ${isLow ? 'bg-rose-50/30' : ''}`}>
                        <td className="px-6 py-6">
                           <div className="font-black text-gray-800 text-lg leading-tight">{p.name}</div>
                           <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase">الوحدة: {p.unit} {isLow && <span className="text-rose-600 font-black mr-2 flex items-center gap-1 inline-flex"><AlertCircle size={10}/> رصيد منخفض</span>}</div>
                        </td>
                        <td className="px-6 py-6 text-center font-black text-2xl text-primary-900">{total}</td>
                        {visibleStores.map(s => (
                          <td key={s.id} className="px-6 py-6 font-black text-center text-primary-600 text-lg">{calculateStock(p.id, s.id)}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
             </table>
          </div>
        ) : (
          <div className="p-10 space-y-6">
             {requests.sort((a,b) => b.date.localeCompare(a.date)).map(req => (
               <div key={req.id} className="p-8 bg-gray-50/50 rounded-[2.5rem] border-2 border-transparent hover:border-primary-100 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group">
                  <div className="flex items-center gap-6">
                     <div className={`p-5 rounded-3xl shadow-sm ${req.status === 'PENDING' ? 'bg-amber-100 text-amber-600' : req.status === 'APPROVED' ? 'bg-indigo-100 text-indigo-600' : req.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {req.status === 'PENDING' ? <Clock size={28}/> : req.status === 'APPROVED' ? <CheckCircle2 size={28}/> : req.status === 'COMPLETED' ? <Package size={28}/> : <Ban size={28}/>}
                     </div>
                     <div>
                        <div className="font-black text-gray-800 text-xl flex items-center gap-3">
                           {stores.find(s => s.id === req.from_store_id)?.name}
                           <ArrowRightLeft size={16} className="text-gray-300"/>
                           {stores.find(s => s.id === req.to_store_id)?.name}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-2 font-black uppercase tracking-widest flex items-center gap-4">
                           <span>بواسطة: {req.requested_by}</span>
                           <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                           <span>التاريخ: {req.date}</span>
                           <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                           <span>الأصناف: {req.items.length}</span>
                        </div>
                        {req.note && <p className="text-xs text-indigo-400 font-bold mt-2">ملاحظة: {req.note}</p>}
                     </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                     {req.status === 'PENDING' && (userPerms.includes('MANAGE_INVENTORY') || userPerms.includes('SYSTEM_SETUP') || userPerms.includes(`STORE_MANAGE:${req.from_store_id}`)) && (
                       <>
                         <button onClick={() => handleRequestStatus(req.id, 'APPROVED')} className="flex-1 md:flex-none bg-indigo-600 text-white px-6 py-3 rounded-xl text-xs font-black shadow-lg">موافقة</button>
                         <button onClick={() => handleRequestStatus(req.id, 'REJECTED')} className="flex-1 md:flex-none bg-white text-rose-600 border border-rose-100 px-6 py-3 rounded-xl text-xs font-black">رفض</button>
                       </>
                     )}
                     {req.status === 'APPROVED' && (userPerms.includes('MANAGE_INVENTORY') || userPerms.includes('SYSTEM_SETUP') || userPerms.includes(`STORE_MANAGE:${req.to_store_id}`)) && (
                        <button onClick={() => handleRequestStatus(req.id, 'COMPLETED')} className="w-full md:w-auto bg-emerald-600 text-white px-8 py-3 rounded-xl text-xs font-black shadow-lg">تأكيد الاستلام والتحريك</button>
                     )}
                     <span className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border ${req.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' : req.status === 'APPROVED' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : req.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {req.status === 'PENDING' ? 'بانتظار الموافقة' : req.status === 'APPROVED' ? 'تمت الموافقة - بانتظار التحريك' : req.status === 'COMPLETED' ? 'مكتمل - تم النقل' : 'تم الرفض'}
                     </span>
                  </div>
               </div>
             ))}
             {requests.length === 0 && <div className="text-center py-32 text-gray-300 italic font-black">لا توجد طلبات تحويل مخزني مسجلة</div>}
          </div>
        )}
      </div>

      {/* Modal Re-implemented with better UX and source selection */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
            <div className={`p-8 text-white flex justify-between items-center ${moveType === 'ADD' ? 'bg-emerald-600' : moveType === 'REQUEST' ? 'bg-indigo-600' : 'bg-orange-600'}`}>
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                    {moveType === 'ADD' ? <TrendingUp size={24}/> : moveType === 'REQUEST' ? <ArrowLeftRight size={24}/> : <TrendingDown size={24}/>}
                 </div>
                 <h3 className="text-2xl font-black">{moveType === 'ADD' ? 'توريد أصناف للمخزن' : moveType === 'REQUEST' ? 'إنشاء طلب تحويل' : 'إذن صرف مستلزمات'}</h3>
              </div>
              <button onClick={() => setShowMoveModal(false)} className="hover:bg-white/10 p-2 rounded-full transition-all"><X size={32}/></button>
            </div>
            
            <form onSubmit={handleVoucherAction} className="p-10 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 mr-2 uppercase tracking-widest">{moveType === 'REQUEST' ? 'المخزن المصدر (المحول منه)' : 'المخزن المعني'}</label>
                  <select value={sourceStoreId} onChange={e => setSourceStoreId(e.target.value)} required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-black outline-none focus:border-primary-500 transition-all">
                    <option value="">-- اختر المخزن --</option>
                    {manageableStores.map(s => <option key={s.id} value={s.id}>{s.name} {s.is_main ? '(رئيسي)' : ''}</option>)}
                  </select>
                </div>
                
                {moveType === 'REQUEST' && (
                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-400 mr-2 uppercase tracking-widest">المخزن الوجهة (المحول إليه)</label>
                    <select value={targetStoreId} onChange={e => setTargetStoreId(e.target.value)} required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-black outline-none focus:border-indigo-500 transition-all">
                      <option value="">-- اختر الوجهة --</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="bg-primary-50 p-6 rounded-[2rem] border-2 border-dashed border-primary-200">
                 <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-12 md:col-span-7">
                       <label className="text-[10px] font-black text-primary-600 uppercase mb-2 mr-2">اختيار الصنف</label>
                       <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full border-2 border-white rounded-xl p-4 font-bold outline-none shadow-sm focus:ring-4 focus:ring-primary-500/10">
                         <option value="">-- ابحث في الأصناف --</option>
                         {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                       </select>
                    </div>
                    <div className="col-span-8 md:col-span-3">
                       <label className="text-[10px] font-black text-primary-600 uppercase mb-2 mr-2">الكمية</label>
                       <input type="number" min="1" value={selectedQuantity} onChange={e => setSelectedQuantity(parseInt(e.target.value))} className="w-full border-2 border-white rounded-xl p-4 text-center font-black text-xl outline-none shadow-sm focus:ring-4 focus:ring-primary-500/10" />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                       <button type="button" onClick={() => {
                          if (!selectedProductId) return;
                          const existing = voucherItems.find(i => i.productId === selectedProductId);
                          if (existing) {
                             setVoucherItems(voucherItems.map(i => i.productId === selectedProductId ? {...i, quantity: i.quantity + selectedQuantity} : i));
                          } else {
                             setVoucherItems([...voucherItems, { productId: selectedProductId, quantity: selectedQuantity }]);
                          }
                          setSelectedProductId('');
                       }} className="w-full py-4 bg-primary-600 text-white rounded-xl font-black shadow-lg hover:bg-primary-700 transition-all">إضافة</button>
                    </div>
                 </div>
              </div>

              <div className="border-2 border-gray-50 rounded-[2rem] overflow-hidden">
                 <table className="w-full text-right">
                    <thead className="bg-gray-50/50">
                       <tr>
                         <th className="px-8 py-4 font-black text-xs text-gray-400 uppercase tracking-widest">الصنف</th>
                         <th className="px-8 py-4 text-center font-black text-xs text-gray-400 uppercase tracking-widest">الكمية</th>
                         <th className="px-8 py-4 text-left font-black text-xs text-gray-400 uppercase tracking-widest">حذف</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {voucherItems.map((item, idx) => (
                         <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="px-8 py-5 font-black text-gray-800">{products.find(p => p.id === item.productId)?.name}</td>
                            <td className="px-8 py-5 text-center font-black text-primary-600 text-lg">{item.quantity}</td>
                            <td className="px-8 py-5 text-left">
                               <button type="button" onClick={() => setVoucherItems(voucherItems.filter(v => v.productId !== item.productId))} className="text-rose-400 hover:text-rose-600 p-2"><Trash2 size={18}/></button>
                            </td>
                         </tr>
                       ))}
                       {voucherItems.length === 0 && (
                         <tr><td colSpan={3} className="py-12 text-center text-gray-300 italic font-bold">يرجى إضافة أصناف إلى القائمة أعلاه</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>

              <div className="space-y-1">
                 <label className="text-xs font-black text-gray-400 mr-2 uppercase tracking-widest">ملاحظات توضيحية</label>
                 <textarea placeholder="اكتب سبباً أو ملاحظة للعملية..." value={voucherNote} onChange={e => setVoucherNote(e.target.value)} className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 h-24 font-black outline-none focus:border-primary-500 transition-all"></textarea>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowMoveModal(false)} className="flex-1 py-5 bg-gray-100 rounded-2xl font-black text-gray-500">إلغاء</button>
                <button type="submit" className={`flex-[2] py-5 text-white rounded-2xl font-black shadow-xl shadow-gray-200 transition-all active:scale-95 ${moveType === 'ADD' ? 'bg-emerald-600' : moveType === 'REQUEST' ? 'bg-indigo-600' : 'bg-orange-600'}`}>تأكيد وحفظ العملية</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryModule;
