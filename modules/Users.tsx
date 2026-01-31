import React, { useState } from 'react';
import { AR, PERMISSIONS_MAP } from '../constants';
import { DB } from '../store';
import { User, Permission } from '../types';
import { UserCog, UserPlus, Search, Trash2, Key, UserCheck, Shield, Check } from 'lucide-react';

const UsersModule: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({ permissions: [] });

  const togglePermission = (perm: Permission) => {
    const current = newUser.permissions || [];
    if (current.includes(perm)) {
      setNewUser({ ...newUser, permissions: current.filter(p => p !== perm) });
    } else {
      setNewUser({ ...newUser, permissions: [...current, perm] });
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.permissions?.length) {
      alert("يرجى اختيار صلاحية واحدة على الأقل");
      return;
    }
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: newUser.name || '',
      username: newUser.username || '',
      permissions: (newUser.permissions as Permission[]) || []
    };
    DB.addUser(user);
    setShowAddModal(false);
    setNewUser({ permissions: [] });
  };

  const filteredUsers = DB.users.filter(u => 
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
                   onClick={() => { if(confirm(AR.confirmation)) DB.deleteUser(user.id); }}
                   className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                 >
                   <Trash2 size={18} />
                 </button>
              </div>
            </div>
            
            <div className="mt-6">
              <h5 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">{AR.permissions}</h5>
              <div className="flex flex-wrap gap-2">
                {user.permissions.map(perm => (
                  <span key={perm} className="px-3 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded-lg border border-primary-100 flex items-center gap-1">
                    <Shield size={10} /> {PERMISSIONS_MAP[perm]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 bg-primary-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <UserCheck size={22} /> {AR.newUser}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-white hover:opacity-75">
                <UserPlus size={24} className="rotate-45" />
              </button>
            </div>
            <div className="p-8">
              <form onSubmit={handleAddUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">{AR.name}</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none"
                      onChange={e => setNewUser({...newUser, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">{AR.username}</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none"
                      onChange={e => setNewUser({...newUser, username: e.target.value})}
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
                  <input 
                    required 
                    type="password" 
                    className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors">إلغاء</button>
                  <button type="submit" className="flex-1 py-4 bg-primary-600 text-white rounded-xl font-bold shadow-lg hover:bg-primary-700 transition-colors">حفظ الحساب</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersModule;
