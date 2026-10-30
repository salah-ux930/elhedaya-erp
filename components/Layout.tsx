import React, { useState, useEffect } from 'react';
import { AR } from '../constants';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Users2,
  Package,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  UserCheck,
  Stethoscope,
  FlaskConical,
  UserRoundCheck,
  PieChart,
  LibraryBig,
  Clock,
  FolderOpen,
  Pill,
  Sun,
  Moon
} from 'lucide-react';
import { Permission } from '../types';
import { realtimeNotificationService } from '../services/realtimeNotificationService.ts';
import { canAccessTab } from '../utils/permissions.ts';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  active: boolean;
  allowed?: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, badge, active, allowed = true, onClick }) => (
  <button
    onClick={onClick}
    title={allowed ? label : `${label} (غير مصرح لحسابك الحالي)`}
    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all text-right cursor-pointer ${
      active
        ? 'bg-primary-600 text-white shadow-sm font-black'
        : allowed
        ? 'text-slate-600 hover:bg-primary-50/70 hover:text-primary-800 font-bold'
        : 'text-slate-400 hover:bg-rose-50/60 hover:text-rose-700 font-semibold opacity-75'
    }`}
  >
    <div className="flex items-center gap-3 min-w-0">
      <span className="shrink-0">{icon}</span>
      <span className="text-sm truncate">{label}</span>
    </div>
    {!allowed ? (
      <span
        className={`text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 ${
          active ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600 border border-rose-200'
        }`}
      >
        غير مصرح
      </span>
    ) : (
      badge && (
        <span
          className={`text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 ${
            active ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary-700'
          }`}
        >
          {badge}
        </span>
      )
    )}
  </button>
);

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: { name: string; permissions: Permission[] };
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);
  const [hasCriticalAlert, setHasCriticalAlert] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('elhedaya_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('elhedaya_theme', isDarkMode ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  }, [isDarkMode]);

  useEffect(() => {
    realtimeNotificationService.start();
    const unsubscribe = realtimeNotificationService.subscribe((alerts) => {
      const unread = alerts.filter((a) => !a.is_read);
      setUnreadAlertsCount(unread.length);
      setHasCriticalAlert(unread.some((a) => a.severity === 'CRITICAL'));
    });
    return () => unsubscribe();
  }, []);

  const navigationGroups = [
    {
      title: '01. التشغيل اليومي والفرز',
      items: [
        { id: 'dashboard', label: AR.dashboard, icon: <LayoutDashboard size={19} /> },
        {
          id: 'reception',
          label: 'بوابة الاستقبال والفرز الموحدة',
          badge: 'غسيل + عيادات',
          icon: <Clock size={19} />
        },
        { id: 'activePatients', label: 'الرعاية النشطة (الغسيل الكلوي)', icon: <UserRoundCheck size={19} /> },
        { id: 'clinics', label: 'العيادات الخارجية والكشف', icon: <Stethoscope size={19} /> }
      ]
    },
    {
      title: '02. صحة الأسرة والسجل الطبي',
      items: [
        {
          id: 'familyFiles',
          label: 'الملف العائلي والمهام اليومية',
          badge: 'ذكي',
          icon: <FolderOpen size={19} />
        },
        { id: 'patients', label: 'سجل المرضى الموحد', icon: <Users size={19} /> },
        { id: 'medicalRecords', label: 'أرشيف الجلسات والسجلات', icon: <LibraryBig size={19} /> }
      ]
    },
    {
      title: '03. الخدمات الطبية المساندة',
      items: [
        { id: 'pharmacy', label: AR.pharmacy || 'الصيدلية والباتشات', icon: <Pill size={19} /> },
        { id: 'lab', label: AR.lab, icon: <FlaskConical size={19} /> }
      ]
    },
    {
      title: '04. الاستحقاق المالي والإدارة',
      items: [
        { id: 'billing', label: 'الفواتير والاستحقاق الاجتماعي', icon: <CreditCard size={19} /> },
        { id: 'finance', label: AR.finance, icon: <Wallet size={19} /> },
        { id: 'inventory', label: AR.inventory, icon: <Package size={19} /> },
        { id: 'employees', label: AR.employees, icon: <Users2 size={19} /> },
        { id: 'reports', label: AR.reports, icon: <PieChart size={19} /> },
        { id: 'users', label: AR.users, icon: <UserCheck size={19} /> },
        { id: 'setup', label: AR.setup, icon: <Settings size={19} /> }
      ]
    }
  ];

  const isTabActive = (itemId: string) => {
    if (
      itemId === 'reception' &&
      (activeTab === 'reception' || activeTab === 'sessionReception' || activeTab === 'clinicReception')
    ) {
      return true;
    }
    return activeTab === itemId;
  };

  const currentTitle =
    navigationGroups
      .flatMap((g) => g.items)
      .find((i) => isTabActive(i.id))?.label ||
    (activeTab === 'notifications' ? 'مركز الإشعارات والتنبيهات السريرية' : AR.dashboard);

  return (
    <div className="flex min-h-screen bg-[#f2f6f8] font-cairo transition-colors duration-200" dir="rtl">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-l border-slate-200 fixed h-full z-20 print:hidden no-print">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white font-black text-xl shrink-0">
            هـ
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black text-slate-900 tracking-tight truncate">
              مركز الهدايه الطبى
            </h1>
            <p className="text-[11px] font-bold text-slate-400 truncate">
              نظام التشغيل الطبي المتكامل
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
          {navigationGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 pb-1 text-[11px] font-black text-slate-400">
                {group.title}
              </div>
              {group.items.map((item) => (
                <SidebarItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  badge={item.badge}
                  active={isTabActive(item.id)}
                  allowed={canAccessTab(user, item.id)}
                  onClick={() => setActiveTab(item.id)}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-xl w-full transition-colors font-bold text-sm cursor-pointer"
          >
            <LogOut size={19} />
            <span>{AR.logout}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:mr-72 min-h-screen transition-all duration-200 print:mr-0 print:p-0">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 h-16 flex items-center justify-between gap-6 print:hidden no-print">
          {/* Zone 1: Brand / Active Section Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h2 className="text-lg font-black text-slate-900 whitespace-nowrap truncate">
              {currentTitle}
            </h2>
          </div>

          {/* Zone 2: Quick Operational Shortcuts */}
          <nav className="hidden xl:flex items-center gap-5 text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab('reception')}
              className={`hover:text-primary-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isTabActive('reception') ? 'text-primary-600 underline underline-offset-8' : ''
              }`}
            >
              الاستقبال والفرز
            </button>
            <button
              onClick={() => setActiveTab('familyFiles')}
              className={`hover:text-primary-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'familyFiles' ? 'text-primary-600 underline underline-offset-8' : ''
              }`}
            >
              مهام الملف العائلي
            </button>
            <button
              onClick={() => setActiveTab('clinics')}
              className={`hover:text-primary-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'clinics' ? 'text-primary-600 underline underline-offset-8' : ''
              }`}
            >
              العيادات
            </button>
            <button
              onClick={() => setActiveTab('activePatients')}
              className={`hover:text-primary-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'activePatients' ? 'text-primary-600 underline underline-offset-8' : ''
              }`}
            >
              الغسيل النشط
            </button>
            <button
              onClick={() => setActiveTab('pharmacy')}
              className={`hover:text-primary-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'pharmacy' ? 'text-primary-600 underline underline-offset-8' : ''
              }`}
            >
              الصيدلية
            </button>
          </nav>

          {/* Zone 3: Eye-Comfort Theme Switcher, Notifications & User Profile */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-primary-50 text-slate-700 hover:text-primary-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title={isDarkMode ? 'التبديل إلى الوضع النهاري المريح للعين' : 'التبديل إلى الوضع الليلي الداكن المريح للعين'}
            >
              {isDarkMode ? (
                <>
                  <Sun size={16} className="text-amber-400" />
                  <span className="hidden sm:inline">الوضع النهاري المريح</span>
                </>
              ) : (
                <>
                  <Moon size={16} className="text-primary-600" />
                  <span className="hidden sm:inline">الوضع الليلي الداكن</span>
                </>
              )}
            </button>

            <button
              type="button"
              className={`relative cursor-pointer transition-colors p-2 rounded-xl ${
                hasCriticalAlert
                  ? 'text-rose-600 bg-rose-50'
                  : 'text-slate-600 hover:text-primary-600 hover:bg-slate-100'
              }`}
              onClick={() => setActiveTab('notifications')}
              title={
                unreadAlertsCount > 0
                  ? `مركز الإشعارات (${unreadAlertsCount} تنبيه غير مقروء)`
                  : 'مركز الإشعارات'
              }
            >
              <Bell size={20} />
              {unreadAlertsCount > 0 && (
                <span
                  className={`absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full border-2 border-white text-[10px] font-black font-mono tabular-nums flex items-center justify-center text-white ${
                    hasCriticalAlert ? 'bg-rose-600' : 'bg-primary-600'
                  }`}
                >
                  {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2.5">
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-slate-800 leading-none">{user.name}</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-sm uppercase">
                {user.name[0]}
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm lg:hidden flex justify-end print:hidden no-print"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="w-72 h-full bg-white shadow-2xl relative flex flex-col animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h1 className="text-lg font-black text-slate-900">مركز الهدايه الطبى</h1>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <nav className="flex-1 p-3 overflow-y-auto space-y-4">
              {navigationGroups.map((group) => (
                <div key={group.title} className="space-y-1">
                  <div className="px-3 pb-1 text-[11px] font-black text-slate-400">
                    {group.title}
                  </div>
                  {group.items.map((item) => (
                    <SidebarItem
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      badge={item.badge}
                      active={isTabActive(item.id)}
                      allowed={canAccessTab(user, item.id)}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                    />
                  ))}
                </div>
              ))}
            </nav>
            <div className="p-3 border-t border-slate-100 shrink-0">
              <button
                onClick={onLogout}
                className="flex items-center gap-3 px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-xl w-full transition-colors font-bold text-sm"
              >
                <LogOut size={19} />
                <span>{AR.logout}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
