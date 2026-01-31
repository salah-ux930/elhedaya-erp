import React, { useState } from 'react';
import { AR } from '../constants';
import { DB } from '../store';
import { Settings, Package, Store, CreditCard, Tag, Plus, Trash2, Edit } from 'lucide-react';

const SetupModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'services' | 'stores' | 'products' | 'funding'>('services');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 p-1 bg-gray-200/50 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('services')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'services' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Tag size={18} /> {AR.services}
        </button>
        <button 
          onClick={() => setActiveTab('stores')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'stores' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Store size={18} /> {AR.stores}
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'products' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Package size={18} /> {AR.products}
        </button>
        <button 
          onClick={() => setActiveTab('funding')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'funding' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <CreditCard size={18} /> {AR.funding}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="font-bold text-lg">
            {activeTab === 'services' && 'إدارة الخدمات والأسعار'}
            {activeTab === 'stores' && 'إدارة مخازن الوحدة'}
            {activeTab === 'products' && 'دليل الأصناف'}
            {activeTab === 'funding' && 'جهات التعاقد (التمويل)'}
          </h3>
          <button className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-primary-700">
            <Plus size={16} /> {AR.add}
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'services' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DB.services.map(s => (
                <div key={s.id} className="p-4 border rounded-xl flex justify-between items-center group hover:border-primary-300 transition-colors">
                  <div>
                    <div className="font-bold text-gray-800">{s.name}</div>
                    <div className="text-sm text-primary-600 font-bold">{s.price === 0 ? AR.free : `${s.price.toLocaleString()} ج.م`}</div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-gray-400 hover:text-primary-600"><Edit size={16} /></button>
                    <button className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'stores' && (
            <div className="space-y-4">
              {DB.stores.map(st => (
                <div key={st.id} className="p-5 border rounded-xl flex justify-between items-center bg-gray-50/50">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${st.isMain ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'}`}>
                      <Store size={20} />
                    </div>
                    <div>
                      <div className="font-bold">{st.name}</div>
                      <div className="text-xs text-gray-400">{st.isMain ? 'المخزن الرئيسي (المركز)' : 'مخزن فرعي'}</div>
                    </div>
                  </div>
                  <button className="px-4 py-2 text-sm font-bold text-gray-600 border rounded-lg hover:bg-white">تعديل الإعدادات</button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'products' && (
            <table className="w-full text-right">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-bold text-gray-600">اسم الصنف</th>
                  <th className="px-4 py-3 font-bold text-gray-600">الوحدة</th>
                  <th className="px-4 py-3 font-bold text-gray-600">حد الطلب</th>
                  <th className="px-4 py-3 font-bold text-gray-600">السعر الافتراضي</th>
                  <th className="px-4 py-3 font-bold text-gray-600">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {DB.products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.unit}</td>
                    <td className="px-4 py-3 text-red-600 font-bold">{p.minStock}</td>
                    <td className="px-4 py-3">{p.price} ج.م</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button className="text-primary-600"><Edit size={16} /></button>
                      <button className="text-red-500"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'funding' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DB.funding.map(f => (
                <div key={f.id} className="p-4 border rounded-xl flex items-center justify-between hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold">
                      {f.name[0]}
                    </div>
                    <span className="font-bold">{f.name}</span>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-primary-900 text-white p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h4 className="text-xl font-bold mb-2">نسخة احتياطية وأرشفة</h4>
          <p className="text-primary-200 text-sm">يوصى بتحميل نسخة احتياطية من جميع البيانات دورياً للحفاظ على أمان السجلات.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all flex items-center gap-2">
            تحميل نسخة (Excel)
          </button>
          <button className="px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold transition-all shadow-lg">
            {AR.archive} الآن
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupModule;