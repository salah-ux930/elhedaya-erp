
import React, { useState, useEffect } from 'react';
import { AR } from '../constants';
import { DB } from '../store';
import { FinancialAccount, Transaction } from '../types';
import { Wallet, Landmark, ArrowUpCircle, ArrowDownCircle, Loader2, Plus, X, ShieldCheck, ShieldX } from 'lucide-react';

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

  if (visibleAccounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[3rem] border-2 border-dashed border-red-100 animate-in fade-in">
        <ShieldX size={80} className="text-red-200 mb-6" />
        <h3 className="text-2xl font-black text-gray-800">لا تملك صلاحية الوصول للخزائن</h3>
        <p className="text-gray-400 mt-2 font-bold">يرجى مراجعة الإدارة لمنحك صلاحية الوصول لأحد حسابات الخزينة أو البنك.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {visibleAccounts.map(acc => (
          <div 
            key={acc.id} 
            onClick={() => setActiveAccount(acc.id)}
            className={`p-8 rounded-[2rem] shadow-sm cursor-pointer transition-all border-2 relative overflow-hidden group ${
              activeAccount === acc.id ? 'border-primary-500 bg-primary-50' : 'border-transparent bg-white hover:border-gray-200'
            }`}
          >
            {manageableAccounts.find(ma => ma.id === acc.id) && (
                <div className="absolute top-0 left-0 bg-primary-600 text-white px-3 py-1 rounded-br-2xl flex items-center gap-1 shadow-lg" title="لديك صلاحية إدارة">
                    <ShieldCheck size={12} /> <span className="text-[10px] font-black uppercase tracking-widest">إدارة</span>
                </div>
            )}
            <div className="flex justify-between items-center mb-6">
              <div className={`p-4 rounded-2xl shadow-sm ${acc.type === 'CASH' ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'}`}>
                {acc.type === 'CASH' ? <Wallet size={24} /> : <Landmark size={24} />}
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{acc.type === 'CASH' ? 'خزينة نقدية' : 'حساب بنكي'}</span>
            </div>
            <div className="text-sm font-black text-gray-500 mb-1">{acc.name}</div>
            <div className="text-3xl font-black text-gray-800 tracking-tighter">{Number(acc.balance).toLocaleString()} <span className="text-xs text-gray-400 font-bold mr-1">ج.م</span></div>
            
            <div className={`absolute bottom-0 right-0 h-1 transition-all ${activeAccount === acc.id ? 'bg-primary-500 w-full' : 'bg-transparent w-0'}`}></div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="font-black text-xl text-gray-800">سجل المعاملات المالية</h3>
            <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">متابعة كافة حركات الإيداع والصرف</p>
          </div>
          <div className="flex gap-2">
             <button 
               disabled={manageableAccounts.length === 0}
               onClick={() => { setTxType('INCOME'); setShowTxForm(true); }}
               className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 disabled:opacity-50 transition-all active:scale-95"
             >
               <ArrowUpCircle size={18} /> تسجيل إيراد
             </button>
             <button 
               disabled={manageableAccounts.length === 0}
               onClick={() => { setTxType('EXPENSE'); setShowTxForm(true); }}
               className="bg-rose-600 text-white px-6 py-3 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-rose-700 shadow-xl shadow-rose-600/20 disabled:opacity-50 transition-all active:scale-95"
             >
               <ArrowDownCircle size={18} /> تسجيل مصروف
             </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">التاريخ</th>
                <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">الحساب</th>
                <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">المبلغ</th>
                <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">التصنيف</th>
                <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-primary-50/20 transition-colors group">
                  <td className="px-8 py-5 text-gray-500 text-xs font-mono">{tx.date}</td>
                  <td className="px-8 py-5 font-black text-sm text-gray-800">{accounts.find(a => a.id === tx.account_id)?.name}</td>
                  <td className={`px-8 py-5 font-black text-lg ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{Number(tx.amount).toLocaleString()} <span className="text-[10px] mr-1">ج.م</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {tx.category}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-gray-400 text-xs font-bold">{tx.note || '---'}</td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                  <tr><td colSpan={5} className="py-20 text-center text-gray-300 italic font-bold">لا توجد معاملات مالية مسجلة لهذه الفئة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showTxForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-gray-800">
                {txType === 'INCOME' ? 'تسجيل إيراد مالي' : 'تسجيل مصروف مالي'}
              </h3>
              <button onClick={() => setShowTxForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleAddTransaction} className="space-y-6">
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 mr-2 uppercase tracking-widest">الخزينة المستهدفة</label>
                <select name="accountId" required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 outline-none font-black text-gray-700 focus:border-primary-500 transition-all">
                  {manageableAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 mr-2 uppercase tracking-widest">مبلغ العملية</label>
                <input name="amount" type="number" step="0.01" required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 outline-none font-black text-2xl text-primary-600 focus:border-primary-500 transition-all" placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 mr-2 uppercase tracking-widest">تصنيف المعاملة</label>
                <input name="category" placeholder="صيانة، إيجار، توريد أدوية..." required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 outline-none font-bold focus:border-primary-500 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 mr-2 uppercase tracking-widest">ملاحظات توضيحية</label>
                <textarea name="note" placeholder="ملاحظات إضافية..." className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 h-28 outline-none resize-none focus:border-primary-500 transition-all font-bold"></textarea>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowTxForm(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-black text-gray-500">إلغاء</button>
                <button type="submit" className={`flex-1 py-4 text-white rounded-2xl font-black shadow-xl shadow-gray-200 ${txType === 'INCOME' ? 'bg-emerald-600' : 'bg-rose-600'}`}>حفظ المعاملة</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceModule;
