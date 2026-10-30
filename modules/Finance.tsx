import React, { useState, useEffect } from 'react';
import { AR } from '../constants';
import { DB } from '../store';
import { FinancialAccount, Transaction } from '../types';
import {
  Wallet,
  Landmark,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  X,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  Lock,
  Eye,
  Info
} from 'lucide-react';
import {
  analyzeUserAccountPermissions,
  canManageAccount,
  getAccountDenialReason,
  getCurrentStoredUser,
  CLIENT_GUARD_SECURITY_NOTICE
} from '../utils/permissions.ts';

const FinanceModule: React.FC = () => {
  const [activeAccount, setActiveAccount] = useState<string>('all');
  const [showTxForm, setShowTxForm] = useState(false);
  const [txType, setTxType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const currentUser = getCurrentStoredUser();

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

  const accountAnalysis = analyzeUserAccountPermissions(currentUser, accounts);
  const { visibleAccounts, manageableAccounts, unassignedAccounts, orphanedAccountIds } = accountAnalysis;

  const selectedAccountObj =
    activeAccount !== 'all' ? visibleAccounts.find((a) => a.id === activeAccount) || null : null;
  const canManageSelected =
    activeAccount === 'all'
      ? manageableAccounts.length > 0
      : canManageAccount(currentUser, activeAccount);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    const target = e.target as any;
    const amount = parseFloat(target.amount.value);
    const accountId = target.accountId.value;

    if (!canManageAccount(currentUser, accountId)) {
      const reason = getAccountDenialReason(currentUser, accountId, 'manage', accounts);
      setActionError(reason);
      return;
    }

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
    } catch (err: any) {
      setActionError(err?.message || 'خطأ في حفظ المعاملة المالية');
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const isVisible = visibleAccounts.some((acc) => acc.id === t.account_id);
    if (!isVisible) return false;
    return activeAccount === 'all' || t.account_id === activeAccount;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary-600" size={40} />
      </div>
    );
  }

  if (visibleAccounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 bg-white rounded-[2.5rem] border-2 border-dashed border-rose-200 animate-in fade-in max-w-4xl mx-auto text-center">
        <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-5">
          <ShieldX size={48} className="text-rose-500" />
        </div>
        <h3 className="text-2xl font-black text-slate-900">
          لا توجد خزائن أو حسابات مالية مخصصة لحسابك حالياً
        </h3>
        <p className="text-slate-600 mt-3 font-bold max-w-2xl leading-relaxed">
          {accountAnalysis.denialReason}
        </p>

        {orphanedAccountIds.length > 0 && (
          <div className="mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold max-w-2xl text-right flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-black mb-1">تشخيص تعارض الصلاحيات لهذا الحساب:</div>
              <div>
                حسابك مرتبط بمعرّف خزينة قديم/محذوف لم يعد موجوداً في جدول الخزن النشطة (
                <span className="font-mono">{orphanedAccountIds.join(', ')}</span>). صلاحية «تعريف وإدارة الخزن» أو «إدارة المالية» لا تمنح الوصول التلقائي لبقية الخزن؛ يجب على مدير النظام تخصيص الخزينة الصحيحة لك من شاشة «إدارة الحسابات».
              </div>
            </div>
          </div>
        )}

        {unassignedAccounts.length > 0 && (
          <div className="mt-5 w-full max-w-2xl p-4 rounded-2xl bg-slate-50 border border-slate-200 text-right">
            <div className="text-xs font-black text-slate-700 mb-2 flex items-center gap-1.5">
              <Lock size={14} className="text-slate-500" />
              <span>الخزن والحسابات النشطة في النظام (محجوبة لعدم تخصيصها لحسابك):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {unassignedAccounts.map((acc) => (
                <span
                  key={acc.id}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1.5"
                >
                  <Lock size={12} className="text-rose-500" />
                  <span>{acc.name}</span>
                  <span className="text-[10px] text-slate-400">
                    ({acc.type === 'CASH' ? 'خزينة نقدية' : 'حساب بنكي'} — غير مخصص)
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 p-3.5 rounded-2xl bg-slate-100 text-slate-600 text-[11px] font-bold max-w-2xl flex items-start gap-2 text-right">
          <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
          <span>{CLIENT_GUARD_SECURITY_NOTICE}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* شريط توضيح الخزن المسموحة وغير المسموحة للمستخدم الحالي */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-black text-slate-800 flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>نطاق صلاحياتك المالية الفعلي ({visibleAccounts.length} من أصل {accounts.length} حسابات):</span>
          </div>
          <p className="text-[11px] text-slate-500 font-bold">
            يتم عرض الخزن المخصصة لحسابك فقط. صلاحية «تعريف الخزن» أو «قسم المالية» لا تفتح الخزن غير المخصصة تلقائياً.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveAccount('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
              activeAccount === 'all'
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            كل الخزن المسموحة ({visibleAccounts.length})
          </button>
          {unassignedAccounts.length > 0 && (
            <span
              className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-bold flex items-center gap-1.5"
              title={`حسابات غير مخصصة لك: ${unassignedAccounts.map((a) => a.name).join('، ')}`}
            >
              <Lock size={12} className="text-rose-500" />
              <span>
                حسابات غير مخصصة لك ({unassignedAccounts.length}):{' '}
                {unassignedAccounts.map((a) => a.name).join('، ')}
              </span>
            </span>
          )}
        </div>
      </div>

      {actionError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-rose-800 text-xs font-bold">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-600 hover:text-rose-800 font-black px-2 py-1"
          >
            إغلاق
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {visibleAccounts.map((acc) => {
          const isManageable = canManageAccount(currentUser, acc.id);
          return (
            <div
              key={acc.id}
              onClick={() => setActiveAccount(acc.id)}
              className={`p-8 rounded-[2rem] shadow-sm cursor-pointer transition-all border-2 relative overflow-hidden group ${
                activeAccount === acc.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-transparent bg-white hover:border-gray-200'
              }`}
            >
              {isManageable ? (
                <div
                  className="absolute top-0 left-0 bg-primary-600 text-white px-3 py-1 rounded-br-2xl flex items-center gap-1 shadow-lg"
                  title="لديك صلاحية إدارة (قبض وصرف)"
                >
                  <ShieldCheck size={12} />{' '}
                  <span className="text-[10px] font-black uppercase tracking-widest">إدارة (قبض/صرف)</span>
                </div>
              ) : (
                <div
                  className="absolute top-0 left-0 bg-amber-100 text-amber-800 px-3 py-1 rounded-br-2xl flex items-center gap-1 border-b border-r border-amber-200"
                  title="لديك صلاحية مشاهدة الرصيد والحركات فقط دون القبض أو الصرف"
                >
                  <Eye size={12} />{' '}
                  <span className="text-[10px] font-black uppercase tracking-widest">مشاهدة فقط</span>
                </div>
              )}
              <div className="flex justify-between items-center mb-6">
                <div
                  className={`p-4 rounded-2xl shadow-sm ${
                    acc.type === 'CASH' ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'
                  }`}
                >
                  {acc.type === 'CASH' ? <Wallet size={24} /> : <Landmark size={24} />}
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {acc.type === 'CASH' ? 'خزينة نقدية' : 'حساب بنكي'}
                </span>
              </div>
              <div className="text-sm font-black text-gray-500 mb-1">{acc.name}</div>
              <div className="text-3xl font-black text-gray-800 tracking-tighter">
                {Number(acc.balance).toLocaleString()}{' '}
                <span className="text-xs text-gray-400 font-bold mr-1">ج.م</span>
              </div>

              <div
                className={`absolute bottom-0 right-0 h-1 transition-all ${
                  activeAccount === acc.id ? 'bg-primary-500 w-full' : 'bg-transparent w-0'
                }`}
              ></div>
            </div>
          );
        })}
      </div>

      {!canManageSelected && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-900 text-xs font-bold">
          <Lock size={18} className="text-amber-600 shrink-0" />
          <span>
            {selectedAccountObj
              ? getAccountDenialReason(currentUser, selectedAccountObj.id, 'manage', accounts)
              : 'حسابك يملك صلاحية المشاهدة فقط على الخزن المعروضة، ولا يملك صلاحية تنفيذ عمليات قبض أو صرف (ACCOUNT_MANAGE).'}
          </span>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="font-black text-xl text-gray-800">سجل المعاملات المالية</h3>
            <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">
              متابعة حركات الإيداع والصرف للخزن المصرح لك بمشاهدتها
            </p>
          </div>
          <div className="flex gap-2">
            <button
              disabled={!canManageSelected}
              onClick={() => {
                setActionError(null);
                setTxType('INCOME');
                setShowTxForm(true);
              }}
              title={
                !canManageSelected
                  ? 'غير مسموح: تحتاج صلاحية إدارة (ACCOUNT_MANAGE) على الخزينة المحددة'
                  : 'تسجيل إيراد'
              }
              className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <ArrowUpCircle size={18} /> تسجيل إيراد
            </button>
            <button
              disabled={!canManageSelected}
              onClick={() => {
                setActionError(null);
                setTxType('EXPENSE');
                setShowTxForm(true);
              }}
              title={
                !canManageSelected
                  ? 'غير مسموح: تحتاج صلاحية إدارة (ACCOUNT_MANAGE) على الخزينة المحددة'
                  : 'تسجيل مصروف'
              }
              className="bg-rose-600 text-white px-6 py-3 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-rose-700 shadow-xl shadow-rose-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
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
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-primary-50/20 transition-colors group">
                  <td className="px-8 py-5 text-gray-500 text-xs font-mono">{tx.date}</td>
                  <td className="px-8 py-5 font-black text-sm text-gray-800">
                    {accounts.find((a) => a.id === tx.account_id)?.name}
                  </td>
                  <td
                    className={`px-8 py-5 font-black text-lg ${
                      tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {tx.type === 'INCOME' ? '+' : '-'}
                    {Number(tx.amount).toLocaleString()} <span className="text-[10px] mr-1">ج.م</span>
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
                <tr>
                  <td colSpan={5} className="py-20 text-center text-gray-300 italic font-bold">
                    لا توجد معاملات مالية مسجلة لهذه الفئة
                  </td>
                </tr>
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
              <button
                onClick={() => setShowTxForm(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-6">
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 mr-2 uppercase tracking-widest">
                  الخزينة المستهدفة (المصرح لك بإدارتها فقط)
                </label>
                <select
                  name="accountId"
                  defaultValue={
                    activeAccount !== 'all' && canManageAccount(currentUser, activeAccount)
                      ? activeAccount
                      : manageableAccounts[0]?.id || ''
                  }
                  required
                  className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 outline-none font-black text-gray-700 focus:border-primary-500 transition-all"
                >
                  {manageableAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 mr-2 uppercase tracking-widest">
                  مبلغ العملية
                </label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 outline-none font-black text-2xl text-primary-600 focus:border-primary-500 transition-all"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 mr-2 uppercase tracking-widest">
                  تصنيف المعاملة
                </label>
                <input
                  name="category"
                  placeholder="صيانة، إيجار، توريد أدوية..."
                  required
                  className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 outline-none font-bold focus:border-primary-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 mr-2 uppercase tracking-widest">
                  ملاحظات توضيحية
                </label>
                <textarea
                  name="note"
                  placeholder="ملاحظات إضافية..."
                  className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 h-28 outline-none resize-none focus:border-primary-500 transition-all font-bold"
                ></textarea>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTxForm(false)}
                  className="flex-1 py-4 bg-gray-100 rounded-2xl font-black text-gray-500"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-4 text-white rounded-2xl font-black shadow-xl shadow-gray-200 ${
                    txType === 'INCOME' ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                >
                  حفظ المعاملة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceModule;
