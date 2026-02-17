
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Link, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { 
  ClipboardList, 
  Map as MapIcon, 
  MessageSquare, 
  User as UserIcon, 
  Search, 
  ChevronRight, 
  Settings,
  ShieldCheck,
  TrendingUp,
  ArrowLeft,
  Plus,
  X,
  Sparkles,
  Edit2,
  Trash2,
  Users as UsersIcon,
  Award,
  Crown,
  Medal,
  Info,
  LockKeyhole,
  ChevronUp,
  ChevronDown,
  Play,
  LogOut,
  Zap,
  BookOpen,
  StickyNote,
  Save,
  KeyRound,
  Eye,
  EyeOff,
  UserPlus,
  Video,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  Wifi
} from 'lucide-react';

// Firebase (Actual implementation would use the firebase.ts file)
// For this demo, we'll keep the logic structured so it's ready for a simple drop-in
import { UserRole, SkillLevel, SkillLevelLabels, UserSkillProgress, QA, Procedure, Skill, User } from './types';
import { MOCK_PROCEDURES, MOCK_SKILLS, MOCK_QA } from './constants';

// --- Constants ---
const DEFAULT_CLINIC_NAME = "なないろ歯科";
const APP_STORAGE_KEYS = {
  USERS: 'dh_path_all_users',
  LOGGED_USER: 'dh_path_logged_user',
  CLINIC_NAME: 'dh_path_clinic_name',
  QA: 'dh_path_qa_list',
  PROCEDURES: 'dh_path_procedures',
  PROGRESS: 'dh_path_all_skill_progress',
  MEMOS: 'dh_path_all_memos'
};

const INITIAL_USERS: User[] = [
  { id: 'u1', name: '田中 里奈', role: UserRole.NEWBIE, clinicId: 'c1', password: '1234' },
  { id: 'u3', name: '佐藤 結衣', role: UserRole.NEWBIE, clinicId: 'c1', password: '1234' },
  { id: 'u2', name: '鈴木 院長', role: UserRole.MENTOR, clinicId: 'c1', password: '1234' },
];

// --- Helpers ---
const getRankInfo = (progress: number) => {
  const PROGRESS_RANKS = [
    { min: 0, label: '研修生', color: 'bg-slate-400', textColor: 'text-slate-400', icon: <UserIcon size={14} /> },
    { min: 21, label: 'ジュニア', color: 'bg-emerald-500', textColor: 'text-emerald-500', icon: <Zap size={14} /> },
    { min: 41, label: 'スタンダード', color: 'bg-blue-500', textColor: 'text-blue-500', icon: <Award size={14} /> },
    { min: 61, label: 'エキスパート', color: 'bg-purple-600', textColor: 'text-purple-600', icon: <Medal size={14} /> },
    { min: 81, label: 'マスター', color: 'bg-amber-500', textColor: 'text-amber-500', icon: <Crown size={14} /> },
  ];
  return [...PROGRESS_RANKS].reverse().find(r => progress >= r.min) || PROGRESS_RANKS[0];
};

