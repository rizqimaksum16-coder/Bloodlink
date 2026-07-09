import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';
import AppFooter from './components/AppFooter';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy loading untuk seluruh komponen halaman demi optimasi performa FCP/LCP
const LandingPage = lazy(() => import('./components/LandingPage'));
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
const SuperAdminDashboard = lazy(() => import('./components/SuperAdminDashboard'));

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background flex flex-col">
          <Navigation />
          <main className="flex-1">
            <ErrorBoundary>
              <Suspense fallback={
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                  <div className="w-9 h-9 rounded-full border-4 border-[#C0392B]/20 border-t-[#C0392B] animate-spin" />
                  <span className="text-xs font-semibold text-[#9B9BB5] uppercase tracking-wider">Memuat Halaman...</span>
                </div>
              }>
              <Routes>
                {/* Public */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/search" element={
                    <ProtectedRoute allowedRoles={['donor', 'pmi', 'rs']}><BloodSearch /></ProtectedRoute>
                  } />
                  <Route path="/add-stock" element={
                    <ProtectedRoute allowedRoles={['pmi']}><AddBloodStock /></ProtectedRoute>
                  } />
                  <Route path="/events" element={
                    <ProtectedRoute allowedRoles={['donor', 'pmi', 'rs']}><Events /></ProtectedRoute>
                  } />
                  <Route path="/alur" element={
                    <ProtectedRoute allowedRoles={['donor', 'driver']}><AlurDonor /></ProtectedRoute>
                  } />
                  <Route path="/info" element={
                    <ProtectedRoute allowedRoles={['donor', 'pmi', 'rs', 'driver']}><Information /></ProtectedRoute>
                  } />
                  <Route path="/dashboard" element={
                    <ProtectedRoute allowedRoles={['donor', 'pmi', 'rs', 'driver']}><Dashboard /></ProtectedRoute>
                  } />

                  {/* Fitur Baru */}
                  <Route path="/ai-matching" element={<Navigate to="/search?tab=ai-matching" replace />} />
                  <Route path="/gps-tracking" element={<Navigate to="/" replace />} />
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
                  <Route path="/dashboard/superadmin" element={
                    <ProtectedRoute allowedRoles={['superadmin']}><SuperAdminDashboard /></ProtectedRoute>
                  } />

                  {/* 404 — catch all */}
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
            </ErrorBoundary>
          </main>
          <AppFooter />
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}
