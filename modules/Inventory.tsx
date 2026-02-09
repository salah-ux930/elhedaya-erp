
import React, { useState, useEffect } from 'react';
import { AR } from '../constants.ts';
import { DB } from '../store.ts';
import { Product, Store, StockTransaction, TransferRequest } from '../types.ts';
import { Package, ArrowLeftRight, TrendingUp, TrendingDown, ClipboardList, Plus, Search, ArrowRightLeft, Loader2, X, Check, Bell, AlertCircle, Trash2, MapPin, CheckCircle, Clock } from 'lucide-react';

const InventoryModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'transfers' | 'requests'>('stock');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [moveType, setMoveType] = useState<'ADD' | 'DEDUCT' | 'TRANSFER'>('ADD');
  
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  
  // طلبات التحويل المتعددة
  const [transferItems, setTransferItems] = useState<{ productId: string, quantity: number }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [showProcessRequest, setShowProcessRequest] = useState<TransferRequest | null>(null);

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const p = await DB.getProducts();
      const s = await DB.getStores();
      setProducts(p || []);
      setStores(s || []);
      
      const reqs = await DB.getTransferRequests();
      setRequests(reqs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addItemToTransfer = () => {
    if (!selectedProductId || selectedQuantity <= 0) return;
    if (transferItems.find(i => i.productId === selectedProductId)) {
      alert("الصنف مضاف بالفعل لهذا الطلب");
      return;
    }
    setTransferItems([...transferItems, { productId: selectedProductId, quantity: selectedQuantity }]);
    setSelectedProductId('');
    setSelectedQuantity(1);
  };

  const removeItemFromTransfer = (pid: string) => {
    setTransferItems(transferItems.filter(i => i.productId !== pid));
  };

  const handleStockAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    
    if (moveType === 'TRANSFER') {
      if (target.storeId.value === target.targetStoreId.value) {
        alert("خطأ: لا يمكن التحويل لنفس المخزن!");
        return;
      }
      if (transferItems.length === 0) {
        alert("يرجى إضافة صنف واحد على الأقل للتحويل");
        return;
      }

      setLoading(true);
      try {
        await DB.createTransferRequest({
          fromStoreId: target.storeId.value,
          toStoreId: target.targetStoreId.value,
          items: transferItems,
          status: 'PENDING',
          requestedBy: JSON.parse(localStorage.getItem('dialysis_user') || '{}').name || 'Unknown',
          note: target.note.value,
          date: new Date().toISOString()
        });
        setShowMoveModal(false);
        setTransferItems([]);
        alert("تم إرسال طلب التحويل بنجاح. سيتم إخطار مسؤول المخزن.");
        loadData();
      } catch (err) {
        alert("حدث خطأ أثناء إرسال الطلب");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        await DB.addStockTransaction({
          productId: target.productId.value,
          storeId: target.storeId.value,
          type: moveType,
          quantity: parseFloat(target.quantity.value),
          date: new Date().toISOString().split('T')[0],
          note: target.note.value
        });
        setShowMoveModal(false);
        loadData();
      } catch (err) { alert("خطأ في العملية"); } finally { setLoading(false); }
    }
  };

  const processRequest = async (status: 'APPROVED' | 'REJECTED') => {
    if (!showProcessRequest) return;
    setLoading(true);
    try {
      await DB.updateTransferRequestStatus(showProcessRequest.id, status, showProcessRequest.items);
      if (status === 'APPROVED') {
        for (const item of showProcessRequest.items) {
          await DB.addStockTransaction({
            productId: item.productId,
            storeId: showProcessRequest.fromStoreId,
            targetStoreId: showProcessRequest.toStoreId,
            quantity: item.quantity,
            type: 'TRANSFER',
            date: new Date().toISOString().split('T')[0]
          });
        }
      }
      setShowProcessRequest(null);
      loadData();
      alert(status === 'APPROVED' ? "تم اعتماد التحويل وتحديث الأرصدة بنجاح" : "تم رفض طلب التحويل");
    } catch (err) {
      alert("خطأ في معالجة طلب التحويل");
    } finally {
      setLoading(false);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const pendingCount = pendingRequests.length;

  return (
    <div className="space-y-6">
      {/* Simulation of Notifications Banner */}
      {pendingCount > 0 && (
        <div 
          onClick={() => setActiveSubTab('requests')}
          className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between cursor-pointer hover:bg-indigo-700 transition-all animate-in slide-in-from-top-4 duration-500 no-print"
        >
          <div className="flex items-center gap-4">
             <div className="bg-white/20 p-2 rounded-xl border border-white/30 animate-pulse">
                <Bell size={24} />
             </div>
             <div>
                <p className="font-bold text-lg">تنبيه: يوجد {pendingCount} طلب تحويل معلق</p>
                <p className="text-xs text-indigo-100">اضغط هنا لمراجعة واعتماد طلبات التحويل الداخلي الواردة</p>
             </div>
          </div>
          <ArrowLeftRight size={24} className="opacity-50" />
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="flex gap-2 p-1 bg-gray-200/50 rounded-xl w-fit">
          <button 
            onClick={() => setActiveSubTab('stock')}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${activeSubTab === 'stock' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {AR.inventory}
          </button>
          <button 
            onClick={() => setActiveSubTab('transfers')}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${activeSubTab === 'transfers' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            سجل الحركات
          </button>
          <button 
            onClick={() => setActiveSubTab('requests')}
            className={`px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${activeSubTab === 'requests' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            طلبات التحويل 
            {pendingCount > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingCount}</span>}
          </button>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
           <button 
             onClick={() => { setMoveType('TRANSFER'); setTransferItems([]); setShowMoveModal(true); }}
             className="flex-1 md:flex-none bg-indigo-600 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-md transition-all active:scale-95"
           >
             <ArrowRightLeft size={18} /> طلب تحويل داخلى
           </button>
           <button 
             onClick={() => { setMoveType('ADD'); setShowMoveModal(true); }}
             className="flex-1 md:flex-none bg-green-600 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-700 shadow-md transition-all active:scale-95"
           >
             <TrendingUp size={18} /> توريد صنف
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        {activeSubTab === 'stock' ? (
          <div className="p-6">
             <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-lg text-gray-800">الأرصدة الحالية بالمخازن</h3>
             </div>
             <table className="w-full text-right">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-bold text-gray-600 uppercase text-xs">اسم الصنف</th>
                    <th className="px-6 py-4 font-bold text-gray-600 uppercase text-xs">الوحدة</th>
                    <th className="px-6 py-4 font-bold text-gray-600 uppercase text-xs">الرصيد المتاح</th>
                    <th className="px-6 py-4 font-bold text-gray-600 uppercase text-xs">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-primary-50/30">
                      <td className="px-6 py-4 font-bold text-gray-800">{p.name}</td>
                      <td className="px-6 py-4 text-gray-600">{p.unit}</td>
                      <td className="px-6 py-4 font-bold text-primary-600">0</td>
                      <td className="px-6 py-4">
                         <span className="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-bold">نفذ الكمية</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        ) : activeSubTab === 'requests' ? (
          <div className="p-6">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
               <ClipboardList className="text-indigo-600" />
               إدارة طلبات التحويل الداخلي
            </h3>
            <div className="space-y-4">
               {requests.map(req => (
                 <div 
                   key={req.id} 
                   className={`p-5 border-2 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${req.status === 'PENDING' ? 'border-indigo-100 bg-indigo-50/30 shadow-sm' : 'border-gray-50 bg-white'}`}
                 >
                    <div>
                       <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-800">{stores.find(s => s.id === req.fromStoreId)?.name || 'مخزن غير معروف'}</span>
                          <ArrowLeftRight size={14} className="text-gray-400" />
                          <span className="font-bold text-indigo-700">{stores.find(s => s.id === req.toStoreId)?.name || 'مخزن غير معروف'}</span>
                       </div>
                       <div className="text-xs text-gray-400">
                          بواسطة: <span className="text-gray-600 font-bold">{req.requestedBy}</span> • {new Date(req.date).toLocaleString('ar-EG')}
                       </div>
                       <div className="mt-3 flex flex-wrap gap-1">
                          {req.items.map((item, idx) => (
                            <span key={idx} className="bg-white border px-2 py-1 rounded-lg text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                               <Package size={10} /> {products.find(p => p.id === item.productId)?.name} ({item.quantity})
                            </span>
                          ))}
                       </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                       {req.status === 'PENDING' ? (
                         <>
                           <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-200 flex items-center gap-1">
                              <Clock size={12} /> قيد المراجعة
                           </span>
                           <button 
                             onClick={() => setShowProcessRequest(req)}
                             className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700"
                           >
                              إتمام التحويل
                           </button>
                         </>
                       ) : (
                         <span className={`text-xs font-bold px-4 py-2 rounded-xl border flex items-center gap-1 ${req.status === 'APPROVED' ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
                           {req.status === 'APPROVED' ? <CheckCircle size={14} /> : <X size={14} />}
                           {req.status === 'APPROVED' ? 'تم الاعتماد' : 'تم الرفض'}
                         </span>
                       )}
                    </div>
                 </div>
               ))}
               {requests.length === 0 && <div className="py-24 text-center text-gray-300 italic">لا توجد طلبات تحويل مسجلة حتى الآن</div>}
            </div>
          </div>
        ) : (
          <div className="p-24 text-center flex flex-col items-center gap-4 text-gray-400 italic">
             <Search size={48} className="text-gray-200" />
             <p>شاشة سجل حركات المخازن التفصيلية (قيد البرمجة)</p>
          </div>
        )}
      </div>

      {/* Modal: New Transfer Request (Multi-Item) */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
            <div className={`p-6 text-white flex justify-between items-center shrink-0 ${moveType === 'ADD' ? 'bg-green-600' : moveType === 'DEDUCT' ? 'bg-red-600' : 'bg-indigo-600'}`}>
              <h3 className="text-xl font-bold flex items-center gap-3">
                {moveType === 'TRANSFER' ? <ArrowRightLeft size={24} /> : moveType === 'ADD' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                {moveType === 'TRANSFER' ? 'طلب تحويل داخلى (أصناف متعددة)' : moveType === 'ADD' ? 'توريد أصناف للمخزن' : 'صرف أصناف'}
              </h3>
              <button onClick={() => setShowMoveModal(false)} className="p-1 hover:bg-white/20 rounded-lg"><X size={26} /></button>
            </div>
            
            <form onSubmit={handleStockAction} className="p-8 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">
                    {moveType === 'TRANSFER' ? 'من مخزن (المصدر)' : 'المخزن'}
                  </label>
                  <select name="storeId" required className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all">
                    <option value="">اختر المخزن...</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                
                {moveType === 'TRANSFER' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">إلى مخزن (الوجهة)</label>
                    <select name="targetStoreId" required className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all">
                      <option value="">اختر المخزن المستلم...</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {moveType === 'TRANSFER' ? (
                <div className="border-2 border-indigo-50 rounded-2xl p-5 bg-indigo-50/20 space-y-4">
                   <h4 className="font-bold text-indigo-700 text-sm flex items-center gap-2 underline decoration-indigo-200 underline-offset-4">قائمة الأصناف المطلوبة</h4>
                   <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">اختر الصنف</label>
                        <select 
                          value={selectedProductId}
                          onChange={e => setSelectedProductId(e.target.value)}
                          className="w-full border-2 border-white rounded-xl p-3 bg-white shadow-sm focus:border-indigo-500 outline-none"
                        >
                          <option value="">-- اختر --</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="w-28">
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">الكمية</label>
                        <input 
                          type="number" 
                          min="0.1"
                          step="0.1"
                          value={selectedQuantity}
                          onChange={e => setSelectedQuantity(parseFloat(e.target.value))}
                          className="w-full border-2 border-white rounded-xl p-3 bg-white shadow-sm focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={addItemToTransfer}
                        className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 shadow-md transition-all active:scale-95 mb-[2px]"
                      >
                        <Plus size={24} />
                      </button>
                   </div>

                   <div className="space-y-2 mt-4">
                      {transferItems.map((item, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-2xl border border-indigo-50 flex justify-between items-center shadow-sm hover:shadow-md transition-all group animate-in slide-in-from-right-4">
                           <div>
                              <span className="font-bold text-gray-800">{products.find(p => p.id === item.productId)?.name}</span>
                              <div className="text-xs text-primary-600 font-bold mt-1">الكمية: {item.quantity}</div>
                           </div>
                           <button type="button" onClick={() => removeItemFromTransfer(item.productId)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl transition-all">
                              <Trash2 size={20} />
                           </button>
                        </div>
                      ))}
                      {transferItems.length === 0 && <div className="text-center py-6 text-xs text-gray-400 italic bg-white/50 rounded-xl border-2 border-dashed border-gray-200">لم يتم إضافة أي أصناف للطلب بعد</div>}
                   </div>
                </div>
              ) : (
                <div className="space-y-4 border rounded-2xl p-5 bg-gray-50">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">الصنف</label>
                    <select name="productId" required className="w-full border rounded-xl p-3 bg-white shadow-sm">
                      <option value="">اختر الصنف...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">الكمية</label>
                    <input name="quantity" type="number" step="0.1" required className="w-full border rounded-xl p-3 bg-white shadow-sm" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">ملاحظات إضافية (اختياري)</label>
                <textarea name="note" className="w-full border rounded-xl p-4 bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all h-24" placeholder="اكتب أي ملاحظات لمسؤول المخزن هنا..."></textarea>
              </div>
            </form>

            <div className="p-6 border-t bg-gray-50 flex gap-4 shrink-0 no-print">
              <button type="button" onClick={() => setShowMoveModal(false)} className="flex-1 py-4 bg-white border-2 border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">إلغاء</button>
              <button 
                form="none" 
                onClick={(e) => {
                  const form = (e.target as any).closest('.bg-white').querySelector('form');
                  if (form) form.requestSubmit();
                }}
                disabled={loading} 
                className={`flex-1 py-4 text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 ${moveType === 'ADD' ? 'bg-green-600 hover:bg-green-700' : moveType === 'DEDUCT' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : (moveType === 'TRANSFER' ? 'إرسال طلب التحويل' : 'تأكيد وحفظ العملية')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Process Request (Admin Review & Complete) - EDITABLE DATA */}
      {showProcessRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
             <div className="p-6 bg-indigo-700 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                   <AlertCircle size={28} className="text-orange-400" />
                   <div>
                      <h3 className="text-xl font-bold">إتمام طلب التحويل الداخلي</h3>
                      <p className="text-xs opacity-75">مراجعة البيانات واعتماد التحويل الفعلي للأرصدة</p>
                   </div>
                </div>
                <button onClick={() => setShowProcessRequest(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={26} /></button>
             </div>
             <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="bg-indigo-50/50 p-5 rounded-2xl border-2 border-indigo-100 grid grid-cols-2 gap-6 shadow-inner">
                   <div>
                      <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mb-1">مخزن المصدر</div>
                      <div className="font-bold text-indigo-900 flex items-center gap-2">
                         <MapPin size={14} /> {stores.find(s => s.id === showProcessRequest.fromStoreId)?.name}
                      </div>
                   </div>
                   <div>
                      <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mb-1">مخزن الوجهة</div>
                      <div className="font-bold text-indigo-900 flex items-center gap-2">
                         <CheckCircle size={14} /> {stores.find(s => s.id === showProcessRequest.toStoreId)?.name}
                      </div>
                   </div>
                   <div className="col-span-2 pt-2 border-t border-indigo-100 flex justify-between items-center">
                      <div>
                         <div className="text-[10px] text-indigo-500 font-bold uppercase mb-1">مقدم الطلب</div>
                         <div className="font-bold text-indigo-900">{showProcessRequest.requestedBy}</div>
                      </div>
                      <div className="text-left">
                         <div className="text-[10px] text-indigo-500 font-bold uppercase mb-1">التاريخ</div>
                         <div className="text-xs font-mono text-indigo-700">{new Date(showProcessRequest.date).toLocaleDateString('ar-EG')}</div>
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-center px-1">
                      <h4 className="font-bold text-gray-700 text-sm">مراجعة الكميات النهائية:</h4>
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">قابلة للتعديل</span>
                   </div>
                   {showProcessRequest.items.map((item, idx) => (
                     <div key={idx} className="flex gap-4 items-center bg-gray-50 p-4 rounded-2xl border-2 border-transparent hover:border-indigo-200 transition-all shadow-sm">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                           <Package size={20} />
                        </div>
                        <div className="flex-1 font-bold text-gray-800">{products.find(p => p.id === item.productId)?.name}</div>
                        <div className="w-32 flex items-center gap-2 bg-white rounded-xl border-2 border-gray-100 px-3 py-1">
                           <input 
                             type="number" 
                             min="0"
                             step="0.1"
                             defaultValue={item.quantity} 
                             onChange={(e) => {
                               const updatedItems = [...showProcessRequest.items];
                               updatedItems[idx].quantity = parseFloat(e.target.value) || 0;
                               setShowProcessRequest({...showProcessRequest, items: updatedItems});
                             }}
                             className="w-full text-center font-extrabold text-primary-700 outline-none"
                           />
                           <span className="text-[10px] text-gray-400 font-bold">{products.find(p => p.id === item.productId)?.unit || 'وحدة'}</span>
                        </div>
                     </div>
                   ))}
                </div>

                {showProcessRequest.note && (
                  <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100 italic text-sm text-yellow-800">
                    <span className="font-bold block mb-1 not-italic text-xs text-yellow-600">ملاحظة الطلب:</span>
                    "{showProcessRequest.note}"
                  </div>
                )}
             </div>

             <div className="p-8 border-t bg-gray-50 flex gap-4 shrink-0">
                <button 
                  onClick={() => processRequest('REJECTED')}
                  disabled={loading}
                  className="flex-1 py-4 bg-white border-2 border-red-200 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                   رفض وإلغاء
                </button>
                <button 
                  onClick={() => processRequest('APPROVED')}
                  disabled={loading}
                  className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-3 transition-all hover:-translate-y-1 active:translate-y-0"
                >
                   {loading ? <Loader2 className="animate-spin" size={24} /> : <Check size={24} />}
                   اعتماد وترحيل الأرصدة
                </button>
             </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4f46e5; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default InventoryModule;
