
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
  CloudOff,
  CloudRain,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
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

// --- Rank Definition ---
const PROGRESS_RANKS = [
  { min: 0, label: '研修生', color: 'bg-slate-400', textColor: 'text-slate-400', icon: <UserIcon size={14} /> },
  { min: 21, label: 'ジュニア', color: 'bg-emerald-500', textColor: 'text-emerald-500', icon: <Zap size={14} /> },
  { min: 41, label: 'スタンダード', color: 'bg-blue-500', textColor: 'text-blue-500', icon: <Award size={14} /> },
  { min: 61, label: 'エキスパート', color: 'bg-purple-600', textColor: 'text-purple-600', icon: <Medal size={14} /> },
  { min: 81, label: 'マスター', color: 'bg-amber-500', textColor: 'text-amber-500', icon: <Crown size={14} /> },
];

const getRankInfo = (progress: number) => {
  return [...PROGRESS_RANKS].reverse().find(r => progress >= r.min) || PROGRESS_RANKS[0];
};

// --- Helpers ---
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

// --- Components ---

const Header: React.FC<{ title: string; user: User | null; clinicName: string; isSyncing?: boolean }> = ({ title, user, clinicName, isSyncing }) => (
  <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center shadow-sm">
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5">
        <h1 className="text-lg font-black text-teal-600 leading-none">なないろ</h1>
        <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'}`}></div>
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

const calculateProgress = (skills: Skill[], progress: UserSkillProgress[]) => {
  if (skills.length === 0) return 0;
  const totalPoints = skills.length * 3;
  const currentPoints = skills.reduce((acc, skill) => {
    const p = progress.find(sp => sp.skillId === skill.id);
    return acc + (p?.level || 0);
  }, 0);
  return Math.round((currentPoints / totalPoints) * 100);
};

// --- Pages ---

const LoginPage: React.FC<{ users: User[]; onLogin: (user: User) => void; clinicName: string }> = ({ users, onLogin, clinicName }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleUserSelect = (u: User) => {
    setSelectedUser(u);
    setError('');
    setPassword('');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser && selectedUser.password === password) {
      onLogin(selectedUser);
    } else {
      setError('パスワードが正しくありません');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-sm:px-4 max-w-sm space-y-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-4">
          <div className="w-24 h-24 bg-teal-600 rounded-[32px] mx-auto flex items-center justify-center shadow-2xl shadow-teal-200/50 rotate-3 transition-transform hover:rotate-0 duration-300">
            <ClipboardList size={48} className="text-white -rotate-3" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter">なないろアプリ</h1>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-2">{clinicName}</p>
          </div>
        </div>

        {!selectedUser ? (
          <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ログインユーザーを選択</p>
            <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
              {users.map(u => (
                <button 
                  key={u.id}
                  onClick={() => handleUserSelect(u)}
                  className={`w-full group flex items-center justify-between p-4 rounded-3xl transition-all active:scale-95 border-2 ${
                    u.role === UserRole.MENTOR 
                      ? 'bg-amber-50 border-amber-50 hover:border-amber-100 text-amber-900' 
                      : 'bg-teal-50 border-teal-50 hover:border-teal-100 text-teal-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm ${u.role === UserRole.MENTOR ? 'bg-amber-100 text-amber-600' : 'bg-teal-100 text-teal-600'}`}>
                      {u.role === UserRole.MENTOR ? <ShieldCheck size={22} /> : <UserIcon size={22} />}
                    </div>
                    <div className="text-left">
                      <p className="font-black text-sm">{u.name}</p>
                      <p className="text-[9px] opacity-50 font-black uppercase tracking-tighter">{u.role === UserRole.MENTOR ? '教育係・管理者' : '新人スタッフ'}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="opacity-20 group-hover:translate-x-1 group-hover:opacity-50 transition-all" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleLoginSubmit} className="bg-white p-10 rounded-[48px] shadow-2xl shadow-slate-200 border border-slate-100 space-y-8 animate-in zoom-in-95 duration-300">
            <button type="button" onClick={() => setSelectedUser(null)} className="flex items-center gap-2 text-slate-300 text-[10px] font-black hover:text-teal-600 transition-colors uppercase tracking-widest">
              <ArrowLeft size={14} /> 選択に戻る
            </button>
            <div className="flex flex-col items-center gap-3">
              <div className={`w-20 h-20 rounded-[30px] flex items-center justify-center shadow-inner ${selectedUser.role === UserRole.MENTOR ? 'bg-amber-50 text-amber-500' : 'bg-teal-50 text-teal-500'}`}>
                <UserIcon size={40} />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-black text-slate-800">{selectedUser.name}</h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{selectedUser.role}</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="relative group">
                <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" size={20} />
                <input 
                  autoFocus
                  type={showPassword ? 'text' : 'password'}
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-14 pr-14 py-5 bg-slate-50 border-2 rounded-3xl text-sm font-black outline-none transition-all ${error ? 'border-red-100 ring-4 ring-red-50' : 'border-slate-50 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-50'}`}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {error && <p className="text-red-500 text-[10px] font-black animate-bounce">{error}</p>}
              <button 
                type="submit"
                className="w-full py-5 bg-teal-600 text-white rounded-[24px] font-black text-base shadow-xl shadow-teal-100 hover:bg-teal-700 active:scale-[0.98] transition-all"
              >
                ログイン
              </button>
            </div>
          </form>
        )}
        
        <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest pt-4">© 2025 Nanairo App Cloud</p>
      </div>
    </div>
  );
};

const DashboardPage: React.FC<{ 
  user: User; 
  procedures: Procedure[];
  allProgress: Record<string, UserSkillProgress[]>;
  skills: Skill[];
  allUsers: User[];
  clinicName: string;
  memo: string;
  onSaveMemo: (memo: string) => void;
  isSaving?: boolean;
}> = ({ user, procedures, allProgress, skills, allUsers, clinicName, memo, onSaveMemo, isSaving }) => {
  const navigate = useNavigate();
  const [tempMemo, setTempMemo] = useState(memo);

  useEffect(() => {
    setTempMemo(memo);
  }, [memo]);
  
  const newbieStats = allUsers.filter(u => u.role === UserRole.NEWBIE).map(u => ({
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
            <div className="flex justify-between items-start">
               <div>
                <h2 className="text-2xl font-black mb-1 leading-none">こんにちは、{user.name}さん</h2>
                <p className="text-[10px] opacity-70 font-black uppercase tracking-widest">{clinicName} / {user.role === UserRole.MENTOR ? '管理者' : 'スタッフ'}</p>
               </div>
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                 {user.role === UserRole.MENTOR ? <ShieldCheck size={24} /> : <UserIcon size={24} />}
               </div>
            </div>
            
            {user.role === UserRole.NEWBIE && (
              <div className="mt-8 space-y-4">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">現在のグレード</span>
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-xl ${myRank.color} bg-white/20 shadow-inner`}>
                        {myRank.icon}
                      </div>
                      <span className="text-2xl font-black tracking-tight">{myRank.label}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60 block mb-1">スキル達成度</span>
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
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest">
              <UsersIcon size={14} className="text-teal-600" /> スタッフ進捗状況
            </h3>
            <button onClick={() => navigate('/skills')} className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
              一覧
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 no-scrollbar">
            {newbieStats.map(staff => {
              const rank = getRankInfo(staff.progress);
              return (
                <button 
                  key={staff.id}
                  onClick={() => navigate(`/skills/${staff.id}`)}
                  className="min-w-[160px] bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center text-center active:scale-95 hover:border-teal-200 transition-all group"
                >
                  <div className="w-14 h-14 bg-slate-50 rounded-[22px] flex items-center justify-center text-teal-600 font-black text-xl mb-3 shadow-inner group-hover:bg-teal-600 group-hover:text-white transition-all">
                    {staff.name.charAt(0)}
                  </div>
                  <p className="font-black text-slate-800 text-sm truncate w-full">{staff.name}</p>
                  <div className={`mt-2 px-3 py-1 rounded-full text-[9px] font-black text-white ${rank.color} shadow-sm`}>
                    {rank.label}
                  </div>
                  <div className="mt-3 w-full space-y-1">
                    <div className="flex justify-between text-[8px] font-black text-slate-300">
                       <span>PROGRESS</span>
                       <span>{staff.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                       <div className="h-full bg-teal-500" style={{ width: `${staff.progress}%` }}></div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-4">
        <div 
          onClick={() => navigate('/procedures')}
          className="bg-white p-6 rounded-[36px] border border-slate-100 flex flex-col items-center text-center cursor-pointer active:scale-95 hover:border-blue-100 transition-all shadow-sm"
        >
          <div className="w-16 h-16 bg-blue-50 rounded-[24px] flex items-center justify-center text-blue-600 mb-4 shadow-inner">
            <BookOpen size={30} />
          </div>
          <span className="text-sm font-black text-slate-800">手順書マニュアル</span>
          <span className="text-[10px] text-slate-400 font-black mt-2 uppercase tracking-[0.2em]">{procedures.length} DOCUMENTS</span>
        </div>
        <div 
          onClick={() => navigate('/qa')}
          className="bg-white p-6 rounded-[36px] border border-slate-100 flex flex-col items-center text-center cursor-pointer active:scale-95 hover:border-amber-100 transition-all shadow-sm"
        >
          <div className="w-16 h-16 bg-amber-50 rounded-[24px] flex items-center justify-center text-amber-600 mb-4 shadow-inner">
            <MessageSquare size={30} />
          </div>
          <span className="text-sm font-black text-slate-800">院内ナレッジ</span>
          <span className="text-[10px] text-slate-400 font-black mt-2 uppercase tracking-[0.2em]">Q&A ARCHIVE</span>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-[11px] font-black text-slate-400 flex items-center justify-between px-2 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <StickyNote size={14} className="text-teal-600" /> 学習メモ
          </div>
          {isSaving && <div className="flex items-center gap-1 text-teal-600 animate-pulse"><RefreshCw size={10} className="animate-spin" /> 保存中</div>}
        </h3>
        <div className="bg-amber-50 rounded-[32px] p-6 border border-amber-100 shadow-sm space-y-4 group focus-within:ring-4 focus-within:ring-amber-50 transition-all">
          <textarea 
            value={tempMemo}
            onChange={(e) => setTempMemo(e.target.value)}
            placeholder="今日学んだこと、注意点を自由にメモしましょう。自分だけの秘密のメモです。"
            className="w-full bg-transparent border-none outline-none text-sm text-amber-950 min-h-[140px] font-bold leading-relaxed resize-none placeholder:text-amber-200"
          />
          <div className="flex justify-end">
            <button 
              onClick={() => onSaveMemo(tempMemo)}
              className="flex items-center gap-2 px-8 py-3 bg-amber-200 hover:bg-amber-300 text-amber-900 text-[11px] font-black rounded-full transition-all active:scale-95 shadow-sm"
            >
              {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} 
              内容を保存する
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

// --- Page Implementations ---

/**
 * ProceduresPage Component
 * Manages display, search, and editing of clinical procedures.
 */
const ProceduresPage: React.FC<{
  user: User;
  procedures: Procedure[];
  onSaveProcedure: (proc: Partial<Procedure>) => void;
  onDeleteProcedure: (id: string) => void;
}> = ({ user, procedures, onSaveProcedure, onDeleteProcedure }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingProc, setEditingProc] = useState<Partial<Procedure> | null>(null);

  const filtered = procedures.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const selected = procedures.find(p => p.id === id);

  const handleEdit = (p: Procedure) => {
    setEditingProc(p);
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setEditingProc({ title: '', category: '', steps: [''], tips: '', videoUrl: '' });
    setIsEditing(true);
  };

  const save = () => {
    if (editingProc) {
      onSaveProcedure(editingProc);
      setIsEditing(false);
      setEditingProc(null);
    }
  };

  if (isEditing && editingProc) {
    return (
      <div className="p-6 space-y-6 animate-in slide-in-from-right duration-300">
        <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <ArrowLeft size={14} /> 編集をキャンセル
        </button>
        <div className="space-y-4 bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm">
          <input 
            placeholder="タイトル" 
            value={editingProc.title} 
            onChange={e => setEditingProc({...editingProc, title: e.target.value})}
            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-lg font-black outline-none focus:ring-2 focus:ring-teal-500"
          />
          <input 
            placeholder="カテゴリー" 
            value={editingProc.category} 
            onChange={e => setEditingProc({...editingProc, category: e.target.value})}
            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-teal-500"
          />
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">手順ステップ</p>
            {editingProc.steps?.map((step, idx) => (
              <div key={idx} className="flex gap-2">
                <input 
                  value={step} 
                  onChange={e => {
                    const newSteps = [...(editingProc.steps || [])];
                    newSteps[idx] = e.target.value;
                    setEditingProc({...editingProc, steps: newSteps});
                  }}
                  className="flex-1 p-3 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none"
                />
                <button 
                  onClick={() => {
                    const newSteps = editingProc.steps?.filter((_, i) => i !== idx);
                    setEditingProc({...editingProc, steps: newSteps});
                  }}
                  className="text-red-400"
                ><Trash2 size={16} /></button>
              </div>
            ))}
            <button 
              onClick={() => setEditingProc({...editingProc, steps: [...(editingProc.steps || []), '']})}
              className="w-full p-3 border-2 border-dashed border-slate-100 rounded-xl text-slate-300 flex items-center justify-center gap-2 hover:border-teal-200 hover:text-teal-400 transition-all"
            >
              <Plus size={14} /> 手順を追加
            </button>
          </div>
          <textarea 
            placeholder="アドバイス・注意点" 
            value={editingProc.tips} 
            onChange={e => setEditingProc({...editingProc, tips: e.target.value})}
            className="w-full p-4 bg-amber-50/50 border-none rounded-2xl text-xs font-bold outline-none min-h-[100px]"
          />
          <input 
            placeholder="動画URL (YouTubeなど)" 
            value={editingProc.videoUrl} 
            onChange={e => setEditingProc({...editingProc, videoUrl: e.target.value})}
            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-[10px] font-black outline-none"
          />
          <button 
            onClick={save}
            className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-teal-100"
          >
            保存する
          </button>
        </div>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="p-4 space-y-6 pb-24 animate-in slide-in-from-right duration-300">
        <button onClick={() => navigate('/procedures')} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <ArrowLeft size={14} /> 一覧に戻る
        </button>
        <div className="bg-white rounded-[48px] overflow-hidden shadow-sm border border-slate-100">
          <div className="p-8 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-3 py-1 bg-teal-50 text-teal-600 text-[9px] font-black rounded-full border border-teal-100 uppercase tracking-widest">{selected.category}</span>
                <h2 className="text-3xl font-black text-slate-800 mt-2 tracking-tight">{selected.title}</h2>
              </div>
              {user.role === UserRole.MENTOR && (
                <button onClick={() => handleEdit(selected)} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-teal-600 transition-colors">
                  <Edit2 size={18} />
                </button>
              )}
            </div>

            {selected.videoUrl && (
              <div className="aspect-video w-full rounded-[32px] overflow-hidden bg-slate-100 shadow-inner group relative">
                <iframe 
                  className="w-full h-full border-none"
                  src={formatEmbedUrl(selected.videoUrl)} 
                  title={selected.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 size={14} className="text-teal-600" /> 手順ステップ
              </h3>
              <div className="space-y-3">
                {selected.steps.map((step, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                    <span className="w-6 h-6 bg-teal-600 text-white rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0">{i + 1}</span>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {selected.tips && (
              <div className="p-6 bg-amber-50 rounded-[32px] border border-amber-100/50 space-y-2">
                <h3 className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                  <Info size={14} /> ポイント・注意点
                </h3>
                <p className="text-sm font-bold text-amber-900/80 leading-relaxed italic">{selected.tips}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">手順マニュアル</h2>
        {user.role === UserRole.MENTOR && (
          <button onClick={handleAddNew} className="p-3 bg-teal-600 text-white rounded-2xl shadow-lg shadow-teal-100 active:scale-95 transition-all">
            <Plus size={20} />
          </button>
        )}
      </div>

      <div className="relative group mx-2">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" size={18} />
        <input 
          placeholder="手順を検索..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-3xl text-sm font-black outline-none focus:ring-4 focus:ring-teal-50 focus:border-teal-500 transition-all shadow-sm"
        />
      </div>

      <div className="space-y-3">
        {filtered.map(p => (
          <button 
            key={p.id}
            onClick={() => navigate(`/procedures/${p.id}`)}
            className="w-full bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all hover:border-teal-200"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-inner">
                {p.videoUrl ? <Video size={20} /> : <BookOpen size={20} />}
              </div>
              <div className="text-left">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.category}</p>
                <p className="font-black text-slate-800 text-sm mt-0.5">{p.title}</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-200 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * SkillMapPage Component
 * Visualizes and updates staff skill levels.
 */
const SkillMapPage: React.FC<{
  user: User;
  skills: Skill[];
  allProgress: Record<string, UserSkillProgress[]>;
  allUsers: User[];
  onUpdateProgress: (targetUserId: string, skillId: string, updates: Partial<UserSkillProgress>) => void;
}> = ({ user, skills, allProgress, allUsers, onUpdateProgress }) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const targetId = userId || user.id;
  const targetUser = allUsers.find(u => u.id === targetId) || user;
  const progressData = allProgress[targetId] || [];

  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [tempLevel, setTempLevel] = useState<SkillLevel>(SkillLevel.UNEXPERIENCED);
  const [tempComment, setTempComment] = useState('');

  const stats = calculateProgress(skills, progressData);
  const rank = getRankInfo(stats);

  const startEdit = (skill: Skill) => {
    if (user.role !== UserRole.MENTOR) return;
    const current = progressData.find(p => p.skillId === skill.id);
    setEditingSkillId(skill.id);
    setTempLevel(current?.level || SkillLevel.UNEXPERIENCED);
    setTempComment(current?.mentorComment || '');
  };

  const save = () => {
    if (editingSkillId) {
      onUpdateProgress(targetId, editingSkillId, { level: tempLevel, mentorComment: tempComment });
      setEditingSkillId(null);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[48px] shadow-sm border border-slate-100 space-y-6 relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-32 h-32 ${rank.color} opacity-5 -mr-16 -mt-16 rounded-full`}></div>
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex items-center justify-center text-teal-600 font-black text-2xl shadow-inner border border-white">
              {targetUser.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">{targetUser.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black text-white ${rank.color}`}>{rank.label}</span>
                <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase">Skill Map</span>
              </div>
            </div>
          </div>
          <div className="text-right">
             <span className="text-3xl font-black text-teal-600 tabular-nums">{stats}<span className="text-xs ml-0.5">%</span></span>
          </div>
        </div>
        <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden p-0.5 shadow-inner">
           <div className={`h-full rounded-full transition-all duration-700 ${rank.color}`} style={{ width: `${stats}%` }}></div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[11px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest px-2">
          <MapIcon size={14} className="text-teal-600" /> スキル項目一覧
        </h3>
        
        <div className="space-y-3">
          {skills.map(skill => {
            const p = progressData.find(sp => sp.skillId === skill.id);
            const level = p?.level || 0;
            return (
              <div key={skill.id} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                   <div>
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{skill.category}</span>
                    <p className="font-black text-slate-800 text-sm">{skill.name}</p>
                   </div>
                   {user.role === UserRole.MENTOR ? (
                     <button onClick={() => startEdit(skill)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-teal-600 transition-all">
                       <Edit2 size={16} />
                     </button>
                   ) : (
                     <div className="flex gap-1">
                        {[1, 2, 3].map(l => (
                          <div key={l} className={`w-3 h-3 rounded-full ${l <= level ? 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.4)]' : 'bg-slate-100'}`}></div>
                        ))}
                     </div>
                   )}
                </div>

                {editingSkillId === skill.id ? (
                  <div className="p-6 bg-slate-50 rounded-[32px] space-y-4 animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between gap-2">
                      {[0, 1, 2, 3].map(l => (
                        <button 
                          key={l}
                          onClick={() => setTempLevel(l as SkillLevel)}
                          className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${
                            tempLevel === l ? 'bg-teal-600 text-white shadow-lg shadow-teal-100' : 'bg-white text-slate-400 border border-slate-100'
                          }`}
                        >
                          {SkillLevelLabels[l as SkillLevel]}
                        </button>
                      ))}
                    </div>
                    <textarea 
                      placeholder="メンターからのコメント..." 
                      value={tempComment}
                      onChange={e => setTempComment(e.target.value)}
                      className="w-full p-4 bg-white border-none rounded-2xl text-xs font-bold outline-none min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setEditingSkillId(null)} className="flex-1 py-3 bg-white text-slate-400 rounded-2xl text-[10px] font-black border border-slate-100">キャンセル</button>
                      <button onClick={save} className="flex-1 py-3 bg-teal-600 text-white rounded-2xl text-[10px] font-black shadow-lg shadow-teal-100">保存</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <span>{SkillLevelLabels[level as SkillLevel]}</span>
                      <span className="opacity-40">{p?.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '-'}</span>
                    </div>
                    {p?.mentorComment && (
                      <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100/50 flex gap-3">
                        <MessageSquare size={14} className="text-teal-400 mt-0.5" />
                        <p className="text-xs font-bold text-teal-800/70 leading-relaxed">{p.mentorComment}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * QAPage Component
 * Clinic-specific knowledge base and Q&A.
 */
const QAPage: React.FC<{
  user: User;
  qaList: QA[];
  onSave: (id: string | null, question: string, answer: string, tags: string) => void;
  onDelete: (id: string) => void;
}> = ({ user, qaList, onSave, onDelete }) => {
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [t, setT] = useState('');

  const filtered = qaList.filter(item => 
    item.question.toLowerCase().includes(search.toLowerCase()) || 
    item.answer.toLowerCase().includes(search.toLowerCase()) ||
    item.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  const startAdd = () => {
    setQ(''); setA(''); setT('');
    setIsAdding(true);
  };

  const startEdit = (item: QA) => {
    setQ(item.question); setA(item.answer); setT(item.tags.join(', '));
    setEditingId(item.id);
  };

  const handleSave = () => {
    onSave(editingId, q, a, t);
    setIsAdding(false);
    setEditingId(null);
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">院内ナレッジ</h2>
        {user.role === UserRole.MENTOR && !isAdding && !editingId && (
          <button onClick={startAdd} className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-100 active:scale-95 transition-all">
            <Plus size={20} />
          </button>
        )}
      </div>

      {(isAdding || editingId) ? (
        <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm space-y-6 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{editingId ? '回答を編集' : '新しい質問を追加'}</h3>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-slate-300 hover:text-red-400 transition-colors"><X size={20} /></button>
          </div>
          <div className="space-y-4">
            <input 
              placeholder="質問内容は？" 
              value={q} 
              onChange={e => setQ(e.target.value)}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-amber-400"
            />
            <textarea 
              placeholder="回答やルールを記入してください" 
              value={a} 
              onChange={e => setA(e.target.value)}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none min-h-[150px] focus:ring-2 focus:ring-amber-400"
            />
            <input 
              placeholder="タグ (カンマ区切り)" 
              value={t} 
              onChange={e => setT(e.target.value)}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl text-[10px] font-black outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button 
              onClick={handleSave}
              className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-amber-100"
            >
              ナレッジを保存
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative group mx-2">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors" size={18} />
            <input 
              placeholder="知識・ルールを検索..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-3xl text-sm font-black outline-none focus:ring-4 focus:ring-amber-50 focus:border-amber-500 transition-all shadow-sm"
            />
          </div>

          <div className="space-y-4">
            {filtered.map(item => (
              <div key={item.id} className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm space-y-4 group">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[8px] font-black rounded-full border border-slate-100 uppercase tracking-tighter">#{tag}</span>
                      ))}
                    </div>
                    <h4 className="font-black text-slate-800 text-base leading-tight">Q. {item.question}</h4>
                  </div>
                  {user.role === UserRole.MENTOR && (
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(item)} className="p-2 bg-slate-50 rounded-xl text-slate-300 hover:text-amber-500 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => { if(confirm('削除しますか？')) onDelete(item.id); }} className="p-2 bg-slate-50 rounded-xl text-slate-300 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-amber-50/30 rounded-[24px] border border-amber-50">
                  <p className="text-sm font-bold text-slate-600 leading-relaxed whitespace-pre-wrap">{item.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * ProfilePage Component
 * User settings, profile updates, and staff management (Mentor only).
 */
const ProfilePage: React.FC<{
  user: User;
  allUsers: User[];
  clinicName: string;
  onUpdateProfile: (name: string, clinicName: string) => void;
  onLogout: () => void;
  onAddUser: (name: string, role: UserRole, pass: string) => void;
  onDeleteUser: (id: string) => void;
}> = ({ user, allUsers, clinicName, onUpdateProfile, onLogout, onAddUser, onDeleteUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [cName, setCName] = useState(clinicName);

  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>(UserRole.NEWBIE);
  const [newStaffPass, setNewStaffPass] = useState('1234');

  const handleUpdate = () => {
    onUpdateProfile(name, cName);
    setIsEditing(false);
  };

  const handleAddStaff = () => {
    if (newStaffName) {
      onAddUser(newStaffName, newStaffRole, newStaffPass);
      setNewStaffName('');
      setIsAddingUser(false);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-4">
        <div className="relative">
           <div className={`w-24 h-24 rounded-[36px] flex items-center justify-center text-white font-black text-4xl shadow-2xl ${user.role === UserRole.MENTOR ? 'bg-amber-500 shadow-amber-200' : 'bg-teal-600 shadow-teal-200'}`}>
            {user.name.charAt(0)}
           </div>
           <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl shadow-lg border border-slate-50 flex items-center justify-center text-slate-400">
             <Settings size={20} />
           </div>
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800">{user.name}</h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{clinicName} / {user.role}</p>
        </div>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="px-6 py-2 bg-slate-50 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-100 hover:bg-slate-100 transition-all">プロフィール編集</button>
        ) : (
          <div className="w-full space-y-4 pt-4 border-t border-slate-50">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">名前</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">クリニック名</label>
              <input value={cName} onChange={e => setCName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black">キャンセル</button>
              <button onClick={handleUpdate} className="flex-1 py-4 bg-teal-600 text-white rounded-2xl text-[10px] font-black shadow-lg shadow-teal-100">保存</button>
            </div>
          </div>
        )}
      </div>

      {user.role === UserRole.MENTOR && (
        <section className="space-y-4">
          <div className="flex justify-between items-center px-2">
             <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <UsersIcon size={14} className="text-teal-600" /> スタッフ管理
             </h3>
             <button onClick={() => setIsAddingUser(true)} className="p-2 bg-teal-50 text-teal-600 rounded-xl border border-teal-100"><UserPlus size={18} /></button>
          </div>
          
          {isAddingUser && (
            <div className="bg-white p-6 rounded-[36px] border border-teal-100 shadow-xl shadow-teal-50 space-y-4 animate-in slide-in-from-top-4 duration-300">
               <input placeholder="スタッフ名" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-teal-500" />
               <div className="flex gap-2">
                 <button onClick={() => setNewStaffRole(UserRole.NEWBIE)} className={`flex-1 py-3 rounded-xl text-[10px] font-black ${newStaffRole === UserRole.NEWBIE ? 'bg-teal-600 text-white' : 'bg-slate-50 text-slate-400'}`}>スタッフ</button>
                 <button onClick={() => setNewStaffRole(UserRole.MENTOR)} className={`flex-1 py-3 rounded-xl text-[10px] font-black ${newStaffRole === UserRole.MENTOR ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-400'}`}>教育係</button>
               </div>
               <input placeholder="初期パスワード" value={newStaffPass} onChange={e => setNewStaffPass(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-teal-500" />
               <div className="flex gap-2">
                 <button onClick={() => setIsAddingUser(false)} className="flex-1 py-3 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-black">閉じる</button>
                 <button onClick={handleAddStaff} className="flex-1 py-3 bg-teal-600 text-white rounded-xl text-[10px] font-black">追加</button>
               </div>
            </div>
          )}

          <div className="space-y-2">
            {allUsers.filter(u => u.id !== user.id).map(u => (
              <div key={u.id} className="bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${u.role === UserRole.MENTOR ? 'bg-amber-50 text-amber-500' : 'bg-teal-50 text-teal-600'}`}>
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">{u.name}</p>
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{u.role}</p>
                  </div>
                </div>
                <button onClick={() => onDeleteUser(u.id)} className="p-2 text-slate-200 hover:text-red-400 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <button 
        onClick={onLogout}
        className="w-full py-5 bg-white border border-red-100 text-red-500 rounded-[32px] font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm"
      >
        <LogOut size={20} />
        ログアウトする
      </button>

      <div className="text-center pt-4">
        <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.3em]">Version 2.0.4 - Nanairo Cloud</p>
      </div>
    </div>
  );
};

// --- Full AppContent ---

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- States ---
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(APP_STORAGE_KEYS.USERS);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(APP_STORAGE_KEYS.LOGGED_USER);
    return saved ? JSON.parse(saved) : null;
  });

  const [clinicName, setClinicName] = useState(() => localStorage.getItem(APP_STORAGE_KEYS.CLINIC_NAME) || DEFAULT_CLINIC_NAME);

  const [qaList, setQaList] = useState<QA[]>(() => {
    const saved = localStorage.getItem(APP_STORAGE_KEYS.QA);
    return saved ? JSON.parse(saved) : MOCK_QA;
  });

  const [proceduresList, setProceduresList] = useState<Procedure[]>(() => {
    const saved = localStorage.getItem(APP_STORAGE_KEYS.PROCEDURES);
    return saved ? JSON.parse(saved) : MOCK_PROCEDURES;
  });

  const [allSkillProgress, setAllSkillProgress] = useState<Record<string, UserSkillProgress[]>>(() => {
    const saved = localStorage.getItem(APP_STORAGE_KEYS.PROGRESS);
    return saved ? JSON.parse(saved) : {};
  });

  const [userMemos, setUserMemos] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem(APP_STORAGE_KEYS.MEMOS);
    return saved ? JSON.parse(saved) : {};
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Persistence Wrappers (Service Simulation) ---
  const persistData = useCallback(async (key: string, data: any) => {
    setIsSaving(true);
    setIsSyncing(true);
    // Simulation of network delay
    await new Promise(r => setTimeout(r, 600));
    localStorage.setItem(key, JSON.stringify(data));
    setIsSaving(false);
    setIsSyncing(false);
  }, []);

  const handleSaveMemo = async (memo: string) => {
    if (!user) return;
    const newMemos = { ...userMemos, [user.id]: memo };
    setUserMemos(newMemos);
    await persistData(APP_STORAGE_KEYS.MEMOS, newMemos);
  };

  const handleAddUser = async (name: string, role: UserRole, password: string) => {
    const newUser: User = { id: `u-${Date.now()}`, name, role, clinicId: 'c1', password };
    const newList = [...allUsers, newUser];
    setAllUsers(newList);
    await persistData(APP_STORAGE_KEYS.USERS, newList);
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm("スタッフ情報を削除しますか？")) {
      const newList = allUsers.filter(u => u.id !== id);
      setAllUsers(newList);
      await persistData(APP_STORAGE_KEYS.USERS, newList);
    }
  };

  const handleUpdateProfile = async (name: string, newClinicName: string) => {
    if (!user) return;
    const updatedUser = { ...user, name };
    setUser(updatedUser);
    setClinicName(newClinicName);
    localStorage.setItem(APP_STORAGE_KEYS.CLINIC_NAME, newClinicName);
    const updatedAllUsers = allUsers.map(u => u.id === user.id ? updatedUser : u);
    setAllUsers(updatedAllUsers);
    localStorage.setItem(APP_STORAGE_KEYS.LOGGED_USER, JSON.stringify(updatedUser));
    await persistData(APP_STORAGE_KEYS.USERS, updatedAllUsers);
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

  const handleSaveProcedure = async (proc: Partial<Procedure>) => {
    const newList = proc.id 
      ? proceduresList.map(p => p.id === proc.id ? { ...p, ...proc } as Procedure : p)
      : [{ ...proc, id: `proc-${Date.now()}` } as Procedure, ...proceduresList];
    setProceduresList(newList);
    await persistData(APP_STORAGE_KEYS.PROCEDURES, newList);
  };

  const handleDeleteProcedure = async (id: string) => {
    const newList = proceduresList.filter(p => p.id !== id);
    setProceduresList(newList);
    await persistData(APP_STORAGE_KEYS.PROCEDURES, newList);
  };

  const handleUpdateSkillProgress = async (targetUserId: string, skillId: string, updates: Partial<UserSkillProgress>) => {
    const userProgress = [...(allSkillProgress[targetUserId] || [])];
    const index = userProgress.findIndex(p => p.skillId === skillId);
    if (index >= 0) {
      userProgress[index] = { ...userProgress[index], ...updates, updatedAt: new Date().toISOString() };
    } else {
      userProgress.push({ userId: targetUserId, skillId, level: updates.level ?? 0, mentorComment: updates.mentorComment ?? '', updatedAt: new Date().toISOString() });
    }
    const newAllProgress = { ...allSkillProgress, [targetUserId]: userProgress };
    setAllSkillProgress(newAllProgress);
    await persistData(APP_STORAGE_KEYS.PROGRESS, newAllProgress);
  };

  const handleSaveQA = async (id: string | null, question: string, answer: string, tags: string) => {
    const tagsArr = tags ? tags.split(',').map(t => t.trim()) : [];
    const newList = id 
      ? qaList.map(q => q.id === id ? { ...q, question, answer, tags: tagsArr } : q)
      : [{ id: `qa-${Date.now()}`, question, answer, tags: tagsArr }, ...qaList];
    setQaList(newList);
    await persistData(APP_STORAGE_KEYS.QA, newList);
  };

  const handleDeleteQA = async (id: string) => {
    const newList = qaList.filter(q => q.id !== id);
    setQaList(newList);
    await persistData(APP_STORAGE_KEYS.QA, newList);
  };

  // --- Auth Guard ---
  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  const getPageTitle = () => {
    if (location.pathname.startsWith('/procedures/')) return '手順詳細';
    if (location.pathname.startsWith('/skills/')) return '進捗確認';
    switch(location.pathname) {
      case '/': return 'ホーム';
      case '/procedures': return '手順一覧';
      case '/skills': return 'スキルマップ';
      case '/qa': return 'ナレッジ';
      case '/profile': return 'プロフ';
      default: return 'なないろアプリ';
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 shadow-2xl relative flex flex-col font-sans border-x border-slate-100 overflow-hidden">
      <Header title={getPageTitle()} user={user} clinicName={clinicName} isSyncing={isSyncing} />
      <main className="flex-1 overflow-y-auto no-scrollbar bg-slate-50/50">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage users={allUsers} onLogin={handleLogin} clinicName={clinicName} />} />
          <Route path="/" element={<DashboardPage user={user!} procedures={proceduresList} allProgress={allSkillProgress} skills={MOCK_SKILLS} allUsers={allUsers} clinicName={clinicName} memo={userMemos[user?.id || ''] || ''} onSaveMemo={handleSaveMemo} isSaving={isSaving} />} />
          <Route path="/procedures" element={<ProceduresPage user={user!} procedures={proceduresList} onSaveProcedure={handleSaveProcedure} onDeleteProcedure={handleDeleteProcedure} />} />
          <Route path="/procedures/:id" element={<ProceduresPage user={user!} procedures={proceduresList} onSaveProcedure={handleSaveProcedure} onDeleteProcedure={handleDeleteProcedure} />} />
          <Route path="/skills" element={<SkillMapPage user={user!} skills={MOCK_SKILLS} allProgress={allSkillProgress} onUpdateProgress={handleUpdateSkillProgress} allUsers={allUsers} />} />
          <Route path="/skills/:userId" element={<SkillMapPage user={user!} skills={MOCK_SKILLS} allProgress={allSkillProgress} onUpdateProgress={handleUpdateSkillProgress} allUsers={allUsers} />} />
          <Route path="/qa" element={<QAPage qaList={qaList} onSave={handleSaveQA} onDelete={handleDeleteQA} user={user!} />} />
          <Route path="/profile" element={<ProfilePage user={user!} allUsers={allUsers} onLogout={handleLogout} clinicName={clinicName} onUpdateProfile={handleUpdateProfile} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} />} />
        </Routes>
      </main>
      {user && <Navigation />}
      
      {/* Toast Notification for Sync Simulation */}
      {isSaving && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-2xl z-[100] flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <RefreshCw size={12} className="animate-spin text-teal-400" /> 
          Syncing with Cloud...
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
