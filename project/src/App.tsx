import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowRight, Bell, Bot, Check, ChevronRight, Clock3, Compass, Flame, Heart,
  Leaf, Loader2, LogOut, Mail, MapPin, Menu, MessageCircle, Mic, Package, Plus, Search,
  Send, ShieldCheck, Sparkles, Square, Star, Store, Truck, UserRound, Users, X, Zap,
  Camera, MessageSquare, Shield, TrendingUp, AlertTriangle, CheckCircle
} from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { FoodPost, FoodPostWithSeller, Profile, Transaction } from '@/lib/types';
import { sendChat, getMatchmaking, analyzeQuality, notifySubscribers, sendWorkspaceMessage, getWorkspaceMessages } from '@/lib/api';
import type { QualityAnalysis, WorkspaceMessage } from '@/lib/types';
import { CURRENCY_OPTIONS, formatDistance, formatPrice, formatPriceShort, getCurrency, haversineKm, setCurrency, timeAgo, timeUntil, type Currency } from '@/lib/utils';

type View = 'home' | 'discover' | 'post' | 'assistant' | 'history' | 'profile' | 'quality' | 'workspace';

const mockFood: FoodPostWithSeller[] = [
  { id: 'mock-1', user_id: 'seller-1', food_name: 'Chicken Biryani', quantity: 8, unit: 'kg', price: 350, original_price: 700, expiry_time: new Date(Date.now() + 3.5 * 3600000).toISOString(), lat: 24.8607, lng: 67.0011, location_text: 'Bahadurabad, Karachi', photo_url: 'https://images.pexels.com/photos/5410401/pexels-photo-5410401.jpeg?auto=compress&cs=tinysrgb&w=900', description: 'Fresh chicken biryani prepared for a wedding order. Packed and ready for pickup.', status: 'available', created_at: new Date(Date.now() - 22 * 60000).toISOString(), updated_at: new Date().toISOString(), seller: { id: 'seller-1', name: 'Nawab Kitchen', rating: 4.9, rating_count: 128, role: 'restaurant' } },
  { id: 'mock-2', user_id: 'seller-2', food_name: 'Paneer Wraps', quantity: 24, unit: 'packs', price: 120, original_price: 250, expiry_time: new Date(Date.now() + 5 * 3600000).toISOString(), lat: 24.8607, lng: 67.0011, location_text: 'Gulberg, Lahore', photo_url: 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=900', description: 'Vegetarian wraps with fresh paneer, salad and mint chutney.', status: 'available', created_at: new Date(Date.now() - 44 * 60000).toISOString(), updated_at: new Date().toISOString(), seller: { id: 'seller-2', name: 'Green Leaf Cafe', rating: 4.7, rating_count: 84, role: 'restaurant' } },
  { id: 'mock-3', user_id: 'seller-3', food_name: 'Daal Chawal Meals', quantity: 12, unit: 'meals', price: 180, original_price: 350, expiry_time: new Date(Date.now() + 2 * 3600000).toISOString(), lat: 24.8607, lng: 67.0011, location_text: 'Saddar, Rawalpindi', photo_url: 'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=900', description: 'Comforting homestyle meals, individually sealed for easy distribution.', status: 'available', created_at: new Date(Date.now() - 70 * 60000).toISOString(), updated_at: new Date().toISOString(), seller: { id: 'seller-3', name: 'Sahaara Community Kitchen', rating: 5, rating_count: 52, role: 'hostel' } },
];

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
  return <div className="min-h-screen overflow-hidden bg-[#f8faf9] text-navy-900">
    <header className="absolute inset-x-0 top-0 z-20"><div className="section-pad flex h-20 items-center justify-between">
      <Brand light />
      <div className="hidden items-center gap-8 text-sm font-medium text-white/75 md:flex"><a href="#how">How it works</a><a href="#impact">Our impact</a><a href="#trust">Trust & safety</a></div>
      <button onClick={onStart} className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">Sign in</button>
    </div></header>
    <main>
      <section className="relative min-h-[720px] overflow-hidden bg-[#001F3F] pt-32"><div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(76,175,80,.28),transparent_28%),radial-gradient(circle_at_10%_80%,rgba(38,100,155,.35),transparent_32%)]" /><div className="absolute -right-40 top-20 h-[560px] w-[560px] rounded-full border border-white/10 animate-float" /><div className="absolute right-4 top-44 h-[400px] w-[400px] rounded-full border border-brand-green/20" />
        <div className="section-pad relative grid items-center gap-12 pb-24 lg:grid-cols-[1.05fr_.95fr]">
          <div className="animate-fade-in-up"><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-3 py-1.5 text-xs font-semibold text-brand-green-light"><span className="h-2 w-2 animate-pulse rounded-full bg-brand-green-light" /> Live food rescue network</div><h1 className="max-w-3xl text-5xl font-extrabold leading-[1.08] tracking-[-.04em] text-white sm:text-6xl lg:text-7xl">Good food has<br /><span className="text-brand-green-light">a second chance.</span></h1><p className="mt-6 max-w-xl text-lg leading-8 text-blue-100/75">A smarter way for kitchens to recover value and for communities to access fresh, affordable meals before they go to waste.</p><div className="mt-9 flex flex-wrap gap-3"><button onClick={onStart} className="btn-primary group">Join the movement <ArrowRight size={18} className="transition group-hover:translate-x-1" /></button><a href="#how" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white transition hover:bg-white/10">See how it works <ChevronRight size={18} /></a></div><div className="mt-12 flex items-center gap-8 text-sm text-white/60"><div><strong className="block text-2xl text-white">12.8k+</strong> meals rescued</div><div><strong className="block text-2xl text-white">Rs 8.4L</strong> value recovered</div><div><strong className="block text-2xl text-white">4.9/5</strong> community trust</div></div></div>
          <div className="relative hidden min-h-[500px] lg:block"><div className="absolute right-8 top-8 h-[410px] w-[410px] overflow-hidden rounded-[40px] border border-white/15 bg-white/10 p-3 shadow-2xl rotate-3 transition duration-700 hover:rotate-0"><img src="https://images.pexels.com/photos/5410401/pexels-photo-5410401.jpeg?auto=compress&cs=tinysrgb&w=1000" className="h-full w-full rounded-[30px] object-cover" /><div className="absolute bottom-7 left-7 right-7 rounded-2xl bg-white/95 p-4 shadow-xl"><div className="flex items-center justify-between"><div><p className="font-bold text-navy-900">Fresh biryani drop</p><p className="mt-1 text-xs text-slate-500">2.3 km away · 3h left</p></div><span className="rounded-lg bg-brand-green-50 px-2 py-1 text-sm font-bold text-brand-green-dark">{formatPrice(350)}/kg</span></div></div></div><div className="absolute -left-2 top-32 flex animate-bounce-in items-center gap-3 rounded-2xl bg-white p-3 pr-5 shadow-xl"><div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-green-50 text-brand-green"><Bell size={18} /></div><div><p className="text-xs font-bold text-navy-900">New rescue nearby</p><p className="text-[11px] text-slate-500">8kg · just posted</p></div></div><div className="absolute bottom-20 left-2 flex animate-bounce-in items-center gap-3 rounded-2xl border border-white/10 bg-navy-700/90 p-3 pr-5 shadow-xl animate-delay-500"><div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-green text-white"><Leaf size={18} /></div><div><p className="text-xs font-bold text-white">Impact unlocked</p><p className="text-[11px] text-blue-100/60">12 meals saved today</p></div></div></div>
        </div>
      </section>
      <section id="how" className="section-pad py-24"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-[.18em] text-brand-green">Simple by design</p><h2 className="mt-3 text-4xl font-extrabold tracking-tight text-navy-900">From surplus to shared.</h2><p className="mt-4 leading-7 text-slate-500">Every rescue is designed to feel effortless, transparent, and genuinely rewarding.</p></div><div className="mt-14 grid gap-6 md:grid-cols-3"><Feature icon={<Compass />} number="01" title="Discover nearby" copy="See real-time food drops from trusted kitchens around you, with clear prices and pickup windows." /><Feature icon={<Sparkles />} number="02" title="Match your need" copy="Tell our smart assistant what you need. It finds the best fit for your budget, people and distance." /><Feature icon={<Heart />} number="03" title="Make an impact" copy="Reserve, collect, and watch your personal impact grow with every meal saved from waste." /></div></section>
      <section id="impact" className="bg-brand-green-50 py-20"><div className="section-pad grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="text-sm font-bold uppercase tracking-[.18em] text-brand-green-dark">The bigger picture</p><h2 className="mt-3 text-4xl font-extrabold tracking-tight text-navy-900">Small choices.<br />Meaningful change.</h2><p className="mt-5 max-w-md leading-7 text-slate-600">When good food finds the people who need it, everyone wins — kitchens, communities, and the planet.</p><button onClick={onStart} className="btn-navy mt-7">Start rescuing <ArrowRight size={17} /></button></div><div className="grid grid-cols-2 gap-4"><Impact value="12.8k" label="Meals rescued" /><Impact value="3.2T" label="Food diverted" /><Impact value="Rs 8.4L" label="Value recovered" /><Impact value="2.1k" label="Active rescuers" /></div></div></section>
    </main>
    <footer id="trust" className="bg-navy-900 py-10"><div className="section-pad flex flex-col justify-between gap-4 text-sm text-white/50 md:flex-row"><Brand light /><p>Built for communities that care.</p></div></footer>
    {showAuth && <AuthModal onClose={onClose} />}
  </div>;
}

