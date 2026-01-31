import React, { useState } from 'react';
import { AR } from '../constants';
import { DB } from '../store';
import { Package, ArrowLeftRight, TrendingUp, TrendingDown, ClipboardList, Plus, FileText, ArrowRightLeft } from 'lucide-react';

const InventoryModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'transfers' | 'stores'>('stock');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveType, setMoveType] = useState<'ADD' | 'DEDUCT' | 'TRANSFER'>('ADD');

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
           <button 
             onClick={() => { setMoveType('TRANSFER'); setShowMoveModal(true); }}
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
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-8 animate-in slide-in-from-bottom-4">
            <h3 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              {moveType === 'ADD' ? <TrendingUp className="text-green-600" /> : moveType === 'DEDUCT' ? <TrendingDown className="text-red-600" /> : <ArrowRightLeft className="text-primary-600" />}
              {moveType === 'ADD' ? 'توريد أصناف للمخزن' : moveType === 'DEDUCT' ? 'صرف أصناف من المخزن' : 'تحويل بين المخازن'}
            </h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">المخزن</label>
                <select className="w-full border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none">
                  {DB.stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {moveType === 'TRANSFER' && (
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">المخزن المحول إليه</label>
                  <select className="w-full border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none">
                    {DB.stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-600 mb-1">الصنف</label>
                  <select className="w-full border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none">
                    {DB.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">الكمية</label>
                  <input type="number" required className="w-full border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">ملاحظات / رقم الإذن</label>
                <textarea className="w-full border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none h-20"></textarea>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowMoveModal(false)} className="flex-1 py-3 bg-gray-100 rounded-lg font-bold text-gray-600">إلغاء</button>
                <button type="submit" className={`flex-1 py-3 text-white rounded-lg font-bold shadow-md ${moveType === 'ADD' ? 'bg-green-600' : moveType === 'DEDUCT' ? 'bg-red-600' : 'bg-primary-600'}`}>حفظ الحركة</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryModule;