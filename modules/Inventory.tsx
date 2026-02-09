
import React, { useState, useEffect } from 'react';
import { AR } from '../constants.ts';
import { DB } from '../store.ts';
import { Product, Store, StockTransaction, TransferRequest } from '../types.ts';
import { 
  Package, ArrowLeftRight, TrendingUp, TrendingDown, ClipboardList, 
  Plus, ArrowRightLeft, Loader2, X, CheckCircle, FileText, ShoppingCart, Hash, Trash2, MapPin, AlertTriangle, ShieldX
} from 'lucide-react';

const InventoryModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'transfers' | 'requests'>('stock');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveType, setMoveType] = useState<'ADD' | 'DEDUCT' | 'TRANSFER'>('ADD');
  
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  
  const [voucherItems, setVoucherItems] = useState<{ productId: string, quantity: number, price: number }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedPrice, setSelectedPrice] = useState(0);
  
  const [documentNumber, setDocumentNumber] = useState('');
  const [voucherNote, setVoucherNote] = useState('');
  const [targetStoreId, setTargetStoreId] = useState('');

  // Get current user permissions
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
      console.error("Error in Inventory loadData:", err);
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
    return visibleStores.reduce((acc, store) => acc + calculateStock(productId, store.id), 0);
  };

  const visibleStores = stores.filter(s => 
    userPerms.includes('SYSTEM_SETUP') || 
    userPerms.includes('MANAGE_INVENTORY') || 
    userPerms.includes(`STORE_VIEW:${s.id}`) || 
    userPerms.includes(`STORE_MANAGE:${s.id}`)
  );

  const manageableStores = stores.filter(s => 
    userPerms.includes('SYSTEM_SETUP') || 
    userPerms.includes('MANAGE_INVENTORY') || 
    userPerms.includes(`STORE_MANAGE:${s.id}`)
  );

  const generateDocNumber = (type: string) => {
    const year = new Date().getFullYear();
    const prefix = type === 'ADD' ? 'REC' : type === 'DEDUCT' ? 'OUT' : 'TRF';
    const random = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}-${year}-${random}`;
  };

  const openModal = (type: 'ADD' | 'DEDUCT' | 'TRANSFER') => {
    if (manageableStores.length === 0) {
      return alert("لا تملك صلاحية إدارة أي مخزن حالياً. يرجى مراجعة الإدارة.");
    }
    setMoveType(type);
    setVoucherItems([]);
    setDocumentNumber(generateDocNumber(type));
    setVoucherNote('');
    setTargetStoreId('');
    setShowMoveModal(true);
  };

  const addItemToVoucher = () => {
    if (!selectedProductId || selectedQuantity <= 0) return;
    if (voucherItems.find(i => i.productId === selectedProductId)) return alert("هذا الصنف مضاف بالفعل في القائمة");
    const p = products.find(prod => prod.id === selectedProductId);
    setVoucherItems([...voucherItems, { productId: selectedProductId, quantity: selectedQuantity, price: selectedPrice || p?.price || 0 }]);
    setSelectedProductId('');
    setSelectedQuantity(1);
    setSelectedPrice(0);
  };

  const removeItemFromVoucher = (pid: string) => setVoucherItems(voucherItems.filter(i => i.productId !== pid));

  const handleVoucherAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (voucherItems.length === 0) return alert("يرجى إضافة أصناف أولاً للمستند");
    
    const target = e.target as any;
    const storeId = target.storeId.value;
    
    if (!storeId) return alert("يرجى اختيار المخزن");
    
    // تأمين الصلاحيات برمجياً
    const canManage = userPerms.includes('SYSTEM_SETUP') || 
                      userPerms.includes('MANAGE_INVENTORY') || 
                      userPerms.includes(`STORE_MANAGE:${storeId}`);
    
    if (!canManage) return alert("عذراً، لا تملك صلاحية الإدارة على هذا المخزن.");

    if (moveType === 'TRANSFER' && !targetStoreId) return alert("يرجى اختيار المخزن المستلم");
    if (moveType === 'TRANSFER' && storeId === targetStoreId) return alert("لا يمكن التحويل لنفس المخزن");

    // التحقق من توفر الأرصدة قبل الصرف أو التحويل
    if (moveType === 'DEDUCT' || moveType === 'TRANSFER') {
        for (const item of voucherItems) {
            const available = calculateStock(item.productId, storeId);
            if (available < item.quantity) {
                const prodName = products.find(p => p.id === item.productId)?.name;
                return alert(`عذراً، الرصيد غير كافٍ للصنف: ${prodName}. المتاح حالياً: ${available}`);
            }
        }
    }

    setLoading(true);
    try {
      if (moveType === 'TRANSFER') {
        for (const item of voucherItems) {
          await DB.addStockTransaction({
            product_id: item.productId,
            store_id: storeId,
            target_store_id: targetStoreId,
            type: 'TRANSFER',
            quantity: item.quantity,
            date: new Date().toISOString().split('T')[0],
            note: `${documentNumber} | ${voucherNote}`
          });
        }
      } else {
        for (const item of voucherItems) {
          await DB.addStockTransaction({
            product_id: item.productId,
            store_id: storeId,
            type: moveType,
            quantity: item.quantity,
            date: new Date().toISOString().split('T')[0],
            note: `${documentNumber} | ${voucherNote}`
          });
        }
      }
      setShowMoveModal(false);
      setVoucherItems([]);
      alert(`تم تنفيذ العملية بنجاح. رقم المستند: ${documentNumber}`);
      loadData();
    } catch (err) {
      alert("حدث خطأ أثناء تنفيذ العملية.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="flex gap-2 p-1 bg-gray-200/50 rounded-xl w-fit">
          <button onClick={() => setActiveSubTab('stock')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeSubTab === 'stock' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}>الأرصدة المتاحة</button>
          <button onClick={() => setActiveSubTab('requests')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeSubTab === 'requests' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}>طلبات التحويل ({requests.filter(r => r.status === 'PENDING').length})</button>
        </div>

        <div className="flex gap-2">
           <button 
             disabled={manageableStores.length === 0}
             onClick={() => openModal('TRANSFER')} 
             className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <ArrowLeftRight size={18} /> تحويل داخلي
           </button>
           <button 
             disabled={manageableStores.length === 0}
             onClick={() => openModal('DEDUCT')} 
             className="bg-orange-600 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <TrendingDown size={18} /> إذن صـــرف
           </button>
           <button 
             disabled={manageableStores.length === 0}
             onClick={() => openModal('ADD')} 
             className="bg-green-600 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <TrendingUp size={18} /> توريد
           </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border overflow-hidden min-h-[400px]">
        {loading && activeSubTab === 'stock' ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4 text-gray-400">
             <Loader2 className="animate-spin text-primary-600" size={40} />
             <p className="font-bold">جاري تحميل المخزون...</p>
          </div>
        ) : activeSubTab === 'stock' ? (
          <div className="p-8">
             <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-xl text-gray-800">الأرصدة في المخازن المصرح لك بمشاهدتها</h3>
               <div className="flex items-center gap-4 text-xs">
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-50 border border-rose-200 rounded"></div> نواقص (أقل من حد الطلب)</div>
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-gray-200 rounded"></div> متوفر</div>
               </div>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-right">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-4 font-bold text-gray-600 text-xs">الصنف</th>
                      <th className="px-6 py-4 font-bold text-gray-600 text-xs">التصنيف</th>
                      <th className="px-6 py-4 font-bold text-gray-600 text-xs text-center">الإجمالي العام</th>
                      {visibleStores.map(s => <th key={s.id} className="px-6 py-4 font-bold text-gray-600 text-xs text-center">{s.name}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map(p => {
                      const totalStock = calculateTotalStock(p.id);
                      const isLowStock = totalStock <= (p.min_stock || 0);
                      
                      return (
                        <tr key={p.id} className={`transition-colors ${isLowStock ? 'bg-rose-50/50 hover:bg-rose-50' : 'hover:bg-gray-50'}`}>
                          <td className="px-6 py-4 font-bold text-gray-700">
                             <div className="flex items-center gap-2">
                               {isLowStock && <AlertTriangle size={14} className="text-rose-500" />}
                               <span>{p.name} <span className="text-[10px] text-gray-400 font-normal">({p.unit})</span></span>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400">{p.category || '---'}</td>
                          <td className={`px-6 py-4 font-black text-center ${isLowStock ? 'text-rose-600' : 'text-primary-800'}`}>
                            {totalStock}
                            {isLowStock && <span className="block text-[8px] font-bold">حد الطلب: {p.min_stock}</span>}
                          </td>
                          {visibleStores.map(s => {
                            const storeQty = calculateStock(p.id, s.id);
                            return (
                              <td key={s.id} className={`px-6 py-4 font-black text-center ${storeQty === 0 ? 'text-gray-300' : 'text-primary-700'}`}>
                                {storeQty}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {products.length === 0 && (
                      <tr><td colSpan={visibleStores.length + 3} className="py-20 text-center text-gray-300 italic">لا توجد أصناف معرفة</td></tr>
                    )}
                  </tbody>
               </table>
             </div>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400 italic">سجل طلبات التحويل المخصص للمخازن التي تديرها</div>
        )}
      </div>

      {showMoveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95">
            <div className={`p-6 text-white flex justify-between items-center ${moveType === 'ADD' ? 'bg-green-600' : moveType === 'TRANSFER' ? 'bg-indigo-600' : 'bg-orange-600'}`}>
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold">{moveType === 'ADD' ? 'توريد' : moveType === 'TRANSFER' ? 'تحويل' : 'صرف'} مخزني</h3>
              </div>
              <button onClick={() => setShowMoveModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-all"><X size={24} /></button>
            </div>
            
            <form id="voucherForm" onSubmit={handleVoucherAction} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-3xl border">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">المخزن (المصرح لك بإدارته)</label>
                  <select name="storeId" required className="w-full border rounded-xl p-3 bg-white font-bold outline-none">
                    <option value="">-- اختر المخزن --</option>
                    {manageableStores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                
                {moveType === 'TRANSFER' && (
                  <div>
                    <label className="block text-xs font-bold text-indigo-600 uppercase mb-2">مخزن الوجهة</label>
                    <select value={targetStoreId} onChange={e => setTargetStoreId(e.target.value)} required className="w-full border rounded-xl p-3 bg-white font-bold outline-none">
                      <option value="">-- اختر الوجهة --</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Items Section */}
              <div className="bg-primary-50/50 p-6 rounded-3xl border-2 border-dashed border-primary-200">
                 <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-12 md:col-span-6">
                       <label className="block text-xs font-bold text-primary-700 mb-2">الصنف</label>
                       <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full border rounded-xl p-3 bg-white outline-none">
                         <option value="">-- ابحث عن صنف... --</option>
                         {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                       </select>
                    </div>
                    <div className="col-span-6 md:col-span-3">
                       <label className="block text-xs font-bold text-primary-700 mb-2">الكمية</label>
                       <input type="number" min="0.1" step="0.1" value={selectedQuantity} onChange={e => setSelectedQuantity(parseFloat(e.target.value))} className="w-full border rounded-xl p-3 bg-white text-center font-bold outline-none" />
                    </div>
                    <div className="col-span-12 md:col-span-3">
                       <button type="button" onClick={addItemToVoucher} className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg">إضافة</button>
                    </div>
                 </div>
              </div>

              <div className="border rounded-3xl overflow-hidden shadow-inner bg-white">
                 <table className="w-full text-right">
                    <thead className="bg-gray-100">
                       <tr>
                         <th className="px-6 py-3 font-bold text-gray-500">الصنف</th>
                         <th className="px-6 py-3 text-center font-bold text-gray-500">الكمية</th>
                         <th className="px-6 py-3 text-left font-bold text-gray-500">حذف</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y">
                       {voucherItems.map((item, idx) => (
                         <tr key={idx}>
                            <td className="px-6 py-3 font-bold">{products.find(p => p.id === item.productId)?.name}</td>
                            <td className="px-6 py-3 text-center font-black text-primary-600">{item.quantity}</td>
                            <td className="px-6 py-3 text-left">
                               <button type="button" onClick={() => removeItemFromVoucher(item.productId)} className="text-red-400 p-2"><Trash2 size={16} /></button>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
            </form>

            <div className="p-8 border-t bg-gray-50 flex gap-4">
              <button onClick={() => setShowMoveModal(false)} className="flex-1 py-4 bg-white border-2 rounded-2xl font-bold text-gray-500">إلغاء</button>
              <button type="submit" form="voucherForm" className={`flex-[2] py-4 text-white rounded-2xl font-bold shadow-xl ${moveType === 'ADD' ? 'bg-green-600' : moveType === 'TRANSFER' ? 'bg-indigo-600' : 'bg-orange-600'}`}>تأكيد الحفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryModule;
