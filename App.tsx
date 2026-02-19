
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { 
  ClipboardList, 
  Map as MapIcon, 
  MessageSquare, 
  User as UserIcon, 
  Search, 
  ChevronRight, 
  TrendingUp,
  ArrowLeft,
  Edit2,
  Users as UsersIcon,
  Award,
  Crown,
  Medal,
  Sparkles,
  Zap,
  BookOpen,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  X,
  Target,
  ChevronUp,
  ChevronDown,
  ImageIcon,
  FileText,
  AlertCircle,
  ArrowDownUp,
  Lock,
  Eye,
  EyeOff,
  Link as LinkIcon,
  ExternalLink,
  Video,
  Upload,
  FileUp,
  PartyPopper,
  Loader2,
  UserPlus
} from 'lucide-react';

// Firebase integration
import { db } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

// --- Types & Config ---
import { UserRole, SkillLevel, SkillLevelLabels, UserSkillProgress, Procedure, Skill, User, QA, Attachment } from './types';
import { MOCK_PROCEDURES, MOCK_SKILLS, MOCK_QA } from './constants';

const DEFAULT_CLINIC_NAME = "なないろ歯科";
const APP_STORAGE_KEYS = {
  LOGGED_USER: 'dh_path_logged_user'
};

const INITIAL_USERS: User[] = [
  { id: 'u1', name: '岡田 堂生', role: UserRole.NEWBIE, clinicId: 'c1', password: '1234' },
  { id: 'u3', name: '佐藤 結衣', role: UserRole.NEWBIE, clinicId: 'c1', password: '1234' },
  { id: 'u2', name: '國友 院長', role: UserRole.MENTOR, clinicId: 'c1', password: '1234' },
];

const getTodayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const getRankInfo = (progress: number) => {
  const PROGRESS_RANKS = [
    { min: 0, label: '研修生', color: 'bg-slate-400', icon: <UserIcon size={14} /> },
    { min: 21, label: 'ジュニア', color: 'bg-emerald-500', icon: <Zap size={14} /> },
    { min: 41, label: 'スタンダード', color: 'bg-blue-500', icon: <Award size={14} /> },
    { min: 61, label: 'エキスパート', color: 'bg-purple-600', icon: <Medal size={14} /> },
    { min: 81, label: 'マスター', color: 'bg-amber-500', icon: <Crown size={14} /> },
  ];
  return [...PROGRESS_RANKS].reverse().find(r => progress >= r.min) || PROGRESS_RANKS[0];
};

const calculateProgress = (skills: Skill[], progress: UserSkillProgress[]) => {
  if (skills.length === 0) return 0;
  const totalPoints = skills.length * 3;
  const currentPoints = skills.reduce((acc, skill) => {
    const p = progress.find(sp => sp.skillId === skill.id);
    return acc + (p?.level || 0);
  }, 0);
  return Math.round((currentPoints / totalPoints) * 100);
};

// --- UI Components ---

