
import React, { useState, useEffect } from 'react';
import { AR } from '../constants.ts';
import { DB } from '../store.ts';
import { Product, Store, StockTransaction, TransferRequest } from '../types.ts';
import { 
  Package, ArrowLeftRight, TrendingUp, TrendingDown, ClipboardList, 
  Plus, Search, ArrowRightLeft, Loader2, X, Check, Bell, 
  AlertCircle, Trash2, MapPin, CheckCircle, Clock, FileText, ShoppingCart, DollarSign, Calculator
} from 'lucide-react';

const InventoryModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'transfers' | 'requests'>('stock');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveType, setMoveType] = useState<'ADD' | 'DEDUCT' | 'TRANSFER'>('ADD');
  
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  
  // إدارة المستند (فاتورة توريد أو إذن صرف)
  const [voucherItems, setVoucherItems] = useState<{ productId: string, quantity: number, price: number }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedPrice, setSelectedPrice] = useState(0);
  
  // بيانات المستند العامة
  const [documentNumber, setDocumentNumber] = useState('');
  const [voucherNote, setVoucherNote] = useState('');

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

  const addItemToVoucher = () => {
    if (!selectedProductId || selectedQuantity <= 0) return;
    if (voucherItems.find(i => i.productId === selectedProductId)) {
      alert("هذا الصنف مضاف بالفعل للقائمة");
      return;
    }
    setVoucherItems([...voucherItems, { 
      productId: selectedProductId, 
      quantity: selectedQuantity,
      price: selectedPrice
    }]);
    setSelectedProductId('');
    setSelectedQuantity(1);
    setSelectedPrice(0);
  };

  const removeItemFromVoucher = (pid: string) => {
    setVoucherItems(voucherItems.filter(i => i.productId !== pid));
  };

  const totalVoucherAmount = voucherItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleVoucherAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    
    if (voucherItems.length === 0) {
      alert("يرجى إضافة صنف واحد على الأقل للقائمة");
      return;
    }

    setLoading(true);
    try {
      const storeId = target.storeId.value;
      const typeLabel = moveType === 'ADD' ? 'فاتورة توريد' : 'إذن صرف';
      
      for (const item of voucherItems) {
        await DB.addStockTransaction({
          productId: item.productId,
          storeId: storeId,
          type: moveType,
          quantity: item.quantity,
          date: new Date().toISOString().split('T')[0],
          note: `[${typeLabel}] رقم: ${documentNumber} | ${voucherNote}`
        });
      }
      
      setShowMoveModal(false);
      setVoucherItems([]);
      setDocumentNumber('');
      setVoucherNote('');
      alert(`تم اعتماد ${typeLabel} وتحديث الأرصدة بنجاح.`);
      loadData();
    } catch (err) {
      alert("حدث خطأ أثناء حفظ المستند.");
    } finally {
      setLoading(false);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Notifications Banner */}
      {pendingRequests.length > 0 && (
        <div 
          onClick={() => setActiveSubTab('requests')}
          className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between cursor-pointer hover:bg-indigo-700 transition-all animate-in slide-in-from-top-4 no-print"
        >
          <div className="flex items-center gap-4">
             <div className="bg-white/20 p-2 rounded-xl border border-white/30 animate-pulse">
                <Bell size={24} />
             </div>
             <div>
                <p className="font-bold text-lg">يوجد {pendingRequests.length} طلب تحويل داخلي بانتظار الموافقة</p>
                <p className="text-xs text-indigo-100 italic">اضغط هنا للمراجعة والاعتماد</p>
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
            الأرصدة الحالية
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
            {pendingRequests.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingRequests.length}</span>}
          </button>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
           <button 
             onClick={() => { setMoveType('DEDUCT'); setVoucherItems([]); setDocumentNumber(''); setShowMoveModal(true); }}
             className="flex-1 md:flex-none bg-orange-600 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-orange-700 shadow-md transition-all"
           >
             <TrendingDown size={18} /> إذن صـــرف
           </button>
           <button 
             onClick={() => { setMoveType('ADD'); setVoucherItems([]); setDocumentNumber(''); setShowMoveModal(true); }}
             className="flex-1 md:flex-none bg-green-600 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-700 shadow-md transition-all"
           >
             <TrendingUp size={18} /> فاتورة توريد
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        {activeSubTab === 'stock' ? (
          <div className="p-6">
             <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center gap-2">
                <Package className="text-primary-600" size={20} /> الأرصدة المتوفرة حالياً
             </h3>
             <table className="w-full text-right">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-bold text-gray-600 text-xs">اسم الصنف</th>
                    <th className="px-6 py-4 font-bold text-gray-600 text-xs">الوحدة</th>
                    <th className="px-6 py-4 font-bold text-gray-600 text-xs text-center">الرصيد المتاح</th>
                    <th className="px-6 py-4 font-bold text-gray-600 text-xs text-left">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-primary-50/20">
                      <td className="px-6 py-4 font-bold text-gray-800">{p.name}</td>
                      <td className="px-6 py-4 text-gray-600">{p.unit}</td>
                      <td className="px-6 py-4 font-extrabold text-primary-700 text-center text-lg">0</td>
                      <td className="px-6 py-4 text-left">
                         <span className="text-[10px] bg-red-50 text-red-500 px-3 py-1 rounded-full font-bold border border-red-100">تحت حد الطلب</span>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && <tr><td colSpan={4} className="py-20 text-center text-gray-400 italic">لا توجد أصناف معرفة حالياً</td></tr>}
                </tbody>
             </table>
          </div>
        ) : activeSubTab === 'requests' ? (
          <div className="p-6">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><ClipboardList className="text-indigo-600" /> إدارة طلبات التحويل الداخلي</h3>
            {/* عرض الطلبات ... */}
            <div className="py-20 text-center text-gray-300 italic">سجل طلبات التحويل الداخلي فارغ حالياً</div>
          </div>
        ) : (
          <div className="p-24 text-center flex flex-col items-center gap-4 text-gray-400 italic">
             <Search size={48} className="text-gray-200" />
             <p>شاشة سجل حركات المخازن التفصيلية قيد التطوير</p>
          </div>
        )}
      </div>

      {/* Modal: Voucher Modal (ADD or DEDUCT) - MULTI ITEM */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[95vh]">
            <div className={`p-6 text-white flex justify-between items-center shrink-0 ${moveType === 'ADD' ? 'bg-green-600' : 'bg-orange-600'}`}>
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-white/20 rounded-2xl shadow-inner">
                   {moveType === 'ADD' ? <ShoppingCart size={28} /> : <TrendingDown size={28} />}
                 </div>
                 <div>
                    <h3 className="text-2xl font-bold">{moveType === 'ADD' ? 'تسجيل فاتورة توريد' : 'إصدار إذن صرف مخزني'}</h3>
                    <p className="text-xs opacity-75">{moveType === 'ADD' ? 'توريد أصناف جديدة وتحديث أسعار الشراء' : 'صرف أصناف من المخزن للاستخدام الطبي'}</p>
                 </div>
              </div>
              <button onClick={() => setShowMoveModal(false)} className="p-2 hover:bg-white/20 rounded-xl transition-all"><X size={26} /></button>
            </div>
            
            <form onSubmit={handleVoucherAction} className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              {/* Top Bar Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-inner">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">المخزن المعني</label>
                  <select name="storeId" required className="w-full border-2 border-white rounded-xl p-3 bg-white shadow-sm focus:border-primary-500 outline-none transition-all font-bold">
                    <option value="">-- اختر المخزن --</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{moveType === 'ADD' ? 'رقم فاتورة المورد' : 'رقم إذن الصرف'}</label>
                   <div className="relative">
                      <FileText size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        required
                        value={documentNumber}
                        onChange={e => setDocumentNumber(e.target.value)}
                        className="w-full border-2 border-white rounded-xl pr-10 pl-3 py-3 bg-white shadow-sm focus:border-primary-500 outline-none font-mono"
                        placeholder={moveType === 'ADD' ? "رقم الفاتورة..." : "رقم الإذن..."}
                      />
                   </div>
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">تاريخ العملية</label>
                   <div className="relative">
                      <Clock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border-2 border-white rounded-xl pr-10 pl-3 py-3 bg-white shadow-sm outline-none" />
                   </div>
                </div>
              </div>

              {/* Add Item Bar */}
              <div className="bg-primary-50/50 p-6 rounded-3xl border-2 border-dashed border-primary-200 space-y-4">
                 <div className="flex items-center gap-2 text-primary-700 font-bold text-sm mb-2">
                    <Plus size={18} /> إضافة أصناف للقائمة
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4">
                       <label className="block text-[10px] font-bold text-gray-400 mb-1">اختر الصنف</label>
                       <select 
                         value={selectedProductId}
                         onChange={e => setSelectedProductId(e.target.value)}
                         className="w-full border-2 border-white rounded-xl p-3 bg-white shadow-sm focus:border-primary-500 outline-none font-bold"
                       >
                         <option value="">-- اختر صنفاً --</option>
                         {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                       </select>
                    </div>
                    <div className="md:col-span-2">
                       <label className="block text-[10px] font-bold text-gray-400 mb-1">الكمية</label>
                       <input 
                         type="number" 
                         min="0.1" step="0.1"
                         value={selectedQuantity}
                         onChange={e => setSelectedQuantity(parseFloat(e.target.value))}
                         className="w-full border-2 border-white rounded-xl p-3 bg-white shadow-sm outline-none font-bold text-center"
                       />
                    </div>
                    {moveType === 'ADD' ? (
                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">سعر الشراء (للوحدة)</label>
                        <div className="relative">
                          <DollarSign size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input 
                            type="number" 
                            min="0"
                            value={selectedPrice}
                            onChange={e => setSelectedPrice(parseFloat(e.target.value))}
                            className="w-full border-2 border-white rounded-xl pr-8 pl-3 py-3 bg-white shadow-sm outline-none font-bold text-primary-600"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="md:col-span-3 opacity-0 pointer-events-none"></div>
                    )}
                    <div className="md:col-span-3">
                       <button 
                         type="button" 
                         onClick={addItemToVoucher}
                         className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${moveType === 'ADD' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'} text-white`}
                       >
                         <Plus size={20} /> إدراج بالجدول
                       </button>
                    </div>
                 </div>
              </div>

              {/* Items Table */}
              <div className="border-2 border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm">
                 <table className="w-full text-right">
                    <thead className="bg-gray-100 text-gray-600 text-[10px] uppercase tracking-widest">
                       <tr>
                          <th className="px-6 py-4 font-bold">اسم الصنف</th>
                          <th className="px-6 py-4 font-bold text-center">الكمية</th>
                          {moveType === 'ADD' && <th className="px-6 py-4 text-center font-bold">سعر الشراء</th>}
                          {moveType === 'ADD' && <th className="px-6 py-4 text-center font-bold">الإجمالي الفرعي</th>}
                          <th className="px-6 py-4 text-left">الإجراء</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                       {voucherItems.map((item, idx) => (
                         <tr key={idx} className="hover:bg-primary-50/30 transition-colors animate-in slide-in-from-right-2">
                            <td className="px-6 py-4">
                               <div className="font-bold text-gray-800">{products.find(p => p.id === item.productId)?.name}</div>
                               <div className="text-[10px] text-gray-400 uppercase">{products.find(p => p.id === item.productId)?.unit}</div>
                            </td>
                            <td className="px-6 py-4 text-center font-mono font-bold text-lg">{item.quantity}</td>
                            {moveType === 'ADD' && <td className="px-6 py-4 text-center font-mono text-gray-600">{item.price.toLocaleString()}</td>}
                            {moveType === 'ADD' && (
                              <td className="px-6 py-4 text-center font-bold text-primary-600 font-mono text-base">
                                {(item.price * item.quantity).toLocaleString()}
                              </td>
                            )}
                            <td className="px-6 py-4 text-left">
                               <button type="button" onClick={() => removeItemFromVoucher(item.productId)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl transition-all">
                                  <Trash2 size={18} />
                               </button>
                            </td>
                         </tr>
                       ))}
                       {voucherItems.length === 0 && (
                         <tr><td colSpan={moveType === 'ADD' ? 5 : 3} className="py-20 text-center text-gray-400 italic">لا توجد أصناف مضافة للقائمة بعد</td></tr>
                       )}
                    </tbody>
                    {moveType === 'ADD' && voucherItems.length > 0 && (
                      <tfoot className="bg-gray-50 border-t-2 border-gray-100">
                         <tr>
                            <td colSpan={3} className="px-6 py-6 font-bold text-gray-500 text-lg flex items-center gap-2">
                               <Calculator size={20} className="text-primary-600" /> إجمالي قيمة الفاتورة:
                            </td>
                            <td className="px-6 py-6 text-center font-extrabold text-primary-700 text-2xl font-mono">
                               {totalVoucherAmount.toLocaleString()} <span className="text-sm font-bold ml-1">ج.م</span>
                            </td>
                            <td></td>
                         </tr>
                      </tfoot>
                    )}
                 </table>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">ملاحظات المستند</label>
                <textarea 
                  value={voucherNote}
                  onChange={e => setVoucherNote(e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none transition-all h-24" 
                  placeholder="اكتب أي ملاحظات إضافية تتعلق بهذه العملية (مثلاً: جهة الصرف، اسم المورد...)"
                ></textarea>
              </div>
            </form>

            <div className="p-8 border-t bg-gray-50 flex gap-4 shrink-0 no-print">
              <button type="button" onClick={() => setShowMoveModal(false)} className="flex-1 py-4 bg-white border-2 border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">إلغاء العملية</button>
              <button 
                onClick={handleVoucherAction}
                disabled={loading} 
                className={`flex-[2] py-4 text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-3 transition-all hover:-translate-y-1 active:translate-y-0 ${moveType === 'ADD' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'}`}
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : (moveType === 'ADD' ? <CheckCircle size={22} /> : <FileText size={22} />)}
                {moveType === 'ADD' ? 'اعتماد توريد الفاتورة' : 'اعتماد صرف الأصناف'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #0ea5e9; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default InventoryModule;
