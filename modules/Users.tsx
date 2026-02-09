
import React, { useState, useEffect } from 'react';
import { AR, PERMISSIONS_MAP } from '../constants.ts';
import { DB } from '../store.ts';
import { User, Permission, Store, FinancialAccount } from '../types.ts';
import { 
  UserPlus, Search, Trash2, UserCheck, Shield, Check, X, 
  Loader2, Package, Wallet, Edit, AlertCircle, RefreshCw, 
  Fingerprint, Database, Eye, Settings2
} from 'lucide-react';

const UsersModule: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState<Partial<User>>({ permissions: [] });
  
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<FinancialAccount[]>([]);
  const [isSchemaError, setIsSchemaError] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setIsSchemaError(false);
    try {
      const [u, s, a] = await Promise.all([
        DB.getUsers(),
        DB.getStores(),
        DB.getAccounts()
      ]);

      setUsers(Array.isArray(u) ? u : []);
      setAvailableStores(s || []);
      setAvailableAccounts(a || []);
    } catch (err: any) {
      console.error("UsersModule Error:", err);
      if (err.message?.includes('SCHEMA_ERROR')) {
        setIsSchemaError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (perm: string) => {
    const current = userData.permissions || [];
    if (current.includes(perm)) {
      setUserData({ ...userData, permissions: current.filter(p => p !== perm) });
    } else {
      setUserData({ ...userData, permissions: [...current, perm] });
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData.name || !userData.username) {
        alert("يرجى إكمال البيانات الأساسية");
        return;
    }
    if (!editingUserId && !userData.password) {
        alert("يرجى إدخال كلمة المرور للحساب الجديد");
        return;
    }

    setSubmitting(true);
    try {
      if (editingUserId) {
        await DB.updateUser(editingUserId, userData);
      } else {
        await DB.addUser(userData);
      }
      await loadData();
      setShowModal(false);
      setUserData({ permissions: [] });
      setEditingUserId(null);
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء حفظ بيانات المستخدم.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => u.name.includes(searchTerm) || u.username.includes(searchTerm));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" placeholder="بحث باسم المستخدم..." 
            className="w-full pr-12 pl-4 py-4 border rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 shadow-sm font-bold"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={() => { setEditingUserId(null); setUserData({ permissions: [] }); setShowModal(true); }} className="bg-primary-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 font-black shadow-lg hover:bg-primary-700 transition-all">
          <UserPlus size={20} /> حساب جديد
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-primary-600" size={48} /></div>
        ) : filteredUsers.map(user => (
          <div key={user.id} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 hover:shadow-xl transition-all group">
             <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                   <div className="w-16 h-16 bg-primary-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl uppercase">
                      {user.name ? user.name[0] : '?'}
                   </div>
                   <div>
                      <h4 className="font-black text-xl text-gray-800">{user.name}</h4>
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-1 font-mono tracking-tighter">
                        <Fingerprint size={12} /> @{user.username}
                      </div>
                   </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => { setEditingUserId(user.id); setUserData(user); setShowModal(true); }} className="p-3 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-600 hover:text-white transition-all"><Edit size={18} /></button>
                   <button onClick={async () => { if(confirm('هل أنت متأكد من حذف هذا الحساب؟')) { await DB.deleteUser(user.id); loadData(); } }} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18} /></button>
                </div>
             </div>
             <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-50">
                {user.permissions?.filter(p => !p.includes(':')).map(p => (
                   <span key={p} className="px-3 py-1 bg-gray-50 text-gray-500 rounded-lg text-[10px] font-bold border border-gray-100">
                     {PERMISSIONS_MAP[p] || p}
                   </span>
                ))}
                {(user.permissions?.filter(p => p.includes(':')).length || 0) > 0 && (
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-100">
                    +{user.permissions?.filter(p => p.includes(':')).length} صلاحية مخصصة
                  </span>
                )}
             </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95">
             <div className="p-8 bg-primary-600 text-white flex justify-between items-center shrink-0">
                <h3 className="text-2xl font-black">{editingUserId ? 'تعديل الصلاحيات' : 'إضافة مستخدم نظام'}</h3>
                <button onClick={() => { setShowModal(false); setEditingUserId(null); }}><X size={32} /></button>
             </div>
             <form id="userForm" onSubmit={handleSaveUser} className="p-10 overflow-y-auto space-y-10 flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 mr-2">اسم الموظف</label>
                      <input required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none transition-all font-bold" value={userData.name || ''} onChange={e => setUserData({...userData, name: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 mr-2">اسم الدخول</label>
                      <input required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none transition-all font-mono" value={userData.username || ''} onChange={e => setUserData({...userData, username: e.target.value})} />
                   </div>
                   <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-gray-500 mr-2">كلمة المرور {editingUserId && '(اتركها فارغة لعدم التغيير)'}</label>
                      <input type="password" placeholder="••••••••" className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none transition-all" value={userData.password || ''} onChange={e => setUserData({...userData, password: e.target.value})} />
                   </div>
                </div>

                {/* General Permissions */}
                <div className="space-y-4">
                   <h4 className="font-black text-gray-800 flex items-center gap-2 border-b pb-2"><Shield size={20} className="text-primary-600"/> الصلاحيات العامة</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(PERMISSIONS_MAP).map(([key, val]) => (
                         <button key={key} type="button" onClick={() => togglePermission(key)} className={`p-4 rounded-2xl border-2 text-right flex justify-between items-center transition-all ${userData.permissions?.includes(key) ? 'bg-primary-600 text-white border-primary-600 shadow-md' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}>
                            <span className="text-xs font-black">{val}</span>
                            {userData.permissions?.includes(key) && <Check size={18} />}
                         </button>
                      ))}
                   </div>
                </div>

                {/* Store Permissions */}
                <div className="space-y-4">
                   <h4 className="font-black text-gray-800 flex items-center gap-2 border-b pb-2"><Package size={20} className="text-indigo-600"/> صلاحيات المخازن المخصصة</h4>
                   <div className="overflow-hidden border border-gray-100 rounded-2xl">
                      <table className="w-full text-right text-sm">
                         <thead className="bg-gray-50">
                            <tr>
                               <th className="p-4 font-bold text-gray-500">اسم المخزن</th>
                               <th className="p-4 font-bold text-center text-gray-500">مشاهدة الأرصدة</th>
                               <th className="p-4 font-bold text-center text-gray-500">إدارة (صرف وتوريد)</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y">
                            {availableStores.map(store => {
                               const viewKey = `STORE_VIEW:${store.id}`;
                               const manageKey = `STORE_MANAGE:${store.id}`;
                               return (
                                  <tr key={store.id} className="hover:bg-indigo-50/30">
                                     <td className="p-4 font-bold text-gray-700">{store.name}</td>
                                     <td className="p-4 text-center">
                                        <button type="button" onClick={() => togglePermission(viewKey)} className={`p-2 rounded-lg transition-all ${userData.permissions?.includes(viewKey) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                           <Eye size={18} />
                                        </button>
                                     </td>
                                     <td className="p-4 text-center">
                                        <button type="button" onClick={() => togglePermission(manageKey)} className={`p-2 rounded-lg transition-all ${userData.permissions?.includes(manageKey) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                           <Settings2 size={18} />
                                        </button>
                                     </td>
                                  </tr>
                               );
                            })}
                         </tbody>
                      </table>
                   </div>
                </div>

                {/* Account Permissions */}
                <div className="space-y-4">
                   <h4 className="font-black text-gray-800 flex items-center gap-2 border-b pb-2"><Wallet size={20} className="text-emerald-600"/> صلاحيات الخزن والحسابات</h4>
                   <div className="overflow-hidden border border-gray-100 rounded-2xl">
                      <table className="w-full text-right text-sm">
                         <thead className="bg-gray-50">
                            <tr>
                               <th className="p-4 font-bold text-gray-500">اسم الحساب</th>
                               <th className="p-4 font-bold text-center text-gray-500">مشاهدة الرصيد</th>
                               <th className="p-4 font-bold text-center text-gray-500">إدارة (قبض وصرف)</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y">
                            {availableAccounts.map(acc => {
                               const viewKey = `ACCOUNT_VIEW:${acc.id}`;
                               const manageKey = `ACCOUNT_MANAGE:${acc.id}`;
                               return (
                                  <tr key={acc.id} className="hover:bg-emerald-50/30">
                                     <td className="p-4 font-bold text-gray-700">{acc.name}</td>
                                     <td className="p-4 text-center">
                                        <button type="button" onClick={() => togglePermission(viewKey)} className={`p-2 rounded-lg transition-all ${userData.permissions?.includes(viewKey) ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                           <Eye size={18} />
                                        </button>
                                     </td>
                                     <td className="p-4 text-center">
                                        <button type="button" onClick={() => togglePermission(manageKey)} className={`p-2 rounded-lg transition-all ${userData.permissions?.includes(manageKey) ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                           <Settings2 size={18} />
                                        </button>
                                     </td>
                                  </tr>
                               );
                            })}
                         </tbody>
                      </table>
                   </div>
                </div>
             </form>
             <div className="p-8 border-t bg-gray-50 flex gap-4 shrink-0">
                <button type="button" onClick={() => { setShowModal(false); setEditingUserId(null); }} className="flex-1 py-5 bg-white border-2 rounded-2xl font-black text-gray-500">إلغاء</button>
                <button 
                  type="submit" 
                  form="userForm" 
                  disabled={submitting} 
                  className="flex-[2] py-5 bg-primary-600 text-white rounded-2xl font-black shadow-xl shadow-primary-600/30 hover:bg-primary-700 disabled:opacity-70 transition-all active:scale-95"
                >
                   {submitting ? 'جاري الحفظ...' : 'حفظ بيانات الحساب'}
                </button>
             </div>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default UsersModule;
