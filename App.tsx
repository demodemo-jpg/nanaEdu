
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
  Loader2
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

const LoginPage: React.FC<{ allUsers: User[], onLogin: (user: User) => void }> = ({ allUsers, onLogin }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

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
          {allUsers.map(u => (
            <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full p-5 bg-white border border-slate-100 rounded-[28px] flex justify-between items-center shadow-sm active:scale-95 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-teal-600 group-hover:bg-teal-50 transition-colors">
                  <UserIcon size={20} />
                </div>
                <span className="font-black text-slate-700">{u.name}</span>
              </div>
              <ChevronRight size={18} className="text-slate-200" />
            </button>
          ))}
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
        <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-[24px] mx-auto flex items-center justify-center mb-4">
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
          <span className="text-xs font-black text-slate-800">院内ナレッジ</span>
        </button>
      </section>
      
      <section className="space-y-4">
        <h3 className="text-[11px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest px-2"><UsersIcon size={14} className="text-teal-600" /> スタッフ進捗</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-1">
          {newbieStats.map((staff: any) => (
            <button key={staff.id} onClick={() => navigate(`/skills/${staff.id}`)} className="min-w-[140px] bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-teal-600 font-black text-xl mb-2">{staff.name.charAt(0)}</div>
              <p className="font-black text-slate-800 text-sm truncate w-full">{staff.name}</p>
              <div className={`mt-2 px-3 py-1 rounded-full text-[9px] font-black text-white ${getRankInfo(staff.progress).color}`}>{getRankInfo(staff.progress).label}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-2"><h3 className="text-[11px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest"><Target size={14} className="text-teal-600" /> ラーニング・ログ</h3></div>
        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="bg-amber-50/50 rounded-2xl p-4 border border-dashed border-amber-200">
            <textarea value={tempMemo} onChange={(e) => setTempMemo(e.target.value)} placeholder="今日学んだこと、気づいたことをメモ..." className="w-full bg-transparent border-none outline-none text-sm text-amber-950 min-h-[100px] font-bold leading-relaxed resize-none" />
          </div>
          <button onClick={() => onSaveMemo(today, tempMemo)} className="w-full py-3.5 bg-teal-600 text-white text-[11px] font-black rounded-full hover:bg-teal-700 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95">{isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} 保存</button>
        </div>
      </section>
    </div>
  );
};

const ProceduresPage: React.FC<any> = ({ procedures, user, onSaveMaster }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isSortMode, setIsSortMode] = useState(false);
  const filtered = isSortMode ? procedures : procedures.filter((p: Procedure) => p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));
  
  const moveProcedure = (index: number, direction: 'up' | 'down') => {
    const newList = [...procedures];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= procedures.length) return;
    [newList[index], newList[target]] = [newList[target], newList[index]];
    onSaveMaster('procedures', newList);
  };

  return (
    <div className="p-4 space-y-6 pb-32 animate-in fade-in min-h-full">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3"><button onClick={() => navigate('/')} className="p-2 bg-white rounded-xl shadow-sm"><ArrowLeft size={20} /></button><h2 className="text-xl font-black text-slate-800">手順書マニュアル</h2></div>
        <button onClick={() => { setIsSortMode(!isSortMode); setSearch(''); }} className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${isSortMode ? 'bg-teal-600 text-white shadow-lg' : 'bg-white text-slate-400 shadow-sm'}`}>
          <ArrowDownUp size={16} /><span className="text-[10px] font-black uppercase tracking-widest">{isSortMode ? '完了' : '順序'}</span>
        </button>
      </div>
      {!isSortMode && (
        <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input type="text" placeholder="手順を検索..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[24px] text-sm font-bold outline-none shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      )}
      <div className="space-y-3">
        {filtered.map((p: Procedure, idx: number) => {
          const originalIdx = isSortMode ? idx : procedures.findIndex(item => item.id === p.id);
          return (
            <div key={p.id} className="flex gap-2 items-stretch animate-in slide-in-from-left-2">
              {isSortMode && (
                <div className="flex flex-col gap-1 pr-1 bg-white/50 rounded-xl">
                  <button disabled={originalIdx === 0} onClick={() => moveProcedure(originalIdx, 'up')} className={`p-2 rounded-xl flex-1 flex items-center justify-center ${originalIdx === 0 ? 'text-slate-100' : 'text-teal-600 bg-white shadow-sm'}`}><ChevronUp size={20} /></button>
                  <button disabled={originalIdx === procedures.length - 1} onClick={() => moveProcedure(originalIdx, 'down')} className={`p-2 rounded-xl flex-1 flex items-center justify-center ${originalIdx === procedures.length - 1 ? 'text-slate-100' : 'text-teal-600 bg-white shadow-sm'}`}><ChevronDown size={20} /></button>
                </div>
              )}
              <button onClick={() => !isSortMode && navigate(`/procedures/${p.id}`)} className={`flex-1 bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between group transition-all ${isSortMode ? 'opacity-90' : 'active:scale-[0.98]'}`}>
                <div className="flex items-center gap-4 text-left">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isSortMode ? 'bg-teal-50 text-teal-600' : 'bg-blue-50 text-blue-600'}`}><BookOpen size={20} /></div>
                  <div className="max-w-[180px]"><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{p.category}</span><p className="font-black text-slate-800 text-sm leading-tight truncate">{p.title}</p></div>
                </div>
                {!isSortMode && <ChevronRight size={18} className="text-slate-300 group-hover:text-teal-600 transition-colors" />}
              </button>
            </div>
          );
        })}
      </div>
      {!isSortMode && <button onClick={() => navigate('/procedures/new')} className="fixed bottom-24 right-6 w-14 h-14 bg-teal-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 border-4 border-white active:scale-95 transition-all"><Plus size={28} /></button>}
    </div>
  );
};

const AttachmentIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'video': return <Video size={18} />;
    case 'image': return <ImageIcon size={18} />;
    case 'pdf': return <FileText size={18} />;
    default: return <LinkIcon size={18} />;
  }
};

const ProcedureDetailPage: React.FC<any> = ({ procedures, onDelete }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const procedure = procedures.find((p: Procedure) => p.id === id);
  if (!procedure) return <div className="p-8 text-center font-black text-slate-400">手順が見つかりません</div>;

  return (
    <div className="p-4 space-y-6 pb-24 animate-in slide-in-from-right-10 duration-500 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/procedures')} className="p-2 bg-white rounded-xl shadow-sm"><ArrowLeft size={20} /></button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{procedure.category}</span>
          <div className="flex gap-1 ml-2">
            <button onClick={() => navigate(`/procedures/edit/${procedure.id}`)} className="p-2 bg-amber-50 text-amber-600 rounded-lg active:scale-95 transition-all"><Edit2 size={16} /></button>
            <button onClick={() => { if(window.confirm('削除しますか？')) { onDelete(procedure.id); navigate('/procedures'); } }} className="p-2 bg-red-50 text-red-500 rounded-lg active:scale-95 transition-all"><Trash2 size={16} /></button>
          </div>
        </div>
      </div>
      <h2 className="text-2xl font-black text-slate-800 leading-tight">{procedure.title}</h2>
      
      {procedure.attachments && procedure.attachments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">参考資料・マニュアル</h3>
          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar px-1">
            {procedure.attachments.map((at: Attachment) => (
              <a key={at.id} href={at.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 min-w-[180px] bg-white border border-slate-100 rounded-[28px] shadow-sm overflow-hidden flex flex-col group active:scale-95 transition-all">
                {at.type === 'image' ? (
                  <div className="w-full h-32 bg-slate-900 overflow-hidden flex items-center justify-center">
                    <img src={at.url} alt={at.name} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className={`w-full h-32 flex items-center justify-center ${at.type === 'video' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                    <AttachmentIcon type={at.type} />
                  </div>
                )}
                <div className="p-3 flex justify-between items-center bg-white border-t border-slate-50">
                  <span className="text-[11px] font-black text-slate-700 truncate pr-2">{at.name}</span>
                  <ExternalLink size={12} className="text-slate-300 group-hover:text-teal-600 flex-shrink-0" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 pt-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">実施ステップ</h3>
        {(procedure.steps || []).map((step: string, i: number) => (
          <div key={i} className="bg-white p-5 rounded-[24px] border border-slate-100 flex gap-4 items-start shadow-sm">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">{i+1}</div>
            <p className="text-sm font-bold text-slate-700 leading-relaxed">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProcedureEditPage: React.FC<any> = ({ procedures, onSave }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isNew = !id;
  const existing = procedures.find((p: Procedure) => p.id === id);
  
  const [form, setForm] = useState<any>(existing ? { 
    ...existing, 
    steps: (existing.steps || []).map((s:string) => ({id: Math.random().toString(36), text: s})),
    attachments: existing.attachments || []
  } : { 
    title: '', 
    category: '基本準備', 
    steps: [{id: '1', text: ''}], 
    attachments: [] 
  });

  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const handleSubmit = () => {
    onSave({ ...form, id: form.id || `p_${Date.now()}`, steps: form.steps.map((s:any) => s.text) });
    navigate('/procedures');
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...form.steps];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newSteps.length) return;
    [newSteps[index], newSteps[target]] = [newSteps[target], newSteps[index]];
    setForm({ ...form, steps: newSteps });
  };

  const addAttachment = () => {
    const newAt: Attachment = { id: `at_${Date.now()}`, type: 'video', url: '', name: '新しいリンク' };
    setForm({ ...form, attachments: [...form.attachments, newAt] });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      let type: 'image' | 'video' | 'pdf' = 'image';
      if (file.type.includes('video')) type = 'video';
      else if (file.type.includes('pdf')) type = 'pdf';

      const newAt: Attachment = {
        id: `file_${Date.now()}`,
        type,
        url: dataUrl,
        name: file.name
      };
      setForm({ ...form, attachments: [...form.attachments, newAt] });
      setIsProcessingFile(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 space-y-6 pb-32 animate-in slide-in-from-bottom-5 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm"><X size={20} /></button>
        <h2 className="text-lg font-black">{isNew ? '新規作成' : '編集'}</h2>
        <button onClick={handleSubmit} className="p-2 bg-teal-600 text-white rounded-xl shadow-md"><Save size={20} /></button>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">タイトル</label>
        <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="手順タイトル" className="w-full p-4 bg-white border border-slate-100 rounded-2xl font-bold outline-none shadow-sm" />
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">実施ステップ（順序入れ替え可）</label>
        {form.steps.map((s:any, i:number) => (
          <div key={s.id} className="flex gap-2 items-start group">
            <div className="flex flex-col gap-1">
              <button disabled={i === 0} onClick={() => moveStep(i, 'up')} className={`p-1 rounded-md border ${i === 0 ? 'text-slate-100 border-slate-50' : 'text-slate-400 border-slate-200 active:bg-teal-50'}`}><ChevronUp size={16} /></button>
              <div className="bg-slate-100 p-2 rounded-lg font-black text-[10px] text-slate-400 text-center">{i+1}</div>
              <button disabled={i === form.steps.length - 1} onClick={() => moveStep(i, 'down')} className={`p-1 rounded-md border ${i === form.steps.length - 1 ? 'text-slate-100 border-slate-50' : 'text-slate-400 border-slate-200 active:bg-teal-50'}`}><ChevronDown size={16} /></button>
            </div>
            <div className="flex-1 relative">
              <textarea value={s.text} onChange={e => {
                const newSteps = [...form.steps];
                newSteps[i].text = e.target.value;
                setForm({...form, steps: newSteps});
              }} className="w-full p-4 bg-white border border-slate-100 rounded-2xl font-bold text-sm min-h-[80px] outline-none shadow-sm" placeholder="何をしますか？" />
              <button onClick={() => setForm({...form, steps: form.steps.filter((_:any, idx:number) => idx !== i)})} className="absolute -top-2 -right-2 w-6 h-6 bg-red-50 text-red-500 rounded-full border border-red-100 flex items-center justify-center shadow-sm"><X size={12} /></button>
            </div>
          </div>
        ))}
        <button onClick={() => setForm({...form, steps: [...form.steps, {id: Math.random().toString(36), text: ''}]})} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[11px] font-black text-teal-600 active:bg-teal-50 transition-all">+ ステップ追加</button>
      </div>

      <div className="space-y-4 pt-4">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">参考資料・ファイル</label>
        <div className="space-y-3">
          {form.attachments.map((at: Attachment, i: number) => (
            <div key={at.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3 relative group">
              <button onClick={() => setForm({...form, attachments: form.attachments.filter((_:any, idx:number) => idx !== i)})} className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 bg-slate-900 border border-slate-100 ${at.type === 'video' ? 'text-blue-600' : at.type === 'image' ? 'text-purple-600' : 'text-red-600'}`}>
                  {at.type === 'image' && at.url ? (
                    <img src={at.url} alt="thumb" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <AttachmentIcon type={at.type} />
                  )}
                </div>
                <input value={at.name} onChange={e => {
                  const newAts = [...form.attachments];
                  newAts[i].name = e.target.value;
                  setForm({...form, attachments: newAts});
                }} placeholder="タイトル" className="flex-1 p-1 bg-transparent border-none rounded-lg text-xs font-bold focus:ring-1 focus:ring-teal-100" />
              </div>
              <input value={at.url.startsWith('data:') ? '[ファイル保存済み]' : at.url} onChange={e => {
                const newAts = [...form.attachments];
                newAts[i].url = e.target.value;
                setForm({...form, attachments: newAts});
              }} disabled={at.url.startsWith('data:')} placeholder="URL (YouTube等)" className="w-full p-2 bg-slate-50 border-none rounded-lg text-[10px] font-mono text-slate-500" />
            </div>
          ))}
          
          <div className="grid grid-cols-2 gap-3">
            <button onClick={addAttachment} className="py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[11px] font-black text-teal-600 flex flex-col items-center justify-center gap-1 active:bg-teal-50">
              <LinkIcon size={16} /> リンクを追加
            </button>
            <button 
              disabled={isProcessingFile}
              onClick={() => fileInputRef.current?.click()} 
              className="py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[11px] font-black text-amber-600 flex flex-col items-center justify-center gap-1 active:bg-amber-50"
            >
              {isProcessingFile ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
              ファイルを選択
            </button>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,application/pdf" onChange={handleFileChange} />
        </div>
      </div>
    </div>
  );
};

const SkillMapPage: React.FC<any> = ({ user, skills, allProgress, allUsers, onUpdate, onSaveMaster }) => {
  const { userId } = useParams();
  const targetId = userId || user.id;
  const targetUser = allUsers.find((u:any) => u.id === targetId) || user;
  const progressData = allProgress[targetId] || [];
  const stats = calculateProgress(skills, progressData);
  const rank = getRankInfo(stats);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: '', category: '基本スキル' });

  const handleAddSkill = () => {
    if (!newSkill.name.trim()) return;
    const skill: Skill = {
      id: `s_${Date.now()}`,
      name: newSkill.name,
      category: newSkill.category
    };
    onSaveMaster('skills', [...skills, skill]);
    setNewSkill({ name: '', category: '基本スキル' });
    setIsAddingSkill(false);
  };

  return (
    <div className="p-4 space-y-6 pb-32 animate-in fade-in">
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-teal-600 font-black text-xl">{targetUser.name.charAt(0)}</div>
          <div><h2 className="text-lg font-black text-slate-800">{targetUser.name}</h2><div className={`px-2 py-0.5 rounded-full text-[8px] font-black text-white ${rank.color} inline-block`}>{rank.label}</div></div>
        </div>
        <div className="text-2xl font-black text-teal-600">{stats}%</div>
      </div>
      <div className="space-y-4">
        {skills.map((skill: Skill) => {
          const p = progressData.find((sp: any) => sp.skillId === skill.id);
          const level = p?.level || 0;
          return (
            <div key={skill.id} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm transition-all duration-300">
              <div className="flex justify-between items-center">
                <div><span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{skill.category}</span><p className="font-black text-slate-800 text-sm">{skill.name}</p></div>
                <button onClick={() => setEditingId(editingId === skill.id ? null : skill.id)} className="p-2 bg-slate-50 rounded-xl text-slate-400 active:bg-teal-50"><Edit2 size={14} /></button>
              </div>
              <div className="mt-3 flex gap-1">{[1, 2, 3].map(l => (<div key={l} className={`h-1.5 flex-1 rounded-full ${l <= level ? 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.3)]' : 'bg-slate-100'}`} />))}</div>
              {editingId === skill.id && (
                <div className="mt-4 grid grid-cols-4 gap-2 animate-in zoom-in-95">
                  {[0, 1, 2, 3].map(l => (<button key={l} onClick={() => { onUpdate(targetId, skill.id, { level: l }); setEditingId(null); }} className={`py-2 rounded-xl text-[8px] font-black ${level === l ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>{SkillLevelLabels[l as SkillLevel]}</button>))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={() => setIsAddingSkill(true)} className="fixed bottom-24 right-6 w-14 h-14 bg-teal-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 border-4 border-white active:scale-95 transition-all"><Plus size={28} /></button>

      {isAddingSkill && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] p-4 flex items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 space-y-4 animate-in zoom-in-95">
            <h3 className="font-black text-lg text-slate-800">スキル項目を追加</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">項目名</label>
                <input value={newSkill.name} onChange={e => setNewSkill({...newSkill, name: e.target.value})} placeholder="例: バキューム操作" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">カテゴリ</label>
                <input value={newSkill.category} onChange={e => setNewSkill({...newSkill, category: e.target.value})} placeholder="例: 基本スキル, 臨床補助" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm shadow-inner" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setIsAddingSkill(false)} className="flex-1 py-4 text-slate-400 font-black text-sm">キャンセル</button>
              <button onClick={handleAddSkill} className="flex-1 py-4 bg-teal-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-teal-600/20">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const QAPage: React.FC<any> = ({ qaList, user, onSave, onDelete }) => {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingQA, setEditingQA] = useState<QA | null>(null);
  const filtered = qaList.filter((q: QA) => q.question.toLowerCase().includes(search.toLowerCase()) || q.answer.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 space-y-6 pb-32 animate-in fade-in">
      <div className="flex justify-between items-center px-1"><h2 className="text-xl font-black text-slate-800">院内ナレッジQ&A</h2></div>
      <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input type="text" placeholder="検索..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[24px] text-sm font-bold outline-none shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <div className="space-y-4">
        {filtered.map((q: QA) => (
          <div key={q.id} className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex justify-between items-start p-5">
              <button onClick={() => setExpandedId(expandedId === q.id ? null : q.id)} className="flex-1 text-left flex gap-4"><div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">Q</div><p className="font-black text-slate-800 text-sm leading-snug">{q.question}</p></button>
              <div className="flex gap-2">
                <button onClick={() => setEditingQA(q)} className="p-1.5 text-slate-300 hover:text-amber-500"><Edit2 size={16} /></button>
                <button onClick={() => { if(window.confirm('削除しますか？')) onDelete(q.id); }} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            </div>
            {expandedId === q.id && <div className="px-5 pb-6 animate-in slide-in-from-top-2"><div className="flex gap-4"><div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">A</div><div className="bg-slate-50 p-4 rounded-2xl flex-1 text-sm font-bold text-slate-600 leading-relaxed whitespace-pre-wrap">{q.answer}</div></div></div>}
          </div>
        ))}
      </div>
      <button onClick={() => setEditingQA({ id: `qa_${Date.now()}`, question: '', answer: '', tags: [] })} className="fixed bottom-24 right-6 w-14 h-14 bg-amber-500 text-white rounded-full shadow-2xl flex items-center justify-center z-40 border-4 border-white active:scale-95 transition-all"><Plus size={28} /></button>
      {editingQA && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] p-4 flex items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 space-y-4 animate-in zoom-in-95">
            <h3 className="font-black text-lg text-slate-800">Q&A編集</h3>
            <textarea placeholder="質問を入力" value={editingQA.question} onChange={e => setEditingQA({...editingQA, question: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm h-24 resize-none" />
            <textarea placeholder="回答を入力" value={editingQA.answer} onChange={e => setEditingQA({...editingQA, answer: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm h-32 resize-none" />
            <div className="flex gap-2 pt-2"><button onClick={() => setEditingQA(null)} className="flex-1 py-4 text-slate-400 font-black text-sm">キャンセル</button><button onClick={() => { onSave(editingQA); setEditingQA(null); }} className="flex-1 py-4 bg-teal-600 text-white rounded-2xl font-black text-sm">保存</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- App Container ---

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
  const [allSkillProgress, setAllSkillProgress] = useState<Record<string, UserSkillProgress[]>>({});
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [qaList, setQaList] = useState<QA[]>([]);
  const [memoData, setMemoData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const savedLogged = localStorage.getItem(APP_STORAGE_KEYS.LOGGED_USER);
    if (savedLogged) { try { setUser(JSON.parse(savedLogged)); } catch (e) { localStorage.removeItem(APP_STORAGE_KEYS.LOGGED_USER); } }
  }, []);

  useEffect(() => {
    const clinicId = user?.clinicId || 'c1';
    setIsSyncing(true);
    const unsubClinic = onSnapshot(doc(db, 'clinic_data', clinicId), snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.users) setAllUsers(data.users);
        if (data.allProgress) setAllSkillProgress(data.allProgress);
        if (data.procedures) setProcedures(data.procedures);
        else setProcedures(MOCK_PROCEDURES);
        if (data.skills) setSkills(data.skills);
        else setSkills(MOCK_SKILLS);
        if (data.qa) setQaList(data.qa);
        else setQaList(MOCK_QA);
      } else {
        setDoc(doc(db, 'clinic_data', clinicId), { users: INITIAL_USERS, procedures: MOCK_PROCEDURES, skills: MOCK_SKILLS, qa: MOCK_QA, allProgress: {} });
      }
      setIsSyncing(false);
    });
    return () => unsubClinic();
  }, [user?.clinicId]);

  useEffect(() => {
    if (!user) return;
    const unsubMemo = onSnapshot(doc(db, 'memos', user.id), snap => { if (snap.exists()) setMemoData(snap.data().entries || {}); });
    return () => unsubMemo();
  }, [user]);

  const handleLogin = (u: User) => { setUser(u); localStorage.setItem(APP_STORAGE_KEYS.LOGGED_USER, JSON.stringify(u)); navigate('/'); };
  const handleLogout = () => { setUser(null); localStorage.removeItem(APP_STORAGE_KEYS.LOGGED_USER); navigate('/'); };
  
  const handleUpdateProgress = async (uId: string, sId: string, updates: any) => {
    const userProgress = [...(allSkillProgress[uId] || [])];
    const index = userProgress.findIndex(p => p.skillId === sId);
    if (index >= 0) userProgress[index] = { ...userProgress[index], ...updates, updatedAt: new Date().toISOString() };
    else userProgress.push({ userId: uId, skillId: sId, level: updates.level, updatedAt: new Date().toISOString() });
    const newAllProgress = { ...allSkillProgress, [uId]: userProgress };
    setAllSkillProgress(newAllProgress);
    await setDoc(doc(db, 'clinic_data', user?.clinicId || 'c1'), { allProgress: newAllProgress }, { merge: true });
  };

  const handleSaveMaster = async (key: string, list: any[]) => {
    setIsSaving(true);
    try { await setDoc(doc(db, 'clinic_data', user?.clinicId || 'c1'), { [key]: list }, { merge: true }); } 
    catch (err) { alert("保存に失敗しました。ファイルが大きすぎる可能性があります。"); } 
    finally { setIsSaving(false); }
  };

  const handleSaveMemo = async (date: string, content: string) => {
    if (!user) return;
    setIsSaving(true);
    try { const newMemoData = { ...memoData, [date]: content }; setMemoData(newMemoData); await setDoc(doc(db, 'memos', user.id), { entries: newMemoData }, { merge: true }); } 
    catch (err) { alert("保存に失敗しました。"); } 
    finally { setIsSaving(false); }
  };

  if (!user) return (<div className="min-h-screen max-w-md mx-auto bg-slate-50 shadow-2xl relative flex flex-col font-sans border-x border-slate-100 overflow-hidden"><LoginPage allUsers={allUsers} onLogin={handleLogin} /></div>);

  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 shadow-2xl relative flex flex-col font-sans border-x border-slate-100 overflow-hidden text-slate-900">
      <Header user={user} clinicName={DEFAULT_CLINIC_NAME} isSyncing={isSyncing} />
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <Routes>
          <Route path="/" element={<DashboardPage user={user!} allProgress={allSkillProgress} skills={skills} allUsers={allUsers} clinicName={DEFAULT_CLINIC_NAME} memoData={memoData} onSaveMemo={handleSaveMemo} isSaving={isSaving} />} />
          <Route path="/procedures" element={<ProceduresPage procedures={procedures} user={user!} onSaveMaster={handleSaveMaster} />} />
          <Route path="/procedures/new" element={<ProcedureEditPage procedures={procedures} onSave={(p: Procedure) => handleSaveMaster('procedures', [...procedures, p])} />} />
          <Route path="/procedures/edit/:id" element={<ProcedureEditPage procedures={procedures} onSave={(p: Procedure) => handleSaveMaster('procedures', procedures.map(old => old.id === p.id ? p : old))} />} />
          <Route path="/procedures/:id" element={<ProcedureDetailPage procedures={procedures} onDelete={(id: string) => handleSaveMaster('procedures', procedures.filter(p => p.id !== id))} />} />
          <Route path="/skills" element={<SkillMapPage user={user!} skills={skills} allProgress={allSkillProgress} allUsers={allUsers} onUpdate={handleUpdateProgress} onSaveMaster={handleSaveMaster} />} />
          <Route path="/skills/:userId" element={<SkillMapPage user={user!} skills={skills} allProgress={allSkillProgress} allUsers={allUsers} onUpdate={handleUpdateProgress} onSaveMaster={handleSaveMaster} />} />
          <Route path="/qa" element={<QAPage qaList={qaList} user={user!} onSave={(q: QA) => handleSaveMaster('qa', qaList.some(oq => oq.id === q.id) ? qaList.map(oq => oq.id === q.id ? q : oq) : [...qaList, q])} onDelete={(id: string) => handleSaveMaster('qa', qaList.filter(q => q.id !== id))} />} />
          <Route path="/profile" element={
            <div className="p-8 text-center animate-in zoom-in-95">
              <div className="w-24 h-24 bg-teal-50 text-teal-600 rounded-[32px] mx-auto mb-6 flex items-center justify-center"><UserIcon size={40} /></div>
              <h2 className="text-xl font-black mb-1">{user?.name}</h2>
              <p className="text-[10px] text-slate-400 font-black mb-8 uppercase tracking-widest">{user?.role}</p>
              <button onClick={handleLogout} className="px-6 py-4 w-full bg-red-50 text-red-500 rounded-2xl font-black active:scale-95 transition-all flex items-center justify-center gap-2">ログアウト</button>
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Navigation />
      {isSaving && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-[9px] font-black tracking-widest flex items-center gap-3 z-[60] animate-in slide-in-from-bottom-2 shadow-2xl"><PartyPopper size={14} className="text-emerald-400" /> CLOUD SYNCED</div>}
    </div>
  );
};

const App: React.FC = () => (<Router><AppContent /></Router>);
export default App;
