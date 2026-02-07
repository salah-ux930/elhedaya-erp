
import React, { useState, useEffect } from 'react';
import { AR } from '../constants.ts';
import { DB } from '../store.ts';
import { Product, Store, StockTransaction } from '../types.ts';
import { Package, ArrowLeftRight, TrendingUp, TrendingDown, ClipboardList, Plus, Search, ArrowRightLeft, Loader2, X, Check } from 'lucide-react';

const InventoryModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'transfers'>('stock');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [moveType, setMoveType] = useState<'ADD' | 'DEDUCT' | 'TRANSFER'>('ADD');
  
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const p = await DB.getProducts();
      const s = await DB.getStores();
      setProducts(p || []);
      setStores(s || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    setLoading(true);
    try {
      await DB.addProduct({
        name: target.name.value,
        unit: target.unit.value,
        minStock: parseInt(target.minStock.value) || 0,
        price: parseFloat(target.price.value) || 0
      });
      setShowAddProductModal(false);
      loadData();
    } catch (err) {
      alert("خطأ أثناء إضافة الصنف");
    } finally {
      setLoading(false);
    }
  };

  const handleStockAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    
    if (moveType === 'TRANSFER' && target.storeId.value === target.targetStoreId.value) {
      alert("لا يمكن التحويل لنفس المخزن!");
      return;
    }

    setLoading(true);
    try {
      await DB.addStockTransaction({
        productId: target.productId.value,
        storeId: target.storeId.value,
        targetStoreId: moveType === 'TRANSFER' ? target.targetStoreId.value : undefined,
        type: moveType,
        quantity: parseFloat(target.quantity.value),
        date: new Date().toISOString().split('T')[0],
        note: target.note.value
      });
      setShowMoveModal(false);
      alert("تمت العملية بنجاح");
      loadData();
    } catch (err) {
      alert("حدث خطأ أثناء تنفيذ العملية");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
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
            حركات المخزن
          </button>
        </div>

        <div className="flex gap-2">
           <button 
             onClick={() => setShowAddProductModal(true)}
             className="bg-primary-100 text-primary-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary-200 transition-all border border-primary-200"
           >
             <Plus size={16} /> صنف جديد
           </button>
           <button 
             onClick={() => { setMoveType('TRANSFER'); setShowMoveModal(true); }}
             className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-sm"
           >
             <ArrowRightLeft size={16} /> تحويل داخلي
           </button>
           <button 
             onClick={() => { setMoveType('ADD'); setShowMoveModal(true); }}
             className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-700 shadow-sm"
           >
             <TrendingUp size={16} /> توريد
           </button>
           <button 
             onClick={() => { setMoveType('DEDUCT'); setShowMoveModal(true); }}
             className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-red-700 shadow-sm"
           >
             <TrendingDown size={16} /> صرف
           </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-primary-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 text-primary-600 rounded-xl"><Package /></div>
            <div>
              <div className="text-sm text-gray-500">إجمالي الأصناف</div>
              <div className="text-2xl font-bold">{products.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-yellow-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl"><ClipboardList /></div>
            <div>
              <div className="text-sm text-gray-500">تحت حد الطلب</div>
              <div className="text-2xl font-bold">0</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-green-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl"><TrendingUp /></div>
            <div>
              <div className="text-sm text-gray-500">حركات اليوم</div>
              <div className="text-2xl font-bold">0</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        {activeSubTab === 'stock' ? (
          <>
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/30">
              <h3 className="font-bold text-lg">الأرصدة الحالية في كافة المخازن</h3>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-600" size={40} /></div>
              ) : (
                <table className="w-full text-right">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-4 font-bold text-gray-600 uppercase text-xs">اسم الصنف</th>
                      <th className="px-6 py-4 font-bold text-gray-600 uppercase text-xs">الوحدة</th>
                      <th className="px-6 py-4 font-bold text-gray-600 uppercase text-xs">الرصيد المتاح</th>
                      <th className="px-6 py-4 font-bold text-gray-600 uppercase text-xs">سعر الوحدة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-primary-50/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-800">{p.name}</td>
                        <td className="px-6 py-4 text-gray-600">{p.unit}</td>
                        <td className="px-6 py-4 font-bold text-primary-600">0</td>
                        <td className="px-6 py-4 text-gray-600 font-mono">{p.price} ج.م</td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-20 text-center text-gray-400 italic">لا توجد أصناف مسجلة حالياً</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="p-20 text-center text-gray-400 italic">سجل حركات المخازن سيظهر هنا بمجرد إجراء عمليات توريد أو صرف</div>
        )}
      </div>

      {/* Modal: Add New Product */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95">
            <div className="p-6 bg-primary-600 text-white flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold flex items-center gap-2"><Plus size={22} /> إضافة صنف جديد</h3>
              <button onClick={() => setShowAddProductModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleAddNewProduct} className="p-8 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">اسم الصنف</label>
                <input name="name" required className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">الوحدة</label>
                  <input name="unit" required placeholder="قطعة/كرتونة" className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">حد الطلب</label>
                  <input name="minStock" type="number" defaultValue={10} required className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">سعر الوحدة</label>
                <input name="price" type="number" step="0.01" required className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setShowAddProductModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">إلغاء</button>
                <button type="submit" disabled={loading} className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg">
                  {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'حفظ الصنف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Inventory Move (Tawreed/Sarf/Transfer) */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl animate-in zoom-in-95">
            <div className={`p-6 text-white flex justify-between items-center rounded-t-2xl ${moveType === 'ADD' ? 'bg-green-600' : moveType === 'DEDUCT' ? 'bg-red-600' : 'bg-indigo-600'}`}>
              <h3 className="text-xl font-bold flex items-center gap-2">
                {moveType === 'ADD' ? <TrendingUp size={22} /> : moveType === 'DEDUCT' ? <TrendingDown size={22} /> : <ArrowRightLeft size={22} />}
                {moveType === 'ADD' ? 'توريد كمية للمخزن' : moveType === 'DEDUCT' ? 'صرف كمية من المخزن' : 'تحويل مخزني داخلي'}
              </h3>
              <button onClick={() => setShowMoveModal(false)}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleStockAction} className="p-8 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">الصنف</label>
                <select name="productId" required className="w-full border rounded-xl p-3 bg-gray-50 outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">اختر الصنف...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">
                    {moveType === 'TRANSFER' ? 'من مخزن' : 'المخزن'}
                  </label>
                  <select name="storeId" required className="w-full border rounded-xl p-3 bg-gray-50 outline-none">
                    <option value="">اختر المخزن...</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name} {s.isMain ? '(رئيسي)' : ''}</option>)}
                  </select>
                </div>
                
                {moveType === 'TRANSFER' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">إلى مخزن</label>
                    <select name="targetStoreId" required className="w-full border rounded-xl p-3 bg-gray-50 outline-none">
                      <option value="">اختر المخزن...</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name} {s.isMain ? '(رئيسي)' : ''}</option>)}
                    </select>
                  </div>
                )}

                <div className={moveType === 'TRANSFER' ? 'col-span-2' : ''}>
                  <label className="block text-sm font-bold text-gray-600 mb-1">الكمية</label>
                  <input name="quantity" type="number" step="0.01" required className="w-full border rounded-xl p-3 bg-gray-50 outline-none" placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">ملاحظات</label>
                <textarea name="note" className="w-full border rounded-xl p-3 bg-gray-50 outline-none h-20" placeholder="اكتب ملاحظاتك هنا..."></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowMoveModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">إلغاء</button>
                <button type="submit" disabled={loading} className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg ${moveType === 'ADD' ? 'bg-green-600' : moveType === 'DEDUCT' ? 'bg-red-600' : 'bg-indigo-600'}`}>
                  {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'تأكيد العملية'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryModule;
