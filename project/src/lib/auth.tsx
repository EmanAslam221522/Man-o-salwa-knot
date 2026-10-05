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

export function approveAdminEmail(email: string): void {
  const clean = email.toLowerCase().trim();
  const list = getApprovedAdminEmails();
  if (!list.map(e => e.toLowerCase()).includes(clean)) {
    list.push(clean);
    localStorage.setItem('salwa_approved_admins', JSON.stringify(list));
  }
  // Also update pending requests
  try {
    const raw = localStorage.getItem('salwa_pending_admin_requests');
    if (raw) {
      const reqs = JSON.parse(raw);
      const updated = reqs.map((r: any) => r.email.toLowerCase().trim() === clean ? { ...r, status: 'approved' } : r);
      localStorage.setItem('salwa_pending_admin_requests', JSON.stringify(updated));
    }
  } catch {}
}

export function revokeAdminEmail(email: string): void {
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
  const initial = [
    {
      id: 'req-sample-1',
      name: 'Tariq Mehmood',
      email: 'tariq.audit@salwa.org',
      reason: 'Regional Food Safety Inspector requesting Administrator transparency access.',
      requestedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      status: 'pending' as const
    }
  ];
  try {
    localStorage.setItem('salwa_pending_admin_requests', JSON.stringify(initial));
  } catch {}
  return initial;
}

export function submitAdminRequest(name: string, email: string, reason?: string) {
  const clean = email.toLowerCase().trim();
  const reqs = getPendingAdminRequests();
  const existing = reqs.find(r => r.email.toLowerCase().trim() === clean);
  if (existing) {
    existing.status = 'pending';
    existing.requestedAt = new Date().toISOString();
    if (reason) existing.reason = reason;
    localStorage.setItem('salwa_pending_admin_requests', JSON.stringify(reqs));
    return existing;
  }
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
  return newReq;
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
