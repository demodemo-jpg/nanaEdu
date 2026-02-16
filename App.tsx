
import React, { useState, useMemo, useEffect } from 'react';
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
  Video
} from 'lucide-react';
import { UserRole, SkillLevel, SkillLevelLabels, UserSkillProgress, QA, Procedure, Skill, User } from './types';
import { MOCK_PROCEDURES, MOCK_SKILLS, MOCK_QA } from './constants';

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

// --- Initial Data ---
const DEFAULT_CLINIC_NAME = "なないろ歯科";
const INITIAL_USERS: User[] = [
  { id: 'u1', name: '田中 里奈', role: UserRole.NEWBIE, clinicId: 'c1', password: '1234' },
  { id: 'u3', name: '佐藤 結衣', role: UserRole.NEWBIE, clinicId: 'c1', password: '1234' },
  { id: 'u2', name: '鈴木 院長', role: UserRole.MENTOR, clinicId: 'c1', password: '1234' },
];

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

const Header: React.FC<{ title: string; user: User | null; clinicName: string }> = ({ title, user, clinicName }) => (
  <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center shadow-sm">
    <div>
      <h1 className="text-xl font-bold text-teal-600">なないろアプリ</h1>
      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{clinicName}</p>
    </div>
    {user && (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
          user.role === UserRole.MENTOR ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-teal-100 text-teal-700 border border-teal-200'
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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around safe-area-bottom z-50 px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      <NavItem to="/" icon={<TrendingUp size={20} />} label="ホーム" active={location.pathname === '/'} />
      <NavItem to="/procedures" icon={<ClipboardList size={20} />} label="手順" active={isActive('/procedures')} />
      <NavItem to="/skills" icon={<MapIcon size={20} />} label="スキル" active={isActive('/skills')} />
      <NavItem to="/qa" icon={<MessageSquare size={20} />} label="Q&A" active={isActive('/qa')} />
      <NavItem to="/profile" icon={<UserIcon size={20} />} label="プロフ" active={isActive('/profile')} />
    </nav>
  );
};

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; active: boolean }> = ({ to, icon, label, active }) => (
  <Link to={to} className={`flex flex-col items-center justify-center py-2 px-1 flex-1 transition-all ${active ? 'text-teal-600 scale-110' : 'text-slate-400'}`}>
    {icon}
    <span className="text-[9px] mt-1 font-bold">{label}</span>
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-teal-50 to-white">
      <div className="w-full max-w-sm space-y-8 text-center animate-in fade-in duration-500">
        <div className="space-y-2">
          <div className="w-20 h-20 bg-teal-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-teal-200 rotate-3">
            <ClipboardList size={40} className="text-white -rotate-3" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">なないろアプリ</h1>
          <p className="text-slate-500 text-sm">{clinicName} 教育支援システム</p>
        </div>

        {!selectedUser ? (
          <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 space-y-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ログインするユーザーを選択</p>
            <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar">
              {users.map(u => (
                <button 
                  key={u.id}
                  onClick={() => handleUserSelect(u)}
                  className={`w-full group flex items-center justify-between p-4 rounded-2xl transition-all active:scale-95 border-2 ${
                    u.role === UserRole.MENTOR 
                      ? 'bg-amber-50 border-amber-100 hover:border-amber-200 text-amber-900' 
                      : 'bg-teal-50 border-teal-100 hover:border-teal-200 text-teal-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${u.role === UserRole.MENTOR ? 'bg-amber-200 text-amber-700' : 'bg-teal-200 text-teal-700'}`}>
                      {u.role === UserRole.MENTOR ? <ShieldCheck size={20} /> : <UserIcon size={20} />}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm">{u.name}</p>
                      <p className="text-[10px] opacity-60 font-bold uppercase">{u.role === UserRole.MENTOR ? '教育係・院長' : '新人スタッフ'}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="opacity-30 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleLoginSubmit} className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <button type="button" onClick={() => setSelectedUser(null)} className="flex items-center gap-2 text-slate-400 text-xs font-bold hover:text-teal-600 transition-colors">
              <ArrowLeft size={14} /> ユーザー選択に戻る
            </button>
            <div className="flex flex-col items-center gap-2">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${selectedUser.role === UserRole.MENTOR ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'}`}>
                <UserIcon size={32} />
              </div>
              <h2 className="text-xl font-black text-slate-800">{selectedUser.name}</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{selectedUser.role === UserRole.MENTOR ? 'Mentor' : 'Staff'}</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  autoFocus
                  type={showPassword ? 'text' : 'password'}
                  placeholder="パスワードを入力"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-12 pr-12 py-4 bg-slate-50 border rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all ${error ? 'border-red-300 ring-red-100' : 'border-slate-100'}`}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && <p className="text-red-500 text-[10px] font-black">{error}</p>}
              <button 
                type="submit"
                className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black shadow-lg shadow-teal-100 active:scale-[0.98] transition-all"
              >
                ログイン
              </button>
            </div>
          </form>
        )}
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
}> = ({ user, procedures, allProgress, skills, allUsers, clinicName, memo, onSaveMemo }) => {
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
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-300">
      <section>
        <div className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={120} />
          </div>
          <div className="relative z-10">
            <h2 className="text-xl font-black mb-1">こんにちは、{user.name}さん</h2>
            <p className="text-xs opacity-80 font-medium">{user.role === UserRole.MENTOR ? '管理者・教育係' : '新人DH'} / {clinicName}</p>
            
            {user.role === UserRole.NEWBIE && (
              <div className="mt-6">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-80 mb-1">現在の階級</span>
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-lg ${myRank.color} bg-white/20`}>
                        {myRank.icon}
                      </div>
                      <span className="text-xl font-black tracking-tight">{myRank.label}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-80 block">達成度</span>
                    <span className="text-2xl font-black">{myProgress}%</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden mt-2 border border-white/10">
                  <div className="h-full bg-white transition-all duration-1000" style={{ width: `${myProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {user.role === UserRole.MENTOR && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <UsersIcon size={18} className="text-teal-600" /> スタッフ進捗
            </h3>
            <button onClick={() => navigate('/skills')} className="text-[10px] font-bold text-teal-600">
              すべて表示
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
            {newbieStats.map(staff => {
              const rank = getRankInfo(staff.progress);
              return (
                <button 
                  key={staff.id}
                  onClick={() => navigate(`/skills/${staff.id}`)}
                  className="min-w-[140px] bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center active:scale-95 transition-all"
                >
                  <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 font-black text-xs mb-2 border border-teal-100">
                    {staff.name.charAt(0)}
                  </div>
                  <p className="font-bold text-slate-800 text-xs truncate w-full">{staff.name}</p>
                  <div className={`mt-2 px-2 py-0.5 rounded-full text-[8px] font-black text-white ${rank.color}`}>
                    {rank.label}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        <div 
          onClick={() => navigate('/procedures')}
          className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-col items-center text-center cursor-pointer active:scale-95 transition-all shadow-sm"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-3">
            <BookOpen size={24} />
          </div>
          <span className="text-sm font-bold">手順書</span>
          <span className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{procedures.length} 件</span>
        </div>
        <div 
          onClick={() => navigate('/qa')}
          className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-col items-center text-center cursor-pointer active:scale-95 transition-all shadow-sm"
        >
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-3">
            <MessageSquare size={24} />
          </div>
          <span className="text-sm font-bold">Q&A</span>
          <span className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">知識共有</span>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 px-1">
          <StickyNote size={18} className="text-teal-600" /> 自分用メモ
        </h3>
        <div className="bg-amber-50 rounded-3xl p-5 border border-amber-100 shadow-sm space-y-3">
          <textarea 
            value={tempMemo}
            onChange={(e) => setTempMemo(e.target.value)}
            placeholder="今日覚えたことや注意点をメモしましょう..."
            className="w-full bg-transparent border-none outline-none text-sm text-amber-900 min-h-[120px] font-medium leading-relaxed resize-none"
          />
          <div className="flex justify-end">
            <button 
              onClick={() => onSaveMemo(tempMemo)}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-amber-200 hover:bg-amber-300 text-amber-800 text-[11px] font-black rounded-full transition-all active:scale-95"
            >
              <Save size={14} /> 保存する
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

const ProceduresPage: React.FC<{ 
  user: User; 
  procedures: Procedure[]; 
  onSaveProcedure: (proc: Partial<Procedure>) => void;
  onDeleteProcedure: (id: string) => void;
}> = ({ user, procedures, onSaveProcedure, onDeleteProcedure }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isManaging, setIsManaging] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSteps, setEditSteps] = useState('');
  const [editTips, setEditTips] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');

  const activeProcedure = procedures.find(p => p.id === id);
  const isMentor = user.role === UserRole.MENTOR;

  const startEdit = (p?: Procedure) => {
    if (p) {
      setIsEditing(p.id);
      setEditTitle(p.title);
      setEditCategory(p.category);
      setEditSteps(p.steps.join('\n'));
      setEditTips(p.tips || '');
      setEditVideoUrl(p.videoUrl || '');
    } else {
      setIsEditing('new');
      setEditTitle('');
      setEditCategory('');
      setEditSteps('');
      setEditTips('');
      setEditVideoUrl('');
    }
  };

  const handleSave = () => {
    if (!editTitle || !editCategory) {
      alert("タイトルとカテゴリは必須です");
      return;
    }
    onSaveProcedure({
      id: isEditing === 'new' ? undefined : isEditing!,
      title: editTitle,
      category: editCategory,
      steps: editSteps.split('\n').filter(s => s.trim()),
      tips: editTips,
      videoUrl: editVideoUrl
    });
    setIsEditing(null);
  };

  const handleDelete = (procId: string, title: string) => {
    if (confirm(`マニュアル「${title}」を完全に削除しますか？`)) {
      onDeleteProcedure(procId);
      if (id === procId) navigate('/procedures');
    }
  };

  const filteredProcedures = procedures.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = Array.from(new Set(procedures.map(p => p.category)));

  if (isEditing) {
    return (
      <div className="p-4 pb-24">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-4">
          <h3 className="text-lg font-black text-slate-800">{isEditing === 'new' ? '新規マニュアル作成' : 'マニュアル編集'}</h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">タイトル</label>
              <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500" placeholder="例: スケーリング準備" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">カテゴリ</label>
              <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500" placeholder="例: 基本準備" value={editCategory} onChange={e => setEditCategory(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">動画マニュアルURL (YouTube等)</label>
              <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500" placeholder="https://www.youtube.com/watch?v=..." value={editVideoUrl} onChange={e => setEditVideoUrl(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">手順（1行に1ステップ入力）</label>
              <textarea className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm min-h-[120px] outline-none focus:ring-2 focus:ring-teal-500 font-medium" placeholder="ステップ1\nステップ2..." value={editSteps} onChange={e => setEditSteps(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">コツ・注意点</label>
              <textarea className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 font-medium" placeholder="患者さんの様子を見ながら進める、など" value={editTips} onChange={e => setEditTips(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-4">
              <button onClick={handleSave} className="flex-1 py-4 bg-teal-600 text-white rounded-2xl font-black shadow-lg shadow-teal-100 active:scale-95 transition-all">保存して公開</button>
              <button onClick={() => setIsEditing(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black active:scale-95 transition-all">キャンセル</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (id && activeProcedure) {
    const embedUrl = formatEmbedUrl(activeProcedure.videoUrl || "");
    return (
      <div className="p-4 pb-24 animate-in fade-in duration-300">
        <div className="flex justify-between items-center mb-4 px-1">
          <button onClick={() => navigate('/procedures')} className="text-teal-600 text-xs font-black flex items-center gap-1 uppercase tracking-widest"><ArrowLeft size={16} /> 戻る</button>
          {isMentor && (
            <div className="flex gap-2">
              <button onClick={() => startEdit(activeProcedure)} className="p-2.5 bg-white text-slate-400 border border-slate-200 rounded-xl shadow-sm hover:text-teal-500 transition-colors"><Edit2 size={16} /></button>
              <button onClick={() => handleDelete(activeProcedure.id, activeProcedure.title)} className="p-2.5 bg-white text-red-400 border border-slate-200 rounded-xl shadow-sm hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          {/* Video Section */}
          {embedUrl && (
            <div className="bg-slate-900 aspect-video relative">
              <iframe 
                className="absolute inset-0 w-full h-full"
                src={embedUrl}
                title={activeProcedure.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          )}

          <div className="p-6 md:p-8 space-y-8">
            <header className="space-y-2">
              <span className="text-[10px] font-black bg-teal-50 text-teal-600 px-3 py-1 rounded-full uppercase tracking-widest inline-block border border-teal-100">{activeProcedure.category}</span>
              <h2 className="text-2xl font-black text-slate-800 leading-tight">{activeProcedure.title}</h2>
            </header>

            <div className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ClipboardList size={16} className="text-teal-600" /> 手順
              </h3>
              <div className="space-y-5">
                {activeProcedure.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4 items-start group">
                    <div className="w-7 h-7 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center text-xs font-black shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-all">
                      {idx + 1}
                    </div>
                    <p className="text-slate-700 font-bold leading-relaxed pt-1">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {activeProcedure.tips && (
              <div className="p-5 bg-amber-50 rounded-[24px] border border-amber-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-5">
                  <Sparkles size={48} />
                </div>
                <h4 className="text-xs font-black text-amber-700 uppercase mb-3 flex items-center gap-2">
                  <Sparkles size={14} /> 現場のコツ・注意点
                </h4>
                <p className="text-sm text-amber-900 leading-relaxed font-bold whitespace-pre-wrap">{activeProcedure.tips}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 animate-in fade-in duration-300">
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="マニュアルを検索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none font-bold focus:ring-2 focus:ring-teal-500 transition-all" />
        </div>
        {isMentor && (
          <div className="flex gap-1">
            <button onClick={() => setIsManaging(!isManaging)} className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${isManaging ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-400'}`}><Settings size={20} /></button>
            <button onClick={() => startEdit()} className="w-12 h-12 bg-teal-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-teal-100 active:scale-95 transition-all"><Plus size={24} /></button>
          </div>
        )}
      </div>

      <div className="space-y-10">
        {categories.length > 0 ? categories.map(cat => (
          <div key={cat} className="space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest px-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-teal-500 rounded-full" /> {cat}
            </h3>
            <div className="grid gap-3">
              {filteredProcedures.filter(p => p.category === cat).map(proc => (
                <div key={proc.id} className="flex gap-2 items-center">
                  <button onClick={() => navigate(`/procedures/${proc.id}`)} className="flex-1 bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm active:scale-[0.98] hover:border-teal-100 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${proc.videoUrl ? 'bg-teal-50 text-teal-600' : 'bg-slate-50 text-slate-300'}`}>
                        {proc.videoUrl ? <Video size={20} /> : <BookOpen size={20} />}
                      </div>
                      <span className="font-black text-slate-700">{proc.title}</span>
                    </div>
                    {!isManaging && <ChevronRight size={18} className="text-slate-200 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />}
                  </button>
                  {isManaging && <button onClick={() => handleDelete(proc.id, proc.title)} className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center border border-red-100 shadow-sm active:scale-90 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={20} /></button>}
                </div>
              ))}
            </div>
          </div>
        )) : (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <ClipboardList size={32} />
            </div>
            <p className="text-slate-400 text-sm font-bold">マニュアルがまだありません</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SkillMapPage: React.FC<{ 
  user: User; 
  skills: Skill[]; 
  allProgress: Record<string, UserSkillProgress[]>; 
  onUpdateProgress: (userId: string, skillId: string, updates: Partial<UserSkillProgress>) => void; 
  allUsers: User[]; 
}> = ({ user, skills, allProgress, onUpdateProgress, allUsers }) => {
  const { userId: paramUserId } = useParams();
  const navigate = useNavigate();
  const isMentor = user.role === UserRole.MENTOR;
  
  // スタッフ自身がアクセスした場合は自分のID、教育係が一覧から選んだ場合はそのスタッフのID
  const targetUserId = paramUserId || (isMentor ? null : user.id);
  const targetUser = allUsers.find(u => u.id === targetUserId);
  const progressList = targetUserId ? (allProgress[targetUserId] || []) : [];
  const categories = Array.from(new Set(skills.map(s => s.category)));

  // 教育係がスタッフ一覧を見ている状態
  if (isMentor && !paramUserId) {
    return (
      <div className="p-4 pb-24 animate-in fade-in duration-300">
        <h2 className="text-2xl font-black text-slate-800 mb-6 px-1">スタッフ進捗管理</h2>
        <div className="space-y-4">
          {allUsers.filter(u => u.role === UserRole.NEWBIE).map(staff => {
            const prog = calculateProgress(skills, allProgress[staff.id] || []);
            const rank = getRankInfo(prog);
            return (
              <button key={staff.id} onClick={() => navigate(`/skills/${staff.id}`)} className="w-full bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col active:scale-[0.98] transition-all group hover:border-teal-200">
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 font-black text-lg group-hover:bg-teal-600 group-hover:text-white transition-all">
                      {staff.name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-800 text-base">{staff.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full text-white ${rank.color}`}>{rank.label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">達成率</div>
                    <div className="text-xl font-black text-teal-600">{prog}%</div>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <div className="h-full bg-teal-500 transition-all duration-1000" style={{ width: `${prog}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 個別のスキルマップ表示
  return (
    <div className="p-4 pb-24 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-8 px-1">
        <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
          <UserIcon size={28} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
             <h2 className="text-xl font-black text-slate-800">{targetUser?.name} さん</h2>
             {!isMentor && (
               <div className="flex items-center gap-1 text-[10px] font-black text-amber-500 uppercase bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                 <LockKeyhole size={12} /> 評価ロック中
               </div>
             )}
          </div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
            {isMentor ? 'Mentor View' : 'Staff Skill Roadmap'}
          </p>
        </div>
      </div>

      <div className="space-y-12">
        {categories.map(cat => (
          <div key={cat} className="space-y-6">
            <h3 className="text-[11px] font-black text-slate-400 mb-4 border-l-4 border-teal-500 pl-3 uppercase tracking-widest">{cat}</h3>
            <div className="space-y-6">
              {skills.filter(s => s.category === cat).map(skill => {
                const prog = progressList.find(p => p.skillId === skill.id);
                const level = prog?.level || 0;
                return (
                  <div key={skill.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-5">
                    <div className="flex justify-between items-start">
                      <h4 className="font-black text-slate-800 text-base flex items-center gap-2">
                        {skill.name}
                        {!isMentor && level === 0 && <LockKeyhole size={14} className="text-slate-300" />}
                      </h4>
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${level > 0 ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                        {SkillLevelLabels[level as SkillLevel]}
                      </span>
                    </div>
                    
                    {/* 鍵方式：スタッフの場合はボタンを無効化 */}
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 1, 2, 3].map(l => (
                        <button 
                          key={l} 
                          disabled={!isMentor}
                          onClick={() => onUpdateProgress(targetUserId!, skill.id, { level: l as SkillLevel })} 
                          className={`py-3 rounded-2xl text-[10px] font-black border-2 transition-all relative
                            ${level === l ? 'bg-teal-600 text-white border-teal-700 shadow-lg shadow-teal-100' : 'bg-white text-slate-400 border-slate-50'}
                            ${!isMentor ? 'cursor-default opacity-80' : 'active:border-teal-200 active:scale-95'}
                          `}
                        >
                          {SkillLevelLabels[l as SkillLevel]}
                          {!isMentor && l !== level && (
                            <div className="absolute top-1 right-1 opacity-20">
                              <LockKeyhole size={8} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    {isMentor && (
                      <div className="space-y-2 pt-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">アドバイス・評価コメント</label>
                        <textarea 
                          className="w-full p-4 bg-amber-50/50 border border-amber-100 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-bold placeholder:text-amber-200" 
                          placeholder="ここが良かった！次への課題は..." 
                          value={prog?.mentorComment || ''} 
                          onChange={(e) => onUpdateProgress(targetUserId!, skill.id, { mentorComment: e.target.value })} 
                        />
                      </div>
                    )}
                    
                    {!isMentor && prog?.mentorComment && (
                      <div className="p-4 bg-amber-50 text-amber-900 rounded-[20px] text-xs border border-amber-100 font-bold relative animate-in slide-in-from-top-2">
                         <div className="absolute -top-2 left-4 bg-white px-2 rounded-full border border-amber-100 flex items-center gap-1">
                            <Sparkles size={10} className="text-amber-500" />
                            <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Mentor's Advice</span>
                         </div>
                         <p className="mt-1 leading-relaxed">{prog.mentorComment}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const QAPage: React.FC<{ qaList: QA[]; onSave: (id: string | null, question: string, answer: string, tags: string) => void; onDelete: (id: string) => void; user: User; }> = ({ qaList, onSave, onDelete, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const isMentor = user.role === UserRole.MENTOR;

  const handleSave = () => {
    if (!editQuestion || !editAnswer) return;
    onSave(isEditing === 'new' ? null : isEditing, editQuestion, editAnswer, "");
    setIsEditing(null);
  };

  return (
    <div className="p-4 pb-24 animate-in fade-in duration-300">
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="ナレッジを検索..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none font-bold focus:ring-2 focus:ring-teal-500 transition-all" />
        </div>
        <button onClick={() => { setIsEditing('new'); setEditQuestion(''); setEditAnswer(''); }} className="w-12 h-12 bg-teal-600 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"><Plus size={24} /></button>
      </div>

      {isEditing ? (
        <div className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-100 space-y-6 mb-8 animate-in zoom-in-95 duration-200">
          <h3 className="text-lg font-black text-slate-800">{isEditing === 'new' ? '新規Q&A追加' : 'Q&A編集'}</h3>
          <div className="space-y-4">
             <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">質問 (Question)</label>
              <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500" value={editQuestion} onChange={e => setEditQuestion(e.target.value)} placeholder="例: 消毒液の希釈倍率は？" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">回答 (Answer)</label>
              <textarea className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm min-h-[150px] outline-none focus:ring-2 focus:ring-teal-500 font-bold" value={editAnswer} onChange={e => setEditAnswer(e.target.value)} placeholder="詳しく回答を入力してください" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} className="flex-1 py-4 bg-teal-600 text-white rounded-2xl font-black shadow-lg shadow-teal-100 active:scale-95 transition-all">保存</button>
            <button onClick={() => setIsEditing(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black active:scale-95 transition-all">キャンセル</button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {qaList.filter(q => q.question.toLowerCase().includes(searchTerm.toLowerCase())).map(qa => (
            <div key={qa.id} className="bg-white rounded-[32px] border border-slate-100 p-7 shadow-sm group hover:border-teal-100 transition-all">
              <div className="flex justify-between items-center mb-4">
                <span className="text-teal-600 font-black text-[10px] uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full border border-teal-100">Question</span>
                {isMentor && (
                  <div className="flex gap-2">
                    <button onClick={() => {setIsEditing(qa.id); setEditQuestion(qa.question); setEditAnswer(qa.answer);}} className="p-2 text-slate-300 hover:text-teal-500 transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => onDelete(qa.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <h4 className="font-black text-slate-800 text-lg mb-4 leading-snug">{qa.question}</h4>
              <div className="p-5 bg-slate-50 rounded-[24px] text-sm text-slate-600 font-bold leading-relaxed border border-slate-100">
                <span className="text-teal-600 mr-2">A.</span>{qa.answer}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ProfilePage: React.FC<{ 
  user: User; 
  allUsers: User[];
  onLogout: () => void;
  clinicName: string;
  onUpdateProfile: (name: string, clinicName: string) => void;
  onAddUser: (name: string, role: UserRole, password: string) => void;
  onDeleteUser: (id: string) => void;
}> = ({ user, allUsers, onLogout, clinicName, onUpdateProfile, onAddUser, onDeleteUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [tempName, setTempName] = useState(user.name);
  const [tempClinic, setTempClinic] = useState(clinicName);

  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.NEWBIE);
  const [newPassword, setNewPassword] = useState('');

  const isMentor = user.role === UserRole.MENTOR;

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPassword) return;
    onAddUser(newName, newRole, newPassword);
    setNewName('');
    setNewPassword('');
    setShowAddUser(false);
  };

  return (
    <div className="p-4 pb-24 text-center animate-in fade-in duration-300">
      <div className="py-12">
        <div className="w-24 h-24 bg-teal-50 rounded-[40px] flex items-center justify-center text-teal-600 mx-auto mb-6 border-4 border-white shadow-xl shadow-teal-100/50">
          <UserIcon size={48} />
        </div>
        {isEditing ? (
          <div className="space-y-4 max-w-xs mx-auto animate-in zoom-in-95 duration-200">
            <input className="w-full p-4 border border-slate-200 rounded-2xl font-bold outline-none shadow-sm focus:ring-2 focus:ring-teal-500" placeholder="お名前" value={tempName} onChange={e => setTempName(e.target.value)} />
            {isMentor && (
              <input className="w-full p-4 border border-slate-200 rounded-2xl font-bold outline-none shadow-sm focus:ring-2 focus:ring-teal-500" placeholder="医院名" value={tempClinic} onChange={e => setTempClinic(e.target.value)} />
            )}
            <div className="flex gap-2">
              <button onClick={() => { onUpdateProfile(tempName, tempClinic); setIsEditing(false); }} className="flex-1 py-4 bg-teal-600 text-white rounded-2xl font-black shadow-lg shadow-teal-100 active:scale-95 transition-all">保存</button>
              <button onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black active:scale-95 transition-all">取消</button>
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-2xl font-black text-slate-800 flex items-center justify-center gap-2">
              {user.name} 
              <button onClick={() => setIsEditing(true)} className="p-2 text-slate-300 hover:text-teal-500 transition-colors">
                <Edit2 size={18} />
              </button>
            </h2>
            <p className="text-slate-400 font-black mt-2 uppercase tracking-widest text-[10px]">
              {user.role === UserRole.MENTOR ? 'Mentor' : 'Staff'} / {clinicName}
            </p>
          </div>
        )}
      </div>

      {isMentor && (
        <section className="mt-4 mb-12 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest">
              <UsersIcon size={18} className="text-teal-600" /> スタッフ管理
            </h3>
            <button 
              onClick={() => setShowAddUser(!showAddUser)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-teal-600 text-white text-[10px] font-black rounded-full shadow-lg shadow-teal-100 active:scale-95 transition-all"
            >
              <UserPlus size={14} /> 新規登録
            </button>
          </div>

          {showAddUser && (
            <form onSubmit={handleAddUserSubmit} className="bg-white p-7 rounded-[32px] border-2 border-teal-50 shadow-xl shadow-slate-100 space-y-5 text-left animate-in zoom-in-95 duration-200">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">スタッフ名</label>
                <input className="w-full p-4 bg-slate-50 border border-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-teal-500" placeholder="例: 佐藤 はなこ" value={newName} onChange={e => setNewName(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ログイン用パスワード</label>
                <input className="w-full p-4 bg-slate-50 border border-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-teal-500" placeholder="4桁以上の英数字推奨" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">権限設定</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setNewRole(UserRole.NEWBIE)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black border-2 transition-all ${newRole === UserRole.NEWBIE ? 'bg-teal-600 text-white border-teal-700 shadow-lg shadow-teal-100' : 'bg-white text-slate-400 border-slate-50 active:border-teal-200'}`}>Staff</button>
                  <button type="button" onClick={() => setNewRole(UserRole.MENTOR)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black border-2 transition-all ${newRole === UserRole.MENTOR ? 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-100' : 'bg-white text-slate-400 border-slate-50 active:border-amber-200'}`}>Mentor</button>
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-teal-100 active:scale-[0.98] transition-all">スタッフを登録する</button>
            </form>
          )}

          <div className="space-y-3">
            {allUsers.filter(u => u.id !== user.id).map(u => (
              <div key={u.id} className="flex items-center justify-between p-5 bg-white rounded-[24px] border border-slate-100 shadow-sm hover:border-teal-100 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${u.role === UserRole.MENTOR ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'}`}>
                    <UserIcon size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-700">{u.name}</p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{u.role}</p>
                  </div>
                </div>
                <button onClick={() => onDeleteUser(u.id)} className="p-2.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <button onClick={onLogout} className="w-full p-5 bg-white border border-red-100 text-red-500 rounded-[24px] font-black flex items-center justify-center gap-3 active:bg-red-50 transition-all shadow-sm mb-4">
        <LogOut size={20} /> アプリをログアウト
      </button>
    </div>
  );
};

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('dh_path_all_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('dh_path_logged_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [clinicName, setClinicName] = useState(() => localStorage.getItem('dh_path_clinic_name') || DEFAULT_CLINIC_NAME);

  const [qaList, setQaList] = useState<QA[]>(() => {
    const saved = localStorage.getItem('dh_path_qa_list');
    return saved ? JSON.parse(saved) : MOCK_QA;
  });

  const [proceduresList, setProceduresList] = useState<Procedure[]>(() => {
    const saved = localStorage.getItem('dh_path_procedures');
    return saved ? JSON.parse(saved) : MOCK_PROCEDURES;
  });

  const [skillsList] = useState<Skill[]>(MOCK_SKILLS);

  const [allSkillProgress, setAllSkillProgress] = useState<Record<string, UserSkillProgress[]>>(() => {
    const saved = localStorage.getItem('dh_path_all_skill_progress');
    return saved ? JSON.parse(saved) : {};
  });

  const [userMemos, setUserMemos] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('dh_path_all_memos');
    return saved ? JSON.parse(saved) : {};
  });

  const handleSaveMemo = (memo: string) => {
    if (!user) return;
    const newMemos = { ...userMemos, [user.id]: memo };
    setUserMemos(newMemos);
    localStorage.setItem('dh_path_all_memos', JSON.stringify(newMemos));
    alert("自分用メモを保存しました");
  };

  const handleAddUser = (name: string, role: UserRole, password: string) => {
    const newUser: User = { id: `u-${Date.now()}`, name, role, clinicId: 'c1', password };
    const newList = [...allUsers, newUser];
    setAllUsers(newList);
    localStorage.setItem('dh_path_all_users', JSON.stringify(newList));
    alert(`${name}さんの登録が完了しました。初期パスワード: ${password}`);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm("このスタッフ情報を完全に削除しますか？進捗データも削除されます。")) {
      const newList = allUsers.filter(u => u.id !== id);
      setAllUsers(newList);
      localStorage.setItem('dh_path_all_users', JSON.stringify(newList));
    }
  };

  const handleUpdateProfile = (name: string, newClinicName: string) => {
    if (!user) return;
    const updatedUser = { ...user, name };
    setUser(updatedUser);
    setClinicName(newClinicName);
    localStorage.setItem('dh_path_clinic_name', newClinicName);
    const updatedAllUsers = allUsers.map(u => u.id === user.id ? updatedUser : u);
    setAllUsers(updatedAllUsers);
    localStorage.setItem('dh_path_logged_user', JSON.stringify(updatedUser));
    localStorage.setItem('dh_path_all_users', JSON.stringify(updatedAllUsers));
  };

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('dh_path_logged_user', JSON.stringify(u));
    navigate('/');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('dh_path_logged_user');
    navigate('/login');
  };

  const handleSaveProcedure = (proc: Partial<Procedure>) => {
    const newList = proc.id 
      ? proceduresList.map(p => p.id === proc.id ? { ...p, ...proc } as Procedure : p)
      : [{ ...proc, id: `proc-${Date.now()}` } as Procedure, ...proceduresList];
    setProceduresList(newList);
    localStorage.setItem('dh_path_procedures', JSON.stringify(newList));
  };

  const handleDeleteProcedure = (id: string) => {
    const newList = proceduresList.filter(p => p.id !== id);
    setProceduresList(newList);
    localStorage.setItem('dh_path_procedures', JSON.stringify(newList));
  };

  const handleUpdateSkillProgress = (targetUserId: string, skillId: string, updates: Partial<UserSkillProgress>) => {
    const userProgress = [...(allSkillProgress[targetUserId] || [])];
    const index = userProgress.findIndex(p => p.skillId === skillId);
    if (index >= 0) {
      userProgress[index] = { ...userProgress[index], ...updates, updatedAt: new Date().toISOString() };
    } else {
      userProgress.push({ userId: targetUserId, skillId, level: updates.level ?? 0, mentorComment: updates.mentorComment ?? '', updatedAt: new Date().toISOString() });
    }
    const newAllProgress = { ...allSkillProgress, [targetUserId]: userProgress };
    setAllSkillProgress(newAllProgress);
    localStorage.setItem('dh_path_all_skill_progress', JSON.stringify(newAllProgress));
  };

  const handleSaveQA = (id: string | null, question: string, answer: string, tags: string) => {
    const tagsArr = tags ? tags.split(',').map(t => t.trim()) : [];
    const newList = id 
      ? qaList.map(q => q.id === id ? { ...q, question, answer, tags: tagsArr } : q)
      : [{ id: `qa-${Date.now()}`, question, answer, tags: tagsArr }, ...qaList];
    setQaList(newList);
    localStorage.setItem('dh_path_qa_list', JSON.stringify(newList));
  };

  const handleDeleteQA = (id: string) => {
    const newList = qaList.filter(q => q.id !== id);
    setQaList(newList);
    localStorage.setItem('dh_path_qa_list', JSON.stringify(newList));
  };

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
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 shadow-2xl relative flex flex-col font-sans border-x border-slate-100">
      <Header title={getPageTitle()} user={user} clinicName={clinicName} />
      <main className="flex-1 overflow-y-auto no-scrollbar bg-slate-50/50">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage users={allUsers} onLogin={handleLogin} clinicName={clinicName} />} />
          <Route path="/" element={<DashboardPage user={user!} procedures={proceduresList} allProgress={allSkillProgress} skills={skillsList} allUsers={allUsers} clinicName={clinicName} memo={userMemos[user?.id || ''] || ''} onSaveMemo={handleSaveMemo} />} />
          <Route path="/procedures" element={<ProceduresPage user={user!} procedures={proceduresList} onSaveProcedure={handleSaveProcedure} onDeleteProcedure={handleDeleteProcedure} />} />
          <Route path="/procedures/:id" element={<ProceduresPage user={user!} procedures={proceduresList} onSaveProcedure={handleSaveProcedure} onDeleteProcedure={handleDeleteProcedure} />} />
          <Route path="/skills" element={<SkillMapPage user={user!} skills={skillsList} allProgress={allSkillProgress} onUpdateProgress={handleUpdateSkillProgress} allUsers={allUsers} />} />
          <Route path="/skills/:userId" element={<SkillMapPage user={user!} skills={skillsList} allProgress={allSkillProgress} onUpdateProgress={handleUpdateSkillProgress} allUsers={allUsers} />} />
          <Route path="/qa" element={<QAPage qaList={qaList} onSave={handleSaveQA} onDelete={handleDeleteQA} user={user!} />} />
          <Route path="/profile" element={<ProfilePage user={user!} allUsers={allUsers} onLogout={handleLogout} clinicName={clinicName} onUpdateProfile={handleUpdateProfile} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} />} />
        </Routes>
      </main>
      {user && <Navigation />}
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
