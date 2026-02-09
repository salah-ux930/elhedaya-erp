
import React, { useState, useEffect } from 'react';
import { AR } from '../constants.ts';
import { DB } from '../store.ts';
import { Product, Store, StockTransaction, TransferRequest } from '../types.ts';
import { 
  Package, ArrowLeftRight, TrendingUp, TrendingDown, ClipboardList, 
  Plus, Search, ArrowRightLeft, Loader2, X, Check, Bell, 
  AlertCircle, Trash2, MapPin, CheckCircle, Clock, FileText, ShoppingCart, DollarSign, Calculator, ArrowDownRight, Hash
} from 'lucide-react';

const InventoryModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'transfers' | 'requests'>('stock');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveType, setMoveType] = useState<'ADD' | 'DEDUCT' | 'TRANSFER'>('ADD');
  
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  
  const [voucherItems, setVoucherItems] = useState<{ productId: string, quantity: number, price: number }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedPrice, setSelectedPrice] = useState(0);
  
  const [documentNumber, setDocumentNumber] = useState('');
  const [voucherNote, setVoucherNote] = useState('');
  const [targetStoreId, setTargetStoreId] = useState('');

  useEffect(() => { loadData(); }, [activeSubTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, s, r] = await Promise.all([DB.getProducts(), DB.getStores(), DB.getTransferRequests()]);
      setProducts(p || []);
      setStores(s || []);
      setRequests(r || []);
    } catch (err) {
      console.error("Error in Inventory loadData:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateDocNumber = (type: string) => {
    const year = new Date().getFullYear();
    const prefix = type === 'ADD' ? 'REC' : type === 'DEDUCT' ? 'OUT' : 'TRF';
    const random = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}-${year}-${random}`;
  };

  const openModal = (type: 'ADD' | 'DEDUCT' | 'TRANSFER') => {
    setMoveType(type);
    setVoucherItems([]);
    setDocumentNumber(generateDocNumber(type));
    setVoucherNote('');
    if (type === 'TRANSFER') {
      // افتراضياً التحويل يكون لأي مخزن غير المخزن المختار كمصدر
      setTargetStoreId('');
    }
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
    if (moveType === 'TRANSFER' && !targetStoreId) return alert("يرجى اختيار المخزن المستلم");
    if (moveType === 'TRANSFER' && storeId === targetStoreId) return alert("لا يمكن التحويل لنفس المخزن");

    setLoading(true);
    try {
      if (moveType === 'TRANSFER') {
        await DB.createTransferRequest({
          fromStoreId: storeId,
          toStoreId: targetStoreId,
          items: voucherItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
          status: 'PENDING',
          date: new Date().toISOString().split('T')[0],
          note: `${documentNumber} | ${voucherNote}`
        });
      } else {
        for (const item of voucherItems) {
          await DB.addStockTransaction({
            productId: item.productId,
            storeId: storeId,
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
      alert("حدث خطأ أثناء تنفيذ العملية المخزنية. تأكد من اتصال قاعدة البيانات.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="flex gap-2 p-1 bg-gray-200/50 rounded-xl w-fit">
          <button onClick={() => setActiveSubTab('stock')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeSubTab === 'stock' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>الأرصدة</button>
          <button onClick={() => setActiveSubTab('requests')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeSubTab === 'requests' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>طلبات التحويل ({requests.filter(r => r.status === 'PENDING').length})</button>
        </div>

        <div className="flex gap-2">
           <button 
             onClick={() => openModal('TRANSFER')}
             className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md transition-all"
           >
             <ArrowLeftRight size={18} /> طلب تحويل داخلي
           </button>
           <button onClick={() => openModal('DEDUCT')} className="bg-orange-600 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md hover:bg-orange-700 transition-all">
             <TrendingDown size={18} /> إذن صـــرف
           </button>
           <button onClick={() => openModal('ADD')} className="bg-green-600 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md hover:bg-green-700 transition-all">
             <TrendingUp size={18} /> فاتورة توريد
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
               <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">الأرصدة الحالية بالمخازن</h3>
               <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">تحديث: {new Date().toLocaleDateString('ar-EG')}</div>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-right">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-4 font-bold text-gray-600 text-xs">الصنف</th>
                      <th className="px-6 py-4 font-bold text-gray-600 text-xs">التصنيف</th>
                      <th className="px-6 py-4 font-bold text-gray-600 text-xs">الوحدة</th>
                      <th className="px-6 py-4 font-bold text-gray-600 text-xs text-center">الرصيد التقديري</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-700">{p.name}</td>
                        <td className="px-6 py-4 text-xs text-gray-400">{p.category || '---'}</td>
                        <td className="px-6 py-4 text-gray-500">{p.unit}</td>
                        <td className="px-6 py-4 font-black text-primary-700 text-center text-xl">0</td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr><td colSpan={4} className="py-20 text-center text-gray-300 italic">لا توجد أصناف معرفة في النظام حالياً</td></tr>
                    )}
                  </tbody>
               </table>
             </div>
          </div>
        ) : (
          <div className="p-8">
             <h3 className="font-bold text-xl text-gray-800 mb-6 flex items-center gap-2"><ArrowLeftRight className="text-indigo-600" /> طلبات التحويل بين المخازن</h3>
             {requests.length === 0 ? (
               <div className="py-20 text-center text-gray-300 italic flex flex-col items-center gap-4">
                 <ClipboardList size={48} className="opacity-10" />
                 لا توجد طلبات تحويل حالياً
               </div>
             ) : (
               <div className="space-y-4">
                  {requests.map(req => (
                    <div key={req.id} className="p-5 border rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/50 hover:bg-white hover:shadow-md transition-all gap-4">
                       <div>
                          <div className="flex items-center gap-2">
                             <span className="font-bold text-gray-800">طلب رقم: {req.id.slice(0, 8)}...</span>
                             <span className="text-[10px] text-gray-400 font-mono">{req.date}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                             <MapPin size={10} /> 
                             {stores.find(s => s.id === req.fromStoreId)?.name} 
                             <ArrowRightLeft size={10} className="mx-1" /> 
                             {stores.find(s => s.id === req.toStoreId)?.name}
                          </div>
                       </div>
                       <div className="flex items-center gap-3 w-full md:w-auto">
                          <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold border uppercase ${req.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : req.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                             {req.status === 'PENDING' ? 'قيد المراجعة' : req.status === 'APPROVED' ? 'تم القبول' : 'مرفوض'}
                          </div>
                          <button className="bg-white border p-2 rounded-xl text-gray-400 hover:text-primary-600 transition-all"><FileText size={18} /></button>
                       </div>
                    </div>
                  ))}
               </div>
             )}
          </div>
        )}
      </div>

      {showMoveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95">
            <div className={`p-6 text-white flex justify-between items-center ${moveType === 'ADD' ? 'bg-green-600' : moveType === 'TRANSFER' ? 'bg-indigo-600' : 'bg-orange-600'}`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
                  {moveType === 'ADD' ? <TrendingUp size={24} /> : moveType === 'TRANSFER' ? <ArrowLeftRight size={24} /> : <TrendingDown size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{moveType === 'ADD' ? 'تسجيل توريد (فاتورة شراء)' : moveType === 'TRANSFER' ? 'إنشاء طلب تحويل مخزني' : 'إصدار إذن صرف مخزني'}</h3>
                  <div className="flex items-center gap-2 text-[10px] opacity-80 mt-1 font-mono tracking-wider">
                    <Hash size={10} /> رقم المستند: {documentNumber}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowMoveModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-all"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleVoucherAction} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-3xl border">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                    {moveType === 'TRANSFER' ? <><TrendingDown size={12}/> مخزن المصدر</> : 'المخزن المعني'}
                  </label>
                  <select name="storeId" required className="w-full border rounded-xl p-3 bg-white font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all">
                    <option value="">-- اختر المخزن --</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name} {s.isMain ? '(رئيسي)' : ''}</option>)}
                  </select>
                </div>
                
                {moveType === 'TRANSFER' && (
                  <div>
                    <label className="block text-xs font-bold text-indigo-600 uppercase mb-2 flex items-center gap-1"><TrendingUp size={12}/> المخزن المستلم</label>
                    <select 
                      value={targetStoreId} 
                      onChange={e => setTargetStoreId(e.target.value)} 
                      required 
                      className="w-full border-2 border-indigo-100 rounded-xl p-3 bg-indigo-50 font-bold text-indigo-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- اختر الوجهة --</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                
                <div className="md:col-span-1">
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-2">رقم المستند (تلقائي)</label>
                   <div className="w-full border rounded-xl p-3 bg-gray-100 font-mono text-sm text-gray-500 flex items-center justify-between">
                     <span>{documentNumber}</span>
                     <Hash size={14} className="opacity-20" />
                   </div>
                </div>
              </div>

              {/* إضافة أصناف */}
              <div className="bg-primary-50/50 p-6 rounded-3xl border-2 border-dashed border-primary-200">
                 <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-12 md:col-span-6">
                       <label className="block text-xs font-bold text-primary-700 mb-2">اختيار الصنف الطبي</label>
                       <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full border rounded-xl p-3 bg-white font-bold outline-none focus:ring-2 focus:ring-primary-500">
                         <option value="">-- ابحث عن صنف... --</option>
                         {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                       </select>
                    </div>
                    <div className="col-span-6 md:col-span-2">
                       <label className="block text-xs font-bold text-primary-700 mb-2 text-center">الكمية</label>
                       <input type="number" min="0.1" step="0.1" value={selectedQuantity} onChange={e => setSelectedQuantity(parseFloat(e.target.value))} className="w-full border rounded-xl p-3 bg-white text-center font-bold outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    {moveType === 'ADD' && (
                      <div className="col-span-6 md:col-span-2">
                        <label className="block text-xs font-bold text-primary-700 mb-2 text-center">سعر الشراء</label>
                        <input type="number" step="0.01" placeholder="0.00" value={selectedPrice} onChange={e => setSelectedPrice(parseFloat(e.target.value))} className="w-full border rounded-xl p-3 bg-white text-center font-bold outline-none focus:ring-2 focus:ring-primary-500" />
                      </div>
                    )}
                    <div className={`col-span-12 md:col-span-${moveType === 'ADD' ? '2' : '4'}`}>
                       <button type="button" onClick={addItemToVoucher} className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg hover:bg-primary-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                         <Plus size={18} /> إضافة للقائمة
                       </button>
                    </div>
                 </div>
              </div>

              <div className="border rounded-3xl overflow-hidden shadow-inner bg-white">
                 <table className="w-full text-right">
                    <thead className="bg-gray-100">
                       <tr>
                         <th className="px-6 py-3 font-bold text-[10px] uppercase tracking-widest text-gray-500">اسم الصنف</th>
                         <th className="px-6 py-3 font-bold text-center text-[10px] uppercase tracking-widest text-gray-500">الكمية</th>
                         {moveType === 'ADD' && <th className="px-6 py-3 text-center text-[10px] uppercase tracking-widest text-gray-500">سعر الوحدة</th>}
                         <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest text-gray-500">إجراء</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y">
                       {voucherItems.map((item, idx) => (
                         <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-3">
                               <div className="font-bold text-gray-800">{products.find(p => p.id === item.productId)?.name}</div>
                               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{products.find(p => p.id === item.productId)?.unit}</div>
                            </td>
                            <td className="px-6 py-3 text-center">
                               <span className="inline-block px-3 py-1 bg-primary-50 text-primary-700 rounded-lg font-black">{item.quantity}</span>
                            </td>
                            {moveType === 'ADD' && (
                              <td className="px-6 py-3 text-center text-emerald-600 font-bold">{item.price.toLocaleString()} ج.م</td>
                            )}
                            <td className="px-6 py-3 text-left">
                               <button type="button" onClick={() => removeItemFromVoucher(item.productId)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg transition-all" title="حذف من القائمة">
                                 <Trash2 size={16} />
                               </button>
                            </td>
                         </tr>
                       ))}
                       {voucherItems.length === 0 && (
                         <tr><td colSpan={moveType === 'ADD' ? 4 : 3} className="py-20 text-center text-gray-300 italic flex flex-col items-center gap-2">
                           <ShoppingCart size={40} className="opacity-10 mb-2" />
                           القائمة فارغة، يرجى إضافة الأصناف أعلاه للبدء
                         </td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
              
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><FileText size={12} /> ملاحظات المستند</label>
                <textarea value={voucherNote} onChange={e => setVoucherNote(e.target.value)} className="w-full border rounded-2xl p-4 bg-gray-50 outline-none h-24 focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all resize-none" placeholder="مثلاً: بانتظار موافقة مدير الصيدلية، توريد طلبيات الأسبوع..."></textarea>
              </div>
            </form>

            <div className="p-8 border-t bg-gray-50 flex flex-col md:flex-row gap-4">
              <button onClick={() => setShowMoveModal(false)} className="flex-1 py-4 bg-white border-2 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all active:scale-95">إلغاء العملية</button>
              <button onClick={handleVoucherAction} disabled={loading} className={`flex-[2] py-4 text-white rounded-2xl font-bold shadow-xl transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 ${moveType === 'ADD' ? 'bg-green-600 hover:bg-green-700' : moveType === 'TRANSFER' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                {loading ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
                {moveType === 'TRANSFER' ? 'إرسال طلب التحويل' : 'تأكيد وحفظ المستند نهائياً'}
              </button>
            </div>
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

export default InventoryModule;
