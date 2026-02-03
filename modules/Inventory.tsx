
import React, { useState, useEffect } from 'react';
import { AR } from '../constants.ts';
import { DB } from '../store.ts';
import { Product } from '../types.ts';
import { Package, ArrowLeftRight, TrendingUp, TrendingDown, ClipboardList, Plus, Search, ArrowRightLeft, Loader2, X, Check } from 'lucide-react';

const InventoryModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'transfers' | 'stores'>('stock');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveType, setMoveType] = useState<'ADD' | 'DEDUCT' | 'TRANSFER'>('ADD');
  
  // Search & Add logic
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [showAddProductInline, setShowAddProductInline] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const filteredProducts = DB.products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleQuickAddProduct = async () => {
    if (!productSearch.trim()) return;
    setIsAdding(true);
    try {
      const newProd = await DB.addProduct({
        name: productSearch,
        unit: 'قطعة',
        minStock: 10,
        price: 0
      });
      // Refresh local products (simulated here since we don't have a global state listener)
      await DB.getProducts();
      setSelectedProductId(newProd.id);
      setShowAddProductInline(false);
    } catch (err) {
      alert("خطأ أثناء إضافة الصنف");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
             onClick={() => { setMoveType('ADD'); setShowMoveModal(true); setProductSearch(''); }}
             className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-700 shadow-sm"
           >
             <TrendingUp size={16} /> توريد
           </button>
           <button 
             onClick={() => { setMoveType('DEDUCT'); setShowMoveModal(true); setProductSearch(''); }}
             className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-red-700 shadow-sm"
           >
             <TrendingDown size={16} /> صرف
           </button>
           <button 
             onClick={() => { setMoveType('TRANSFER'); setShowMoveModal(true); setProductSearch(''); }}
             className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary-700 shadow-sm"
           >
             <ArrowRightLeft size={16} /> تحويل
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-primary-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 text-primary-600 rounded-xl"><Package /></div>
            <div>
              <div className="text-sm text-gray-500">إجمالي الأصناف</div>
              <div className="text-2xl font-bold">{DB.products.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-yellow-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl"><TrendingDown /></div>
            <div>
              <div className="text-sm text-gray-500">أصناف تحت حد الطلب</div>
              <div className="text-2xl font-bold">2</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-green-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl"><ClipboardList /></div>
            <div>
              <div className="text-sm text-gray-500">حركات اليوم</div>
              <div className="text-2xl font-bold">12</div>
            </div>
          </div>
        </div>
      </div>

      {activeSubTab === 'stock' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="font-bold text-lg">قائمة الأرصدة الحالية</h3>
            <button className="text-primary-600 text-sm font-bold border-b border-primary-600 pb-0.5">طباعة جرد عام</button>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-right">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-600">اسم الصنف</th>
                  <th className="px-6 py-4 font-bold text-gray-600">الوحدة</th>
                  <th className="px-6 py-4 font-bold text-gray-600">الرصيد الكلي</th>
                  <th className="px-6 py-4 font-bold text-gray-600">سعر الوحدة</th>
                  <th className="px-6 py-4 font-bold text-gray-600">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {DB.products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-gray-800">{p.name}</td>
                    <td className="px-6 py-4 text-gray-600">{p.unit}</td>
                    <td className="px-6 py-4 font-bold text-primary-600">1,240</td>
                    <td className="px-6 py-4 text-gray-600">{p.price} ج.م</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">متوفر</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-600">التاريخ</th>
                <th className="px-6 py-4 font-bold text-gray-600">النوع</th>
                <th className="px-6 py-4 font-bold text-gray-600">الصنف</th>
                <th className="px-6 py-4 font-bold text-gray-600">المخزن</th>
                <th className="px-6 py-4 font-bold text-gray-600">الكمية</th>
                <th className="px-6 py-4 font-bold text-gray-600">البيان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[1, 2, 3].map(i => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-500 text-sm">2024-05-15</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${i % 2 === 0 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {i % 2 === 0 ? 'تحويل' : 'صرف'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold">فلتر 1.4 ديالي</td>
                  <td className="px-6 py-4 text-gray-600">المخزن الرئيسي</td>
                  <td className="px-6 py-4 font-bold">50</td>
                  <td className="px-6 py-4 text-gray-400 text-xs">صرف لجلسات الدور الأول</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showMoveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className={`p-6 text-white flex justify-between items-center shrink-0 ${moveType === 'ADD' ? 'bg-green-600' : moveType === 'DEDUCT' ? 'bg-red-600' : 'bg-primary-600'}`}>
              <h3 className="text-xl font-bold flex items-center gap-2">
                {moveType === 'ADD' ? <TrendingUp size={24} /> : moveType === 'DEDUCT' ? <TrendingDown size={24} /> : <ArrowRightLeft size={24} />}
                {moveType === 'ADD' ? 'توريد أصناف للمخزن' : moveType === 'DEDUCT' ? 'صرف أصناف من المخزن' : 'تحويل بين المخازن'}
              </h3>
              <button onClick={() => setShowMoveModal(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">المخزن</label>
                  <select className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none">
                    {DB.stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {moveType === 'TRANSFER' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">المخزن المحول إليه</label>
                    <select className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none">
                      {DB.stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-bold text-gray-600 mb-2">البحث عن الصنف</label>
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="ابحث بالاسم..." 
                        className="w-full pr-10 pl-4 py-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setSelectedProductId('');
                        }}
                      />
                    </div>
                    
                    {/* Search Results Dropdown */}
                    {productSearch && !selectedProductId && (
                      <div className="absolute z-10 w-full mt-2 bg-white border rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                        {filteredProducts.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedProductId(p.id);
                              setProductSearch(p.name);
                            }}
                            className="w-full text-right px-4 py-3 hover:bg-primary-50 border-b last:border-0 flex items-center justify-between"
                          >
                            <span className="font-bold text-gray-700">{p.name}</span>
                            <span className="text-xs text-gray-400">{p.unit}</span>
                          </button>
                        ))}
                        {filteredProducts.length === 0 && (
                          <div className="p-4 text-center">
                            <p className="text-sm text-gray-500 mb-3 italic">الصنف غير موجود بالسيستم</p>
                            <button 
                              type="button"
                              onClick={handleQuickAddProduct}
                              disabled={isAdding}
                              className="w-full py-2 bg-primary-100 text-primary-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary-200"
                            >
                              {isAdding ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                              إضافة صنف جديد: {productSearch}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {selectedProductId && (
                      <div className="mt-2 flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded-lg border border-green-100">
                        <Check size={16} />
                        <span className="text-xs font-bold">تم اختيار الصنف بنجاح</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-2">الكمية</label>
                      <input type="number" required placeholder="0" className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-2">ملاحظات / رقم الإذن</label>
                      <input type="text" placeholder="اختياري" className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t bg-gray-50 flex gap-3 shrink-0">
              <button type="button" onClick={() => setShowMoveModal(false)} className="flex-1 py-4 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">إلغاء</button>
              <button 
                type="submit" 
                disabled={!selectedProductId}
                className={`flex-1 py-4 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${moveType === 'ADD' ? 'bg-green-600 hover:bg-green-700' : moveType === 'DEDUCT' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'}`}
              >
                حفظ الحركة
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #0ea5e9;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default InventoryModule;
