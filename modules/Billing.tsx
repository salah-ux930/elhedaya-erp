import React, { useState } from 'react';
import { AR, ROOMS } from '../constants';
import { DB } from '../store';
import { Invoice } from '../types';
import { FileDown, Filter, Printer, MoreVertical, CheckCircle, Clock, Plus, Search } from 'lucide-react';

const BillingModule: React.FC = () => {
  const [filterRoom, setFilterRoom] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredInvoices = [
    { id: '1', patientName: 'أحمد محمد علي', date: '2024-05-15', amount: 500, status: 'PAID', room: 'A1' },
    { id: '2', patientName: 'سارة محمود خليل', date: '2024-05-14', amount: 1200, status: 'DEFERRED', room: 'B2' },
    { id: '3', patientName: 'إبراهيم حسن', date: '2024-05-14', amount: 0, status: 'FREE', room: 'A1' },
  ].filter(inv => 
    (filterRoom === '' || inv.room === filterRoom) &&
    (filterStatus === '' || inv.status === filterStatus) &&
    (searchTerm === '' || inv.patientName.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="بحث عن فاتورة مريض..."
            className="w-full pr-10 pl-4 py-3 border rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            className="flex-1 md:w-40 py-3 px-4 border rounded-xl bg-white shadow-sm outline-none"
            onChange={(e) => setFilterRoom(e.target.value)}
          >
            <option value="">كل الغرف</option>
            {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select 
            className="flex-1 md:w-40 py-3 px-4 border rounded-xl bg-white shadow-sm outline-none"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">كل الحالات</option>
            <option value="PAID">{AR.paid}</option>
            <option value="DEFERRED">{AR.deferred}</option>
            <option value="FREE">{AR.free}</option>
          </select>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="w-full md:w-auto bg-primary-600 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-700 transition-all font-bold shadow-md"
        >
          <Plus size={20} /> إنشاء فاتورة
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 flex justify-between items-center border-b no-print">
          <span className="text-sm font-bold text-gray-500">تم العثور على {filteredInvoices.length} فاتورة</span>
          <button className="text-primary-600 text-sm font-bold flex items-center gap-1 hover:underline">
            <FileDown size={16} /> {AR.export} Excel
          </button>
        </div>
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-600">رقم الفاتورة</th>
              <th className="px-6 py-4 font-bold text-gray-600">{AR.name}</th>
              <th className="px-6 py-4 font-bold text-gray-600">{AR.date}</th>
              <th className="px-6 py-4 font-bold text-gray-600">{AR.room}</th>
              <th className="px-6 py-4 font-bold text-gray-600">{AR.totalAmount}</th>
              <th className="px-6 py-4 font-bold text-gray-600">{AR.status}</th>
              <th className="px-6 py-4 font-bold text-gray-600 no-print">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredInvoices.map(inv => (
              <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-mono text-primary-600 font-bold">#INV-24-{inv.id.padStart(4, '0')}</td>
                <td className="px-6 py-4 font-bold text-gray-800">{inv.patientName}</td>
                <td className="px-6 py-4 text-gray-500 text-sm">{inv.date}</td>
                <td className="px-6 py-4"><span className="text-gray-600 font-bold">{inv.room}</span></td>
                <td className="px-6 py-4 font-bold">{inv.amount === 0 ? AR.free : `${inv.amount.toLocaleString()} ج.م`}</td>
                <td className="px-6 py-4">
                  {inv.status === 'PAID' ? (
                    <span className="flex items-center gap-1 w-fit px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                      <CheckCircle size={12} /> {AR.paid}
                    </span>
                  ) : inv.status === 'DEFERRED' ? (
                    <span className="flex items-center gap-1 w-fit px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold border border-yellow-200">
                      <Clock size={12} /> {AR.deferred}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 w-fit px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold border border-blue-200">
                      {AR.free}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 no-print">
                  <div className="flex gap-2">
                    <button className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all" title={AR.print}>
                      <Printer size={18} />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-800">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 bg-primary-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">إنشاء فاتورة جديدة</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-white hover:opacity-75">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <div className="p-8">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">اختيار المريض</label>
                    <select className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none">
                      {DB.patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">الغرفة</label>
                    <select className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none">
                      {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-gray-50 p-4 font-bold border-b text-sm">بنود الفاتورة</div>
                  <div className="p-4 space-y-4">
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-400 mb-1">الخدمة</label>
                        <select className="w-full border rounded-lg p-2 bg-white outline-none">
                          {DB.services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.price} ج.م)</option>)}
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="block text-xs font-bold text-gray-400 mb-1">الكمية</label>
                        <input type="number" defaultValue={1} className="w-full border rounded-lg p-2 bg-white outline-none" />
                      </div>
                      <button type="button" className="p-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100">
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-primary-50 rounded-xl">
                  <div className="text-primary-900 font-bold">الإجمالي المستحق</div>
                  <div className="text-2xl font-bold text-primary-600">500.00 ج.م</div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                    إلغاء
                  </button>
                  <button type="button" className="flex-1 py-4 bg-primary-600 text-white rounded-xl font-bold shadow-lg hover:bg-primary-700 transition-colors">
                    حفظ الفاتورة
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingModule;