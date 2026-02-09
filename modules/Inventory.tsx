
import React, { useState, useEffect } from 'react';
import { AR } from '../constants.ts';
import { DB } from '../store.ts';
import { Product, Store, StockTransaction, TransferRequest } from '../types.ts';
import { 
  Package, ArrowLeftRight, TrendingUp, TrendingDown, ClipboardList, 
  Plus, Search, ArrowRightLeft, Loader2, X, Check, Bell, 
  AlertCircle, Trash2, MapPin, CheckCircle, Clock, FileText, ShoppingCart, DollarSign, Calculator, ArrowDownRight
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addItemToVoucher = () => {
    if (!selectedProductId || selectedQuantity <= 0) return;
    if (voucherItems.find(i => i.productId === selectedProductId)) return alert("الصنف مضاف بالفعل");
    setVoucherItems([...voucherItems, { productId: selectedProductId, quantity: selectedQuantity, price: selectedPrice }]);
    setSelectedProductId('');
    setSelectedQuantity(1);
    setSelectedPrice(0);
  };

  const removeItemFromVoucher = (pid: string) => setVoucherItems(voucherItems.filter(i => i.productId !== pid));
  const totalVoucherAmount = voucherItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleVoucherAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (voucherItems.length === 0) return alert("يرجى إضافة أصناف أولاً");
    setLoading(true);
    try {
      const storeId = (e.target as any).storeId.value;
      if (moveType === 'TRANSFER') {
        await DB.createTransferRequest({
          fromStoreId: storeId,
          toStoreId: targetStoreId, // القيمة المستلمة تلقائياً
          items: voucherItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
          status: 'PENDING',
          date: new Date().toISOString().split('T')[0],
          note: voucherNote
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
      alert("تمت العملية بنجاح");
      loadData();
    } catch (err) {
      alert("حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="flex gap-2 p-1 bg-gray-200/50 rounded-xl w-fit">
          <button onClick={() => setActiveSubTab('stock')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeSubTab === 'stock' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}>الأرصدة</button>
          <button onClick={() => setActiveSubTab('requests')} className={`px-6 py-2 rounded-lg font-bold transition-all ${activeSubTab === 'requests' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}>طلبات التحويل ({requests.filter(r => r.status === 'PENDING').length})</button>
        </div>

        <div className="flex gap-2">
           <button 
             onClick={() => { setMoveType('TRANSFER'); setVoucherItems([]); setTargetStoreId(stores.find(s => !s.isMain)?.id || ''); setShowMoveModal(true); }}
             className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md"
           >
             <ArrowLeftRight size={18} /> طلب تحويل داخلي
           </button>
           <button onClick={() => { setMoveType('DEDUCT'); setVoucherItems([]); setShowMoveModal(true); }} className="bg-orange-600 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md">
             <TrendingDown size={18} /> إذن صـــرف
           </button>
           <button onClick={() => { setMoveType('ADD'); setVoucherItems([]); setShowMoveModal(true); }} className="bg-green-600 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md">
             <TrendingUp size={18} /> فاتورة توريد
           </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border overflow-hidden min-h-[400px]">
        {activeSubTab === 'stock' ? (
          <div className="p-8">
             <h3 className="font-bold text-xl text-gray-800 mb-6 flex items-center gap-2">الأرصدة الحالية بالمخازن</h3>
             <table className="w-full text-right">
                <thead className="bg-gray-50 border-b">
                  <tr><th className="px-6 py-4 font-bold text-gray-600 text-xs">الصنف</th><th className="px-6 py-4 font-bold text-gray-600 text-xs">الوحدة</th><th className="px-6 py-4 font-bold text-gray-600 text-xs text-center">الرصيد</th></tr>
                </thead>
                <tbody className="divide-y">
                  {products.map(p => <tr key={p.id} className="hover:bg-gray-50"><td className="px-6 py-4 font-bold">{p.name}</td><td className="px-6 py-4 text-gray-500">{p.unit}</td><td className="px-6 py-4 font-black text-primary-700 text-center text-xl">0</td></tr>)}
                </tbody>
             </table>
          </div>
        ) : (
          <div className="p-20 text-center text-gray-300 italic">لا توجد طلبات معلقة حالياً</div>
        )}
      </div>

      {showMoveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
            <div className={`p-6 text-white flex justify-between items-center ${moveType === 'ADD' ? 'bg-green-600' : moveType === 'TRANSFER' ? 'bg-indigo-600' : 'bg-orange-600'}`}>
              <h3 className="text-xl font-bold">{moveType === 'ADD' ? 'تسجيل توريد' : moveType === 'TRANSFER' ? 'إنشاء طلب تحويل مخزني' : 'إصدار إذن صرف'}</h3>
              <button onClick={() => setShowMoveModal(false)}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleVoucherAction} className="p-8 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-3xl border">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    {moveType === 'TRANSFER' ? 'مخزن المصدر (الذي سيخرج منه الصنف)' : 'المخزن المعني'}
                  </label>
                  <select name="storeId" required className="w-full border rounded-xl p-3 bg-white font-bold">
                    <option value="">-- اختر المخزن --</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                {moveType === 'TRANSFER' && (
                  <div>
                    <label className="block text-xs font-bold text-indigo-600 uppercase mb-1">المخزن المستلم (ثابت)</label>
                    <div className="w-full border-2 border-indigo-100 rounded-xl p-3 bg-indigo-50 font-bold text-indigo-800 flex items-center gap-2">
                       <MapPin size={16} /> {stores.find(s => s.id === targetStoreId)?.name || 'غير محدد'}
                    </div>
                    <p className="text-[10px] text-indigo-400 mt-1">* يتم تحديد المخزن المستلم تلقائياً بناءً على وجهة الصرف.</p>
                  </div>
                )}
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">رقم المستند / المرجعية</label>
                   <input type="text" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} className="w-full border rounded-xl p-3 bg-white" placeholder="رقم الفاتورة أو الإذن..." />
                </div>
              </div>

              {/* إضافة أصناف */}
              <div className="bg-primary-50/50 p-6 rounded-3xl border-2 border-dashed border-primary-200">
                 <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-6">
                       <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full border rounded-xl p-3 bg-white font-bold">
                         <option value="">-- اختر صنفاً --</option>
                         {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                       </select>
                    </div>
                    <div className="col-span-2">
                       <input type="number" value={selectedQuantity} onChange={e => setSelectedQuantity(parseFloat(e.target.value))} className="w-full border rounded-xl p-3 bg-white text-center font-bold" />
                    </div>
                    {moveType === 'ADD' && (
                      <div className="col-span-2">
                        <input type="number" placeholder="سعر الشراء" value={selectedPrice} onChange={e => setSelectedPrice(parseFloat(e.target.value))} className="w-full border rounded-xl p-3 bg-white text-center" />
                      </div>
                    )}
                    <div className={`col-span-${moveType === 'ADD' ? '2' : '4'}`}>
                       <button type="button" onClick={addItemToVoucher} className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg hover:bg-primary-700">إضافة للقائمة</button>
                    </div>
                 </div>
              </div>

              <div className="border rounded-3xl overflow-hidden shadow-inner">
                 <table className="w-full text-right">
                    <thead className="bg-gray-100">
                       <tr><th className="px-6 py-3 font-bold text-xs uppercase">اسم الصنف</th><th className="px-6 py-3 font-bold text-center text-xs">الكمية</th>{moveType === 'ADD' && <th className="px-6 py-3 text-center text-xs">السعر</th>}<th className="px-6 py-3 text-left text-xs">حذف</th></tr>
                    </thead>
                    <tbody className="divide-y">
                       {voucherItems.map((item, idx) => (
                         <tr key={idx}>
                            <td className="px-6 py-3 font-bold">{products.find(p => p.id === item.productId)?.name}</td>
                            <td className="px-6 py-3 text-center font-black">{item.quantity}</td>
                            {moveType === 'ADD' && <td className="px-6 py-3 text-center text-emerald-600 font-bold">{item.price}</td>}
                            <td className="px-6 py-3 text-left"><button type="button" onClick={() => removeItemFromVoucher(item.productId)} className="text-red-400 p-2"><Trash2 size={16} /></button></td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
            </form>

            <div className="p-8 border-t bg-gray-50 flex gap-4">
              <button onClick={() => setShowMoveModal(false)} className="flex-1 py-4 bg-white border-2 rounded-2xl font-bold text-gray-500">إلغاء</button>
              <button onClick={handleVoucherAction} className={`flex-[2] py-4 text-white rounded-2xl font-bold shadow-xl ${moveType === 'ADD' ? 'bg-green-600' : moveType === 'TRANSFER' ? 'bg-indigo-600' : 'bg-orange-600'}`}>
                {moveType === 'TRANSFER' ? 'إرسال طلب التحويل للمخزن المستلم' : 'تأكيد وحفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryModule;