function Feature({ icon, number, title, copy }: { icon: ReactNode; number: string; title: string; copy: string }) { return <div className="card card-hover p-7"><div className="flex items-start justify-between"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-green-50 text-brand-green">{icon}</div><span className="text-sm font-bold text-slate-300">{number}</span></div><h3 className="mt-7 text-xl font-bold text-navy-900">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-500">{copy}</p></div> }
function Impact({ value, label }: { value: string; label: string }) { return <div className="rounded-2xl border border-brand-green/10 bg-white p-6 shadow-sm"><p className="text-3xl font-extrabold text-navy-900">{value}</p><p className="mt-2 text-sm text-slate-500">{label}</p></div> }
function Brand({ light = false }: { light?: boolean }) { return <div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-green text-white shadow-green"><Leaf size={20} strokeWidth={2.5} /></div><span className={`text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-navy-900'}`}>Man<span className="text-brand-green">OSalwa</span>Knot</span></div> }

function AuthModal({ onClose }: { onClose: () => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [role, setRole] = useState<Profile['role']>('individual'); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); const result = mode === 'login' ? await signIn(email, password) : await signUp(email, password, name, role); setBusy(false); if (result.error) setError(result.error); else onClose(); }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-navy-900/70 p-4 backdrop-blur-sm"><div className="relative w-full max-w-md animate-scale-in rounded-3xl bg-white p-7 shadow-2xl"><button onClick={onClose} className="absolute right-5 top-5 rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button><div className="mb-7"><Brand /><h2 className="mt-7 text-2xl font-bold text-navy-900">{mode === 'login' ? 'Welcome back' : 'Join the rescue network'}</h2><p className="mt-2 text-sm text-slate-500">{mode === 'login' ? 'Pick up where you left off.' : 'Create your free account in less than a minute.'}</p></div><form onSubmit={submit} className="space-y-4">{mode === 'signup' && <input required className="input-field" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />}<input required type="email" className="input-field" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} /><input required minLength={6} type="password" className="input-field" placeholder="Password (6+ characters)" value={password} onChange={e => setPassword(e.target.value)} />{mode === 'signup' && <div className="grid grid-cols-3 gap-2">{(['individual', 'restaurant', 'hostel'] as Profile['role'][]).map(item => <button type="button" key={item} onClick={() => setRole(item)} className={`rounded-xl border px-2 py-3 text-xs font-semibold capitalize transition ${role === item ? 'border-brand-green bg-brand-green-50 text-brand-green-dark' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>{item === 'hostel' ? 'NGO / Hostel' : item}</button>)}</div>}{error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}<button disabled={busy} className="btn-primary w-full disabled:opacity-60">{busy ? <Loader2 className="animate-spin" size={17} /> : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={17} /></button></form><p className="mt-6 text-center text-sm text-slate-500">{mode === 'login' ? "Don't have an account?" : 'Already part of the movement?'} <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="font-bold text-brand-green-dark hover:underline">{mode === 'login' ? 'Sign up' : 'Sign in'}</button></p></div></div>
}

function Workspace() {
  const { profile } = useAuth(); const [view, setView] = useState<View>('home'); const [mobileNav, setMobileNav] = useState(false);
  return <div className="min-h-screen bg-[#f6f8fa] text-navy-900"><aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 px-4 py-6 transition-transform lg:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}><div className="px-3"><Brand light /></div><div className="mt-10 flex-1 space-y-1">{([{ id: 'home', label: 'Overview', icon: <Compass size={19} /> }, { id: 'discover', label: 'Discover food', icon: <Search size={19} /> }, { id: 'post', label: 'Post surplus', icon: <Plus size={19} />, roles: ['restaurant', 'hostel'] }, { id: 'assistant', label: 'Ask Salwa', icon: <Bot size={19} /> }, { id: 'history', label: 'My activity', icon: <Package size={19} /> }, { id: 'quality', label: 'Food quality AI', icon: <Shield size={19} /> }, { id: 'workspace', label: 'Business chat', icon: <MessageSquare size={19} />, roles: ['restaurant', 'hostel'] }, { id: 'profile', label: 'Profile', icon: <UserRound size={19} /> }] as { id: View; label: string; icon: ReactNode; roles?: string[] }[]).filter(item => !item.roles || item.roles.includes(profile?.role ?? 'individual')).map(item => <button key={item.id} onClick={() => { setView(item.id); setMobileNav(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${view === item.id ? 'bg-white/10 text-white' : 'text-blue-100/55 hover:bg-white/5 hover:text-white'}`}>{item.icon}<span>{item.label}</span>{item.id === 'assistant' && <span className="ml-auto rounded-full bg-brand-green px-1.5 py-0.5 text-[10px] font-bold text-white">AI</span>}</button>)}</div><div className="border-t border-white/10 pt-4"><div className="flex items-center gap-3 rounded-xl bg-white/5 p-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-brand-green text-sm font-bold text-white">{profile?.name?.slice(0, 1).toUpperCase() ?? 'U'}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{profile?.name ?? 'Rescuer'}</p><p className="text-xs capitalize text-blue-100/50">{profile?.tier ?? 'free'} member</p></div></div></div></aside><div className="lg:pl-64"><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-8"><button className="rounded-lg p-2 lg:hidden" onClick={() => setMobileNav(!mobileNav)}><Menu size={22} /></button><div className="hidden text-sm text-slate-500 sm:block">{view === 'home' ? `Good morning, ${profile?.name?.split(' ')[0] ?? 'there'}` : view === 'discover' ? 'Discover nearby surplus' : view === 'post' ? 'Share surplus food' : view === 'assistant' ? 'Your food rescue assistant' : view === 'history' ? 'Your activity' : 'Your profile'}</div><div className="ml-auto flex items-center gap-3"><CurrencySwitcher /><button className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"><Bell size={19} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-green" /></button><div className="h-8 w-px bg-slate-200" /><div className="grid h-9 w-9 place-items-center rounded-full bg-brand-green-50 text-sm font-bold text-brand-green-dark">{profile?.name?.slice(0, 1).toUpperCase() ?? 'U'}</div></div></header><main className="section-pad py-7"><ViewContent view={view} setView={setView} /></main></div></div>;
}

