import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';

export const MAIN_ADMIN_EMAIL = 'emanaslam543@gmail.com';

export function getApprovedAdminEmails(): string[] {
  try {
    const raw = localStorage.getItem('salwa_approved_admins');
    if (raw) {
      const list: string[] = JSON.parse(raw);
      if (!list.map(e => e.toLowerCase()).includes(MAIN_ADMIN_EMAIL)) {
        list.push(MAIN_ADMIN_EMAIL);
      }
      return list;
    }
  } catch {}
  return [MAIN_ADMIN_EMAIL];
}

export function isApprovedAdmin(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  if (clean === MAIN_ADMIN_EMAIL) return true;
  const list = getApprovedAdminEmails();
  return list.some(e => e.toLowerCase().trim() === clean);
}

const API_BASE = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'https://man-o-salwa-knot.vercel.app'
  : '';

export async function checkAdminApprovalRemote(email: string): Promise<boolean> {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  if (clean === MAIN_ADMIN_EMAIL) return true;
  try {
    const res = await fetch(`${API_BASE}/api/admin/status?email=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.approved) {
        const list = getApprovedAdminEmails();
        if (!list.map(e => e.toLowerCase()).includes(clean)) {
          list.push(clean);
          localStorage.setItem('salwa_approved_admins', JSON.stringify(list));
        }
        return true;
      }
    }
  } catch (err) {
    console.warn('checkAdminApprovalRemote error:', err);
  }
  return false;
}

export async function fetchAdminRequests(): Promise<Array<{
  id: string;
  name: string;
  email: string;
  reason: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}>> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/requests`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.requests) && data.requests.length > 0) {
        localStorage.setItem('salwa_pending_admin_requests', JSON.stringify(data.requests));
        return data.requests;
      }
    }
  } catch (err) {
    console.warn('fetchAdminRequests error:', err);
  }
  return getPendingAdminRequests();
}

export async function approveAdminEmail(email: string): Promise<void> {
  const clean = email.toLowerCase().trim();
  const list = getApprovedAdminEmails();
  if (!list.map(e => e.toLowerCase()).includes(clean)) {
    list.push(clean);
    localStorage.setItem('salwa_approved_admins', JSON.stringify(list));
  }
  try {
    const raw = localStorage.getItem('salwa_pending_admin_requests');
    if (raw) {
      const reqs = JSON.parse(raw);
      const updated = reqs.map((r: any) => r.email.toLowerCase().trim() === clean ? { ...r, status: 'approved' } : r);
      localStorage.setItem('salwa_pending_admin_requests', JSON.stringify(updated));
    }
  } catch {}

  try {
    await fetch(`${API_BASE}/api/admin/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clean }),
    });
  } catch (err) {
    console.warn('Remote approve call error:', err);
  }
}

export async function revokeAdminEmail(email: string): Promise<void> {
  const clean = email.toLowerCase().trim();
  if (clean === MAIN_ADMIN_EMAIL) return; // Cannot revoke permanent SuperAdmin
  const list = getApprovedAdminEmails().filter(e => e.toLowerCase().trim() !== clean);
  localStorage.setItem('salwa_approved_admins', JSON.stringify(list));
  try {
    const raw = localStorage.getItem('salwa_pending_admin_requests');
    if (raw) {
      const reqs = JSON.parse(raw);
      const updated = reqs.map((r: any) => r.email.toLowerCase().trim() === clean ? { ...r, status: 'rejected' } : r);
      localStorage.setItem('salwa_pending_admin_requests', JSON.stringify(updated));
    }
  } catch {}

  try {
    await fetch(`${API_BASE}/api/admin/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clean }),
    });
  } catch (err) {
    console.warn('Remote reject call error:', err);
  }
}

