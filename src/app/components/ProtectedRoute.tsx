import { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuth, UserRole } from '../context/AuthContext';
import { Droplets, Lock } from 'lucide-react';
import { Link } from 'react-router';

interface ProtectedRouteProps {
  children?: ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Wrong role — show forbidden screen
    const roleLabels: Record<UserRole, string> = {
      pmi: 'PMI',
      rs: 'Rumah Sakit',
      donor: 'Pendonor',
      driver: 'Driver Ambulans',
      superadmin: 'Super Admin',
    };
    const dashboardLink: Record<UserRole, string> = {
      pmi: '/dashboard/pmi',
      rs: '/dashboard/rs',
      donor: '/dashboard/donor',
      driver: '/dashboard/driver',
      superadmin: '/dashboard/superadmin',
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7FB] px-4">
        <div className="bg-white rounded-2xl border border-border shadow-sm p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-[#FDEDEC] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-[#C0392B]" />
          </div>
          <h2 className="text-xl font-bold text-[#1A1A2E] mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Akses Ditolak
          </h2>
          <p className="text-sm text-[#4A4A6A] mb-1">
            Halaman ini hanya untuk{' '}
            <span className="font-semibold text-[#C0392B]">
              {allowedRoles.map(r => roleLabels[r]).join(' / ')}
            </span>.
          </p>
          <p className="text-xs text-[#9B9BB5] mb-6">
            Kamu login sebagai <span className="font-semibold">{roleLabels[user.role]}</span>.
          </p>
          <Link to={dashboardLink[user.role]}>
            <button className="w-full py-2.5 rounded-xl bg-[#C0392B] text-white text-sm font-semibold hover:bg-[#922B21] transition-colors flex items-center justify-center gap-2">
              <Droplets className="w-4 h-4" />
              Ke Dashboard Saya
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}