function ViewContent({ view, setView }: { view: View; setView: (v: View) => void }) { if (view === 'home') return <Home setView={setView} />; if (view === 'discover') return <Discover />; if (view === 'post') return <PostFood onDone={() => setView('discover')} />; if (view === 'assistant') return <Assistant />; if (view === 'history') return <History />; if (view === 'quality') return <FoodQualityAnalyzer />; if (view === 'workspace') return <BusinessWorkspace />; return <ProfilePage />; }

function Home({ setView }: { setView: (v: View) => void }) { const { profile } = useAuth(); const [posts, setPosts] = useState<FoodPostWithSeller[]>(mockFood); useEffect(() => { supabase.from('food_posts').select('*, seller:profiles!user_id(id,name,rating,rating_count,role)').eq('status', 'available').order('created_at', { ascending: false }).limit(6).then(({ data }) => { if (data?.length) setPosts(data as unknown as FoodPostWithSeller[]); }); }, []); return <div className="animate-fade-in-up"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-brand-green-dark">Tuesday, 12 March 2024</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">Good food is waiting.</h1><p className="mt-2 text-slate-500">Find a rescue near you and make today count.</p></div><button onClick={() => setView(profile?.role === 'restaurant' || profile?.role === 'hostel' ? 'post' : 'assistant')} className="btn-primary">{profile?.role === 'restaurant' || profile?.role === 'hostel' ? <><Plus size={18} /> Post food</> : <><Bot size={18} /> Find food with Salwa</>}</button></div><div className="mt-8 grid gap-4 sm:grid-cols-3"><Stat icon={<Leaf />} label="Meals rescued" value="24" delta="+6 this week" /><Stat icon={<Flame />} label="Impact score" value="840" delta="Top 12% nearby" /><Stat icon={<Heart />} label="Your savings" value={formatPrice(2460)} delta="Since joining" /></div><div className="mt-10 flex items-center justify-between"><div><h2 className="text-xl font-bold">Fresh near you</h2><p className="mt-1 text-sm text-slate-500">Food posted in the last few hours</p></div><button onClick={() => setView('discover')} className="btn-ghost text-sm">View all <ArrowRight size={16} /></button></div><div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{posts.slice(0, 3).map(post => <FoodCard key={post.id} post={post} />)}</div><div className="mt-10 rounded-3xl bg-navy-900 p-7 text-white sm:p-9"><div className="grid items-center gap-8 md:grid-cols-[1fr_auto]"><div><span className="badge bg-brand-green/20 text-brand-green-light"><Sparkles size={13} /> Smart matching</span><h2 className="mt-4 text-2xl font-bold">Not sure what to look for?</h2><p className="mt-2 max-w-xl text-sm leading-6 text-blue-100/65">Tell Salwa how many people you are feeding, your budget, or just what you are craving. It will do the searching.</p></div><button onClick={() => setView('assistant')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-navy-900 transition hover:bg-brand-green-50">Ask Salwa <ArrowRight size={17} /></button></div></div></div> }
function Stat({ icon, label, value, delta }: { icon: ReactNode; label: string; value: string; delta: string }) { return <div className="card p-5"><div className="flex items-start justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-green-50 text-brand-green">{icon}</div><span className="text-xs font-semibold text-brand-green-dark">{delta}</span></div><p className="mt-5 text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold tracking-tight text-navy-900">{value}</p></div> }

function Discover() { const [query, setQuery] = useState(''); const [posts, setPosts] = useState<FoodPostWithSeller[]>(mockFood); const filtered = useMemo(() => posts.filter(p => p.food_name.toLowerCase().includes(query.toLowerCase()) || p.location_text?.toLowerCase().includes(query.toLowerCase())), [posts, query]); return <div className="animate-fade-in-up"><div><p className="text-sm font-medium text-brand-green-dark">The live network</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight">Discover food near you</h1><p className="mt-2 text-slate-500">Fresh surplus, fair prices, real impact.</p></div><div className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><div className="relative min-h-[520px] overflow-hidden rounded-3xl bg-[#dce9df] shadow-card"><div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'linear-gradient(30deg, transparent 49%, rgba(0,31,63,.08) 50%, transparent 51%), linear-gradient(120deg, transparent 49%, rgba(0,31,63,.08) 50%, transparent 51%)', backgroundSize: '90px 90px' }} /><div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_45%,rgba(76,175,80,.35),transparent_10%),radial-gradient(circle_at_25%_20%,rgba(255,255,255,.8),transparent_28%)]" /><div className="absolute left-[51%] top-[45%] grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white bg-brand-green text-white shadow-green"><MapPin size={22} /></div>{filtered.map((p, i) => <div key={p.id} className={`absolute ${['left-[23%] top-[30%]', 'right-[18%] top-[23%]', 'right-[25%] bottom-[21%]'][i % 3]} grid h-10 w-10 place-items-center rounded-full border-4 border-white bg-navy-600 text-white shadow-lg transition hover:scale-125`}><span className="absolute h-full w-full animate-pulse-ring rounded-full bg-navy-600/40" /><Store size={16} /></div>)}<div className="absolute bottom-5 left-5 rounded-2xl bg-white/90 p-3 text-xs font-semibold text-navy-900 shadow-lg backdrop-blur"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand-green" />{filtered.length} active drops in your area</div></div><div><div className="relative"><Search className="absolute left-4 top-3.5 text-slate-400" size={18} /><input value={query} onChange={e => setQuery(e.target.value)} className="input-field pl-11" placeholder="Search biryani, wraps, location..." /></div><div className="mt-4 space-y-4">{filtered.map(post => <FoodCard key={post.id} post={post} compact />)}</div></div></div></div> }

function FoodCard({ post, compact = false }: { post: FoodPostWithSeller; compact?: boolean }) { const [saved, setSaved] = useState(false); const distance = post.lat && post.lng ? haversineKm(24.8607, 67.0011, post.lat, post.lng) : 2.3; return <article className={`card card-hover overflow-hidden ${compact ? 'flex' : ''}`}><div className={`${compact ? 'h-auto w-28 shrink-0' : 'h-44'} relative overflow-hidden bg-brand-green-50`}>{post.photo_url ? <img src={post.photo_url} className="h-full w-full object-cover transition duration-500 hover:scale-105" /> : <div className="grid h-full place-items-center text-brand-green"><Leaf size={38} /></div>}<span className="absolute left-3 top-3 badge bg-white/90 text-brand-green-dark shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-brand-green" /> Live</span><button onClick={() => setSaved(!saved)} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:scale-110">{saved ? <Heart size={15} fill="#4CAF50" className="text-brand-green" /> : <Heart size={15} />}</button></div><div className="flex-1 p-4"><div className="flex items-start justify-between gap-2"><div><h3 className="font-bold text-navy-900">{post.food_name}</h3><p className="mt-1 text-xs text-slate-500">{post.seller?.name ?? 'Community kitchen'}</p></div><span className="whitespace-nowrap text-sm font-extrabold text-brand-green-dark">{formatPrice(post.price)}<span className="text-[10px] font-medium text-slate-400">/{post.unit}</span></span></div>{!compact && <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{post.description}</p>}<div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span className="flex items-center gap-1"><MapPin size={13} /> {formatDistance(distance)}</span><span className="flex items-center gap-1"><Clock3 size={13} /> {timeUntil(post.expiry_time ?? new Date().toISOString())}</span></div><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><span className="flex items-center gap-1 text-xs font-semibold text-amber-500"><Star size={13} fill="currentColor" /> {post.seller?.rating ?? '4.8'} <span className="font-normal text-slate-400">({post.seller?.rating_count ?? 0})</span></span><button className="text-xs font-bold text-navy-600 transition hover:text-brand-green-dark">View details <ChevronRight size={14} className="inline" /></button></div></div></article> }

function PostFood({ onDone }: { onDone: () => void }) { const { profile, session } = useAuth(); const [foodName, setFoodName] = useState(''); const [quantity, setQuantity] = useState(''); const [price, setPrice] = useState(''); const [expiry, setExpiry] = useState(''); const [location, setLocation] = useState(''); const [description, setDescription] = useState(''); const [busy, setBusy] = useState(false); const [success, setSuccess] = useState(false); const [error, setError] = useState(''); async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); const { data: postData, error: err } = await supabase.from('food_posts').insert({ food_name: foodName, quantity: Number(quantity), price: Number(price), original_price: Number(price) * 2, expiry_time: new Date(expiry).toISOString(), location_text: location, description, user_id: profile?.id }).select('id').maybeSingle(); if (err) { setBusy(false); setError(err.message); return; } if (postData?.id) { try { await notifySubscribers(postData.id, session?.access_token); } catch { /* non-fatal */ } } setBusy(false); setSuccess(true); setTimeout(onDone, 1400); } if (success) return <div className="mx-auto max-w-lg animate-scale-in py-20 text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-green-50 text-brand-green"><Check size={38} /></div><h1 className="mt-6 text-3xl font-extrabold">Drop is live.</h1><p className="mt-3 text-slate-500">People nearby can now discover your food and help rescue it.</p></div>; return <div className="mx-auto max-w-3xl animate-fade-in-up"><p className="text-sm font-medium text-brand-green-dark">Help it find a home</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight">Post surplus food</h1><p className="mt-2 text-slate-500">A few details are all it takes to turn surplus into impact.</p><form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_.8fr]"><div className="card space-y-5 p-6"><Field label="What food do you have?" placeholder="e.g. Vegetable biryani, 20 portions" value={foodName} onChange={setFoodName} required /><div className="grid grid-cols-2 gap-4"><Field label="Quantity" placeholder="8" type="number" value={quantity} onChange={setQuantity} required /><div><label className="mb-2 block text-sm font-semibold text-navy-900">Unit</label><select className="input-field"><option>kg</option><option>portions</option><option>packs</option><option>litres</option></select></div></div><div className="grid grid-cols-2 gap-4"><Field label={`Rescue price (${getCurrency()})`} placeholder="350" type="number" value={price} onChange={setPrice} required /><Field label="Available until" type="datetime-local" value={expiry} onChange={setExpiry} required /></div><Field label="Pickup location" placeholder="Street, neighbourhood or landmark" value={location} onChange={setLocation} required /><div><label className="mb-2 block text-sm font-semibold text-navy-900">A little more detail <span className="font-normal text-slate-400">(optional)</span></label><textarea className="input-field min-h-28 resize-none" placeholder="Packing details, dietary notes, pickup instructions..." value={description} onChange={e => setDescription(e.target.value)} /></div></div><div className="space-y-5"><div className="rounded-2xl bg-brand-green-50 p-6"><div className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-green"><Zap size={19} /></div><div><h3 className="font-bold text-navy-900">Rescue tip</h3><p className="mt-1 text-sm leading-6 text-slate-600">Clear portions and a realistic pickup window help food move 2x faster.</p></div></div></div><div className="card p-6"><h3 className="font-bold">Your listing preview</h3><div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="font-bold text-navy-900">{foodName || 'Your food name'}</p><p className="mt-1 text-xs text-slate-500">{quantity || '0'} kg · {location || 'Pickup location'}</p><p className="mt-4 text-xl font-extrabold text-brand-green-dark">{price ? formatPrice(Number(price)) : formatPrice(0)}</p></div></div>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}<button disabled={busy} className="btn-primary w-full disabled:opacity-60">{busy ? <Loader2 className="animate-spin" size={17} /> : <><Sparkles size={17} /> Publish rescue drop</>}</button></div></form></div> }
function Field({ label, placeholder, value, onChange, type = 'text', required = false }: { label: string; placeholder?: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <div><label className="mb-2 block text-sm font-semibold text-navy-900">{label}</label><input required={required} type={type} placeholder={placeholder} className="input-field" value={value} onChange={e => onChange(e.target.value)} /></div> }

function Assistant() {
  const { profile, session } = useAuth();
  const [messages, setMessages] = useState<{ role: 'assistant' | 'user'; text: string }[]>([
    { role: 'assistant', text: profile?.name ? `Assalam-o-Alaikum ${profile.name.split(' ')[0]}! I am Salwa. I can find real food available near you right now.\n\nEnglish or Urdu — both work. Try: "biryani for 10 people" or "mujhe 500 rupees mein khana chahiye."` : 'Assalam-o-Alaikum! I am Salwa, your food rescue assistant. Tell me what you need — in English or Urdu. I search real listings on the platform.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [lang, setLang] = useState<'en' | 'ur'>('en');
  const recRef = useRef<Record<unknown> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, busy]);

  async function send(text = input) {
    if (!text.trim() || busy) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text }]);
    setBusy(true);
    try {
      const data = await sendChat(text, profile?.id, lang, session?.access_token);
      setMessages(m => [...m, { role: 'assistant', text: data.reply || 'Sorry, I could not process that.' }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'I could not reach the server right now. Please try again in a moment.' }]);
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
  function handleSend(text: string) { if (isUrdu(text)) setLang('ur'); else setLang('en'); send(text); }

  return <div className="mx-auto max-w-4xl animate-fade-in-up">
    <div className="mb-7 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-navy-900 text-brand-green-light shadow-navy"><Bot size={25} /></div>
        <div><p className="text-sm font-medium text-brand-green-dark">Powered by real platform data</p><h1 className="text-3xl font-extrabold tracking-tight">Ask Salwa</h1></div>
      </div>
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1">
        {(['en', 'ur'] as const).map(l => <button key={l} onClick={() => setLang(l)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${lang === l ? 'bg-navy-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{l === 'en' ? 'EN' : 'اردو'}</button>)}
      </div>
    </div>
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 p-4"><span className="h-2.5 w-2.5 rounded-full bg-brand-green animate-pulse" /><span className="text-sm font-semibold text-navy-900">Salwa AI</span><span className="text-xs text-slate-400">· Searching real food listings</span></div>
      <div ref={scrollRef} className="max-h-[420px] min-h-[390px] space-y-5 overflow-y-auto p-5 sm:p-7">{messages.map((m, i) => <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}><div className={`max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 ${m.role === 'user' ? 'rounded-br-md bg-navy-900 text-white' : 'rounded-bl-md bg-brand-green-50 text-navy-900'}`}>{m.text}</div></div>)}{busy && <div className="flex gap-3"><div className="rounded-2xl rounded-bl-md bg-brand-green-50 px-4 py-3"><Loader2 size={16} className="animate-spin text-brand-green" /></div></div>}</div>
      <div className="border-t border-slate-100 p-4"><div className="mb-3 flex flex-wrap gap-2">{lang === 'ur' ? ['مجھے بریانی چاہیے 10 لوگوں کے لیے', 'قریب کیا دستیاب ہے؟', 'بجٹ 500 روپے'] : ['Biryani for 10 people', 'What is nearby?', `I have ${formatPriceShort(500)} budget`].map(q => <button key={q} onClick={() => handleSend(q)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-green hover:bg-brand-green-50">{q}</button>)}{lang === 'en' && <button onClick={() => handleSend('Mujhe 500 rupees mein khana chahiye')} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-green hover:bg-brand-green-50">Mujhe 500 rupees mein khana chahiye</button>}</div><form onSubmit={e => { e.preventDefault(); handleSend(input); }} className="flex gap-2"><input value={input} onChange={e => setInput(e.target.value)} className="input-field" placeholder={lang === 'ur' ? 'سلواءٰ پوچھیں...' : 'Ask in English or Urdu...'} /><button type="button" onClick={toggleVoice} className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl transition ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{recording ? <Square size={18} /> : <Mic size={18} />}</button><button className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-green text-white transition hover:bg-brand-green-dark"><Send size={18} /></button></form>{recording && <p className="mt-2 text-xs font-medium text-red-500">Listening... speak now</p>}</div>
    </div>
  </div>;
}

function History() { const { profile } = useAuth(); const [items, setItems] = useState<Transaction[]>([]); useEffect(() => { if (!profile) return; supabase.from('transactions').select('*').or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`).order('created_at', { ascending: false }).then(({ data }) => setItems((data as Transaction[]) ?? [])); }, [profile]); return <div className="animate-fade-in-up"><p className="text-sm font-medium text-brand-green-dark">Your impact trail</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight">My activity</h1><div className="mt-8 grid gap-4 sm:grid-cols-3"><Stat icon={<Truck />} label="Rescues completed" value="24" delta="+6 this month" /><Stat icon={<Leaf />} label="Meals kept in use" value="86" delta="Growing daily" /><Stat icon={<Heart />} label="Community rating" value="4.9" delta="Excellent" /></div><div className="card mt-8 overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 p-5"><h2 className="font-bold">Recent transactions</h2><button className="btn-ghost text-xs">Download report</button></div>{items.length === 0 ? <div className="p-12 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-green-50 text-brand-green"><Package size={24} /></div><p className="mt-4 font-semibold text-navy-900">Your rescue story starts here</p><p className="mt-1 text-sm text-slate-500">Completed purchases and sales will appear in this timeline.</p></div> : items.map(item => <div key={item.id} className="flex items-center justify-between border-b border-slate-100 p-5 last:border-0"><div><p className="font-semibold">{item.food_name}</p><p className="mt-1 text-xs text-slate-500">{timeAgo(item.created_at)} · {item.payment_method}</p></div><span className="font-bold text-brand-green-dark">{formatPrice(item.amount)}</span></div>)}</div></div> }

function ProfilePage() { const { profile, signOut } = useAuth(); const [alertsOn, setAlertsOn] = useState(false); const [alertRadius, setAlertRadius] = useState('3'); const [alertBusy, setAlertBusy] = useState(false); useEffect(() => { if (!profile) return; supabase.from('food_subscriptions').select('*').eq('user_id', profile.id).maybeSingle().then(({ data }) => { if (data) { setAlertsOn(true); setAlertRadius(String(data.notify_radius_km)); } }); }, [profile]); async function toggleAlerts() { if (!profile) return; setAlertBusy(true); if (alertsOn) { await supabase.from('food_subscriptions').delete().eq('user_id', profile.id); setAlertsOn(false); } else { await supabase.from('food_subscriptions').upsert({ user_id: profile.id, notify_radius_km: Number(alertRadius), email_enabled: true }); setAlertsOn(true); } setAlertBusy(false); } async function updateRadius(value: string) { setAlertRadius(value); if (alertsOn && profile) { await supabase.from('food_subscriptions').update({ notify_radius_km: Number(value) }).eq('user_id', profile.id); } } return <div className="mx-auto max-w-3xl animate-fade-in-up"><p className="text-sm font-medium text-brand-green-dark">Your account</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight">Profile</h1><div className="card mt-8 overflow-hidden"><div className="h-28 bg-navy-900" /><div className="px-6 pb-6"><div className="-mt-10 flex items-end justify-between"><div className="grid h-20 w-20 place-items-center rounded-2xl border-4 border-white bg-brand-green text-3xl font-bold text-white shadow-lg">{profile?.name?.slice(0, 1).toUpperCase()}</div><span className="badge bg-brand-green-50 text-brand-green-dark"><ShieldCheck size={14} /> Verified member</span></div><h2 className="mt-4 text-2xl font-bold">{profile?.name}</h2><p className="mt-1 text-sm text-slate-500">{profile?.email}</p><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Member type</p><p className="mt-1 font-bold capitalize">{profile?.role}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Plan</p><p className="mt-1 font-bold capitalize">{profile?.tier} member</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Trust score</p><p className="mt-1 flex items-center gap-1 font-bold"><Star size={14} fill="#FFA726" className="text-amber-500" /> {profile?.rating || 'New'}</p></div></div><div className="mt-7 rounded-2xl border border-slate-200 p-5"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-green-50 text-brand-green"><Mail size={19} /></div><div><h3 className="font-bold text-navy-900">Food alert notifications</h3><p className="mt-1 text-sm text-slate-500">Get an email the moment new food is posted near you.</p></div></div><button onClick={toggleAlerts} disabled={alertBusy} className={`relative h-7 w-12 shrink-0 rounded-full transition ${alertsOn ? 'bg-brand-green' : 'bg-slate-300'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${alertsOn ? 'left-6' : 'left-1'}`} /></button></div>{alertsOn && <div className="mt-4 border-t border-slate-100 pt-4"><label className="mb-2 block text-sm font-semibold text-navy-900">Alert radius</label><div className="flex items-center gap-3"><input type="range" min="1" max="10" value={alertRadius} onChange={e => updateRadius(e.target.value)} className="flex-1 accent-brand-green" /><span className="whitespace-nowrap text-sm font-bold text-brand-green-dark">{alertRadius} km</span></div><p className="mt-2 text-xs text-slate-400">You will be notified when food is posted within this distance.</p></div>}</div><button onClick={signOut} className="mt-7 inline-flex items-center gap-2 rounded-xl border border-red-100 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"><LogOut size={16} /> Sign out</button></div></div></div> }

function FoodQualityAnalyzer() {
  const { session } = useAuth();
  const [imageUrl, setImageUrl] = useState('');
  const [result, setResult] = useState<QualityAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function analyze() {
    if (!imageUrl.trim()) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const data = await analyzeQuality(imageUrl, session?.access_token);
      setResult(data);
    } catch (err) {
      setError('Could not analyze this image. Please try another URL.');
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
          <p className="text-sm font-medium text-brand-green-dark">AI-Powered Verification</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Food Quality Analyzer</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_.9fr]">
        <div className="card p-6">
          <h3 className="font-bold text-navy-900 mb-4">Analyze Food Photo</h3>
          <p className="text-sm text-slate-500 mb-4">Paste a food image URL to verify quality, freshness, and presentation before you buy.</p>
          <div className="space-y-4">
            <input
              className="input-field"
              placeholder="Paste food image URL..."
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
            />
            {imageUrl && (
              <div className="h-48 rounded-xl overflow-hidden bg-slate-50">
                <img src={imageUrl} className="h-full w-full object-cover" alt="Food preview" onError={() => setError('Invalid image URL')} />
              </div>
            )}
            <button onClick={analyze} disabled={busy || !imageUrl.trim()} className="btn-primary w-full disabled:opacity-60">
              {busy ? <Loader2 className="animate-spin" size={17} /> : <><Camera size={17} /> Analyze with AI</>}
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
                    {result.trustBadge.charAt(0).toUpperCase() + result.trustBadge.slice(1)}
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
                <h3 className="font-bold text-navy-900 mb-4">Detailed Analysis</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Freshness</span>
                    <span className="text-sm font-semibold text-navy-900">{result.freshness}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Hygiene</span>
                    <span className="text-sm font-semibold text-navy-900">{result.hygiene}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Presentation</span>
                    <span className="text-sm font-semibold text-navy-900">{result.presentation}</span>
                  </div>
                </div>
                {result.concerns.length > 0 && (
                  <div className="mt-4 rounded-xl bg-amber-50 p-3">
                    <p className="text-xs font-bold text-amber-700 mb-1">⚠️ Concerns</p>
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
            <div className="card p-12 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-green-50 text-brand-green">
                <Camera size={28} />
              </div>
              <h3 className="mt-4 font-bold text-navy-900">AI-Powered Food Verification</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
                Our AI analyzes food photos for freshness, hygiene, and presentation quality. It detects if food looks different from what's advertised.
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
    supabase.from('food_posts').select('*, seller:profiles!user_id(id,name,rating,rating_count,role)')
      .eq('user_id', profile.id).eq('status', 'available')
      .order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => { if (data?.length) setPosts(data as unknown as FoodPostWithSeller[]); });
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
    } catch { /* silent */ }
  }

  async function sendMsg(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || !selectedPost || !profile) return;
    setBusy(true);
    try {
      await sendWorkspaceMessage(selectedPost, profile.id, profile.name, profile.role, input, session?.access_token);
      setInput('');
      await loadMessages();
    } catch { /* silent */ }
    setBusy(false);
  }

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center gap-3 mb-7">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-navy-900 text-brand-green-light shadow-navy">
          <MessageSquare size={25} />
        </div>
        <div>
          <p className="text-sm font-medium text-brand-green-dark">Coordination Hub</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Business Workspace</h1>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[.4fr_1fr]">
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Your Active Listings</h3>
          {posts.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-sm text-slate-500">No active food posts yet.</p>
            </div>
          ) : posts.map(post => (
            <button key={post.id} onClick={() => setSelectedPost(post.id)}
              className={`card w-full p-4 text-left transition ${selectedPost === post.id ? 'border-brand-green ring-2 ring-brand-green/20' : 'card-hover'}`}>
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
                  <div className="text-center py-12">
                    <MessageSquare className="mx-auto text-slate-300" size={32} />
                    <p className="mt-3 text-sm text-slate-500">No messages yet. Start the conversation!</p>
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
                  <input value={input} onChange={e => setInput(e.target.value)} className="input-field" placeholder="Type a message..." />
                  <button disabled={busy} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-green text-white transition hover:bg-brand-green-dark">
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <Users className="mx-auto text-slate-300" size={40} />
              <h3 className="mt-4 font-bold text-navy-900">Select a listing</h3>
              <p className="mt-2 text-sm text-slate-500">Choose a food listing to view and manage coordination with interested individuals.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CurrencySwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Currency>(getCurrency());
  function select(c: Currency) { setCurrency(c); setCurrent(c); setOpen(false); }
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