const Header: React.FC<{ user: User | null; clinicName: string; isSyncing?: boolean }> = ({ user, clinicName, isSyncing }) => (
  <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center shadow-sm">
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-black text-teal-600 leading-none">なないろ</h1>
        <div className="flex items-center gap-1">
          {isSyncing ? (
            <RefreshCw size={10} className="text-amber-400 animate-spin" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
          )}
          <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">{isSyncing ? 'Syncing...' : 'Live'}</span>
        </div>
      </div>
      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{clinicName}</p>
    </div>
    {user && (
      <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
        user.role === UserRole.MENTOR ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-teal-50 text-teal-600 border-teal-100'
      }`}>
        {user.role === UserRole.MENTOR ? 'Mentor' : 'Staff'}
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

// --- Login Logic ---

const LoginPage: React.FC<{ allUsers: User[], onLogin: (user: User) => void, onAddUser: (name: string, role: UserRole, password: string) => void }> = ({ allUsers, onLogin, onAddUser }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.NEWBIE);
  const [newPassword, setNewPassword] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (selectedUser.password === password) {
      onLogin(selectedUser);
    } else {
      setError('パスワードが正しくありません');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPassword.trim()) {
      setError('全ての項目を入力してください');
      setTimeout(() => setError(''), 3000);
      return;
    }
    onAddUser(newName, newRole, newPassword);
    setIsRegistering(false);
    setNewName('');
    setNewPassword('');
    setNewRole(UserRole.NEWBIE);
  };

  if (isRegistering) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-screen space-y-8 animate-in slide-in-from-bottom-5">
        <div className="text-center">
          <button onClick={() => setIsRegistering(false)} className="mb-6 p-2 bg-white rounded-full text-slate-400 shadow-sm flex items-center gap-2 pr-4 active:scale-95 transition-all">
            <ArrowLeft size={16} /> <span className="text-[10px] font-black">戻る</span>
          </button>
          <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-[24px] mx-auto flex items-center justify-center mb-4">
            <UserPlus size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-800">スタッフ新規登録</h2>
          <p className="text-[10px] text-slate-400 font-bold mt-1">医院の新しいメンバーを追加します</p>
        </div>
        <form onSubmit={handleRegisterSubmit} className="w-full max-w-sm space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">お名前</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="氏名を入力" className="w-full p-4 bg-white border border-slate-100 rounded-2xl font-bold outline-none shadow-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">役割</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setNewRole(UserRole.NEWBIE)} className={`py-4 rounded-2xl text-[11px] font-black transition-all ${newRole === UserRole.NEWBIE ? 'bg-teal-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>スタッフ</button>
              <button type="button" onClick={() => setNewRole(UserRole.MENTOR)} className={`py-4 rounded-2xl text-[11px] font-black transition-all ${newRole === UserRole.MENTOR ? 'bg-amber-500 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>教育係/院長</button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">パスワード</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="ログインパスワード" className="w-full p-4 bg-white border border-slate-100 rounded-2xl font-bold outline-none shadow-sm" />
          </div>
          {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-xs font-bold flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
          <button type="submit" className="w-full py-5 bg-teal-600 text-white rounded-[24px] font-black shadow-xl shadow-teal-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4">登録して完了</button>
        </form>
      </div>
    );
  }

  if (!selectedUser) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-screen space-y-8 animate-in fade-in">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-teal-600 rounded-[24px] mx-auto flex items-center justify-center shadow-2xl">
            <ClipboardList size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">なないろアプリ</h2>
          <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">{DEFAULT_CLINIC_NAME}</p>
        </div>
        <div className="w-full space-y-3 max-w-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">スタッフを選択:</p>
          <div className="max-h-[320px] overflow-y-auto pr-1 space-y-3 no-scrollbar">
            {allUsers.map(u => (
              <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full p-5 bg-white border border-slate-100 rounded-[28px] flex justify-between items-center shadow-sm active:scale-95 transition-all group">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${u.role === UserRole.MENTOR ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-teal-600'} group-hover:bg-opacity-80 transition-colors`}>
                    <UserIcon size={20} />
                  </div>
                  <span className="font-black text-slate-700">{u.name}</span>
                </div>
                <ChevronRight size={18} className="text-slate-200" />
              </button>
            ))}
          </div>
          <button onClick={() => setIsRegistering(true)} className="w-full p-5 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[28px] flex items-center justify-center gap-3 text-slate-400 hover:text-teal-600 hover:border-teal-200 transition-all active:scale-95 group">
            <UserPlus size={20} className="group-hover:scale-110 transition-transform" />
            <span className="font-black text-sm">スタッフを追加登録</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-screen space-y-8 animate-in slide-in-from-right-10">
      <div className="text-center">
        <button onClick={() => setSelectedUser(null)} className="mb-6 p-2 bg-white rounded-full text-slate-400 shadow-sm flex items-center gap-2 pr-4 active:scale-95 transition-all">
          <ArrowLeft size={16} /> <span className="text-[10px] font-black">ユーザー選択に戻る</span>
        </button>
        <div className={`w-20 h-20 rounded-[24px] mx-auto flex items-center justify-center mb-4 ${selectedUser.role === UserRole.MENTOR ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'}`}>
          <Lock size={32} />
        </div>
        <h2 className="text-xl font-black text-slate-800">{selectedUser.name}さん</h2>
        <p className="text-[10px] text-slate-400 font-bold mt-1">認証パスワードを入力してください</p>
      </div>
      <form onSubmit={handleLoginSubmit} className="w-full max-w-sm space-y-6">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"><Lock size={18} /></div>
          <input 
            type={showPassword ? "text" : "password"} 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            autoFocus
            className="w-full pl-12 pr-12 py-5 bg-white border border-slate-100 rounded-[24px] text-lg font-bold outline-none shadow-sm focus:border-teal-500 transition-all"
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-teal-600 transition-colors">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-bounce"><AlertCircle size={14} /> {error}</div>}
        <button type="submit" className="w-full py-5 bg-teal-600 text-white rounded-[24px] font-black shadow-xl shadow-teal-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">ログイン <ChevronRight size={18} /></button>
      </form>
    </div>
  );
};

