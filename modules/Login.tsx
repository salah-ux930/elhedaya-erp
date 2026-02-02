
import React, { useState } from 'react';
import { AR } from '../constants.ts';
import { DB } from '../store.ts';
import { LogIn, Lock, User, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

const LoginModule: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // محاكاة تسجيل الدخول أو الربط مع جدول نظام المستخدمين
      // في حالة الإنتاج الفعلية نستخدم supabase.auth.signInWithPassword
      if (username === 'admin' && password === 'admin') {
        const user = { name: 'مدير النظام', role: 'ADMIN' };
        onLoginSuccess(user);
      } else {
        setError('خطأ في اسم المستخدم أو كلمة المرور');
      }
    } catch (err) {
      setError('حدث خطأ أثناء الاتصال بالسيرفر');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-gray-900 p-4 font-cairo">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20">
          <div className="p-8 text-center bg-primary-600">
            <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/20">
              <ShieldCheck size={40} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">ديالي كلينك ERP</h1>
            <p className="text-primary-100 text-sm">نظام إدارة وحدة غسيل الكلى المتكامل</p>
          </div>

          <div className="p-10">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100 animate-bounce">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600 flex items-center gap-2">
                  <User size={16} /> {AR.username}
                </label>
                <input 
                  type="text" 
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  className="w-full border-2 border-gray-100 rounded-xl p-4 bg-gray-50 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600 flex items-center gap-2">
                  <Lock size={16} /> {AR.password}
                </label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border-2 border-gray-100 rounded-xl p-4 bg-gray-50 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-primary-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-primary-600/30 hover:bg-primary-700 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {loading ? <Loader2 className="animate-spin" /> : <LogIn size={22} />}
                تسجيل الدخول للنظام
              </button>
            </form>

            <div className="mt-8 text-center border-t pt-6">
              <p className="text-xs text-gray-400">© 2024 جميع الحقوق محفوظة لمركز ديالي كلينك</p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-center gap-6 text-white/40 text-sm">
          <button className="hover:text-white transition-colors">الدعم الفني</button>
          <button className="hover:text-white transition-colors">دليل الاستخدام</button>
        </div>
      </div>
    </div>
  );
};

export default LoginModule;
