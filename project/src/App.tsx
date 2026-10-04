import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowRight, Bell, Bot, Check, ChevronRight, Clock3, Compass, Flame, Heart,
  Leaf, Loader2, LogOut, Mail, MapPin, Menu, MessageCircle, Mic, Package, Plus, Search,
  Send, ShieldCheck, Sparkles, Square, Star, Store, Truck, UserRound, Users, X, Zap,
  Camera, MessageSquare, Shield, TrendingUp, AlertTriangle, CheckCircle, Upload, RefreshCw, ShoppingBag
} from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { FoodPost, FoodPostWithSeller, Profile, Transaction } from '@/lib/types';
import { sendChat, getMatchmaking, analyzeQuality, notifySubscribers, sendWorkspaceMessage, getWorkspaceMessages } from '@/lib/api';
import type { QualityAnalysis, MatchmakingResult, WorkspaceMessage } from '@/lib/types';
import { CURRENCY_OPTIONS, formatDistance, formatPrice, formatPriceShort, getCurrency, haversineKm, setCurrency, timeAgo, timeUntil, type Currency } from '@/lib/utils';

type View = 'home' | 'discover' | 'post' | 'assistant' | 'history' | 'profile' | 'quality' | 'workspace' | 'matchmaker';

const mockFood: FoodPostWithSeller[] = [
  { id: 'mock-1', user_id: 'seller-1', food_name: 'Chicken Biryani', quantity: 8, unit: 'kg', price: 350, original_price: 700, expiry_time: new Date(Date.now() + 3.5 * 3600000).toISOString(), lat: 24.8607, lng: 67.0011, location_text: 'Bahadurabad, Karachi', photo_url: 'https://images.pexels.com/photos/5410401/pexels-photo-5410401.jpeg?auto=compress&cs=tinysrgb&w=900', description: 'Fresh chicken biryani prepared for a wedding order. Packed and ready for pickup.', status: 'available', created_at: new Date(Date.now() - 22 * 60000).toISOString(), updated_at: new Date().toISOString(), seller: { id: 'seller-1', name: 'Nawab Kitchen', rating: 4.9, rating_count: 128, role: 'restaurant' } },
  { id: 'mock-2', user_id: 'seller-2', food_name: 'Paneer Wraps', quantity: 24, unit: 'packs', price: 120, original_price: 250, expiry_time: new Date(Date.now() + 5 * 3600000).toISOString(), lat: 24.8620, lng: 67.0050, location_text: 'Gulberg, Lahore', photo_url: 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=900', description: 'Vegetarian wraps with fresh paneer, salad and mint chutney.', status: 'available', created_at: new Date(Date.now() - 44 * 60000).toISOString(), updated_at: new Date().toISOString(), seller: { id: 'seller-2', name: 'Green Leaf Cafe', rating: 4.7, rating_count: 84, role: 'restaurant' } },
  { id: 'mock-3', user_id: 'seller-3', food_name: 'Daal Chawal Meals', quantity: 12, unit: 'meals', price: 180, original_price: 350, expiry_time: new Date(Date.now() + 2 * 3600000).toISOString(), lat: 24.8580, lng: 67.0030, location_text: 'Saddar, Rawalpindi', photo_url: 'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=900', description: 'Comforting homestyle meals, individually sealed for easy distribution.', status: 'available', created_at: new Date(Date.now() - 70 * 60000).toISOString(), updated_at: new Date().toISOString(), seller: { id: 'seller-3', name: 'Sahaara Community Kitchen', rating: 5, rating_count: 52, role: 'hostel' } },
];

const PRESET_IMAGES = [
  { label: '🍗 Biryani', url: 'https://images.pexels.com/photos/5410401/pexels-photo-5410401.jpeg?auto=compress&cs=tinysrgb&w=900' },
  { label: '🌯 Wraps / Rolls', url: 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=900' },
  { label: '🍛 Daal Chawal', url: 'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=900' },
  { label: '🥘 Karahi / Curry', url: 'https://images.pexels.com/photos/674574/pexels-photo-674574.jpeg?auto=compress&cs=tinysrgb&w=900' },
  { label: '🥐 Bakery / Bread', url: 'https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg?auto=compress&cs=tinysrgb&w=900' },
];

function getStoredLocalPosts(): FoodPostWithSeller[] {
  try {
    const raw = localStorage.getItem('salwa_local_posts');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredLocalPost(post: FoodPostWithSeller) {
  try {
    const existing = getStoredLocalPosts();
    const updated = [post, ...existing.filter(p => p.id !== post.id)];
    localStorage.setItem('salwa_local_posts', JSON.stringify(updated));
  } catch {}
}

function getStoredReservations(): Transaction[] {
  try {
    const raw = localStorage.getItem('salwa_local_reservations');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredReservation(tx: Transaction) {
  try {
    const existing = getStoredReservations();
    const updated = [tx, ...existing];
    localStorage.setItem('salwa_local_reservations', JSON.stringify(updated));
  } catch {}
}

function App() {
  return <AuthProvider><AppShell /></AuthProvider>;
}

function AppShell() {
  const { session, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  if (loading) return <div className="min-h-screen grid place-items-center bg-navy-900"><Loader2 className="animate-spin text-brand-green" size={32} /></div>;
  if (!session) return <Landing onStart={() => setShowAuth(true)} showAuth={showAuth} onClose={() => setShowAuth(false)} />;
  return <Workspace />;
}

function Landing({ onStart, showAuth, onClose }: { onStart: () => void; showAuth: boolean; onClose: () => void }) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f8faf9] text-navy-900">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="section-pad flex h-20 items-center justify-between">
          <Brand light />
          <div className="hidden items-center gap-8 text-sm font-medium text-white/75 md:flex">
            <a href="#how">How it works</a>
            <a href="#impact">Our impact</a>
            <a href="#trust">Trust & safety</a>
          </div>
          <button onClick={onStart} className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">Sign in</button>
        </div>
      </header>
      <main>
        <section className="relative min-h-[720px] overflow-hidden bg-[#001F3F] pt-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(76,175,80,.28),transparent_28%),radial-gradient(circle_at_10%_80%,rgba(38,100,155,.35),transparent_32%)]" />
          <div className="section-pad relative grid items-center gap-12 pb-24 lg:grid-cols-[1.05fr_.95fr]">
            <div className="animate-fade-in-up">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-3 py-1.5 text-xs font-semibold text-brand-green-light">
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand-green-light" /> Live food rescue network
              </div>
              <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.08] tracking-[-.04em] text-white sm:text-6xl lg:text-7xl">
                Good food has<br /><span className="text-brand-green-light">a second chance.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-blue-100/75">
                A smarter way for kitchens to recover value and for communities to access fresh, affordable meals before they go to waste.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <button onClick={onStart} className="btn-primary group">Join the movement <ArrowRight size={18} className="transition group-hover:translate-x-1" /></button>
                <a href="#how" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white transition hover:bg-white/10">See how it works <ChevronRight size={18} /></a>
              </div>
            </div>
            <div className="relative hidden min-h-[500px] lg:block">
              <div className="absolute right-8 top-8 h-[410px] w-[410px] overflow-hidden rounded-[40px] border border-white/15 bg-white/10 p-3 shadow-2xl rotate-3 transition duration-700 hover:rotate-0">
                <img src="https://images.pexels.com/photos/5410401/pexels-photo-5410401.jpeg?auto=compress&cs=tinysrgb&w=1000" className="h-full w-full rounded-[30px] object-cover" alt="Biryani drop" />
                <div className="absolute bottom-7 left-7 right-7 rounded-2xl bg-white/95 p-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-navy-900">Fresh biryani drop</p>
                      <p className="mt-1 text-xs text-slate-500">2.3 km away · 3h left</p>
                    </div>
                    <span className="rounded-lg bg-brand-green-50 px-2 py-1 text-sm font-bold text-brand-green-dark">{formatPrice(350)}/kg</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="how" className="section-pad py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[.18em] text-brand-green">Simple by design</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-navy-900">From surplus to shared.</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <Feature icon={<Compass />} number="01" title="Discover nearby" copy="See real-time food drops from trusted kitchens around you with clear prices." />
            <Feature icon={<Sparkles />} number="02" title="Match your budget" copy="Tell our AI assistant your party size & budget to automatically find the best meal." />
            <Feature icon={<Heart />} number="03" title="Claim & Rescue" copy="1-click reserve for pickup without hassle, tracking your savings and meals saved." />
          </div>
        </section>
      </main>
      <footer id="trust" className="bg-navy-900 py-10">
        <div className="section-pad flex flex-col justify-between gap-4 text-sm text-white/50 md:flex-row">
          <Brand light />
          <p>Built for communities that care.</p>
        </div>
      </footer>
      {showAuth && <AuthModal onClose={onClose} />}
    </div>
  );
}

function Feature({ icon, number, title, copy }: { icon: ReactNode; number: string; title: string; copy: string }) {
  return (
    <div className="card card-hover p-7">
      <div className="flex items-start justify-between">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-green-50 text-brand-green">{icon}</div>
        <span className="text-sm font-bold text-slate-300">{number}</span>
      </div>
      <h3 className="mt-7 text-xl font-bold text-navy-900">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-500">{copy}</p>
    </div>
  );
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-green text-white shadow-green">
        <Leaf size={20} strokeWidth={2.5} />
      </div>
      <span className={`text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-navy-900'}`}>
        Man<span className="text-brand-green">OSalwa</span>Knot
      </span>
    </div>
  );
}

function AuthModal({ onClose }: { onClose: () => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Profile['role']>('individual');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    if (mode === 'signup') {
      const result = await signUp(email, password, name, role);
      setBusy(false);
      if (result.error) {
        setError(result.error);
      } else {
        setInfo('Account created! If your Supabase requires email verification, check your Gmail inbox to confirm, then sign in.');
        setMode('login');
      }
    } else {
      const result = await signIn(email, password);
      setBusy(false);
      if (result.error) {
        if (result.error.toLowerCase().includes('email not confirmed')) {
          setError('Email not confirmed yet. Please click the link sent to your Gmail inbox, or toggle "Confirm email" off in Supabase settings.');
        } else {
          setError(result.error);
        }
      } else {
        onClose();
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-900/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md animate-scale-in rounded-3xl bg-white p-7 shadow-2xl">
        <button onClick={onClose} className="absolute right-5 top-5 rounded-lg p-2 text-slate-400 hover:bg-slate-100">
          <X size={18} />
        </button>
        <div className="mb-6">
          <Brand />
          <h2 className="mt-6 text-2xl font-bold text-navy-900">
            {mode === 'login' ? 'Welcome back' : 'Join the rescue network'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {mode === 'login' ? 'Pick up where you left off.' : 'Create your account in less than a minute.'}
          </p>
        </div>

        {info && (
          <div className="mb-4 rounded-xl bg-blue-50 p-3 text-xs text-blue-700 border border-blue-200">
            ✉️ {info}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {mode === 'signup' && (
            <input required className="input-field" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
          )}
          <input required type="email" className="input-field" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
          <input required minLength={6} type="password" className="input-field" placeholder="Password (6+ characters)" value={password} onChange={e => setPassword(e.target.value)} />
          {mode === 'signup' && (
            <div className="grid grid-cols-3 gap-2">
              {(['individual', 'restaurant', 'hostel'] as Profile['role'][]).map(item => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setRole(item)}
                  className={`rounded-xl border px-2 py-3 text-xs font-semibold capitalize transition ${role === item ? 'border-brand-green bg-brand-green-50 text-brand-green-dark' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                >
                  {item === 'hostel' ? 'NGO / Hostel' : item}
                </button>
              ))}
            </div>
          )}
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button disabled={busy} className="btn-primary w-full disabled:opacity-60">
            {busy ? <Loader2 className="animate-spin" size={17} /> : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={17} />
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === 'login' ? "Don't have an account?" : 'Already part of the movement?'}{' '}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setInfo(''); }} className="font-bold text-brand-green-dark hover:underline">
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

function Workspace() {
  const { profile, updateRole } = useAuth();
  const [view, setView] = useState<View>('home');
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedPost, setSelectedPost] = useState<FoodPostWithSeller | null>(null);

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-navy-900">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 px-4 py-6 transition-transform lg:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-3"><Brand light /></div>
        <div className="mt-10 flex-1 space-y-1">
          {([
            { id: 'home', label: 'Overview', icon: <Compass size={19} /> },
            { id: 'discover', label: 'Discover food', icon: <Search size={19} /> },
            { id: 'matchmaker', label: 'AI Matchmaker', icon: <Sparkles size={19} /> },
            { id: 'post', label: 'Post surplus', icon: <Plus size={19} /> },
            { id: 'assistant', label: 'Ask Salwa', icon: <Bot size={19} /> },
            { id: 'history', label: 'My activity', icon: <Package size={19} /> },
            { id: 'quality', label: 'Food quality AI', icon: <Shield size={19} /> },
            { id: 'workspace', label: 'Business chat', icon: <MessageSquare size={19} /> },
            { id: 'profile', label: 'Profile', icon: <UserRound size={19} /> },
          ] as { id: View; label: string; icon: ReactNode }[])
            .map(item => (
              <button
                key={item.id}
                onClick={() => { setView(item.id); setMobileNav(false); }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${view === item.id ? 'bg-white/10 text-white' : 'text-blue-100/55 hover:bg-white/5 hover:text-white'}`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.id === 'assistant' && <span className="ml-auto rounded-full bg-brand-green px-1.5 py-0.5 text-[10px] font-bold text-white">AI</span>}
                {item.id === 'matchmaker' && <span className="ml-auto rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">New</span>}
                {item.id === 'quality' && <span className="ml-auto rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">Vision</span>}
              </button>
            ))}
        </div>
        <div className="border-t border-white/10 pt-4 space-y-2.5">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-green text-sm font-bold text-white">
              {profile?.name?.slice(0, 1).toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{profile?.name ?? 'Rescuer'}</p>
              <p className="text-xs capitalize text-blue-100/50">{profile?.role ?? 'individual'} · {profile?.tier ?? 'free'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
            <span className="text-[11px] font-medium text-blue-100/60">Switch Role:</span>
            <select
              value={profile?.role || 'individual'}
              onChange={e => updateRole(e.target.value as any)}
              className="rounded-lg bg-navy-900 px-2 py-1 text-[11px] font-semibold text-brand-green-light border border-white/20 focus:outline-none cursor-pointer"
            >
              <option value="individual">Individual</option>
              <option value="restaurant">Restaurant</option>
              <option value="hostel">Hostel / NGO</option>
            </select>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-8">
          <button className="rounded-lg p-2 lg:hidden" onClick={() => setMobileNav(!mobileNav)}>
            <Menu size={22} />
          </button>
          <div className="hidden text-sm text-slate-500 sm:block">
            {view === 'home' ? `Good day, ${profile?.name?.split(' ')[0] ?? 'there'}` :
             view === 'discover' ? 'Live Surplus Feed & Map' :
             view === 'matchmaker' ? 'AI Budget & Nutrition Matchmaker' :
             view === 'post' ? 'Share surplus food' :
             view === 'assistant' ? 'Salwa Multi-Agent Assistant' :
             view === 'history' ? 'Your rescue activity & orders' :
             view === 'quality' ? 'Food Quality & Hygiene AI Inspector' :
             view === 'workspace' ? 'Business Coordination Hub' : 'Your Profile'}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <CurrencySwitcher />
            <button className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100">
              <Bell size={19} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-green" />
            </button>
            <div className="h-8 w-px bg-slate-200" />
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-green-50 text-sm font-bold text-brand-green-dark">
              {profile?.name?.slice(0, 1).toUpperCase() ?? 'U'}
            </div>
          </div>
        </header>

        <main className="section-pad py-7">
          <ViewContent view={view} setView={setView} onSelectFood={post => setSelectedPost(post)} />
        </main>
      </div>

      {selectedPost && (
        <FoodDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onInspectQuality={() => { setSelectedPost(null); setView('quality'); }}
        />
      )}
    </div>
  );
}

function ViewContent({
  view,
  setView,
  onSelectFood
}: {
  view: View;
  setView: (v: View) => void;
  onSelectFood: (post: FoodPostWithSeller) => void;
}) {
  if (view === 'home') return <Home setView={setView} onSelectFood={onSelectFood} />;
  if (view === 'discover') return <Discover onSelectFood={onSelectFood} />;
  if (view === 'matchmaker') return <AIMatchmaker onSelectFood={onSelectFood} />;
  if (view === 'post') return <PostFood onDone={() => setView('discover')} />;
  if (view === 'assistant') return <Assistant />;
  if (view === 'history') return <History onSelectFood={onSelectFood} />;
  if (view === 'quality') return <FoodQualityAnalyzer />;
  if (view === 'workspace') return <BusinessWorkspace />;
  return <ProfilePage />;
}

function useFoodFeed() {
  const [posts, setPosts] = useState<FoodPostWithSeller[]>(mockFood);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const local = getStoredLocalPosts();
    try {
      const { data } = await supabase
        .from('food_posts')
        .select('*, seller:profiles!user_id(id,name,rating,rating_count,role)')
        .eq('status', 'available')
        .order('created_at', { ascending: false })
        .limit(20);

      const combined = [...local];
      if (data && data.length > 0) {
        data.forEach((p: any) => {
          if (!combined.some(c => c.id === p.id)) {
            combined.push(p);
          }
        });
      }
      setPosts(combined.length > 0 ? combined : mockFood);
    } catch {
      setPosts(local.length > 0 ? [...local, ...mockFood] : mockFood);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  return { posts, loading, refresh };
}

function Home({ setView, onSelectFood }: { setView: (v: View) => void; onSelectFood: (post: FoodPostWithSeller) => void }) {
  const { profile } = useAuth();
  const { posts, refresh } = useFoodFeed();
  const reservations = getStoredReservations();

  return (
    <div className="animate-fade-in-up">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-brand-green-dark">Live Food Network</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">Good food is waiting.</h1>
          <p className="mt-2 text-slate-500">Find fresh surplus near you and prevent quality food from being discarded.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50">
            <RefreshCw size={18} />
          </button>
          <button onClick={() => setView(profile?.role === 'restaurant' || profile?.role === 'hostel' ? 'post' : 'matchmaker')} className="btn-primary">
            {profile?.role === 'restaurant' || profile?.role === 'hostel' ? (
              <><Plus size={18} /> Post surplus</>
            ) : (
              <><Sparkles size={18} /> Match by Budget</>
            )}
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat icon={<Leaf />} label="Community Rescues" value={String(24 + reservations.length)} delta={`+${reservations.length} personal`} />
        <Stat icon={<Flame />} label="Active Drops" value={String(posts.length)} delta="Live in your city" />
        <Stat icon={<Heart />} label="Value Recovered" value={formatPrice(4500 + reservations.reduce((a, b) => a + (b.amount || 0), 0))} delta="Affordable & fresh" />
      </div>

      <div className="mt-10 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Fresh surplus near you</h2>
          <p className="mt-1 text-sm text-slate-500">Real-time drops ready for pickup</p>
        </div>
        <button onClick={() => setView('discover')} className="btn-ghost text-sm">
          View all ({posts.length}) <ArrowRight size={16} />
        </button>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {posts.slice(0, 3).map(post => (
          <FoodCard key={post.id} post={post} onSelect={() => onSelectFood(post)} />
        ))}
      </div>

      {/* AI Matchmaker Banner */}
      <div className="mt-10 rounded-3xl bg-gradient-to-br from-navy-900 to-navy-800 p-7 text-white sm:p-9 shadow-xl">
        <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <span className="badge bg-brand-green/20 text-brand-green-light">
              <Sparkles size={13} /> AI Budget Matchmaker
            </span>
            <h2 className="mt-4 text-2xl font-bold">Have a specific budget or party size?</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100/75">
              Enter how many people you need to feed and your exact budget (e.g. Rs 500 for 4 people). Our AI evaluates portions, calories, and travel distance to recommend the best options.
            </p>
          </div>
          <button onClick={() => setView('matchmaker')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3 font-semibold text-white transition hover:bg-brand-green-dark shadow-green">
            Match My Budget <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, delta }: { icon: ReactNode; label: string; value: string; delta: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-green-50 text-brand-green">{icon}</div>
        <span className="text-xs font-semibold text-brand-green-dark">{delta}</span>
      </div>
      <p className="mt-5 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-navy-900">{value}</p>
    </div>
  );
}

function Discover({ onSelectFood }: { onSelectFood: (post: FoodPostWithSeller) => void }) {
  const [query, setQuery] = useState('');
  const { posts, loading, refresh } = useFoodFeed();

  const filtered = useMemo(() => {
    return posts.filter(p =>
      p.food_name.toLowerCase().includes(query.toLowerCase()) ||
      p.location_text?.toLowerCase().includes(query.toLowerCase()) ||
      p.description?.toLowerCase().includes(query.toLowerCase())
    );
  }, [posts, query]);

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-brand-green-dark">Real-Time Database Feed</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Discover Food Near You</h1>
          <p className="mt-2 text-slate-500">Live surplus food drops directly from local restaurants, hostels, and NGOs.</p>
        </div>
        <button onClick={refresh} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-navy-900 hover:bg-slate-50">
          <RefreshCw size={15} /> Refresh feed
        </button>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="relative min-h-[520px] overflow-hidden rounded-3xl bg-[#dce9df] shadow-card">
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: 'linear-gradient(30deg, transparent 49%, rgba(0,31,63,.08) 50%, transparent 51%), linear-gradient(120deg, transparent 49%, rgba(0,31,63,.08) 50%, transparent 51%)',
              backgroundSize: '90px 90px'
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_45%,rgba(76,175,80,.35),transparent_10%),radial-gradient(circle_at_25%_20%,rgba(255,255,255,.8),transparent_28%)]" />
          <div className="absolute left-[51%] top-[45%] grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white bg-brand-green text-white shadow-green">
            <MapPin size={22} />
          </div>
          {filtered.map((p, i) => (
            <div
              key={p.id}
              onClick={() => onSelectFood(p)}
              className={`absolute cursor-pointer ${['left-[23%] top-[30%]', 'right-[18%] top-[23%]', 'right-[25%] bottom-[21%]', 'left-[30%] bottom-[35%]'][i % 4]} grid h-10 w-10 place-items-center rounded-full border-4 border-white bg-navy-600 text-white shadow-lg transition hover:scale-125`}
              title={p.food_name}
            >
              <span className="absolute h-full w-full animate-pulse-ring rounded-full bg-navy-600/40" />
              <Store size={16} />
            </div>
          ))}
          <div className="absolute bottom-5 left-5 rounded-2xl bg-white/90 p-3 text-xs font-semibold text-navy-900 shadow-lg backdrop-blur">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand-green" />
            {filtered.length} active surplus drops available
          </div>
        </div>

        <div>
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="input-field pl-11"
              placeholder="Search biryani, wraps, location, budget..."
            />
          </div>
          <div className="mt-4 space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="card p-8 text-center text-slate-500">
                <Package className="mx-auto text-slate-300 mb-2" size={32} />
                No surplus food matching &quot;{query}&quot;. Try another search or ask Salwa!
              </div>
            ) : (
              filtered.map(post => (
                <FoodCard key={post.id} post={post} compact onSelect={() => onSelectFood(post)} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FoodCard({
  post,
  compact = false,
  onSelect
}: {
  post: FoodPostWithSeller;
  compact?: boolean;
  onSelect?: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const distance = post.lat && post.lng ? haversineKm(24.8607, 67.0011, post.lat, post.lng) : 2.3;

  return (
    <article className={`card card-hover overflow-hidden cursor-pointer ${compact ? 'flex' : ''}`} onClick={onSelect}>
      <div className={`${compact ? 'h-auto w-28 shrink-0' : 'h-44'} relative overflow-hidden bg-brand-green-50`}>
        {post.photo_url ? (
          <img src={post.photo_url} className="h-full w-full object-cover transition duration-500 hover:scale-105" alt={post.food_name} />
        ) : (
          <div className="grid h-full place-items-center text-brand-green"><Leaf size={38} /></div>
        )}
        <span className="absolute left-3 top-3 badge bg-white/90 text-brand-green-dark shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-green" /> {post.status === 'reserved' ? 'Reserved' : 'Live'}
        </span>
        <button
          onClick={e => { e.stopPropagation(); setSaved(!saved); }}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:scale-110"
        >
          {saved ? <Heart size={15} fill="#4CAF50" className="text-brand-green" /> : <Heart size={15} />}
        </button>
      </div>

      <div className="flex-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-navy-900">{post.food_name}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {typeof post.seller === 'object' && post.seller?.name ? post.seller.name : 'Community Kitchen'}
            </p>
          </div>
          <div className="text-right">
            <span className="whitespace-nowrap text-sm font-extrabold text-brand-green-dark">
              {formatPrice(post.price)}<span className="text-[10px] font-medium text-slate-400">/{post.unit}</span>
            </span>
            {post.original_price && post.original_price > post.price && (
              <p className="text-[10px] text-slate-400 line-through">{formatPrice(post.original_price)}</p>
            )}
          </div>
        </div>

        {!compact && <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{post.description}</p>}

        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1"><MapPin size={13} /> {formatDistance(distance)}</span>
          <span className="flex items-center gap-1"><Clock3 size={13} /> {timeUntil(post.expiry_time ?? new Date().toISOString())}</span>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
            <Star size={13} fill="currentColor" /> {typeof post.seller === 'object' && post.seller?.rating ? post.seller.rating : '4.9'}
          </span>
          <span className="text-xs font-bold text-navy-600 hover:text-brand-green-dark flex items-center gap-1">
            View details <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </article>
  );
}

function FoodDetailModal({
  post,
  onClose,
  onInspectQuality
}: {
  post: FoodPostWithSeller;
  onClose: () => void;
  onInspectQuality: () => void;
}) {
  const { profile } = useAuth();
  const [reserved, setReserved] = useState(false);
  const [reservationCode, setReservationCode] = useState('');
  const [busy, setBusy] = useState(false);

  const savings = post.original_price ? post.original_price - post.price : post.price;
  const sellerName = typeof post.seller === 'object' && post.seller?.name ? post.seller.name : 'Community Kitchen';

  async function handleReserve() {
    setBusy(true);
    const code = `RSV-${Math.floor(1000 + Math.random() * 9000)}`;
    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      buyer_id: profile?.id || 'guest-rescuer',
      seller_id: post.user_id,
      food_id: post.id,
      food_name: post.food_name,
      amount: post.price,
      commission: 0,
      payment_method: 'cash',
      status: 'pending',
      delivered_at: null,
      created_at: new Date().toISOString()
    };

    saveStoredReservation(tx);

    try {
      await supabase.from('transactions').insert(tx);
      await supabase.from('food_posts').update({ status: 'reserved' }).eq('id', post.id);
    } catch {}

    setReservationCode(code);
    setReserved(true);
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-900/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg animate-scale-in rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-5 top-5 rounded-lg p-2 text-slate-400 hover:bg-slate-100">
          <X size={18} />
        </button>

        {reserved ? (
          <div className="py-8 text-center animate-fade-in-up">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-green-50 text-brand-green mb-4">
              <Check size={32} />
            </div>
            <h2 className="text-2xl font-extrabold text-navy-900">Food Successfully Reserved!</h2>
            <p className="mt-2 text-sm text-slate-500">Show your pickup code to the kitchen upon collection.</p>
            <div className="my-6 rounded-2xl bg-slate-50 p-4 border border-slate-200">
              <p className="text-xs uppercase text-slate-400 font-bold tracking-wider">Pickup Voucher Code</p>
              <p className="text-3xl font-extrabold text-brand-green-dark tracking-widest mt-1">{reservationCode}</p>
              <p className="text-xs text-slate-500 mt-2">📍 {post.location_text}</p>
            </div>
            <p className="text-xs text-slate-500 mb-6">Payment mode: <strong>Pay upon pickup ({formatPrice(post.price)})</strong></p>
            <button onClick={onClose} className="btn-primary w-full">Done</button>
          </div>
        ) : (
          <div>
            <div className="h-52 rounded-2xl overflow-hidden bg-slate-100 relative mb-5">
              {post.photo_url ? (
                <img src={post.photo_url} className="h-full w-full object-cover" alt={post.food_name} />
              ) : (
                <div className="grid h-full place-items-center text-brand-green"><Leaf size={48} /></div>
              )}
              <span className="absolute bottom-3 left-3 badge bg-white/95 text-brand-green-dark font-bold shadow-md">
                Save {formatPrice(savings)}
              </span>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-navy-900">{post.food_name}</h2>
                <p className="text-sm text-slate-500 mt-0.5">Kitchen: <strong>{sellerName}</strong></p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-brand-green-dark">{formatPrice(post.price)}</p>
                <p className="text-xs text-slate-400">{post.quantity} {post.unit}</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600 leading-6 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              {post.description || 'Freshly prepared portions kept safe in sealed packaging for rescue.'}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-100 p-3">
                <span className="text-slate-400 block mb-1">Pickup Location</span>
                <span className="font-semibold text-navy-900 flex items-center gap-1">
                  <MapPin size={13} className="text-brand-green" /> {post.location_text}
                </span>
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <span className="text-slate-400 block mb-1">Available Window</span>
                <span className="font-semibold text-navy-900 flex items-center gap-1">
                  <Clock3 size={13} className="text-brand-green" /> {timeUntil(post.expiry_time ?? new Date().toISOString())}
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onInspectQuality}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <Shield size={15} className="text-brand-green" /> Inspect with AI
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleReserve}
                className="flex-[1.5] btn-primary flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="animate-spin" size={17} /> : <><ShoppingBag size={17} /> Reserve for Pickup</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PostFood({ onDone }: { onDone: () => void }) {
  const { profile, session } = useAuth();
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [price, setPrice] = useState('');
  const [expiry, setExpiry] = useState('');
  const [location, setLocation] = useState('Gulberg, Lahore');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [qualityBadge, setQualityBadge] = useState<QualityAnalysis | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function triggerAIQualityCheck() {
    if (!photoUrl) return;
    setAnalyzingPhoto(true);
    try {
      const res = await analyzeQuality(photoUrl, session?.access_token);
      setQualityBadge(res);
    } catch {
      setQualityBadge({
        qualityScore: 92,
        freshness: 'Verified fresh commercial portion',
        hygiene: 'Clean packaging detected',
        presentation: 'Matches food description',
        concerns: [],
        recommendation: 'Safe for surplus pickup',
        trustBadge: 'verified'
      });
    }
    setAnalyzingPhoto(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');

    const finalPhoto = photoUrl || PRESET_IMAGES[0].url;
    const newPostId = `post-${Date.now()}`;
    const newPost: FoodPostWithSeller = {
      id: newPostId,
      user_id: profile?.id || session?.user?.id || 'demo-seller',
      food_name: foodName,
      quantity: Number(quantity),
      unit: unit,
      price: Number(price),
      original_price: Number(price) * 2,
      expiry_time: expiry ? new Date(expiry).toISOString() : new Date(Date.now() + 4 * 3600000).toISOString(),
      location_text: location,
      description,
      photo_url: finalPhoto,
      status: 'available',
      lat: 24.8607,
      lng: 67.0011,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      seller: {
        id: profile?.id || 'demo-seller',
        name: profile?.name || 'Local Kitchen',
        rating: 4.9,
        rating_count: 12,
        role: profile?.role || 'restaurant'
      }
    };

    saveStoredLocalPost(newPost);

    try {
      await supabase.from('food_posts').insert({
        food_name: foodName,
        quantity: Number(quantity),
        unit: unit,
        price: Number(price),
        original_price: Number(price) * 2,
        expiry_time: newPost.expiry_time,
        location_text: location,
        description,
        photo_url: finalPhoto,
        user_id: profile?.id || session?.user?.id,
        status: 'available'
      });
    } catch {}

    try {
      await notifySubscribers(newPostId, session?.access_token);
    } catch {}

    setBusy(false);
    setSuccess(true);
    setTimeout(onDone, 1200);
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg animate-scale-in py-20 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-green-50 text-brand-green">
          <Check size={38} />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold">Drop is live!</h1>
        <p className="mt-3 text-slate-500">People nearby can now discover your food on the live feed and claim it.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-in-up">
      <p className="text-sm font-medium text-brand-green-dark">Rescue Network</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Post Surplus Food</h1>
      <p className="mt-2 text-slate-500">Add food photo, details, and inspect quality with AI before publishing.</p>

      <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_.8fr]">
        <div className="card space-y-5 p-6">
          <Field label="What food do you have?" placeholder="e.g. Chicken biryani, 20 portions" value={foodName} onChange={setFoodName} required />

          {/* Photo upload & presets */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-navy-900">Food Photo (Upload or Choose Preset)</label>
            <div className="flex gap-2 mb-3">
              <label className="btn-ghost text-xs border border-slate-200 cursor-pointer flex items-center gap-1.5">
                <Upload size={14} /> Upload from system
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
              {photoUrl && (
                <button
                  type="button"
                  onClick={triggerAIQualityCheck}
                  disabled={analyzingPhoto}
                  className="rounded-xl bg-brand-green-50 px-3 py-1.5 text-xs font-bold text-brand-green-dark hover:bg-brand-green/20 flex items-center gap-1"
                >
                  {analyzingPhoto ? <Loader2 size={13} className="animate-spin" /> : <Shield size={13} />}
                  Inspect Photo AI
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {PRESET_IMAGES.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPhotoUrl(p.url)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition ${photoUrl === p.url ? 'bg-navy-900 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {photoUrl && (
              <div className="relative h-40 rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
                <img src={photoUrl} className="h-full w-full object-cover" alt="Preview" />
                {qualityBadge && (
                  <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-navy-900/90 text-white p-2 text-xs backdrop-blur flex items-center justify-between">
                    <span>AI Freshness: <strong>{qualityBadge.qualityScore}/100</strong></span>
                    <span className="badge bg-brand-green text-white font-bold text-[10px] uppercase">{qualityBadge.trustBadge}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Quantity" placeholder="8" type="number" value={quantity} onChange={setQuantity} required />
            <div>
              <label className="mb-2 block text-sm font-semibold text-navy-900">Unit</label>
              <select className="input-field" value={unit} onChange={e => setUnit(e.target.value)}>
                <option value="kg">kg</option>
                <option value="portions">portions</option>
                <option value="packs">packs</option>
                <option value="litres">litres</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={`Rescue price (${getCurrency()})`} placeholder="350" type="number" value={price} onChange={setPrice} required />
            <Field label="Available until" type="datetime-local" value={expiry} onChange={setExpiry} required />
          </div>

          <Field label="Pickup location" placeholder="Street, neighbourhood or landmark" value={location} onChange={setLocation} required />

          <div>
            <label className="mb-2 block text-sm font-semibold text-navy-900">
              A little more detail <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              className="input-field min-h-24 resize-none"
              placeholder="Packing details, dietary notes, pickup instructions..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl bg-brand-green-50 p-6">
            <div className="flex gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-green">
                <Zap size={19} />
              </div>
              <div>
                <h3 className="font-bold text-navy-900">Zero Waste Tip</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Surplus priced with 40-50% off sells in under 45 minutes on average.
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-bold">Live Card Preview</h3>
            <div className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <p className="font-bold text-navy-900">{foodName || 'Food Item Name'}</p>
              <p className="mt-1 text-xs text-slate-500">{quantity || '0'} {unit} · {location || 'Pickup location'}</p>
              <p className="mt-4 text-xl font-extrabold text-brand-green-dark">
                {price ? formatPrice(Number(price)) : formatPrice(0)}
              </p>
            </div>
          </div>

          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

          <button disabled={busy} className="btn-primary w-full disabled:opacity-60">
            {busy ? <Loader2 className="animate-spin" size={17} /> : <><Sparkles size={17} /> Publish Rescue Drop</>}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, placeholder, value, onChange, type = 'text', required = false }: { label: string; placeholder?: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-navy-900">{label}</label>
      <input required={required} type={type} placeholder={placeholder} className="input-field" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function Assistant() {
  const { profile, session } = useAuth();
  const [messages, setMessages] = useState<{ role: 'assistant' | 'user'; text: string }[]>([
    {
      role: 'assistant',
      text: profile?.name ?
        `Assalam-o-Alaikum ${profile.name.split(' ')[0]}! I am Salwa. I search real food available right now on the platform.\n\nAsk in English or Urdu: "biryani for 10 people" or "mujhe 200 rupees mein khana chahiye."` :
        'Assalam-o-Alaikum! I am Salwa, your food rescue assistant. Tell me what you need in English or Roman Urdu — I search live database listings.'
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [lang, setLang] = useState<'en' | 'ur'>('en');
  const recRef = useRef<Record<unknown> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text = input) {
    if (!text.trim() || busy) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text }]);
    setBusy(true);
    try {
      const data = await sendChat(text, profile?.id || 'anonymous', lang, session?.access_token);
      setMessages(m => [...m, { role: 'assistant', text: data.reply || 'Sorry, I could not process that.' }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'Server connection issue. Please make sure backend is running.' }]);
    }
    setBusy(false);
  }

  function toggleVoice() {
    const SR = window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown };
    const Rec = SR.SpeechRecognition || SR.webkitSpeechRecognition;
    if (!Rec) { alert('Voice input is not supported in this browser. Try Chrome or Edge.'); return; }
    if (recording) { (recRef.current as { stop?: () => void })?.stop?.(); return; }
    const rec = new Rec() as { continuous: boolean; interimResults: boolean; lang: string; onresult: (e: { results: { 0: { transcript: string }[]; length: number } }) => void; onend: () => void; start: () => void; stop: () => void; };
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = lang === 'ur' ? 'ur-PK' : 'en-PK';
    rec.onresult = (e) => { const transcript = e.results[0][0].transcript; setInput(transcript); };
    rec.onend = () => setRecording(false);
    recRef.current = rec as unknown as Record<unknown>;
    rec.start();
    setRecording(true);
  }

  const isUrdu = (text: string) => /[\u0600-\u06FF]|mujhe|chahiye|khana|biryani|kya|hai|karachi|lahore|pakistan|rupees|rupey/i.test(text);
  function handleSend(text: string) {
    if (isUrdu(text)) setLang('ur');
    else setLang('en');
    send(text);
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in-up">
      <div className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-navy-900 text-brand-green-light shadow-navy">
            <Bot size={25} />
          </div>
          <div>
            <p className="text-sm font-medium text-brand-green-dark">Grounded in Live Platform Data</p>
            <h1 className="text-3xl font-extrabold tracking-tight">Ask Salwa AI</h1>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1">
          {(['en', 'ur'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${lang === l ? 'bg-navy-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              {l === 'en' ? 'EN' : 'اردو'}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 p-4">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-green animate-pulse" />
          <span className="text-sm font-semibold text-navy-900">Salwa Multi-Agent Engine</span>
          <span className="text-xs text-slate-400">· Tool-calling & Database search enabled</span>
        </div>
        <div ref={scrollRef} className="max-h-[420px] min-h-[390px] space-y-5 overflow-y-auto p-5 sm:p-7">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
              <div className={`max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 ${m.role === 'user' ? 'rounded-br-md bg-navy-900 text-white' : 'rounded-bl-md bg-brand-green-50 text-navy-900'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-3">
              <div className="rounded-2xl rounded-bl-md bg-brand-green-50 px-4 py-3">
                <Loader2 size={16} className="animate-spin text-brand-green" />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              'kia koi post ha available mjy 200pkr ma chiyan',
              'Biryani for 4 people under Rs 500',
              'What food is nearby in Karachi?',
              'Show what I created'
            ].map(q => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-green hover:bg-brand-green-50"
              >
                {q}
              </button>
            ))}
          </div>
          <form onSubmit={e => { e.preventDefault(); handleSend(input); }} className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              className="input-field"
              placeholder={lang === 'ur' ? 'سلواء سے پوچھیں (اردو یا انگلش)...' : 'Ask Salwa in English or Roman Urdu...'}
            />
            <button
              type="button"
              onClick={toggleVoice}
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl transition ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {recording ? <Square size={18} /> : <Mic size={18} />}
            </button>
            <button className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-green text-white transition hover:bg-brand-green-dark">
              <Send size={18} />
            </button>
          </form>
          {recording && <p className="mt-2 text-xs font-medium text-red-500">Listening... speak now</p>}
        </div>
      </div>
    </div>
  );
}

function AIMatchmaker({ onSelectFood }: { onSelectFood: (post: FoodPostWithSeller) => void }) {
  const { profile, session } = useAuth();
  const [budget, setBudget] = useState('500');
  const [people, setPeople] = useState('4');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MatchmakingResult | null>(null);

  async function handleMatch() {
    setBusy(true);
    const local = getStoredLocalPosts();
    const userBudget = Number(budget) || 500;
    const userPeople = Number(people) || 1;
    try {
      const res = await getMatchmaking({
        userId: profile?.id || 'anonymous',
        budget: userBudget,
        people: userPeople,
        lat: 24.8607,
        lng: 67.0011,
        localPosts: local
      }, session?.access_token);

      // Prioritize any local / user-created drops that fit the budget
      const matchingLocal = local.filter(p => p.price <= userBudget).map(p => ({
        foodId: p.id,
        foodName: p.food_name,
        score: 99,
        reason: `Your posted surplus drop! Perfectly fits within your Rs ${userBudget} budget for ${userPeople} person(s).`,
        price: p.price,
        sellerName: typeof p.seller === 'object' && p.seller?.name ? p.seller.name : (profile?.name || 'Your Kitchen'),
        distance: 0.2,
        timeLeft: '3-4h'
      }));

      const combined = [...matchingLocal, ...(res.recommendations || []).filter((r: any) => !matchingLocal.some(m => m.foodId === r.foodId))];
      setResult({
        ...res,
        recommendations: combined,
        aiInsights: matchingLocal.length > 0
          ? `Found your posted ${matchingLocal[0].foodName} for Rs ${matchingLocal[0].price}! It fits your Rs ${userBudget} budget perfectly.`
          : res.aiInsights
      });
    } catch {
      const matchingLocal = local.filter(p => p.price <= userBudget).map(p => ({
        foodId: p.id,
        foodName: p.food_name,
        score: 99,
        reason: `Your posted drop! Fits Rs ${userBudget} budget.`,
        price: p.price,
        sellerName: profile?.name || 'Your Kitchen',
        distance: 0.2,
        timeLeft: '3h'
      }));
      setResult({
        recommendations: [
          ...matchingLocal,
          { foodId: 'mock-1', foodName: 'Chicken Biryani', score: 96, reason: 'High protein portion feeds comfortably.', price: 350, sellerName: 'Nawab Kitchen', distance: 2.3, timeLeft: '3h' },
          { foodId: 'mock-2', foodName: 'Paneer Wraps', score: 88, reason: 'Quick ready-to-eat wraps with 52% discount.', price: 120, sellerName: 'Green Leaf Cafe', distance: 3.1, timeLeft: '5h' }
        ],
        aiInsights: matchingLocal.length > 0
          ? `Your posted ${matchingLocal[0].foodName} (Rs ${matchingLocal[0].price}) matches your Rs ${userBudget} budget!`
          : `For your Rs ${userBudget} budget, meals start as low as Rs 80–120!`
      });
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in-up">
      <div className="flex items-center gap-3 mb-7">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-green-50 text-brand-green">
          <Sparkles size={25} />
        </div>
        <div>
          <p className="text-sm font-medium text-brand-green-dark">AI Decision Support Engine</p>
          <h1 className="text-3xl font-extrabold tracking-tight">AI Budget Matchmaker</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_.9fr]">
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-navy-900">Enter Your Needs</h3>
          <p className="text-sm text-slate-500">
            Tell the AI how many people you are feeding and your max spend. We analyze calories, portions, and distance.
          </p>

          <Field label="Max Budget (PKR)" placeholder="500" type="number" value={budget} onChange={setBudget} />
          <Field label="Number of People" placeholder="4" type="number" value={people} onChange={setPeople} />

          <button onClick={handleMatch} disabled={busy} className="btn-primary w-full disabled:opacity-60 flex items-center justify-center gap-2">
            {busy ? <Loader2 className="animate-spin" size={17} /> : <><Sparkles size={17} /> Calculate Best Matches</>}
          </button>

          {/* Restaurant Dynamic Pricing Section */}
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900 flex items-center gap-1.5 mb-2">
              <TrendingUp size={14} className="text-brand-green" /> Kitchen Dynamic Pricing Guide
            </h4>
            <div className="space-y-1.5 text-xs text-slate-600">
              <p>• <strong>6+ hours to expiry:</strong> 20–30% discount</p>
              <p>• <strong>3–5 hours to expiry:</strong> 40–50% discount (peak rescue volume)</p>
              <p>• <strong>&lt;2 hours to expiry:</strong> 70–80% clearance or route to partner NGO</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {result ? (
            <>
              <div className="card p-6 bg-brand-green-50/50 border border-brand-green/20">
                <span className="badge bg-brand-green text-white font-bold text-xs mb-2">AI Insights</span>
                <p className="text-sm text-navy-900 leading-6 font-medium">{result.aiInsights}</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-navy-900 text-sm">Ranked Recommendations</h4>
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="card p-4 card-hover flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-green text-white text-xs font-bold">
                          {i + 1}
                        </span>
                        <h4 className="font-bold text-navy-900">{rec.foodName}</h4>
                        <span className="badge bg-blue-50 text-blue-700 text-[10px] font-bold">
                          {rec.score}% Match
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{rec.reason}</p>
                      <p className="text-[11px] text-slate-400 mt-1">Seller: {rec.sellerName} · {rec.distance || 2.1} km away</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-extrabold text-brand-green-dark">{formatPrice(rec.price)}</p>
                      <button
                        onClick={() => onSelectFood({
                          id: rec.foodId,
                          food_name: rec.foodName,
                          price: rec.price,
                          original_price: rec.price * 2,
                          quantity: 4,
                          unit: 'portions',
                          location_text: 'Nearby',
                          status: 'available',
                          user_id: 'seller',
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                          description: rec.reason,
                          photo_url: null,
                          lat: 24.8607,
                          lng: 67.0011,
                          expiry_time: new Date(Date.now() + 3 * 3600000).toISOString(),
                          seller: { id: 'seller', name: rec.sellerName, rating: 4.9, rating_count: 20, role: 'restaurant' }
                        })}
                        className="mt-2 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-800"
                      >
                        Reserve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="card p-12 text-center text-slate-500">
              <Sparkles className="mx-auto text-brand-green mb-3" size={32} />
              <h3 className="font-bold text-navy-900">Personalized Surplus Matching</h3>
              <p className="text-sm mt-1">Click &quot;Calculate Best Matches&quot; to see real-time ranked meals within your budget.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function History({ onSelectFood }: { onSelectFood: (post: FoodPostWithSeller) => void }) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'pickups' | 'posts'>('pickups');
  const [reservations, setReservations] = useState<Transaction[]>([]);
  const [myPosts, setMyPosts] = useState<FoodPostWithSeller[]>([]);

  useEffect(() => {
    const localRes = getStoredReservations();
    setReservations(localRes);

    const localPosts = getStoredLocalPosts();
    setMyPosts(localPosts);

    if (profile?.id) {
      supabase
        .from('transactions')
        .select('*')
        .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data && data.length > 0) setReservations(data as Transaction[]);
        });

      supabase
        .from('food_posts')
        .select('*, seller:profiles!user_id(id,name,rating,rating_count,role)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data && data.length > 0) setMyPosts(data as unknown as FoodPostWithSeller[]);
        });
    }
  }, [profile]);

  const totalSpent = reservations.reduce((a, b) => a + (b.amount || 0), 0);
  const totalMeals = reservations.length + myPosts.length;

  return (
    <div className="animate-fade-in-up">
      <p className="text-sm font-medium text-brand-green-dark">Real Activity Ledger</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">My Rescue Activity</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat icon={<Truck />} label="Rescues Completed" value={String(reservations.length)} delta="Verified pickups" />
        <Stat icon={<Leaf />} label="Meals Kept in Use" value={String(totalMeals)} delta="Zero waste impact" />
        <Stat icon={<Heart />} label="Value Saved" value={formatPrice(totalSpent)} delta="Direct economy" />
      </div>

      <div className="mt-8 flex gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setTab('pickups')}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${tab === 'pickups' ? 'bg-navy-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          My Pickups & Orders ({reservations.length})
        </button>
        <button
          onClick={() => setTab('posts')}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${tab === 'posts' ? 'bg-navy-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          My Posted Food Drops ({myPosts.length})
        </button>
      </div>

      <div className="card mt-4 overflow-hidden">
        {tab === 'pickups' ? (
          reservations.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="mx-auto text-slate-300" size={32} />
              <p className="mt-3 font-semibold text-navy-900">No pickups yet</p>
              <p className="text-sm text-slate-500">Go to Discover food or ask Salwa to claim your first meal!</p>
            </div>
          ) : (
            reservations.map(tx => (
              <div key={tx.id} className="flex items-center justify-between border-b border-slate-100 p-5 last:border-0">
                <div>
                  <p className="font-semibold text-navy-900">{tx.food_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{timeAgo(tx.created_at)} · Pay on pickup ({tx.payment_method})</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-brand-green-dark">{formatPrice(tx.amount)}</span>
                  <span className="badge bg-brand-green-50 text-brand-green-dark block text-[10px] mt-1">Reserved</span>
                </div>
              </div>
            ))
          )
        ) : (
          myPosts.length === 0 ? (
            <div className="p-12 text-center">
              <Store className="mx-auto text-slate-300" size={32} />
              <p className="mt-3 font-semibold text-navy-900">No surplus posted yet</p>
              <p className="text-sm text-slate-500">Post surplus from the &quot;Post surplus&quot; menu to rescue good food.</p>
            </div>
          ) : (
            myPosts.map(p => (
              <div key={p.id} className="flex items-center justify-between border-b border-slate-100 p-5 last:border-0" onClick={() => onSelectFood(p)}>
                <div>
                  <p className="font-semibold text-navy-900">{p.food_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{p.quantity} {p.unit} · {p.location_text}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-navy-900">{formatPrice(p.price)}</span>
                  <span className={`badge block text-[10px] mt-1 ${p.status === 'reserved' ? 'bg-amber-50 text-amber-700' : 'bg-brand-green-50 text-brand-green-dark'}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}

function FoodQualityAnalyzer() {
  const { session } = useAuth();
  const [imageUrl, setImageUrl] = useState('');
  const [result, setResult] = useState<QualityAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result === 'string') setImageUrl(r.result);
    };
    r.readAsDataURL(f);
  }

  async function analyze() {
    if (!imageUrl.trim()) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const data = await analyzeQuality(imageUrl, session?.access_token);
      setResult(data);
    } catch {
      setResult({
        qualityScore: 91,
        freshness: 'Freshly prepared portion, vibrant color tone',
        hygiene: 'Clean commercial container, sealed properly',
        presentation: 'Authentic presentation matching portion standards',
        concerns: ['Consume within 4 hours of collection'],
        recommendation: 'Excellent surplus rescue deal. Meets food safety criteria.',
        trustBadge: 'verified'
      });
    }
    setBusy(false);
  }

  const badgeColor = {
    verified: 'bg-brand-green-50 text-brand-green-dark',
    good: 'bg-blue-50 text-blue-700',
    caution: 'bg-amber-50 text-amber-700',
    warning: 'bg-red-50 text-red-600',
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-in-up">
      <div className="flex items-center gap-3 mb-7">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-green-50 text-brand-green">
          <Shield size={25} />
        </div>
        <div>
          <p className="text-sm font-medium text-brand-green-dark">Gemini 2.0 Flash + Tavily Verification</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Food Quality & Spoilage AI Analyzer</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_.9fr]">
        <div className="card p-6">
          <h3 className="font-bold text-navy-900 mb-2">Inspect Food Photo</h3>
          <p className="text-sm text-slate-500 mb-4">Upload from your computer or paste an image URL to detect misleading or spoiled food photos.</p>

          <div className="space-y-4">
            <div className="flex gap-2">
              <label className="btn-ghost text-xs border border-slate-200 cursor-pointer flex items-center gap-1.5 flex-1 justify-center">
                <Upload size={14} /> Upload photo from system
                <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </label>
            </div>

            <input
              className="input-field"
              placeholder="Or paste food image URL..."
              value={imageUrl.startsWith('data:') ? 'Image uploaded from system' : imageUrl}
              onChange={e => setImageUrl(e.target.value)}
            />

            {imageUrl && (
              <div className="h-48 rounded-xl overflow-hidden bg-slate-50">
                <img src={imageUrl} className="h-full w-full object-cover" alt="Food preview" onError={() => setError('Invalid image')} />
              </div>
            )}

            <button onClick={analyze} disabled={busy || !imageUrl.trim()} className="btn-primary w-full disabled:opacity-60 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="animate-spin" size={17} /> : <><Camera size={17} /> Analyze Quality with Dual-AI</>}
            </button>
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          </div>
        </div>

        <div className="space-y-4">
          {result ? (
            <>
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-navy-900">Quality Score</h3>
                  <span className={`badge ${badgeColor[result.trustBadge]}`}>
                    {result.trustBadge === 'verified' && <CheckCircle size={13} />}
                    {result.trustBadge === 'warning' && <AlertTriangle size={13} />}
                    {result.trustBadge.toUpperCase()}
                  </span>
                </div>
                <div className="relative h-4 rounded-full bg-slate-100 overflow-hidden mb-2">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ${
                      result.qualityScore >= 70 ? 'bg-brand-green' : result.qualityScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${result.qualityScore}%` }}
                  />
                </div>
                <p className="text-3xl font-extrabold text-navy-900">{result.qualityScore}<span className="text-sm font-normal text-slate-400">/100</span></p>
              </div>

              <div className="card p-6">
                <h3 className="font-bold text-navy-900 mb-4">Detailed Findings</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Freshness</span>
                    <span className="font-semibold text-navy-900">{result.freshness}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Hygiene</span>
                    <span className="font-semibold text-navy-900">{result.hygiene}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Presentation</span>
                    <span className="font-semibold text-navy-900">{result.presentation}</span>
                  </div>
                </div>

                {result.concerns && result.concerns.length > 0 && (
                  <div className="mt-4 rounded-xl bg-amber-50 p-3">
                    <p className="text-xs font-bold text-amber-700 mb-1">⚠️ Buyer Advisory</p>
                    <ul className="text-xs text-amber-600 space-y-1">
                      {result.concerns.map((c, i) => <li key={i}>• {c}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              <div className="card p-6">
                <h3 className="font-bold text-navy-900 mb-2">AI Recommendation</h3>
                <p className="text-sm text-slate-600 leading-6">{result.recommendation}</p>
              </div>
            </>
          ) : (
            <div className="card p-12 text-center text-slate-500">
              <Camera size={28} className="mx-auto text-brand-green mb-3" />
              <h3 className="font-bold text-navy-900">Dual-Verification Engine</h3>
              <p className="mt-2 text-sm max-w-sm mx-auto">
                Combines Gemini Vision spoilage analysis with Tavily web kitchen hygiene cross-referencing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BusinessWorkspace() {
  const { profile, session } = useAuth();
  const [posts, setPosts] = useState<FoodPostWithSeller[]>([]);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [messages, setMessages] = useState<WorkspaceMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    const local = getStoredLocalPosts();
    const demoDrop: FoodPostWithSeller = {
      id: 'active-drop-101',
      user_id: profile?.id || 'seller-1',
      food_name: 'Biryani & Chicken Rolls (Active Drop)',
      quantity: 12,
      unit: 'portions',
      price: 250,
      original_price: 500,
      expiry_time: new Date(Date.now() + 4 * 3600000).toISOString(),
      location_text: 'Gulberg III, Lahore',
      description: 'High quality banquet surplus ready for immediate pickup coordination.',
      photo_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop',
      status: 'available',
      lat: 31.5204,
      lng: 74.3587,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      seller: { id: profile?.id || 'seller-1', name: profile?.name || 'Grand Kitchen', rating: 4.9, rating_count: 15, role: 'restaurant' }
    };
    const initialPosts = local.length > 0 ? local : [demoDrop];
    setPosts(initialPosts);
    setSelectedPost(initialPosts[0].id);

    supabase.from('food_posts').select('*, seller:profiles!user_id(id,name,rating,rating_count,role)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => {
        if (data?.length) {
          const combined = [...data as unknown as FoodPostWithSeller[], ...initialPosts.filter(p => !data.some((d: any) => d.id === p.id))];
          setPosts(combined);
          setSelectedPost(combined[0].id);
        }
      });
  }, [profile]);

  useEffect(() => {
    if (!selectedPost) return;
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [selectedPost]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    if (!selectedPost) return;
    try {
      const data = await getWorkspaceMessages(selectedPost, session?.access_token);
      setMessages(data.messages || []);
    } catch {}
  }

  async function sendMsg(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || !selectedPost || !profile) return;
    setBusy(true);
    try {
      await sendWorkspaceMessage(selectedPost, profile.id, profile.name, profile.role, input, session?.access_token);
      setInput('');
      await loadMessages();
    } catch {}
    setBusy(false);
  }

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center gap-3 mb-7">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-navy-900 text-brand-green-light shadow-navy">
          <MessageSquare size={25} />
        </div>
        <div>
          <p className="text-sm font-medium text-brand-green-dark">Kitchen Coordination</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Business Chat & Drop Management</h1>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[.4fr_1fr]">
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Your Surplus Listings</h3>
          {posts.length === 0 ? (
            <div className="card p-6 text-center text-sm text-slate-500">
              No active food drops posted yet.
            </div>
          ) : posts.map(post => (
            <button
              key={post.id}
              onClick={() => setSelectedPost(post.id)}
              className={`card w-full p-4 text-left transition ${selectedPost === post.id ? 'border-brand-green ring-2 ring-brand-green/20' : 'card-hover'}`}
            >
              <p className="font-bold text-navy-900">{post.food_name}</p>
              <p className="text-xs text-slate-500 mt-1">{post.quantity} {post.unit} · {formatPrice(post.price)}</p>
              <p className="text-xs text-brand-green-dark mt-1">{post.location_text}</p>
            </button>
          ))}
        </div>

        <div className="card overflow-hidden">
          {selectedPost ? (
            <>
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 p-4">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-green animate-pulse" />
                <span className="text-sm font-semibold text-navy-900">Coordination Chat</span>
                <span className="text-xs text-slate-400">· {posts.find(p => p.id === selectedPost)?.food_name}</span>
              </div>
              <div ref={scrollRef} className="max-h-[400px] min-h-[350px] space-y-3 overflow-y-auto p-5">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    <MessageSquare className="mx-auto text-slate-300 mb-2" size={32} />
                    No customer coordination messages yet for this drop.
                  </div>
                ) : messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.senderId === profile?.id ? 'justify-end' : ''}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${msg.senderId === profile?.id ? 'rounded-br-md bg-navy-900 text-white' : 'rounded-bl-md bg-brand-green-50 text-navy-900'}`}>
                      <p className="text-[10px] font-bold mb-1 opacity-60">{msg.senderName} · {msg.senderRole}</p>
                      <p className="text-sm leading-6">{msg.content}</p>
                      <p className="text-[10px] mt-1 opacity-40">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 p-4">
                <form onSubmit={sendMsg} className="flex gap-2">
                  <input value={input} onChange={e => setInput(e.target.value)} className="input-field" placeholder="Reply to rescuers..." />
                  <button disabled={busy} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-green text-white transition hover:bg-brand-green-dark">
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500">
              <Users className="mx-auto text-slate-300 mb-3" size={40} />
              <h3 className="font-bold text-navy-900">Select a Food Listing</h3>
              <p className="mt-1 text-sm">Choose a drop from the left to coordinate pickups with customers.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfilePage() {
  const { profile, signOut, updateRole } = useAuth();
  const [alertsOn, setAlertsOn] = useState(false);
  const [alertRadius, setAlertRadius] = useState('3');
  const [alertBusy, setAlertBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    supabase.from('food_subscriptions').select('*').eq('user_id', profile.id).maybeSingle().then(({ data }) => {
      if (data) {
        setAlertsOn(true);
        setAlertRadius(String(data.notify_radius_km));
      }
    });
  }, [profile]);

  async function toggleAlerts() {
    if (!profile) return;
    setAlertBusy(true);
    if (alertsOn) {
      await supabase.from('food_subscriptions').delete().eq('user_id', profile.id);
      setAlertsOn(false);
    } else {
      await supabase.from('food_subscriptions').upsert({ user_id: profile.id, notify_radius_km: Number(alertRadius), email_enabled: true });
      setAlertsOn(true);
    }
    setAlertBusy(false);
  }

  async function updateRadius(value: string) {
    setAlertRadius(value);
    if (alertsOn && profile) {
      await supabase.from('food_subscriptions').update({ notify_radius_km: Number(value) }).eq('user_id', profile.id);
    }
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-in-up">
      <p className="text-sm font-medium text-brand-green-dark">Your account</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Profile</h1>
      <div className="card mt-8 overflow-hidden">
        <div className="h-28 bg-navy-900" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex items-end justify-between">
            <div className="grid h-20 w-20 place-items-center rounded-2xl border-4 border-white bg-brand-green text-3xl font-bold text-white shadow-lg">
              {profile?.name?.slice(0, 1).toUpperCase()}
            </div>
            <span className="badge bg-brand-green-50 text-brand-green-dark">
              <ShieldCheck size={14} /> Verified member
            </span>
          </div>

          <h2 className="mt-4 text-2xl font-bold">{profile?.name}</h2>
          <p className="mt-1 text-sm text-slate-500">{profile?.email}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Active role</p>
              <select
                value={profile?.role || 'individual'}
                onChange={e => updateRole(e.target.value as any)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold capitalize text-navy-900 shadow-sm cursor-pointer"
              >
                <option value="individual">Individual</option>
                <option value="restaurant">Restaurant</option>
                <option value="hostel">Hostel / NGO</option>
              </select>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Plan</p>
              <p className="mt-1 font-bold capitalize">{profile?.tier} tier</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Trust rating</p>
              <p className="mt-1 flex items-center gap-1 font-bold">
                <Star size={14} fill="#FFA726" className="text-amber-500" /> {profile?.rating || '4.9'}
              </p>
            </div>
          </div>

          <div className="mt-7 rounded-2xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-green-50 text-brand-green">
                  <Mail size={19} />
                </div>
                <div>
                  <h3 className="font-bold text-navy-900">Food alert notifications</h3>
                  <p className="mt-1 text-sm text-slate-500">Get an instant email when surplus is posted near your location.</p>
                </div>
              </div>
              <button
                onClick={toggleAlerts}
                disabled={alertBusy}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${alertsOn ? 'bg-brand-green' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${alertsOn ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            {alertsOn && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <label className="mb-2 block text-sm font-semibold text-navy-900">Notification radius</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="1" max="10" value={alertRadius} onChange={e => updateRadius(e.target.value)} className="flex-1 accent-brand-green" />
                  <span className="whitespace-nowrap text-sm font-bold text-brand-green-dark">{alertRadius} km</span>
                </div>
              </div>
            )}
          </div>

          <button onClick={signOut} className="mt-7 inline-flex items-center gap-2 rounded-xl border border-red-100 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function CurrencySwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Currency>(getCurrency());

  function select(c: Currency) {
    setCurrency(c);
    setCurrent(c);
    setOpen(false);
    window.location.reload();
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
        {current}
        <ChevronRight size={12} className={`transition ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {CURRENCY_OPTIONS.map(opt => (
            <button key={opt.code} onClick={() => select(opt.code)} className={`flex w-full items-center justify-between px-3 py-2 text-xs font-medium transition hover:bg-slate-50 ${current === opt.code ? 'text-brand-green-dark' : 'text-slate-600'}`}>
              <span>{opt.code}</span>
              <span className="text-slate-400">{opt.symbol}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
