
import React, { useState, useEffect, useMemo } from 'react';
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
  StickyNote,
  Save,
  Video,
  RefreshCw,
  CheckCircle2,
  PartyPopper,
  Info,
  ExternalLink
} from 'lucide-react';

// Firebase integration
import { db } from './firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

// --- Types & Config ---
import { UserRole, SkillLevel, SkillLevelLabels, UserSkillProgress, Procedure, Skill, User, QA } from './types';
import { MOCK_PROCEDURES, MOCK_SKILLS, MOCK_QA } from './constants';

const DEFAULT_CLINIC_NAME = "なないろ歯科";
const APP_STORAGE_KEYS = {
  LOGGED_USER: 'dh_path_logged_user',
  PROGRESS: 'dh_path_all_skill_progress'
};

const INITIAL_USERS: User[] = [
  { id: 'u1', name: '田中 里奈', role: UserRole.NEWBIE, clinicId: 'c1', password: '1234' },
  { id: 'u3', name: '佐藤 結衣', role: UserRole.NEWBIE, clinicId: 'c1', password: '1234' },
  { id: 'u2', name: '鈴木 院長', role: UserRole.MENTOR, clinicId: 'c1', password: '1234' },
];

// --- Helpers ---
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

const formatEmbedUrl = (url?: string) => {
  if (!url) return "";
  if (url.includes('youtube.com/embed')) return url;
  if (url.includes('youtube.com/watch?v=')) {
    const id = url.split('v=')[1]?.split('&')[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  return url;
};

// --- Common UI Components ---

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
          <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">{isSyncing ? 'Syncing...' : 'Live Cloud'}</span>
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

// --- Pages ---

const DashboardPage: React.FC<any> = ({ user, allProgress, skills, allUsers, clinicName, memo, onSaveMemo, isSaving }) => {
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

      {user.role === UserRole.MENTOR && (
        <section className="space-y-4">
          <h3 className="text-[11px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest px-2">
            <UsersIcon size={14} className="text-teal-600" /> スタッフ進捗
          </h3>
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
      )}

      <section className="space-y-4">
        <h3 className="text-[11px] font-black text-slate-400 flex items-center justify-between px-2 uppercase tracking-widest">
          <div className="flex items-center gap-2"><StickyNote size={14} className="text-teal-600" /> 学習メモ</div>
          {isSaving && <div className="text-teal-600 animate-pulse text-[8px] font-black uppercase">Cloud Sync...</div>}
        </h3>
        <div className="bg-amber-50 rounded-[32px] p-6 border border-amber-100 shadow-sm space-y-4">
          <textarea 
            value={tempMemo} 
            onChange={(e) => setTempMemo(e.target.value)} 
            placeholder="今日学んだことをメモ..." 
            className="w-full bg-transparent border-none outline-none text-sm text-amber-950 min-h-[140px] font-bold leading-relaxed resize-none" 
          />
          <button 
            onClick={() => onSaveMemo(tempMemo)} 
            className="w-full py-3 bg-amber-200 text-amber-900 text-[11px] font-black rounded-full hover:bg-amber-300 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} クラウドに保存して同期
          </button>
        </div>
      </section>
    </div>
  );
};

const ProceduresPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const filtered = MOCK_PROCEDURES.filter(p => p.title.includes(search) || p.category.includes(search));

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="p-2 bg-white rounded-xl shadow-sm"><ArrowLeft size={20} /></button>
        <h2 className="text-xl font-black text-slate-800">手順書マニュアル</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        <input 
          type="text" 
          placeholder="手順を検索..." 
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[24px] text-sm font-bold outline-none shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filtered.map(p => (
          <button 
            key={p.id} 
            onClick={() => navigate(`/procedures/${p.id}`)}
            className="w-full bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between group"
          >
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><BookOpen size={20} /></div>
              <div>
                <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{p.category}</span>
                <p className="font-black text-slate-800">{p.title}</p>
              </div>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl text-slate-300 group-hover:text-teal-600 transition-colors"><ChevronRight size={18} /></div>
          </button>
        ))}
      </div>
    </div>
  );
};

const ProcedureDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const procedure = MOCK_PROCEDURES.find(p => p.id === id);

  if (!procedure) return <div>Not found</div>;

  return (
    <div className="p-4 space-y-6 pb-24 animate-in slide-in-from-right-10 duration-500">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/procedures')} className="p-2 bg-white rounded-xl shadow-sm"><ArrowLeft size={20} /></button>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{procedure.category}</span>
      </div>

      <h2 className="text-2xl font-black text-slate-800 leading-tight">{procedure.title}</h2>

      {procedure.videoUrl && (
        <div className="aspect-video w-full rounded-[32px] overflow-hidden bg-slate-100 shadow-lg border-4 border-white">
          <iframe 
            src={formatEmbedUrl(procedure.videoUrl)} 
            className="w-full h-full" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen 
          />
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-[11px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest px-2">
          <ClipboardList size={14} className="text-blue-500" /> ステップ
        </h3>
        <div className="space-y-3">
          {procedure.steps.map((step, i) => (
            <div key={i} className="bg-white p-5 rounded-[24px] border border-slate-100 flex gap-4 items-start shadow-sm">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">{i+1}</div>
              <p className="text-sm font-bold text-slate-700 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {procedure.tips && (
        <div className="bg-amber-50 rounded-[28px] p-6 border border-amber-100 shadow-sm flex gap-4">
          <div className="p-2 bg-amber-200 rounded-xl text-amber-700 flex-shrink-0 self-start"><Info size={18} /></div>
          <div>
            <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">アドバイス</h4>
            <p className="text-sm font-bold text-amber-900 leading-relaxed">{procedure.tips}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const QAPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const filtered = MOCK_QA.filter(q => q.question.includes(search) || q.answer.includes(search) || q.tags.some(t => t.includes(search)));

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in">
      <h2 className="text-xl font-black text-slate-800 px-1">院内ナレッジQ&A</h2>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        <input 
          type="text" 
          placeholder="キーワード・タグで検索..." 
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[24px] text-sm font-bold outline-none shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filtered.map(q => (
          <div key={q.id} className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
            <button 
              onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
              className="w-full p-5 text-left flex justify-between items-start"
            >
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">Q</div>
                <div>
                  <p className="font-black text-slate-800 text-sm">{q.question}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {q.tags.map(t => <span key={t} className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[8px] font-black rounded-md">#{t}</span>)}
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className={`text-slate-300 transition-transform ${expandedId === q.id ? 'rotate-90' : ''}`} />
            </button>
            {expandedId === q.id && (
              <div className="px-5 pb-6 animate-in slide-in-from-top-2">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">A</div>
                  <div className="bg-slate-50 p-4 rounded-2xl flex-1 text-sm font-bold text-slate-600 leading-relaxed">
                    {q.answer}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const SkillMapPage: React.FC<any> = ({ user, skills, allProgress, allUsers, onUpdate }) => {
  const { userId } = useParams();
  const targetId = userId || user.id;
  const targetUser = allUsers.find((u:any) => u.id === targetId) || user;
  const progressData = allProgress[targetId] || [];
  const stats = calculateProgress(skills, progressData);
  const rank = getRankInfo(stats);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in">
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-teal-600 font-black text-xl">{targetUser.name.charAt(0)}</div>
          <div>
            <h2 className="text-lg font-black text-slate-800">{targetUser.name}</h2>
            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black text-white ${rank.color} inline-block`}>{rank.label}</div>
          </div>
        </div>
        <div className="text-2xl font-black text-teal-600">{stats}%</div>
      </div>
      <div className="space-y-4">
        {skills.map((skill:any) => {
          const p = progressData.find((sp:any) => sp.skillId === skill.id);
          const level = p?.level || 0;
          return (
            <div key={skill.id} className="bg-white p-5 rounded-[28px] border border-slate-100">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{skill.category}</span>
                  <p className="font-black text-slate-800 text-sm">{skill.name}</p>
                </div>
                {user.role === UserRole.MENTOR && (
                  <button onClick={() => setEditingId(editingId === skill.id ? null : skill.id)} className="p-2 bg-slate-50 rounded-xl text-slate-400"><Edit2 size={14} /></button>
                )}
              </div>
              <div className="mt-3 flex gap-1">
                {[1, 2, 3].map(l => (
                  <div key={l} className={`h-1.5 flex-1 rounded-full ${l <= level ? 'bg-teal-500' : 'bg-slate-100'}`} />
                ))}
              </div>
              {editingId === skill.id && (
                <div className="mt-4 grid grid-cols-4 gap-2 animate-in zoom-in-95">
                  {[0, 1, 2, 3].map(l => (
                    <button key={l} onClick={() => { onUpdate(targetId, skill.id, { level: l }); setEditingId(null); }} className={`py-2 rounded-xl text-[8px] font-black ${level === l ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>
                      {SkillLevelLabels[l as SkillLevel]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ProfilePage: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => (
  <div className="p-8 space-y-8 pb-24 text-center">
    <div className="w-24 h-24 bg-teal-50 text-teal-600 rounded-[32px] mx-auto flex items-center justify-center shadow-inner border-2 border-white">
      <UserIcon size={40} />
    </div>
    <div>
      <h2 className="text-2xl font-black text-slate-800">{user.name}</h2>
      <p className="text-xs font-black text-slate-300 uppercase tracking-widest mt-1">
        {user.role === UserRole.MENTOR ? 'Education Mentor' : 'Dental Hygienist'}
      </p>
    </div>
    
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 space-y-4 shadow-sm text-left">
      <div className="flex justify-between items-center pb-4 border-b border-slate-50">
        <span className="text-[10px] font-black text-slate-400 uppercase">Clinic</span>
        <span className="text-sm font-black text-slate-800">{DEFAULT_CLINIC_NAME}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black text-slate-400 uppercase">Version</span>
        <span className="text-xs font-black text-teal-600">v1.2.0 Cloud Live</span>
      </div>
    </div>

    <button onClick={onLogout} className="w-full py-5 bg-red-50 text-red-500 rounded-[28px] font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
      ログアウトして終了
    </button>
  </div>
);

const LoginPage: React.FC<any> = ({ users, onLogin }) => {
  const [selected, setSelected] = useState<User | null>(null);
  const [pass, setPass] = useState('');
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[80vh] space-y-8">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-teal-600 rounded-[24px] mx-auto flex items-center justify-center shadow-2xl"><ClipboardList size={40} className="text-white" /></div>
        <h2 className="text-2xl font-black text-slate-800">なないろアプリ</h2>
        <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">{DEFAULT_CLINIC_NAME}</p>
      </div>
      {!selected ? (
        <div className="w-full space-y-3">
          {users.map((u:any) => (
            <button key={u.id} onClick={() => setSelected(u)} className="w-full p-5 bg-white border border-slate-100 rounded-[28px] flex justify-between items-center shadow-sm active:scale-95 transition-all">
              <span className="font-black text-slate-700">{u.name}</span>
              <ChevronRight size={18} className="text-slate-200" />
            </button>
          ))}
        </div>
      ) : (
        <div className="w-full space-y-4 bg-white p-10 rounded-[40px] border border-slate-100 animate-in zoom-in-95">
          <input type="password" placeholder="••••" value={pass} onChange={e => setPass(e.target.value)} className="w-full p-5 bg-slate-50 border-none rounded-2xl text-center text-xl font-black outline-none" />
          <button onClick={() => onLogin(selected)} className="w-full py-5 bg-teal-600 text-white rounded-2xl font-black shadow-lg shadow-teal-100">ログイン</button>
          <button onClick={() => setSelected(null)} className="w-full text-[10px] text-slate-300 font-black uppercase tracking-widest">戻る</button>
        </div>
      )}
    </div>
  );
};

// --- App Root ---

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [allUsers] = useState<User[]>(INITIAL_USERS);
  const [user, setUser] = useState<User | null>(null);
  const [allSkillProgress, setAllSkillProgress] = useState<Record<string, UserSkillProgress[]>>({});
  const [currentMemo, setCurrentMemo] = useState<string>('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const savedLogged = localStorage.getItem(APP_STORAGE_KEYS.LOGGED_USER);
    if (savedLogged) setUser(JSON.parse(savedLogged));
  }, []);

  // リアルタイム同期
  useEffect(() => {
    if (!user) return;

    setIsSyncing(true);
    
    // 1. メモ同期
    const unsubMemo = onSnapshot(doc(db, 'memos', user.id), (snap) => {
      if (snap.exists()) setCurrentMemo(snap.data().content || '');
      setIsSyncing(false);
    }, () => setIsSyncing(false));

    // 2. 全スタッフの進捗同期
    const unsubProgress = onSnapshot(doc(db, 'clinic_data', 'c1'), (snap) => {
      if (snap.exists()) {
        const data = snap.data().allProgress || {};
        setAllSkillProgress(data);
        localStorage.setItem(APP_STORAGE_KEYS.PROGRESS, JSON.stringify(data));
      }
    });

    return () => { unsubMemo(); unsubProgress(); };
  }, [user]);

  const handleSaveMemo = async (content: string) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'memos', user.id), {
        content,
        updatedAt: serverTimestamp(),
        userId: user.id,
        userName: user.name
      });
      setCurrentMemo(content);
    } catch (e) { console.error("Cloud Save Error:", e); } finally { setIsSaving(false); }
  };

  const handleUpdateProgress = async (uId: string, sId: string, updates: any) => {
    const userProgress = [...(allSkillProgress[uId] || [])];
    const index = userProgress.findIndex(p => p.skillId === sId);
    const now = new Date().toISOString();
    
    if (index >= 0) userProgress[index] = { ...userProgress[index], ...updates, updatedAt: now };
    else userProgress.push({ userId: uId, skillId: sId, level: updates.level, mentorComment: updates.mentorComment || '', updatedAt: now });
    
    const newAllProgress = { ...allSkillProgress, [uId]: userProgress };
    setAllSkillProgress(newAllProgress);

    try {
      await setDoc(doc(db, 'clinic_data', 'c1'), { allProgress: newAllProgress }, { merge: true });
    } catch (e) { console.error("Cloud Sync Error:", e); }
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

  if (!user && location.pathname !== '/login') return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 shadow-2xl relative flex flex-col font-sans border-x border-slate-100 overflow-hidden">
      <Header user={user} clinicName={DEFAULT_CLINIC_NAME} isSyncing={isSyncing} />
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <Routes>
          <Route path="/login" element={<LoginPage users={allUsers} onLogin={handleLogin} />} />
          <Route path="/" element={<DashboardPage user={user!} allProgress={allSkillProgress} skills={MOCK_SKILLS} allUsers={allUsers} clinicName={DEFAULT_CLINIC_NAME} memo={currentMemo} onSaveMemo={handleSaveMemo} isSaving={isSaving} />} />
          <Route path="/procedures" element={<ProceduresPage />} />
          <Route path="/procedures/:id" element={<ProcedureDetailPage />} />
          <Route path="/skills" element={<SkillMapPage user={user!} skills={MOCK_SKILLS} allProgress={allSkillProgress} allUsers={allUsers} onUpdate={handleUpdateProgress} />} />
          <Route path="/skills/:userId" element={<SkillMapPage user={user!} skills={MOCK_SKILLS} allProgress={allSkillProgress} allUsers={allUsers} onUpdate={handleUpdateProgress} />} />
          <Route path="/qa" element={<QAPage />} />
          <Route path="/profile" element={<ProfilePage user={user!} onLogout={handleLogout} />} />
        </Routes>
      </main>
      {user && <Navigation />}
      {isSaving && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-[9px] font-black tracking-widest flex items-center gap-3 shadow-2xl animate-in slide-in-from-bottom-2 z-[60]">
          <PartyPopper size={14} className="text-emerald-400" /> CLOUD SYNCED
        </div>
      )}
    </div>
  );
};

export default function App() { return ( <Router> <AppContent /> </Router> ); }
