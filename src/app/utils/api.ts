// Client API Layer - Connecting React Frontend to Express + MySQL Backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper for JWT Auth Headers
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('bloodlink_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

// Generic Fetch Wrapper with Fallback Support
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}, fallbackData?: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers
      }
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.warn(`[API] Fallback triggered for ${endpoint}:`, (err as Error).message);
    if (fallbackData !== undefined) {
      return fallbackData;
    }
    throw err;
  }
}

// API Services
export const api = {
  // Auth API
  auth: {
    login: (email: string, password: string) =>
      apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),

    register: (data: { name: string; email: string; password: string; role?: string; blood_type?: string }) =>
      apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getProfile: () => apiFetch('/auth/me')
  },

  // Donors API
  donors: {
    getProfile: (email: string, fallback?: any) =>
      apiFetch(`/donors/profile?email=${encodeURIComponent(email)}`, {}, fallback),

    getHistory: (email: string, fallback?: any[]) =>
      apiFetch(`/donors/history?email=${encodeURIComponent(email)}`, {}, fallback),

    updateProfile: (data: any) =>
      apiFetch('/donors/profile', {
        method: 'PUT',
        body: JSON.stringify(data)
      })
  },

  // Events API
  events: {
    getAll: (fallback?: any[]) => apiFetch('/events', {}, fallback),

    register: (data: { event_id: number; donor_name: string; donor_email: string; blood_type?: string }) =>
      apiFetch('/events/register', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    checkIn: (data: { qr_data?: string; booking_id?: string }) =>
      apiFetch('/events/checkin', {
        method: 'POST',
        body: JSON.stringify(data)
      })
  },

  // Blood Stock API
  stock: {
    getHospitalStock: (fallback?: any[]) => apiFetch('/stock/hospital', {}, fallback),

    getPMIStock: (fallback?: any[]) => apiFetch('/stock/pmi', {}, fallback),

    updatePMIStock: (pmi_name: string, blood_type: string, stock: number) =>
      apiFetch('/stock/pmi', {
        method: 'PUT',
        body: JSON.stringify({ pmi_name, blood_type, stock })
      }),

    getActivityLogs: (fallback?: any[]) => apiFetch('/stock/activity-logs', {}, fallback)
  },

  // Orders & Deliveries API
  orders: {
    getRequests: (fallback?: any[]) => apiFetch('/orders/requests', {}, fallback),

    createRequest: (data: any) =>
      apiFetch('/orders/requests', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getDeliveries: (fallback?: any[]) => apiFetch('/orders/deliveries', {}, fallback),

    updateDeliveryStatus: (id: string, data: { status?: string; pct?: number; eta?: string }) =>
      apiFetch(`/orders/deliveries/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
  },

  // Rewards API
  rewards: {
    getAll: (fallback?: any[]) => apiFetch('/rewards', {}, fallback),

    redeem: (reward_id: string, donor_email: string) =>
      apiFetch('/rewards/redeem', {
        method: 'POST',
        body: JSON.stringify({ reward_id, donor_email })
      })
  }
};
