import React, { useState } from 'react';
import { AR } from '../constants';
import { DB } from '../store';
import { Wallet, Landmark, ArrowUpCircle, ArrowDownCircle, Search, Calendar, Plus } from 'lucide-react';

const FinanceModule: React.FC = () => {
  const [activeAccount, setActiveAccount] = useState<string>('all');
  const [showTxForm, setShowTxForm] = useState(false);
  const [txType, setTxType] = useState<'INCOME' | 'EXPENSE'>('INCOME');

  const filteredTransactions = activeAccount === 'all' 
    ? DB.transactions 
    : DB.transactions.filter(t => t.accountId === activeAccount);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    const amount = parseFloat(target.amount.value);
    const accountId = target.accountId.value;
    
    DB.addFinanceTx({
      id: Math.random().toString(36).substr(2, 9),
      accountId,
      amount,
      type: txType,
      date: new Date().toISOString().split('T')[0],
      category: target.category.value,
      note: target.note.value
    });
    setShowTxForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {DB.accounts.map(acc => (
          <div 
            key={acc.id} 
            onClick={() => setActiveAccount(acc.id)}
            className={`p-6 rounded-2xl shadow-sm cursor-pointer transition-all border-2 ${
              activeAccount === acc.id ? 'border-primary-500 bg-primary-50' : 'border-transparent bg-white hover:border-gray-200'
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <div className={`p-2 rounded-lg ${acc.type === 'CASH' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                {acc.type === 'CASH' ? <Wallet size={20} /> : <Landmark size={20} />}
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase">{acc.type === 'CASH' ? AR.mainCash : 'حساب بنكي'}</span>
            </div>
            <div className="text-sm text-gray-500 mb-1">{acc.name}</div>
            <div className="text-2xl font-bold">{acc.balance.toLocaleString()} ج.م</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-lg">سجل المعاملات المالية</h3>
            {activeAccount !== 'all' && (
              <button 
                onClick={() => setActiveAccount('all')}
                className="text-xs text-primary-600 font-bold hover:underline"
              >
                إظهار الكل
              </button>
            )}
          </div>
          <div className="flex gap-2">
             <button 
               onClick={() => { setTxType('INCOME'); setShowTxForm(true); }}
               className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-700"
             >
               <ArrowUpCircle size={16} /> تسجيل إيراد
             </button>
             <button 
               onClick={() => { setTxType('EXPENSE'); setShowTxForm(true); }}
               className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-red-700"
             >
               <ArrowDownCircle size={16} /> تسجيل مصروف
             </button>
          </div>
        </div>

        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-600">التاريخ</th>
              <th className="px-6 py-4 font-bold text-gray-600">الحساب</th>
              <th className="px-6 py-4 font-bold text-gray-600">التصنيف</th>
              <th className="px-6 py-4 font-bold text-gray-600">المبلغ</th>
              <th className="px-6 py-4 font-bold text-gray-600">ملاحظات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTransactions.length > 0 ? filteredTransactions.map(tx => (
              <tr key={tx.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-500 text-sm font-mono">{tx.date}</td>
                <td className="px-6 py-4 font-bold">{DB.accounts.find(a => a.id === tx.accountId)?.name}</td>
                <td className="px-6 py-4 text-xs font-bold uppercase">{tx.category}</td>
                <td className={`px-6 py-4 font-bold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'INCOME' ? '+' : '-'}{tx.amount.toLocaleString()} ج.م
                </td>
                <td className="px-6 py-4 text-gray-400 text-sm">{tx.note}</td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="py-20 text-center text-gray-400 italic">لا توجد حركات مالية مسجلة</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showTxForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-6 text-gray-800">
              {txType === 'INCOME' ? 'تسجيل إيراد جديد' : 'تسجيل مصروف جديد'}
            </h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">الحساب</label>
                <select name="accountId" required className="w-full border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none">
                  {DB.accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">المبلغ</label>
                <input name="amount" type="number" step="0.01" required className="w-full border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">التصنيف</label>
                <input name="category" placeholder="مثلاً: أدوات طبية، صيانة، تحصيل مرضى" required className="w-full border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">ملاحظات</label>
                <textarea name="note" className="w-full border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none h-24"></textarea>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowTxForm(false)} className="flex-1 py-3 bg-gray-100 rounded-lg font-bold text-gray-600">إلغاء</button>
                <button type="submit" className={`flex-1 py-3 text-white rounded-lg font-bold shadow-md ${txType === 'INCOME' ? 'bg-green-600' : 'bg-red-600'}`}>حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceModule;