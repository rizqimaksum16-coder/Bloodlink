import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  Droplets, Search, LogIn, LayoutDashboard, Calendar, Info,
  Menu, X, ChevronRight, Building2, HeartPulse, Heart, LogOut, User,
  ChevronDown, Sun, Moon, Truck, HelpCircle, Activity, QrCode, Trophy, Bell, Shield
} from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext';
import LogoutConfirmDialog from './LogoutConfirmDialog';
import ProfileModal from './ProfileModal';
import DonorAIChat from './DonorAIChat';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

// ─── Role nav config (dashboard link per role) ────────────────────────────────

const roleNavExtra: Record<UserRole, { to: string; label: string; icon: React.ElementType }> = {
  pmi: { to: '/dashboard/pmi', label: 'Dashboard PMI', icon: HeartPulse },
  rs: { to: '/dashboard/rs', label: 'Dashboard RS', icon: Building2 },
  donor: { to: '/dashboard/donor', label: 'Dashboard Saya', icon: Heart },
  driver: { to: '/dashboard/driver', label: 'Dashboard Driver', icon: Truck },
  superadmin: { to: '/dashboard/superadmin', label: 'Super Admin', icon: Shield },
};

const roleColors: Record<UserRole, { color: string; bg: string; label: string }> = {
  pmi: { color: '#C0392B', bg: '#FDEDEC', label: 'PMI' },
  rs: { color: '#2980B9', bg: '#EAF7FB', label: 'RS' },
  donor: { color: '#8E44AD', bg: '#F4EFFE', label: 'Donor' },
  driver: { color: '#16A085', bg: '#E8F8F5', label: 'Driver' },
  superadmin: { color: '#1A1A2E', bg: '#EAEAF4', label: 'Super Admin' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);

  // Reload notifications when user changes with role validation and Supabase integration
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const userKey = `sb_notifications_${user.email}`;
    const rolePrefixes: Record<string, string> = {
      pmi: 'N_PMI',
      rs: 'N_RS',
      driver: 'N_DRV',
      donor: 'N00'
    };
    const expectedPrefix = rolePrefixes[user.role] || 'N00';

    async function loadNotifications() {
      if (!user) return;

      const deletedSaved = localStorage.getItem(`sb_deleted_notifications_${user.email}`);
      const deletedIds: string[] = deletedSaved ? JSON.parse(deletedSaved) : [];

      // Try fetching live notifications from Supabase first
      if (isSupabaseConfigured) {
        try {
          if (user.role === 'pmi') {
            const { data: reqs } = await supabase.from('blood_requests').select('*').eq('status', 'pending').limit(3);
            if (reqs && reqs.length > 0) {
              const liveNotifs = reqs.map((r: any, idx: number) => ({
                id: `N_PMI_LIVE_${r.id}`,
                type: 'darurat',
                title: '🚨 Permintaan Darah Baru!',
                message: `Rumah Sakit mengajukan permintaan ${r.quantity || r.qty || 5} kantong ${r.blood_type} (Urgensi: ${r.urgency || 'Mendesak'}).`,
                time: 'Baru saja',
                read: false
              }));
              const defaults = getRoleDefaultNotifications('pmi');
              const merged = [...liveNotifs, ...defaults.slice(liveNotifs.length)];
              const filtered = merged.filter((n: any) => !deletedIds.includes(n.id));
              setNotifications(filtered);
              localStorage.setItem(userKey, JSON.stringify(filtered));
              return;
            }
          } else if (user.role === 'driver') {
            const { data: delivs } = await supabase.from('deliveries').select('*').eq('driver_name', user.name).limit(3);
            if (delivs && delivs.length > 0) {
              const liveNotifs = delivs.map((d: any) => ({
                id: `N_DRV_LIVE_${d.id}`,
                type: d.urgent ? 'darurat' : 'info',
                title: d.status === 'perjalanan' ? '🚚 Sedang Dalam Perjalanan' : '🚨 Tugas Pengantaran Darah!',
                message: `Pengiriman ${d.order_id} (${d.qty} kantong ${d.blood_type}) dari ${d.from_name} ke ${d.to_name}.`,
                time: d.updated_at ? new Date(d.updated_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Baru saja',
                read: false
              }));
              const filtered = liveNotifs.filter((n: any) => !deletedIds.includes(n.id));
              setNotifications(filtered);
              localStorage.setItem(userKey, JSON.stringify(filtered));
              return;
            }
          }
        } catch (e) {
          console.warn('Gagal fetch live notifications:', e);
        }
      }

      // LocalStorage or Role Default fallback
      try {
        const saved = localStorage.getItem(userKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.length === 0) {
            setNotifications([]);
            return;
          }
          const isRoleMatch = Array.isArray(parsed) && (
            (user.role === 'pmi' && parsed[0]?.id?.includes('PMI')) ||
            (user.role === 'rs' && parsed[0]?.id?.includes('RS')) ||
            (user.role === 'driver' && parsed[0]?.id?.includes('DRV')) ||
            (user.role === 'donor' && !parsed[0]?.id?.includes('PMI') && !parsed[0]?.id?.includes('RS') && !parsed[0]?.id?.includes('DRV'))
          );
          if (isRoleMatch) {
            const filtered = parsed.filter((n: any) => !deletedIds.includes(n.id));
            setNotifications(filtered);
            return;
          }
        }
      } catch (e) { console.warn(e); }

      // Reset to exact role defaults
      const defaults = getRoleDefaultNotifications(user.role);
      const filtered = defaults.filter((n: any) => !deletedIds.includes(n.id));
      setNotifications(filtered);
      localStorage.setItem(userKey, JSON.stringify(filtered));
      window.dispatchEvent(new Event('sb_notifications_changed'));
    }

    loadNotifications();
  }, [user]);

  const handleNotificationClick = (notifId: string) => {
    const updated = notifications.map(n => n.id === notifId ? { ...n, read: true } : n);
    setNotifications(updated);
    if (user) localStorage.setItem(`sb_notifications_${user.email}`, JSON.stringify(updated));
    window.dispatchEvent(new Event('sb_notifications_changed'));
    setNotifOpen(false);

    const role = user?.role;
    const targetPath = getNotifAction(role).to;
    console.log('[Notif] user role:', role, '| navigating to:', targetPath);
    setTimeout(() => {
      window.location.href = targetPath;
    }, 50);
  };

  const handleDeleteNotification = (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notifications.filter(n => n.id !== notifId);
    setNotifications(updated);
    if (user) {
      localStorage.setItem(`sb_notifications_${user.email}`, JSON.stringify(updated));
      const deletedSaved = localStorage.getItem(`sb_deleted_notifications_${user.email}`);
      const deletedIds = deletedSaved ? JSON.parse(deletedSaved) : [];
      const newDeleted = Array.from(new Set([...deletedIds, notifId]));
      localStorage.setItem(`sb_deleted_notifications_${user.email}`, JSON.stringify(newDeleted));
    }
    window.dispatchEvent(new Event('sb_notifications_changed'));
  };

  useEffect(() => {
    const handleSync = () => {
      if (!user) return;
      const userKey = `sb_notifications_${user.email}`;
      try {
        const saved = localStorage.getItem(userKey);
        if (saved) setNotifications(JSON.parse(saved));
      } catch (e) {
        console.warn(e);
      }
    };
    window.addEventListener('sb_notifications_changed', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('sb_notifications_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [user]);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRefDesktop = useRef<HTMLDivElement>(null);
  const notifRefMobile = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  };

  const isActive = (path: string) => {
    if (path.includes('?')) {
      const [pathname, search] = path.split('?');
      return location.pathname === pathname && location.search.includes(search);
    }
    if (path === '/search') {
      return location.pathname === '/search' && !location.search.includes('tab=ai-matching');
    }
    return location.pathname === path;
  };
  const roleCfg = user ? roleColors[user.role] : null;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      const insideNotif =
        (notifRefDesktop.current && notifRefDesktop.current.contains(e.target as Node)) ||
        (notifRefMobile.current && notifRefMobile.current.contains(e.target as Node));
      if (!insideNotif) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    setShowLogoutDialog(true);
    setProfileOpen(false);
    setDrawerOpen(false);
  };

  const confirmLogout = async () => {
    if ((window as any).isStockDirty && typeof (window as any).saveStockToDb === 'function') {
      try {
        await (window as any).saveStockToDb();
      } catch (e) {
        console.warn('Gagal auto-save sebelum logout:', e);
      }
    }
    logout();
    setShowLogoutDialog(false);
    navigate('/login');
  };

  const coreLinks = user?.role === 'superadmin' ? [
    { to: '/dashboard/superadmin', label: 'Super Admin', icon: Shield },
  ] : [
    { to: '/', label: 'Beranda', icon: Droplets },
    ...(user?.role !== 'pmi' && user?.role !== 'driver' ? [{ to: '/search', label: 'Cari Stok', icon: Search }] : []),
    ...(user?.role !== 'driver' ? [{ to: '/events', label: 'Event', icon: Calendar }] : []),
    ...(user?.role === 'donor' ? [{ to: '/rewards', label: 'Reward', icon: Trophy }] : []),
    { to: '/info', label: 'Info & FAQ', icon: HelpCircle },
  ];

  return (
    <>
      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 bg-white transition-all duration-300 ${scrolled ? 'shadow-lg border-b border-border' : 'border-b border-border'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-2">

            {/* Hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka menu navigasi"
              className="md:hidden p-2 -ml-1 rounded-xl text-[#4A4A6A] hover:bg-[#F4F4F8] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 mr-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg,#C0392B,#7B241C)' }}>
                <Droplets className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="font-bold text-[17px] text-[#1A1A2E] hidden sm:block tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                Suroboyo Bloods
              </span>
            </Link>

            {/* Role badge */}
            {isAuthenticated && roleCfg && (
              <span className="hidden sm:inline-flex text-[11px] font-bold px-2.5 py-0.5 rounded-full mr-1 border" style={{ background: roleCfg.bg, color: roleCfg.color, borderColor: roleCfg.color + '40' }}>
                {roleCfg.label}
              </span>
            )}

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-0.5 flex-1">
              {coreLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive(to)
                      ? 'text-[#C0392B] bg-[#FDEDEC]'
                      : 'text-[#4A4A6A] hover:bg-[#F4F4F8] hover:text-[#1A1A2E]'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />{label}
                  {isActive(to) && (
                    <span className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#C0392B] rounded-full" />
                  )}
                </Link>
              ))}

              {/* Role-based dashboard link */}
              {isAuthenticated && user && roleNavExtra[user.role] && (
                <Link
                  to={roleNavExtra[user.role].to}
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive(roleNavExtra[user.role].to)
                      ? 'bg-[#FDEDEC] text-[#C0392B]'
                      : 'text-[#4A4A6A] hover:bg-[#F4F4F8] hover:text-[#1A1A2E]'
                    }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Dashboard
                  {isActive(roleNavExtra[user.role].to) && (
                    <span className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#C0392B] rounded-full" />
                  )}
                </Link>
              )}
            </div>

            {/* Right: profile or login */}
            <div className="hidden md:flex items-center gap-3 ml-auto">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl border border-border hover:border-[#C0392B]/40 hover:bg-[#F4F4F8] transition-all text-[#4A4A6A] hover:text-[#C0392B]"
                aria-label="Toggle dark mode"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>

              {/* Notification Bell */}
              {isAuthenticated && user && user.role !== 'superadmin' && (
                <div className="relative" ref={notifRefDesktop}>
                  <button
                    onClick={() => setNotifOpen(v => !v)}
                    className="p-2 rounded-xl border border-border hover:border-[#C0392B]/40 hover:bg-[#F4F4F8] transition-all text-[#4A4A6A] hover:text-[#C0392B] relative"
                    aria-label="Notifikasi"
                  >
                    <Bell className="w-4 h-4" />
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-[#C0392B] text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div onMouseDown={(e) => e.stopPropagation()} className="absolute top-full right-0 mt-2 bg-white border border-border rounded-2xl shadow-xl w-80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-3 border-b border-border bg-[#F9F9FC] flex items-center justify-between">
                        <span className="font-bold text-xs text-[#1A1A2E]">Notifikasi Centre</span>
                        {notifications.length > 0 && (
                          <div className="flex items-center gap-2">
                            {notifications.some(n => !n.read) && (
                              <>
                                <button
                                  onClick={() => {
                                    const updated = notifications.map(n => ({ ...n, read: true }));
                                    setNotifications(updated);
                                    if (user) localStorage.setItem(`sb_notifications_${user.email}`, JSON.stringify(updated));
                                    window.dispatchEvent(new Event('sb_notifications_changed'));
                                  }}
                                  className="text-[10px] text-[#C0392B] font-semibold hover:underline cursor-pointer"
                                >
                                  Tandai Dibaca
                                </button>
                                <span className="text-[#9B9BB5] text-[10px]">•</span>
                              </>
                            )}
                            <button
                              onClick={() => {
                                if (user) {
                                  const deletedSaved = localStorage.getItem(`sb_deleted_notifications_${user.email}`);
                                  const deletedIds = deletedSaved ? JSON.parse(deletedSaved) : [];
                                  const newDeleted = Array.from(new Set([...deletedIds, ...notifications.map(n => n.id)]));
                                  localStorage.setItem(`sb_deleted_notifications_${user.email}`, JSON.stringify(newDeleted));
                                  localStorage.setItem(`sb_notifications_${user.email}`, JSON.stringify([]));
                                }
                                setNotifications([]);
                                window.dispatchEvent(new Event('sb_notifications_changed'));
                              }}
                              className="text-[10px] text-[#4A4A6A] font-semibold hover:underline cursor-pointer"
                            >
                              Hapus Semua
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-border">
                        {notifications.length > 0 ? (
                          notifications.map((notif) => {
                            const isUnread = !notif.read;
                            return (
                              <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif.id)}
                                className={`p-3.5 text-left cursor-pointer transition-colors hover:bg-[#F8F9FA] flex gap-2.5 items-start group ${isUnread ? 'bg-[#FDEDEC]/10' : ''}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${isUnread ? 'bg-[#C0392B]' : 'bg-transparent'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-bold ${isUnread ? 'text-[#1A1A2E]' : 'text-[#4A4A6A]'}`}>{notif.title}</p>
                                  <p className="text-[11px] text-[#9B9BB5] mt-0.5 leading-relaxed">{notif.message}</p>
                                  {notif.type === 'darurat' && isUnread && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleNotificationClick(notif.id);
                                      }}
                                      className="block mt-2 w-full py-1.5 rounded-lg bg-[#C0392B] hover:bg-[#922B21] text-white text-[10px] font-bold text-center transition-all shadow-sm cursor-pointer"
                                    >
                                      {getNotifAction(user?.role).label}
                                    </button>
                                  )}
                                  <span className="text-[9px] text-[#9B9BB5] block mt-1.5">{notif.time}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteNotification(notif.id, e)}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#F4F4F8] text-[#9B9BB5] hover:text-[#C0392B] transition-all cursor-pointer flex-shrink-0 self-start"
                                  title="Hapus"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-6 text-center text-xs text-[#9B9BB5]">Tidak ada notifikasi.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {isAuthenticated && user ? (
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(v => !v)}
                    aria-expanded={profileOpen}
                    aria-label="Buka menu profil"
                    className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-border hover:border-[#C0392B]/40 hover:shadow-sm transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm" style={{ background: roleCfg?.color }}>
                      {user.avatar}
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-xs font-semibold text-[#1A1A2E] leading-tight">{user.name}</p>
                      <p className="text-[11px] text-[#9B9BB5] leading-tight">{user.org}</p>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#9B9BB5] transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileOpen && (
                    <div className="absolute top-full right-0 mt-2 bg-white border border-border rounded-2xl shadow-xl w-56 overflow-hidden z-50">
                      {/* User header */}
                      <div className="px-4 py-3 border-b border-border" style={{ background: roleCfg?.bg }}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: roleCfg?.color }}>
                            {user.avatar}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#1A1A2E] truncate">{user.name}</p>
                            <p className="text-[11px] truncate" style={{ color: roleCfg?.color }}>{user.org}</p>
                          </div>
                        </div>
                      </div>
                      {/* Menu items */}
                      <div className="py-1.5">
                        <div onClick={() => { setProfileModalOpen(true); setProfileOpen(false); }} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#4A4A6A] hover:bg-[#F4F4F8] hover:text-[#C0392B] transition-colors cursor-pointer">
                          <User className="w-4 h-4" /> Profil Akun
                        </div>
                      </div>
                      <div className="border-t border-border py-1.5">
                        <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#C0392B] hover:bg-[#FDEDEC] transition-colors">
                          <LogOut className="w-4 h-4" /> Keluar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login">
                  <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md shadow-sm"
                    style={{ background: 'linear-gradient(135deg,#C0392B,#7B241C)' }}>
                    <LogIn className="w-4 h-4" /> Masuk
                  </button>
                </Link>
              )}
            </div>

            {/* Mobile right */}
            <div className="md:hidden ml-auto flex items-center gap-2">
              {isAuthenticated && user && user.role !== 'superadmin' && (
                <div className="relative" ref={notifRefMobile}>
                  <button
                    onClick={() => setNotifOpen(v => !v)}
                    className="p-1.5 rounded-lg border border-border bg-white text-[#4A4A6A] hover:text-[#C0392B] relative animate-in zoom-in duration-100"
                    aria-label="Notifikasi"
                  >
                    <Bell className="w-4 h-4" />
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C0392B] text-white text-[8px] font-black rounded-full flex items-center justify-center">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div onMouseDown={(e) => e.stopPropagation()} className="absolute top-full right-[-40px] mt-2 bg-white border border-border rounded-2xl shadow-xl w-72 overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-border bg-[#F9F9FC] flex items-center justify-between">
                        <span className="font-bold text-xs text-[#1A1A2E]">Notifikasi</span>
                        {notifications.length > 0 && (
                          <div className="flex items-center gap-2">
                            {notifications.some(n => !n.read) && (
                              <>
                                <button
                                  onClick={() => {
                                    const updated = notifications.map(n => ({ ...n, read: true }));
                                    setNotifications(updated);
                                    if (user) localStorage.setItem(`sb_notifications_${user.email}`, JSON.stringify(updated));
                                    window.dispatchEvent(new Event('sb_notifications_changed'));
                                  }}
                                  className="text-[9px] text-[#C0392B] font-semibold hover:underline cursor-pointer"
                                >
                                  Tandai Dibaca
                                </button>
                                <span className="text-[#9B9BB5] text-[9px]">•</span>
                              </>
                            )}
                            <button
                              onClick={() => {
                                if (user) {
                                  const deletedSaved = localStorage.getItem(`sb_deleted_notifications_${user.email}`);
                                  const deletedIds = deletedSaved ? JSON.parse(deletedSaved) : [];
                                  const newDeleted = Array.from(new Set([...deletedIds, ...notifications.map(n => n.id)]));
                                  localStorage.setItem(`sb_deleted_notifications_${user.email}`, JSON.stringify(newDeleted));
                                  localStorage.setItem(`sb_notifications_${user.email}`, JSON.stringify([]));
                                }
                                setNotifications([]);
                                window.dispatchEvent(new Event('sb_notifications_changed'));
                              }}
                              className="text-[9px] text-[#4A4A6A] font-semibold hover:underline cursor-pointer"
                            >
                              Hapus Semua
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="max-h-64 overflow-y-auto divide-y divide-border">
                        {notifications.length > 0 ? (
                          notifications.map((notif) => {
                            const isUnread = !notif.read;
                            return (
                              <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif.id)}
                                className={`p-3 text-left cursor-pointer hover:bg-[#F8F9FA] flex gap-2 items-start ${isUnread ? 'bg-[#FDEDEC]/10' : ''}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${isUnread ? 'bg-[#C0392B]' : 'bg-transparent'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-bold ${isUnread ? 'text-[#1A1A2E]' : 'text-[#4A4A6A]'}`}>{notif.title}</p>
                                  <p className="text-[10px] text-[#9B9BB5] mt-0.5 leading-relaxed">{notif.message}</p>
                                  {notif.type === 'darurat' && isUnread && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleNotificationClick(notif.id);
                                      }}
                                      className="block mt-2 w-full py-1.5 rounded-lg bg-[#C0392B] hover:bg-[#922B21] text-white text-[9px] font-bold text-center transition-all shadow-sm cursor-pointer"
                                    >
                                      {getNotifAction(user?.role).label}
                                    </button>
                                  )}
                                  <span className="text-[9px] text-[#9B9BB5] block mt-1">{notif.time}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteNotification(notif.id, e)}
                                  className="p-1 rounded hover:bg-[#F4F4F8] text-[#9B9BB5] hover:text-[#C0392B] transition-colors cursor-pointer flex-shrink-0 self-start"
                                  title="Hapus"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-xs text-[#9B9BB5]">Tidak ada notifikasi.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isAuthenticated && user ? (
                <button
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Buka menu"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm" style={{ background: roleCfg?.color }}>
                  {user.avatar}
                </button>
              ) : (
                <Link to="/login">
                  <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm" style={{ background: 'linear-gradient(135deg,#C0392B,#7B241C)' }}>
                    <LogIn className="w-3.5 h-3.5" /> Masuk
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="h-16" />

      {/* ── Overlay ────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* ── Drawer ─────────────────────────────────────────── */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-white z-50 md:hidden shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#C0392B,#7B241C)' }}>
              <Droplets className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-bold text-[15px] text-[#1A1A2E]" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Suroboyo Bloods</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-[#9B9BB5] hover:bg-[#F4F4F8] transition-colors"
              aria-label="Toggle dark mode"
            >
              {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
            </button>
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Tutup menu"
              className="p-1.5 rounded-lg text-[#9B9BB5] hover:bg-[#F4F4F8] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* User card if logged in */}
          {isAuthenticated && user && roleCfg && (
            <div className="mx-3 mt-3 rounded-xl p-3 flex items-center gap-3" style={{ background: roleCfg.bg }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: roleCfg.color }}>
                {user.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1A1A2E] truncate">{user.name}</p>
                <p className="text-xs font-medium truncate" style={{ color: roleCfg.color }}>{user.org}</p>
              </div>
            </div>
          )}

          <nav className="px-3 py-4">
            {/* Core links */}
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#9B9BB5] px-3 pb-2">Menu Utama</p>
            <div className="space-y-0.5">
              {coreLinks.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} onClick={() => setDrawerOpen(false)}>
                  <div className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive(to) ? 'bg-[#FDEDEC] text-[#C0392B]' : 'text-[#4A4A6A] hover:bg-[#F4F4F8]'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive(to) ? 'bg-[#C0392B]/10' : 'bg-[#F4F4F8]'}`}>
                        <Icon className={`w-4 h-4 ${isActive(to) ? 'text-[#C0392B]' : 'text-[#9B9BB5]'}`} />
                      </div>
                      {label}
                    </div>
                    {isActive(to) && <ChevronRight className="w-4 h-4 text-[#C0392B]" />}
                  </div>
                </Link>
              ))}
            </div>

            {/* Dashboard link */}
            {isAuthenticated && user && roleNavExtra[user.role] && (
              <>
                <div className="h-4" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#9B9BB5] px-3 pb-2">Dashboard</p>
                <div className="space-y-0.5">
                  <Link to={roleNavExtra[user.role].to} onClick={() => setDrawerOpen(false)}>
                    <div className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive(roleNavExtra[user.role].to) ? 'bg-[#FDEDEC] text-[#C0392B]' : 'text-[#4A4A6A] hover:bg-[#F4F4F8]'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive(roleNavExtra[user.role].to) ? 'bg-[#C0392B]/10' : 'bg-[#F4F4F8]'}`}>
                          <LayoutDashboard className={`w-4 h-4 ${isActive(roleNavExtra[user.role].to) ? 'text-[#C0392B]' : 'text-[#9B9BB5]'}`} />
                        </div>
                        {roleNavExtra[user.role].label}
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#C0392B] opacity-60" />
                    </div>
                  </Link>
                </div>
              </>
            )}

          </nav>
        </div>

        {/* Drawer footer */}
        <div className="border-t border-border px-3 py-3 flex-shrink-0 space-y-2">
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#C0392B] hover:bg-[#FDEDEC] transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-[#FDEDEC] flex items-center justify-center">
                <LogOut className="w-4 h-4 text-[#C0392B]" />
              </div>
              Keluar dari Akun
            </button>
          ) : (
            <Link to="/login">
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors" style={{ background: 'linear-gradient(135deg,#C0392B,#7B241C)' }}>
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <LogIn className="w-4 h-4 text-white" />
                </div>
                Masuk ke Akun
              </div>
            </Link>
          )}
          <div className="bg-[#F7F7FB] rounded-xl px-4 py-2.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#27AE60] animate-pulse flex-shrink-0" />
            <p className="text-xs text-[#4A4A6A]"><span className="font-semibold">Sistem Online</span> · PMI × RS Surabaya</p>
          </div>
        </div>
      </div>
      <LogoutConfirmDialog
        isOpen={showLogoutDialog}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
      {isAuthenticated && user?.role === 'donor' && <DonorAIChat />}
    </>
  );
}

const getNotifAction = (role?: string) => {
  switch (role) {
    case 'pmi':
      return { to: '/dashboard/pmi?tab=requests', label: 'Proses Permintaan Darah →' };
    case 'rs':
      return { to: '/dashboard/rs?tab=order', label: 'Pantau Status Order →' };
    case 'driver':
      return { to: '/dashboard/driver', label: 'Lihat Tugas Kurir →' };
    case 'donor':
    default:
      return { to: '/events', label: 'Daftar Donor Sekarang →' };
  }
};

const getRoleDefaultNotifications = (role: string) => {
  switch (role) {
    case 'pmi':
      return [
        { id: 'N_PMI_01', type: 'darurat', title: '🚨 Permintaan Darah Baru!', message: 'Rumah Sakit A mengajukan permintaan 5 kantong O+ (Urgency: Darurat).', time: '1 menit lalu', read: false },
        { id: 'N_PMI_02', type: 'info', title: '⚠️ Stok Darah Kritis!', message: 'Stok darah B- di gudang PMI A kurang dari batas aman (tersisa 3 kantong).', time: '2 jam lalu', read: false },
        { id: 'N_PMI_03', type: 'info', title: '📅 Rapat Koordinasi PMI', message: 'Rapat koordinasi distribusi darah wilayah PMI A besok pukul 09:00 WIB.', time: '1 hari lalu', read: true }
      ];
    case 'rs':
      return [
        { id: 'N_RS_01', type: 'darurat', title: '📦 Pesanan Darah Dikirim', message: 'Order darah ORD001 (5 kantong O+) sedang dalam perjalanan bersama kurir Budi (ETA: 5 menit).', time: '5 menit lalu', read: false },
        { id: 'N_RS_02', type: 'reward', title: '✅ Permintaan Disetujui', message: 'Permintaan darah O- oleh Rumah Sakit A telah diverifikasi dan disetujui oleh PMI.', time: '15 menit lalu', read: false },
        { id: 'N_RS_03', type: 'info', title: '💡 Rekomendasi AI', message: 'Stok darah A+ Anda diprediksi habis dalam 2 hari berdasarkan data histori pemakaian.', time: '1 hari lalu', read: true }
      ];
    case 'driver':
      return [
        { id: 'N_DRV_01', type: 'darurat', title: '🚨 Tugas Pengantaran Baru!', message: 'Kirim 5 kantong O+ dari PMI A ke Rumah Sakit A. Segera ambil muatan.', time: '2 menit lalu', read: false },
        { id: 'N_DRV_02', type: 'reward', title: '✅ Pengiriman Selesai', message: 'Serah terima darah O- di Rumah Sakit C telah berhasil dikonfirmasi.', time: '3 jam lalu', read: false },
        { id: 'N_DRV_03', type: 'info', title: '⚠️ Kendala Rute', message: 'Rute Jl. Nginden terpantau padat. Gunakan rute alternatif untuk efisiensi pengiriman.', time: '1 hari lalu', read: true }
      ];
    case 'donor':
    default:
      return [
        { id: 'N001', type: 'darurat', title: '🚨 Darah O- Kritis!', message: 'PMI A sangat membutuhkan golongan darah O- saat ini. Hanya 4 kantong tersisa. Kamu salah satu pendonor terdekat.', time: '5 menit lalu', read: false },
        { id: 'N002', type: 'reminder', title: 'Kamu Sudah Bisa Donor Lagi', message: 'Selamat! Masa tunggu 3 bulanmu sudah selesai per 22 Januari 2026. Jadwalkan donor sekarang.', time: '1 hari lalu', read: false },
        { id: 'N003', type: 'reward', title: 'Reward Baru Tersedia', message: 'Kamu sudah cukup poin untuk menukar voucher Indomaret Rp25.000. Segera tukarkan sebelum kedaluwarsa!', time: '3 hari lalu', read: true },
        { id: 'N004', type: 'info', title: 'Event Donor Juli 2026', message: 'Event Kampanye Donor PMI Juli 2026 di Mall Galaxy Surabaya tinggal 9 hari lagi. Jangan lupa hadir!', time: '5 hari lalu', read: true }
      ];
  }
};

