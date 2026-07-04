import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';
import AppFooter from './components/AppFooter';

// Lazy loading untuk seluruh komponen halaman demi optimasi performa FCP/LCP
const HomePage = lazy(() => import('./components/HomePage'));
const BloodSearch = lazy(() => import('./components/BloodSearch'));
const AddBloodStock = lazy(() => import('./components/AddBloodStock'));
const Login = lazy(() => import('./components/Login'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const Events = lazy(() => import('./components/Events'));
const Information = lazy(() => import('./components/Information'));
const PMIDashboard = lazy(() => import('./components/PMIDashboard'));
const HospitalDashboard = lazy(() => import('./components/HospitalDashboard'));
const DonorDashboard = lazy(() => import('./components/DonorDashboard'));
const GPSTracking = lazy(() => import('./components/GPSTracking'));
const QRCheckIn = lazy(() => import('./components/QRCheckIn'));
const RewardPage = lazy(() => import('./components/RewardPage'));
const DriverDashboard = lazy(() => import('./components/DriverDashboard'));
const NotFound = lazy(() => import('./components/NotFound'));
const AlurDonor = lazy(() => import('./components/AlurDonor'));

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background flex flex-col">
          <Navigation />
          <main className="flex-1">
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <div className="w-9 h-9 rounded-full border-4 border-[#C0392B]/20 border-t-[#C0392B] animate-spin" />
                <span className="text-xs font-semibold text-[#9B9BB5] uppercase tracking-wider">Memuat Halaman...</span>
              </div>
            }>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<Login />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/search" element={<BloodSearch />} />
                  <Route path="/add-stock" element={<AddBloodStock />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/alur" element={<AlurDonor />} />
                  <Route path="/info" element={<Information />} />
                  <Route path="/dashboard" element={<Dashboard />} />

                  {/* Fitur Baru */}
                  <Route path="/ai-matching" element={<Navigate to="/search?tab=ai-matching" replace />} />
                  <Route path="/gps-tracking" element={<GPSTracking />} />
                  <Route path="/qr-checkin" element={
                    <ProtectedRoute allowedRoles={['pmi', 'rs']}><QRCheckIn /></ProtectedRoute>
                  } />
                  <Route path="/rewards" element={
                    <ProtectedRoute allowedRoles={['donor']}><RewardPage /></ProtectedRoute>
                  } />

                  {/* Protected: role-based dashboards */}
                  <Route path="/dashboard/pmi" element={
                    <ProtectedRoute allowedRoles={['pmi']}><PMIDashboard /></ProtectedRoute>
                  } />
                  <Route path="/dashboard/rs" element={
                    <ProtectedRoute allowedRoles={['rs']}><HospitalDashboard /></ProtectedRoute>
                  } />
                  <Route path="/dashboard/donor" element={
                    <ProtectedRoute allowedRoles={['donor']}><DonorDashboard /></ProtectedRoute>
                  } />
                  <Route path="/dashboard/driver" element={
                    <ProtectedRoute allowedRoles={['driver']}><DriverDashboard /></ProtectedRoute>
                  } />

                  {/* 404 — catch all */}
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </main>
          <AppFooter />
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}