const formatEmbedUrl = (url: string) => {
  if (!url) return "";
  if (url.includes('youtube.com/embed')) return url;
  if (url.includes('youtube.com/watch?v=')) {
    const id = url.split('v=')[1]?.split('&')[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split('?')[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  return url;
};

// Fix for line 97: Moved INDEPENDENT_LEVEL_SCORE declaration before totalPoints calculation
const calculateProgress = (skills: Skill[], progress: UserSkillProgress[]) => {
  if (skills.length === 0) return 0;
  const INDEPENDENT_LEVEL_SCORE = 3;
  const totalPoints = skills.length * INDEPENDENT_LEVEL_SCORE;
  const currentPoints = skills.reduce((acc, skill) => {
    const p = progress.find(sp => sp.skillId === skill.id);
    return acc + (p?.level || 0);
  }, 0);
  return Math.round((currentPoints / totalPoints) * 100);
};

// --- Components ---

const Header: React.FC<{ title: string; user: User | null; clinicName: string; isSyncing?: boolean }> = ({ title, user, clinicName, isSyncing }) => (
  <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center shadow-sm">
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-black text-teal-600 leading-none">なないろ</h1>
        <div className="flex items-center gap-1">
          {isSyncing ? (
            <RefreshCw size={10} className="text-amber-400 animate-spin" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
          )}
          <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">Live Sync</span>
        </div>
      </div>
      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{clinicName}</p>
    </div>
    {user && (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
          user.role === UserRole.MENTOR ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-teal-50 text-teal-600 border-teal-100'
        }`}>
          {user.role === UserRole.MENTOR ? 'Mentor' : 'Staff'}
        </span>
      </div>
    )}
  </header>
);

const Navigation: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around safe-area-bottom z-50 px-2 shadow-[0_-10px_30px_rgba(0,0,0,0.04)]">
      <NavItem to="/" icon={<TrendingUp size={20} />} label="ホーム" active={location.pathname === '/'} />
      <NavItem to="/procedures" icon={<ClipboardList size={20} />} label="手順" active={isActive('/procedures')} />
      <NavItem to="/skills" icon={<MapIcon size={20} />} label="スキル" active={isActive('/skills')} />
      <NavItem to="/qa" icon={<MessageSquare size={20} />} label="Q&A" active={isActive('/qa')} />
      <NavItem to="/profile" icon={<UserIcon size={20} />} label="プロフ" active={isActive('/profile')} />
    </nav>
  );
};

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; active: boolean }> = ({ to, icon, label, active }) => (
  <Link to={to} className={`flex flex-col items-center justify-center py-2 px-1 flex-1 transition-all ${active ? 'text-teal-600 scale-105' : 'text-slate-300'}`}>
    {icon}
    <span className="text-[9px] mt-1 font-black">{label}</span>
  </Link>
);

// --- Sub-Pages (Extracted for better readability) ---

const DashboardPage: React.FC<any> = ({ user, procedures, allProgress, skills, allUsers, clinicName, memo, onSaveMemo, isSaving }) => {
  const navigate = useNavigate();
  const [tempMemo, setTempMemo] = useState(memo);
  useEffect(() => setTempMemo(memo), [memo]);
  
  const newbieStats = allUsers.filter((u: User) => u.role === UserRole.NEWBIE).map((u: User) => ({
    ...u,
    progress: calculateProgress(skills, allProgress[u.id] || [])
  }));

  const myProgress = user.role === UserRole.NEWBIE ? calculateProgress(skills, allProgress[user.id] || []) : 0;
  const myRank = getRankInfo(myProgress);

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <section>
        <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 rounded-[40px] p-8 text-white shadow-2xl shadow-teal-200/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Sparkles size={180} />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black mb-1 leading-none">こんにちは、{user.name}さん</h2>
            <p className="text-[10px] opacity-70 font-black uppercase tracking-widest">{clinicName} / {user.role}</p>
            
            {user.role === UserRole.NEWBIE && (
              <div className="mt-8 space-y-4">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">現在のグレード</span>
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-xl ${myRank.color} bg-white/20 shadow-inner`}>{myRank.icon}</div>
                      <span className="text-2xl font-black tracking-tight">{myRank.label}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-black tabular-nums">{myProgress}<span className="text-sm opacity-60 ml-0.5">%</span></span>
                  </div>
                </div>
                <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
                  <div className="h-full bg-white rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(255,255,255,0.4)]" style={{ width: `${myProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {user.role === UserRole.MENTOR && (
        <section className="space-y-4">
          <h3 className="text-[11px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest px-2">
            <UsersIcon size={14} className="text-teal-600" /> スタッフ進捗
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 no-scrollbar">
            {newbieStats.map((staff: any) => (
              <button key={staff.id} onClick={() => navigate(`/skills/${staff.id}`)} className="min-w-[160px] bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center text-center hover:border-teal-200 transition-all group">
                <div className="w-14 h-14 bg-slate-50 rounded-[22px] flex items-center justify-center text-teal-600 font-black text-xl mb-3 shadow-inner group-hover:bg-teal-600 group-hover:text-white transition-all">
                  {staff.name.charAt(0)}
                </div>
                <p className="font-black text-slate-800 text-sm truncate w-full">{staff.name}</p>
                <div className={`mt-2 px-3 py-1 rounded-full text-[9px] font-black text-white ${getRankInfo(staff.progress).color} shadow-sm`}>{getRankInfo(staff.progress).label}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-4">
        <div onClick={() => navigate('/procedures')} className="bg-white p-6 rounded-[36px] border border-slate-100 flex flex-col items-center text-center cursor-pointer active:scale-95 transition-all shadow-sm">
          <div className="w-14 h-14 bg-blue-50 rounded-[22px] flex items-center justify-center text-blue-600 mb-3 shadow-inner"><BookOpen size={28} /></div>
          <span className="text-xs font-black text-slate-800">手順書</span>
        </div>
        <div onClick={() => navigate('/qa')} className="bg-white p-6 rounded-[36px] border border-slate-100 flex flex-col items-center text-center cursor-pointer active:scale-95 transition-all shadow-sm">
          <div className="w-14 h-14 bg-amber-50 rounded-[22px] flex items-center justify-center text-amber-600 mb-3 shadow-inner"><MessageSquare size={28} /></div>
          <span className="text-xs font-black text-slate-800">院内ナレッジ</span>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-[11px] font-black text-slate-400 flex items-center justify-between px-2 uppercase tracking-widest">
          <div className="flex items-center gap-2"><StickyNote size={14} className="text-teal-600" /> 学習メモ</div>
          {isSaving && <div className="text-teal-600 animate-pulse text-[8px] font-black">SYNCING...</div>}
        </h3>
        <div className="bg-amber-50 rounded-[32px] p-6 border border-amber-100 shadow-sm space-y-4">
          <textarea value={tempMemo} onChange={(e) => setTempMemo(e.target.value)} placeholder="今日学んだことをメモ..." className="w-full bg-transparent border-none outline-none text-sm text-amber-950 min-h-[140px] font-bold leading-relaxed resize-none" />
          <button onClick={() => onSaveMemo(tempMemo)} className="w-full py-3 bg-amber-200 text-amber-900 text-[11px] font-black rounded-full shadow-sm hover:bg-amber-300 transition-all flex items-center justify-center gap-2">
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} 内容を保存
          </button>
        </div>
      </section>
    </div>
  );
};

// --- Main App Logic (Synced Version) ---

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
  const [user, setUser] = useState<User | null>(null);
  const [clinicName, setClinicName] = useState(DEFAULT_CLINIC_NAME);
  const [qaList, setQaList] = useState<QA[]>(MOCK_QA);
  const [proceduresList, setProceduresList] = useState<Procedure[]>(MOCK_PROCEDURES);
  const [allSkillProgress, setAllSkillProgress] = useState<Record<string, UserSkillProgress[]>>({});
  const [userMemos, setUserMemos] = useState<Record<string, string>>({});
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Real-time Sync Logic (Mocking Firestore onSnapshot) ---
  // In a real app, you would use firebase/firestore here.
  useEffect(() => {
    setIsSyncing(true);
    
    // Load local storage as initial state
    const savedUsers = localStorage.getItem(APP_STORAGE_KEYS.USERS);
    const savedLogged = localStorage.getItem(APP_STORAGE_KEYS.LOGGED_USER);
    const savedClinic = localStorage.getItem(APP_STORAGE_KEYS.CLINIC_NAME);
    const savedQA = localStorage.getItem(APP_STORAGE_KEYS.QA);
    const savedProcs = localStorage.getItem(APP_STORAGE_KEYS.PROCEDURES);
    const savedProgress = localStorage.getItem(APP_STORAGE_KEYS.PROGRESS);
    const savedMemos = localStorage.getItem(APP_STORAGE_KEYS.MEMOS);

    if (savedUsers) setAllUsers(JSON.parse(savedUsers));
    if (savedLogged) setUser(JSON.parse(savedLogged));
    if (savedClinic) setClinicName(savedClinic);
    if (savedQA) setQaList(JSON.parse(savedQA));
    if (savedProcs) setProceduresList(JSON.parse(savedProcs));
    if (savedProgress) setAllSkillProgress(JSON.parse(savedProgress));
    if (savedMemos) setUserMemos(JSON.parse(savedMemos));

    // Simulate real-time sync check
    const syncInterval = setInterval(() => {
      // Here we would normally check Firestore for updates
      // onSnapshot(doc(db, "clinics", "c1"), (doc) => { ... })
    }, 5000);

    const timeout = setTimeout(() => setIsSyncing(false), 800);
    return () => {
      clearInterval(syncInterval);
      clearTimeout(timeout);
    };
  }, []);

  const persist = useCallback(async (key: string, data: any) => {
    setIsSaving(true);
    // In Firebase version: 
    // await setDoc(doc(db, "clinics", "c1", key, "main"), data);
    await new Promise(r => setTimeout(r, 600)); // Simulate network latency
    localStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data));
    setIsSaving(false);
  }, []);

  // --- Action Handlers ---

  const handleSaveMemo = async (memo: string) => {
    if (!user) return;
    const newMemos = { ...userMemos, [user.id]: memo };
    setUserMemos(newMemos);
    await persist(APP_STORAGE_KEYS.MEMOS, newMemos);
  };

  const handleUpdateSkillProgress = async (targetUserId: string, skillId: string, updates: Partial<UserSkillProgress>) => {
    const userProgress = [...(allSkillProgress[targetUserId] || [])];
    const index = userProgress.findIndex(p => p.skillId === skillId);
    const now = new Date().toISOString();
    
    if (index >= 0) {
      userProgress[index] = { ...userProgress[index], ...updates, updatedAt: now };
    } else {
      userProgress.push({ userId: targetUserId, skillId, level: updates.level ?? 0, mentorComment: updates.mentorComment ?? '', updatedAt: now });
    }
    
    const newAllProgress = { ...allSkillProgress, [targetUserId]: userProgress };
    setAllSkillProgress(newAllProgress);
    await persist(APP_STORAGE_KEYS.PROGRESS, newAllProgress);
  };

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem(APP_STORAGE_KEYS.LOGGED_USER, JSON.stringify(u));
    navigate('/');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(APP_STORAGE_KEYS.LOGGED_USER);
    navigate('/login');
  };

  // --- Auth Guard ---
  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 shadow-2xl relative flex flex-col font-sans border-x border-slate-100 overflow-hidden">
      <Header title="なないろ" user={user} clinicName={clinicName} isSyncing={isSyncing} />
      <main className="flex-1 overflow-y-auto no-scrollbar bg-slate-50/50">
        <Routes>
          <Route path="/login" element={<LoginPage users={allUsers} onLogin={handleLogin} clinicName={clinicName} />} />
          <Route path="/" element={<DashboardPage user={user!} procedures={proceduresList} allProgress={allSkillProgress} skills={MOCK_SKILLS} allUsers={allUsers} clinicName={clinicName} memo={userMemos[user?.id || ''] || ''} onSaveMemo={handleSaveMemo} isSaving={isSaving} />} />
          <Route path="/procedures" element={<div className="p-4"><h2 className="text-xl font-black">Procedures List</h2><p className="text-slate-400 text-xs">Ready for real-time data sync</p></div>} />
          <Route path="/skills" element={<div className="p-4"><h2 className="text-xl font-black">Skill Map</h2><p className="text-slate-400 text-xs">Synced across devices</p></div>} />
          <Route path="/skills/:userId" element={<div className="p-4"><h2 className="text-xl font-black">User Progress</h2></div>} />
          <Route path="/qa" element={<div className="p-4"><h2 className="text-xl font-black">Clinic Knowledge</h2></div>} />
          <Route path="/profile" element={<div className="p-4 text-center py-20"><button onClick={handleLogout} className="px-10 py-4 bg-red-500 text-white font-black rounded-3xl">Logout</button></div>} />
        </Routes>
      </main>
      {user && <Navigation />}
      
      {/* Real-time Status Floating Toast */}
      {isSaving && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-2 rounded-full text-[10px] font-black tracking-widest flex items-center gap-2 shadow-2xl animate-in slide-in-from-bottom-2">
          <Wifi size={12} className="text-emerald-400" /> SYNCING WITH CLOUD...
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

// Placeholder for LoginPage since it's used in AppContent
const LoginPage: React.FC<any> = ({ users, onLogin, clinicName }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  
  return (
    <div className="p-8 space-y-8 flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-20 h-20 bg-teal-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-teal-200">
        <ClipboardList size={40} className="text-white" />
      </div>
      <div className="text-center">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">なないろアプリ</h2>
        <p className="text-slate-400 text-xs font-black mt-1 uppercase tracking-widest">{clinicName}</p>
      </div>

      {!selectedUser ? (
        <div className="w-full space-y-3">
          {users.map((u: User) => (
            <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full p-4 bg-white border border-slate-100 rounded-3xl flex items-center justify-between shadow-sm active:scale-95 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-teal-600"><UserIcon size={20} /></div>
                <div className="text-left">
                  <p className="text-sm font-black">{u.name}</p>
                  <p className="text-[9px] text-slate-400 font-black">{u.role}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-200" />
            </button>
          ))}
        </div>
      ) : (
        <div className="w-full space-y-6 bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <button onClick={() => setSelectedUser(null)} className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1"><ArrowLeft size={14}/> Back</button>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-black text-slate-800">{selectedUser.name}</h3>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Enter Password</p>
          </div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-center text-xl font-black outline-none focus:ring-2 focus:ring-teal-500" />
          <button onClick={() => onLogin(selectedUser)} className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black shadow-lg shadow-teal-100 active:scale-95 transition-all">Login</button>
        </div>
      )}
    </div>
  );
};
