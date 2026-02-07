
import React, { useState, useEffect } from 'react';
import { AR, PERMISSIONS_MAP } from '../constants.ts';
import { DB } from '../store.ts';
import { User, Permission } from '../types.ts';
import { UserCog, UserPlus, Search, Trash2, Key, UserCheck, Shield, Check, X, Loader2 } from 'lucide-react';

const UsersModule: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({ permissions: [] });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await DB.getUsers();
      setUsers(data || []);
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (perm: Permission) => {
    const current = newUser.permissions || [];
    if (current.includes(perm)) {
      setNewUser({ ...newUser, permissions: current.filter(p => p !== perm) });
    } else {
      setNewUser({ ...newUser, permissions: [...current, perm] });
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.permissions?.length) {
      alert("يرجى اختيار صلاحية واحدة على الأقل");
      return;
    }
    
    setSubmitting(true);
    try {
      const userToSave = {
        name: newUser.name || '',
        username: newUser.username || '',
        permissions: newUser.permissions
      };
      
      await DB.addUser(userToSave);
      await loadUsers();
      setShowAddModal(false);
      setNewUser({ permissions: [] });
    } catch (err) {
      alert("حدث خطأ أثناء إضافة المستخدم. ربما اسم المستخدم محجوز مسبقاً.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm(AR.confirmation)) return;
    try {
      await DB.deleteUser(id);
      await loadUsers();
    } catch (err) {
      alert("خطأ أثناء حذف المستخدم");
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="بحث عن مستخدم..." 
            className="w-full pr-10 pl-4 py-3 border rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-primary-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-primary-700 transition-all font-bold shadow-md"
        >
          <UserPlus size={20} />
          {AR.newUser}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
          <Loader2 className="animate-spin text-primary-600" size={40} />
          <p className="font-bold">جاري تحميل المستخدمين...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredUsers.map(user => (
            <div key={user.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all group">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center font-bold text-2xl border border-primary-50">
                    {user.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg">{user.name}</h4>
                    <p className="text-gray-400 text-sm flex items-center gap-1">
                      <UserCog size={14} /> @{user.username}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                   <button className="p-2 bg-gray-50 text-gray-500 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-colors">
                     <Key size={18} />
                   </button>
                   <button 
                     onClick={() => handleDeleteUser(user.id)}
                     className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                   >
                     <Trash2 size={18} />
                   </button>
                </div>
              </div>
              
              <div className="mt-6">
                <h5 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">{AR.permissions}</h5>
                <div className="flex flex-wrap gap-2">
                  {user.permissions && user.permissions.map(perm => (
                    <span key={perm} className="px-3 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded-lg border border-primary-100 flex items-center gap-1">
                      <Shield size={10} /> {PERMISSIONS_MAP[perm] || perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="lg:col-span-2 text-center py-20 text-gray-400 italic">
              لا توجد نتائج لمطابقة بحثك
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="p-6 bg-primary-600 text-white flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <UserCheck size={22} /> {AR.newUser}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar">
              <form id="addUserForm" onSubmit={handleAddUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">{AR.name}</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="الاسم الثلاثي للموظف"
                      className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none"
                      onChange={e => setNewUser({...newUser, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">{AR.username}</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="اسم الدخول (بالإنجليزي)"
                      className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none"
                      onChange={e => setNewUser({...newUser, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-3">{AR.permissions}</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-xl bg-gray-50/50">
                    {Object.entries(PERMISSIONS_MAP).map(([key, val]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => togglePermission(key as Permission)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all text-right ${
                          newUser.permissions?.includes(key as Permission)
                            ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        <span className="font-bold text-sm">{val}</span>
                        {newUser.permissions?.includes(key as Permission) && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">{AR.password}</label>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                    <Shield className="text-blue-600 mt-1" size={20} />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      يتم تعيين كلمة مرور افتراضية للمستخدم الجديد. يمكن للمستخدم تغييرها عند أول تسجيل دخول له بعد تفعيل ميزة الأمان.
                    </p>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3 shrink-0">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">إلغاء</button>
              <button 
                form="addUserForm" 
                type="submit" 
                disabled={submitting}
                className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'حفظ الحساب'}
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

export default UsersModule;