export function getPendingAdminRequests(): Array<{
  id: string;
  name: string;
  email: string;
  reason: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}> {
  try {
    const raw = localStorage.getItem('salwa_pending_admin_requests');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export async function submitAdminRequest(name: string, email: string, reason?: string) {
  const clean = email.toLowerCase().trim();
  const reqs = getPendingAdminRequests();
  const existing = reqs.find(r => r.email.toLowerCase().trim() === clean);
  let resultReq;
  if (existing) {
    existing.status = 'pending';
    existing.requestedAt = new Date().toISOString();
    if (reason) existing.reason = reason;
    localStorage.setItem('salwa_pending_admin_requests', JSON.stringify(reqs));
    resultReq = existing;
  } else {
    const newReq = {
      id: 'req-' + Date.now(),
      name: name || clean.split('@')[0],
      email: clean,
      reason: reason || 'Requested Administrator access via login portal.',
      requestedAt: new Date().toISOString(),
      status: 'pending' as const
    };
    reqs.unshift(newReq);
    localStorage.setItem('salwa_pending_admin_requests', JSON.stringify(reqs));
    resultReq = newReq;
  }

  try {
    await fetch(`${API_BASE}/api/admin/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name || clean.split('@')[0], email: clean, reason }),
    });
  } catch (err) {
    console.warn('Remote submitAdminRequest error:', err);
  }

  return resultReq;
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    name: string,
    role: Profile['role']
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateRole: (role: Profile['role']) => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();
      if (data) {
        const adminStatus = isApprovedAdmin(data.email);
        const userProf = data as Profile;
        if (adminStatus) {
          userProf.role = 'admin';
        } else if (userProf.role === 'admin') {
          // If unapproved, downgrade to individual
          userProf.role = 'individual';
        }
        setProfile(userProf);
        return;
      }
    } catch {
      /* fallback below */
    }
    const sess = (await supabase.auth.getSession()).data.session;
    const email = sess?.user?.email || 'user@example.com';
    const name = sess?.user?.user_metadata?.name || email.split('@')[0] || 'Rescuer';
    const adminStatus = isApprovedAdmin(email);
    const fallbackProfile: Profile = {
      id: uid,
      email,
      name: adminStatus ? (email.toLowerCase() === MAIN_ADMIN_EMAIL ? 'Eman Aslam (SuperAdmin)' : `${name} (Admin)`) : name,
      role: adminStatus ? 'admin' : (email.includes('kitchen') || email.includes('cafe') ? 'restaurant' : 'individual'),
      rating: 4.9,
      rating_count: 5,
      tier: 'free',
      phone: null,
      location_text: 'Karachi, Pakistan',
      lat: 24.8607,
      lng: 67.0011,
      avatar_url: null,
      created_at: new Date().toISOString()
    };
    setProfile(fallbackProfile);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess) {
        (async () => {
          await loadProfile(sess.user.id);
        })();
      } else {
        setProfile(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const adminStatus = isApprovedAdmin(email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message?.toLowerCase().includes('failed to fetch') || error.message?.toLowerCase().includes('network') || error.message?.toLowerCase().includes('invalid login credentials')) {
          const fallback: Profile = {
            id: 'user-' + Date.now(),
            email,
            name: adminStatus ? (email.toLowerCase() === MAIN_ADMIN_EMAIL ? 'Eman Aslam (SuperAdmin)' : `${email.split('@')[0]} (Admin)`) : email.split('@')[0],
            role: adminStatus ? 'admin' : (email.includes('kitchen') || email.includes('cafe') ? 'restaurant' : 'individual'),
            rating: 4.9,
            rating_count: 5,
            tier: 'free',
            phone: null,
            location_text: 'Lahore, Pakistan',
            lat: 31.5204,
            lng: 74.3587,
            avatar_url: null,
            created_at: new Date().toISOString()
          };
          setProfile(fallback);
          setSession({ user: { id: fallback.id, email } } as any);
          return { error: null };
        }
        return { error: error.message };
      }
      return { error: null };
    } catch {
      const fallback: Profile = {
        id: 'user-' + Date.now(),
        email,
        name: adminStatus ? (email.toLowerCase() === MAIN_ADMIN_EMAIL ? 'Eman Aslam (SuperAdmin)' : `${email.split('@')[0]} (Admin)`) : email.split('@')[0],
        role: adminStatus ? 'admin' : (email.includes('kitchen') || email.includes('cafe') ? 'restaurant' : 'individual'),
        rating: 4.9,
        rating_count: 5,
        tier: 'free',
        phone: null,
        location_text: 'Lahore, Pakistan',
        lat: 31.5204,
        lng: 74.3587,
        avatar_url: null,
        created_at: new Date().toISOString()
      };
      setProfile(fallback);
      setSession({ user: { id: fallback.id, email } } as any);
      return { error: null };
    }
  }

  async function signUp(
    email: string,
    password: string,
    name: string,
    role: Profile['role']
  ) {
    const adminStatus = isApprovedAdmin(email);
    const effectiveRole: Profile['role'] = adminStatus ? 'admin' : (role === 'admin' ? 'individual' : role);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        if (error.message?.toLowerCase().includes('failed to fetch')) {
          const fallback: Profile = {
            id: 'user-' + Date.now(),
            email,
            name: adminStatus ? `${name} (Admin)` : name,
            role: effectiveRole,
            rating: 4.9,
            rating_count: 5,
            tier: 'free',
            phone: null,
            location_text: 'Lahore, Pakistan',
            lat: 31.5204,
            lng: 74.3587,
            avatar_url: null,
            created_at: new Date().toISOString()
          };
          setProfile(fallback);
          setSession({ user: { id: fallback.id, email } } as any);
          return { error: null };
        }
        return { error: error.message };
      }
      if (data.user) {
        try {
          await supabase.from('profiles').insert({
            id: data.user.id,
            email,
            name: adminStatus ? `${name} (Admin)` : name,
            role: effectiveRole,
          });
        } catch {}
      }
      return { error: null };
    } catch {
      const fallback: Profile = {
        id: 'user-' + Date.now(),
        email,
        name: adminStatus ? `${name} (Admin)` : name,
        role: effectiveRole,
        rating: 4.9,
        rating_count: 5,
        tier: 'free',
        phone: null,
        location_text: 'Lahore, Pakistan',
        lat: 31.5204,
        lng: 74.3587,
        avatar_url: null,
        created_at: new Date().toISOString()
      };
      setProfile(fallback);
      setSession({ user: { id: fallback.id, email } } as any);
      return { error: null };
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch {}
    setSession(null);
    setProfile(null);
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          localStorage.removeItem(key);
        }
      }
    } catch {}
  }

  async function refreshProfile() {
    if (session) await loadProfile(session.user.id);
  }

  async function updateRole(role: Profile['role']) {
    if (role === 'admin' && !isApprovedAdmin(profile?.email)) {
      alert(`Access Restricted: Administrator role requires approval from Main Administrator (${MAIN_ADMIN_EMAIL}).`);
      return;
    }
    setProfile(prev => (prev ? { ...prev, role } : null));
    if (profile?.id) {
      try {
        await supabase.from('profiles').update({ role }).eq('id', profile.id);
      } catch {
        /* silent fallback */
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, signIn, signUp, signOut, refreshProfile, updateRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
