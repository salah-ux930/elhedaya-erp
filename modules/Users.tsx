
import React, { useState, useEffect } from 'react';
import { AR, PERMISSIONS_MAP } from '../constants.ts';
import { DB } from '../store.ts';
import { User, Permission, Store, FinancialAccount } from '../types.ts';
import { UserPlus, Search, Trash2, UserCheck, Shield, Check, X, Loader2, Package, Wallet, Edit, AlertCircle } from 'lucide-react';

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, s, a] = await Promise.all([
        DB.getUsers(),
        DB.getStores(),
        DB.getAccounts()
      ]);

      // ضمان أن u مصفوفة حتى لو كانت null
      const userList = u || [];
      const sanitizedUsers = userList.map(user => ({
        ...user,
        permissions: Array.isArray(user.permissions) ? user.permissions : []
      }));
      
      setUsers(sanitizedUsers);
      setAvailableStores(s || []);
      setAvailableAccounts(a || []);
    } catch (err) {
      console.error("Error fetching data in UsersModule:", err);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (perm: Permission) => {
    const current = userData.permissions || [];
    if (current.includes(perm)) {
      setUserData({ ...userData, permissions: current.filter(p => p !== perm) });
    } else {
      setUserData({ ...userData, permissions: [...current, perm] });
    }
  };

  const handleOpenAdd = () => {
    setEditingUserId(null);
    setUserData({ permissions: [], name: '', username: '', password: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUserId(user.id);
    setUserData({ 
      name: user.name, 
      username: user.username, 
      permissions: user.permissions,
      password: '' 
    });
    setShowModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData.permissions?.length) return alert("يرجى اختيار صلاحية واحدة على الأقل");
    setSubmitting(true);
    try {
      if (editingUserId) {
        await DB.updateUser(editingUserId, userData);
      } else {
        await DB.addUser({
          name: userData.name || '',
          username: userData.username || '',
          password: userData.password,
          permissions: userData.permissions
        });
      }
      await loadData();
      setShowModal(false);
    } catch (err) {
      alert("حدث خطأ أثناء حفظ بيانات المستخدم. تأكد من إعداد جدول system_users بشكل صحيح.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المستخدم؟")) return;
    try {
      await DB.deleteUser(id);
      await loadData();
    } catch (err) {
      alert("خطأ أثناء الحذف");
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center gap-4">
        <div className="relative w-96">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" placeholder="بحث عن مستخدم..." 
            className="w-full pr-10 pl-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={handleOpenAdd} className="bg-primary-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-md hover:bg-primary-700 transition-all">
          <UserPlus size={20} /> {AR.newUser}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-primary-600" size={40} />
          <p className="text-gray-400 font-bold">جاري جلب قائمة المستخدمين...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white p-20 rounded-3xl border border-dashed flex flex-col items-center justify-center text-gray-400">
          <AlertCircle size={48} className="mb-4 opacity-20" />
          <p className="font-bold">لم يتم العثور على أي مستخدمين</p>
          <button onClick={handleOpenAdd} className="mt-4 text-primary-600 font-bold hover:underline">أضف أول مستخدم الآن</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredUsers.map(user => (
            <div key={user.id} className="bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary-600 text-white rounded-xl flex items-center justify-center font-bold text-xl uppercase shadow-sm">
                    {user.name ? user.name[0] : '?'}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-800">{user.name}</h4>
                    <p className="text-gray-400 text-sm font-mono">@{user.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenEdit(user)} className="text-gray-400 hover:text-primary-600 p-2 transition-colors">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDeleteUser(user.id)} className="text-gray-400 hover:text-red-600 p-2 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {user.permissions?.map(perm => (
                  <span key={perm} className="px-3 py-1 bg-gray-50 text-gray-600 text-[10px] font-bold rounded-lg border flex items-center gap-1">
                    <Shield size={10} /> 
                    {PERMISSIONS_MAP[perm] || 
                     (perm.startsWith('STORE_ACCESS_') ? `مخزن: ${availableStores.find(s => `STORE_ACCESS_${s.id}` === perm)?.name || 'مخزن خاص'}` : 
                      perm.startsWith('ACC_ACCESS_') ? `خزينة: ${availableAccounts.find(a => `ACC_ACCESS_${a.id}` === perm)?.name || 'حساب مالي'}` : 
                      perm)}
                  </span>
                ))}
                {(!user.permissions || user.permissions.length === 0) && (
                  <span className="text-[10px] text-gray-400 italic">لا توجد صلاحيات مسندة</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
            <div className="p-6 bg-primary-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <UserCheck size={22} /> {editingUserId ? "تعديل حساب مستخدم" : "إنشاء حساب مستخدم جديد"}
              </h3>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
              <form id="userForm" onSubmit={handleSaveUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 mr-2">الاسم بالكامل</label>
                    <input required placeholder="الاسم" className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary-500" value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 mr-2">اسم الدخول</label>
                    <input required placeholder="اسم المستخدم" className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary-500 font-mono" value={userData.username} onChange={e => setUserData({...userData, username: e.target.value})} />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 mr-2">كلمة المرور {editingUserId && "(اتركها فارغة لعدم التغيير)"}</label>
                    <input type="password" placeholder="••••••••" className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary-500" value={userData.password} onChange={e => setUserData({...userData, password: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-gray-800 border-r-4 border-primary-600 pr-3">الصلاحيات الإدارية العامة</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(PERMISSIONS_MAP).map(([key, val]) => (
                      <button key={key} type="button" onClick={() => togglePermission(key as Permission)} className={`p-3 rounded-xl border text-xs font-bold transition-all text-right ${userData.permissions?.includes(key as Permission) ? 'bg-primary-600 text-white border-primary-600 shadow-md' : 'bg-white hover:bg-primary-50 border-gray-100'}`}>
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-gray-800 border-r-4 border-amber-600 pr-3 flex items-center gap-2">
                    <Package size={18} className="text-amber-600" /> صلاحيات المخازن المحددة
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableStores.map(store => {
                      const perm = `STORE_ACCESS_${store.id}`;
                      return (
                        <button key={store.id} type="button" onClick={() => togglePermission(perm)} className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${userData.permissions?.includes(perm) ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white hover:bg-amber-50 border-gray-100'}`}>
                          <span>{store.name}</span>
                          {userData.permissions?.includes(perm) && <Check size={14} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-gray-800 border-r-4 border-emerald-600 pr-3 flex items-center gap-2">
                    <Wallet size={18} className="text-emerald-600" /> صلاحيات الخزائن المحددة
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableAccounts.map(acc => {
                      const perm = `ACC_ACCESS_${acc.id}`;
                      return (
                        <button key={acc.id} type="button" onClick={() => togglePermission(perm)} className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${userData.permissions?.includes(perm) ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white hover:bg-emerald-50 border-gray-100'}`}>
                          <span>{acc.name}</span>
                          {userData.permissions?.includes(perm) && <Check size={14} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">إلغاء</button>
              <button form="userForm" type="submit" disabled={submitting} className="flex-1 py-4 bg-primary-600 text-white rounded-xl font-bold shadow-lg hover:bg-primary-700 disabled:opacity-70 flex items-center justify-center gap-2">
                 {submitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                 {editingUserId ? "تحديث الحساب" : "إنشاء الحساب"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #0284c7; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default UsersModule;
