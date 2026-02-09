
import React, { useState, useEffect } from 'react';
import { AR } from '../constants';
import { DB } from '../store';
import { FinancialAccount, Transaction } from '../types';
import { Wallet, Landmark, ArrowUpCircle, ArrowDownCircle, Loader2, Plus, X, ShieldCheck } from 'lucide-react';

const FinanceModule: React.FC = () => {
  const [activeAccount, setActiveAccount] = useState<string>('all');
  const [showTxForm, setShowTxForm] = useState(false);
  const [txType, setTxType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current user permissions
  const currentUser = JSON.parse(localStorage.getItem('dialysis_user') || '{}');
  const userPerms = currentUser.permissions || [];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [acc, tx] = await Promise.all([DB.getAccounts(), DB.getTransactions()]);
      setAccounts(acc || []);
      setTransactions(tx || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const visibleAccounts = accounts.filter(acc => 
    userPerms.includes('SYSTEM_SETUP') || 
    userPerms.includes('MANAGE_FINANCE') || 
    userPerms.includes(`ACCOUNT_VIEW:${acc.id}`) || 
    userPerms.includes(`ACCOUNT_MANAGE:${acc.id}`)
  );

  const manageableAccounts = accounts.filter(acc => 
    userPerms.includes('SYSTEM_SETUP') || 
    userPerms.includes('MANAGE_FINANCE') || 
    userPerms.includes(`ACCOUNT_MANAGE:${acc.id}`)
  );

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    const amount = parseFloat(target.amount.value);
    const accountId = target.accountId.value;
    
    // تأمين الصلاحيات برمجياً
    const canManage = userPerms.includes('SYSTEM_SETUP') || 
                      userPerms.includes('MANAGE_FINANCE') || 
                      userPerms.includes(`ACCOUNT_MANAGE:${accountId}`);
    
    if (!canManage) return alert("عذراً، لا تملك صلاحية الإدارة (قبض/صرف) على هذا الحساب.");

    try {
      await DB.addFinanceTx({
        account_id: accountId,
        amount,
        type: txType,
        date: new Date().toISOString().split('T')[0],
        category: target.category.value,
        note: target.note.value
      });
      setShowTxForm(false);
      await loadData();
    } catch (err) {
      alert("خطأ في حفظ المعاملة");
    }
  };

  const filteredTransactions = activeAccount === 'all' 
    ? transactions.filter(t => visibleAccounts.some(acc => acc.id === t.account_id))
    : transactions.filter(t => t.account_id === activeAccount);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-600" size={40} /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {visibleAccounts.map(acc => (
          <div 
            key={acc.id} 
            onClick={() => setActiveAccount(acc.id)}
            className={`p-6 rounded-2xl shadow-sm cursor-pointer transition-all border-2 relative overflow-hidden ${
              activeAccount === acc.id ? 'border-primary-500 bg-primary-50' : 'border-transparent bg-white hover:border-gray-200'
            }`}
          >
            {manageableAccounts.find(ma => ma.id === acc.id) && (
                <div className="absolute top-0 left-0 bg-primary-600 text-white p-1 rounded-br-lg" title="لديك صلاحية إدارة">
                    <ShieldCheck size={12} />
                </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <div className={`p-2 rounded-lg ${acc.type === 'CASH' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                {acc.type === 'CASH' ? <Wallet size={20} /> : <Landmark size={20} />}
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase">{acc.type === 'CASH' ? 'خزينة نقدية' : 'حساب بنكي'}</span>
            </div>
            <div className="text-sm text-gray-500 mb-1">{acc.name}</div>
            <div className="text-2xl font-bold">{Number(acc.balance).toLocaleString()} ج.م</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-lg">سجل المعاملات المصرح لك بمشاهدتها</h3>
          </div>
          <div className="flex gap-2">
             <button 
               disabled={manageableAccounts.length === 0}
               onClick={() => { setTxType('INCOME'); setShowTxForm(true); }}
               className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
             >
               <ArrowUpCircle size={16} /> تسجيل إيراد
             </button>
             <button 
               disabled={manageableAccounts.length === 0}
               onClick={() => { setTxType('EXPENSE'); setShowTxForm(true); }}
               className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-red-700 disabled:opacity-50"
             >
               <ArrowDownCircle size={16} /> تسجيل مصروف
             </button>
          </div>
        </div>

        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-600 text-xs">التاريخ</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-xs">الحساب</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-xs">المبلغ</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-xs">التصنيف</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-xs">ملاحظات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTransactions.map(tx => (
              <tr key={tx.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 text-gray-500 text-xs font-mono">{tx.date}</td>
                <td className="px-6 py-4 font-bold text-sm">{accounts.find(a => a.id === tx.account_id)?.name}</td>
                <td className={`px-6 py-4 font-black ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'INCOME' ? '+' : '-'}{Number(tx.amount).toLocaleString()} ج.م
                </td>
                <td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-500">{tx.category}</span></td>
                <td className="px-6 py-4 text-gray-400 text-xs">{tx.note}</td>
              </tr>
            ))}
            {filteredTransactions.length === 0 && (
                <tr><td colSpan={5} className="py-20 text-center text-gray-300 italic">لا توجد معاملات مسجلة</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showTxForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-6 text-gray-800">
              {txType === 'INCOME' ? 'تسجيل إيراد' : 'تسجيل مصروف'}
            </h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">الخزينة (المصرح لك بإدارتها)</label>
                <select name="accountId" required className="w-full border rounded-lg p-3 bg-gray-50 outline-none font-bold">
                  {manageableAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">المبلغ</label>
                <input name="amount" type="number" step="0.01" required className="w-full border rounded-lg p-3 bg-gray-50 outline-none font-black text-lg" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">التصنيف</label>
                <input name="category" placeholder="صيانة، إيجار، توريد أدوية..." required className="w-full border rounded-lg p-3 bg-gray-50 outline-none font-bold" />
              </div>
              <textarea name="note" placeholder="ملاحظات إضافية..." className="w-full border rounded-lg p-3 bg-gray-50 h-24 outline-none"></textarea>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowTxForm(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">إلغاء</button>
                <button type="submit" className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg ${txType === 'INCOME' ? 'bg-green-600' : 'bg-red-600'}`}>حفظ المعاملة</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceModule;