// --- Pages ---

const DashboardPage: React.FC<any> = ({ user, allProgress, skills, allUsers, clinicName, memoData, onSaveMemo, isSaving }) => {
  const navigate = useNavigate();
  const today = getTodayStr();
  const [tempMemo, setTempMemo] = useState(memoData[today] || '');
  useEffect(() => { setTempMemo(memoData[today] || ''); }, [memoData, today]);
  const newbieStats = allUsers.filter((u: User) => u.role === UserRole.NEWBIE).map((u: User) => ({ ...u, progress: calculateProgress(skills, allProgress[u.id] || []) }));
  const myProgress = user.role === UserRole.NEWBIE ? calculateProgress(skills, allProgress[user.id] || []) : 0;
  const myRank = getRankInfo(myProgress);

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <section className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Sparkles size={180} /></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black mb-1 leading-none">こんにちは、{user.name}さん</h2>
          <p className="text-[10px] opacity-70 font-black uppercase tracking-widest">{clinicName}</p>
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
                <span className="text-4xl font-black tabular-nums">{myProgress}<span className="text-sm opacity-60 ml-0.5">%</span></span>
              </div>
              <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
                <div className="h-full bg-white rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(255,255,255,0.4)]" style={{ width: `${myProgress}%` }} />
              </div>
            </div>
          )}
        </div>
      </section>
      <section className="grid grid-cols-2 gap-4">
        <button onClick={() => navigate('/procedures')} className="bg-white p-6 rounded-[36px] border border-slate-100 flex flex-col items-center shadow-sm active:scale-95 transition-all">
          <div className="w-14 h-14 bg-blue-50 rounded-[22px] flex items-center justify-center text-blue-600 mb-3"><BookOpen size={28} /></div>
          <span className="text-xs font-black text-slate-800">手順書マニュアル</span>
        </button>
        <button onClick={() => navigate('/qa')} className="bg-white p-6 rounded-[36px] border border-slate-100 flex flex-col items-center shadow-sm active:scale-95 transition-all">
          <div className="w-14 h-14 bg-amber-50 rounded-[22px] flex items-center justify-center text-amber-600 mb-3"><MessageSquare size={28} /></div>
          <span className="text-xs font-black text-slate-800">Q&A掲示板</span>
        </button>
      </section>

      {/* 今日のメモセクション */}
      <section className="bg-white p-6 rounded-[36px] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Edit2 size={18} className="text-teal-600" />
            <h3 className="font-black text-slate-800">今日のメモ</h3>
          </div>
          {isSaving && <Loader2 size={14} className="text-teal-500 animate-spin" />}
        </div>
        <textarea
          value={tempMemo}
          onChange={(e) => setTempMemo(e.target.value)}
          onBlur={() => onSaveMemo(today, tempMemo)}
          placeholder="今日の気づきや連絡事項を入力..."
          className="w-full h-32 p-4 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500/20 transition-all resize-none"
        />
        <p className="text-[10px] text-slate-400 mt-2 text-right">自動保存されます</p>
      </section>

      {/* メンター向けの進捗管理 */}
      {user.role === UserRole.MENTOR && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <UsersIcon size={18} className="text-teal-600" />
            <h3 className="font-black text-slate-800">スタッフ進捗一覧</h3>
          </div>
          <div className="space-y-3">
            {newbieStats.map((u: any) => (
              <div key={u.id} className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-teal-600 font-black text-xs">
                    {u.name.substring(0, 1)}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-sm">{u.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{getRankInfo(u.progress).label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-teal-600">{u.progress}%</span>
                  <ChevronRight size={14} className="text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

// プレースホルダーページ
const ProceduresPage: React.FC = () => <div className="p-8"><h2 className="text-xl font-black mb-4">手順書マニュアル</h2><p className="text-slate-400">各臨床手順の詳細は現在メンテナンス中です。</p></div>;
const SkillsPage: React.FC = () => <div className="p-8"><h2 className="text-xl font-black mb-4">スキルマップ</h2><p className="text-slate-400">スキルの習得状況はプロフまたはダッシュボードから確認できます。</p></div>;
const QAPage: React.FC = () => <div className="p-8"><h2 className="text-xl font-black mb-4">Q&A掲示板</h2><p className="text-slate-400">院内のナレッジ共有スペースです。</p></div>;
const ProfilePage: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => (
  <div className="p-8 flex flex-col items-center">
    <div className="w-24 h-24 bg-teal-100 rounded-[32px] flex items-center justify-center text-teal-600 mb-6 shadow-xl shadow-teal-100/50">
      <UserIcon size={48} />
    </div>
    <h2 className="text-2xl font-black text-slate-800 mb-1">{user.name}</h2>
    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">{user.role}</p>
    
    <div className="w-full space-y-3 max-w-sm">
      <button className="w-full p-5 bg-white border border-slate-100 rounded-[24px] flex items-center justify-between font-black text-slate-700 shadow-sm active:scale-[0.98] transition-all">
        <span>アカウント設定</span>
        <ChevronRight size={18} className="text-slate-200" />
      </button>
      <button onClick={onLogout} className="w-full p-5 bg-red-50 text-red-500 rounded-[24px] flex items-center justify-center gap-2 font-black shadow-sm active:scale-[0.98] transition-all">
        <Trash2 size={18} />
        <span>ログアウト</span>
      </button>
    </div>
  </div>
);

// --- Main App Component ---

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
  const [allProgress, setAllProgress] = useState<Record<string, UserSkillProgress[]>>({});
  const [memoData, setMemoData] = useState<Record<string, string>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 初回読み込みと永続化の復元
  useEffect(() => {
    const saved = localStorage.getItem(APP_STORAGE_KEYS.LOGGED_USER);
    if (saved) setUser(JSON.parse(saved));
  }, []);

  // Firebaseからの同期
  useEffect(() => {
    setIsSyncing(true);
    const unsubUsers = onSnapshot(doc(db, "clinic_data", "users"), (doc) => {
      if (doc.exists()) setAllUsers(doc.data().list || INITIAL_USERS);
      setIsSyncing(false);
    });
    const unsubProgress = onSnapshot(doc(db, "clinic_data", "progress"), (doc) => {
      if (doc.exists()) setAllProgress(doc.data().data || {});
    });
    const unsubMemos = onSnapshot(doc(db, "clinic_data", "memos"), (doc) => {
      if (doc.exists()) setMemoData(doc.data().data || {});
    });
    return () => { unsubUsers(); unsubProgress(); unsubMemos(); };
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem(APP_STORAGE_KEYS.LOGGED_USER, JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(APP_STORAGE_KEYS.LOGGED_USER);
  };

  const handleAddUser = async (name: string, role: UserRole, password: string) => {
    const newUser: User = {
      id: `u${Date.now()}`,
      name,
      role,
      clinicId: 'c1',
      password
    };
    const newList = [...allUsers, newUser];
    await setDoc(doc(db, "clinic_data", "users"), { list: newList });
  };

  const handleSaveMemo = async (date: string, text: string) => {
    setIsSaving(true);
    const newData = { ...memoData, [date]: text };
    try {
      await setDoc(doc(db, "clinic_data", "memos"), { data: newData });
    } catch (e) {
      console.error("Save memo error", e);
    }
    setIsSaving(false);
  };

  if (!user) {
    return <LoginPage allUsers={allUsers} onLogin={handleLogin} onAddUser={handleAddUser} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 pb-20">
        <Header user={user} clinicName={DEFAULT_CLINIC_NAME} isSyncing={isSyncing} />
        <Routes>
          <Route path="/" element={<DashboardPage user={user} allProgress={allProgress} skills={MOCK_SKILLS} allUsers={allUsers} clinicName={DEFAULT_CLINIC_NAME} memoData={memoData} onSaveMemo={handleSaveMemo} isSaving={isSaving} />} />
          <Route path="/procedures/*" element={<ProceduresPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/qa" element={<QAPage />} />
          <Route path="/profile" element={<ProfilePage user={user} onLogout={handleLogout} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Navigation />
      </div>
    </Router>
  );
};

// Fix the "No default export" error by adding the default export
export default App;
