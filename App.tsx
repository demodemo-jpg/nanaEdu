
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  RefreshCw,
  CheckCircle2,
  PartyPopper,
  Plus,
  Trash2,
  X,
  Settings,
  UserPlus,
  CalendarDays,
  Target,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ImageIcon,
  PlayCircle,
  FileText,
  FileDown,
  UploadCloud,
  FileUp,
  Loader2,
  AlertCircle,
  ChevronLeft,
  History,
  ArrowDownUp
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

// --- Helpers ---
const getTodayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split('-');
  return `${y}年${m}月${d}日`;
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

// --- Sub Pages ---

const DashboardPage: React.FC<any> = ({ user, allProgress, skills, allUsers, clinicName, memoData, onSaveMemo, isSaving }) => {
  const navigate = useNavigate();
  const today = getTodayStr();
  const [tempMemo, setTempMemo] = useState(memoData[today] || '');
  
  useEffect(() => {
    setTempMemo(memoData[today] || '');
  }, [memoData, today]);
  
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
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[11px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest">
            <Target size={14} className="text-teal-600" /> ラーニング・ログ
          </h3>
        </div>
        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="bg-amber-50/50 rounded-2xl p-4 border border-dashed border-amber-200">
            <textarea 
              value={tempMemo} 
              onChange={(e) => setTempMemo(e.target.value)} 
              placeholder="今日学んだこと、気づいたことをメモ..." 
              className="w-full bg-transparent border-none outline-none text-sm text-amber-950 min-h-[100px] font-bold leading-relaxed resize-none" 
            />
          </div>
          <button 
            onClick={() => onSaveMemo(today, tempMemo)} 
            className="w-full py-3.5 bg-teal-600 text-white text-[11px] font-black rounded-full hover:bg-teal-700 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} 保存
          </button>
        </div>
      </section>
    </div>
  );
};

// --- Procedures List ---
const ProceduresPage: React.FC<any> = ({ procedures, user, onSaveMaster }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isSortMode, setIsSortMode] = useState(false);
  
  const filtered = isSortMode 
    ? procedures 
    : procedures.filter((p: Procedure) => 
        p.title.toLowerCase().includes(search.toLowerCase()) || 
        p.category.toLowerCase().includes(search.toLowerCase())
      );

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
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 bg-white rounded-xl shadow-sm"><ArrowLeft size={20} /></button>
          <h2 className="text-xl font-black text-slate-800">手順書マニュアル</h2>
        </div>
        {user.role === UserRole.MENTOR && (
          <button 
            onClick={() => { setIsSortMode(!isSortMode); setSearch(''); }} 
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${isSortMode ? 'bg-teal-600 text-white shadow-lg' : 'bg-white text-slate-400 shadow-sm'}`}
          >
            <ArrowDownUp size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">{isSortMode ? '完了' : '順序'}</span>
          </button>
        )}
      </div>

      {!isSortMode && (
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
              <button 
                onClick={() => !isSortMode && navigate(`/procedures/${p.id}`)} 
                className={`flex-1 bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between group transition-all ${isSortMode ? 'opacity-90' : 'active:scale-[0.98]'}`}
              >
                <div className="flex items-center gap-4 text-left">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isSortMode ? 'bg-teal-50 text-teal-600' : 'bg-blue-50 text-blue-600'}`}><BookOpen size={20} /></div>
                  <div className="max-w-[180px]">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{p.category}</span>
                    <p className="font-black text-slate-800 text-sm leading-tight truncate">{p.title}</p>
                  </div>
                </div>
                {!isSortMode && <ChevronRight size={18} className="text-slate-300 group-hover:text-teal-600 transition-colors" />}
              </button>
            </div>
          );
        })}
      </div>
      
      {!isSortMode && user.role === UserRole.MENTOR && (
        <button onClick={() => navigate('/procedures/new')} className="fixed bottom-24 right-6 w-14 h-14 bg-teal-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 border-4 border-white active:scale-95 transition-all"><Plus size={28} /></button>
      )}
    </div>
  );
};

// --- Skill Map Page ---
const SkillMapPage: React.FC<any> = ({ user, skills, allProgress, allUsers, onUpdate, onSaveSkill, onDeleteSkill, onSaveMaster }) => {
  const { userId } = useParams();
  const navigate = useNavigate();
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
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-teal-600 font-black text-xl">
            {targetUser.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">{targetUser.name}</h2>
            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black text-white ${rank.color} inline-block`}>{rank.label}</div>
          </div>
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
                <div>
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{skill.category}</span>
                  <p className="font-black text-slate-800 text-sm">{skill.name}</p>
                </div>
                {user.role === UserRole.MENTOR && (
                  <button onClick={() => setEditingId(editingId === skill.id ? null : skill.id)} className="p-2 bg-slate-50 rounded-xl text-slate-400">
                    <Edit2 size={14} />
                  </button>
                )}
              </div>
              <div className="mt-3 flex gap-1">
                {[1, 2, 3].map(l => (
                  <div key={l} className={`h-1.5 flex-1 rounded-full ${l <= level ? 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.3)]' : 'bg-slate-100'}`} />
                ))}
              </div>
              {editingId === skill.id && (
                <div className="mt-4 grid grid-cols-4 gap-2 animate-in zoom-in-95">
                  {[0, 1, 2, 3].map(l => (
                    <button 
                      key={l} 
                      onClick={() => { onUpdate(targetId, skill.id, { level: l }); setEditingId(null); }} 
                      className={`py-2 rounded-xl text-[8px] font-black ${level === l ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}
                    >
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

// --- Q&A Page ---
const QAPage: React.FC<any> = ({ qaList, user, onSave, onDelete }) => {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingQA, setEditingQA] = useState<QA | null>(null);
  const filtered = qaList.filter((q: QA) => q.question.toLowerCase().includes(search.toLowerCase()) || q.answer.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 space-y-6 pb-32 animate-in fade-in">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-black text-slate-800">院内ナレッジQ&A</h2>
        <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full">
          <UsersIcon size={12} />
          <span className="text-[8px] font-black uppercase">Shared</span>
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        <input 
          type="text" 
          placeholder="検索..." 
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[24px] text-sm font-bold outline-none shadow-sm" 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
      </div>
      <div className="space-y-4">
        {filtered.map((q: QA) => (
          <div key={q.id} className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex justify-between items-start p-5">
              <button onClick={() => setExpandedId(expandedId === q.id ? null : q.id)} className="flex-1 text-left flex gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">Q</div>
                <p className="font-black text-slate-800 text-sm leading-snug">{q.question}</p>
              </button>
              {user.role === UserRole.MENTOR && (
                <div className="flex gap-2">
                  <button onClick={() => setEditingQA(q)} className="p-1.5 text-slate-300 hover:text-amber-500"><Edit2 size={16} /></button>
                  <button onClick={() => { if(window.confirm('削除しますか？')) onDelete(q.id); }} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              )}
            </div>
            {expandedId === q.id && (
              <div className="px-5 pb-6 animate-in slide-in-from-top-2">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">A</div>
                  <div className="bg-slate-50 p-4 rounded-2xl flex-1 text-sm font-bold text-slate-600 leading-relaxed whitespace-pre-wrap">{q.answer}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {user.role === UserRole.MENTOR && (
        <button onClick={() => setEditingQA({ id: `qa_${Date.now()}`, question: '', answer: '', tags: [] })} className="fixed bottom-24 right-6 w-14 h-14 bg-amber-500 text-white rounded-full shadow-2xl flex items-center justify-center z-40 border-4 border-white active:scale-95 transition-all"><Plus size={28} /></button>
      )}
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

// --- Procedure Detail / Edit Components (Omitted for brevity, kept essential ones) ---

const ProcedureDetailPage: React.FC<any> = ({ procedures, onDelete }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const procedure = procedures.find((p: Procedure) => p.id === id);
  if (!procedure) return <div className="p-8 text-center font-black text-slate-400">手順が見つかりません</div>;

  return (
    <div className="p-4 space-y-6 pb-24 animate-in slide-in-from-right-10 duration-500">
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
      <div className="space-y-4 pt-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ステップ解説</h3>
        {(procedure.steps || []).map((step: string, i: number) => (
          <div key={i} className="bg-white p-5 rounded-[24px] border border-slate-100 flex gap-4 items-start shadow-sm">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">{i+1}</div>
            <p className="text-sm font-bold text-slate-700 leading-relaxed">{step}</p>
          </div>
        ))}
      </div>
      {procedure.tips && (
        <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100 flex gap-4 items-start">
          <div className="p-2 bg-white rounded-xl text-emerald-600 shadow-sm"><CheckCircle2 size={18} /></div>
          <div><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Clinic Tips</p><p className="text-sm font-bold text-emerald-800 leading-relaxed">{procedure.tips}</p></div>
        </div>
      )}
    </div>
  );
};

const ProcedureEditPage: React.FC<any> = ({ procedures, onSave }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const existing = procedures.find((p: Procedure) => p.id === id);

  const [form, setForm] = useState<{
    title: string;
    category: string;
    steps: { id: string; text: string }[];
    tips: string;
    id?: string;
  }>(() => {
    if (existing) {
      return {
        ...existing,
        steps: (existing.steps || []).map((s: string) => ({ id: Math.random().toString(36).substr(2, 9), text: s }))
      };
    }
    return { title: '', category: '基本準備', steps: [{ id: 'init', text: '' }], tips: '' };
  });

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...form.steps];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newSteps.length) return;
    [newSteps[index], newSteps[target]] = [newSteps[target], newSteps[index]];
    setForm({ ...form, steps: newSteps });
  };

  const handleSubmit = () => { 
    if(!form.title) return alert('タイトルを入力してください'); 
    const dataToSave = {
      ...form,
      id: form.id || `p_${Date.now()}`,
      steps: form.steps.map(s => s.text)
    };
    onSave(dataToSave); 
    navigate('/procedures'); 
  };

  return (
    <div className="p-4 space-y-6 pb-32 animate-in slide-in-from-bottom-5">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm"><X size={20} /></button>
        <h2 className="text-lg font-black text-slate-800">{isNew ? '手順を新規作成' : '手順を編集'}</h2>
        <button onClick={handleSubmit} className="p-2 bg-teal-600 text-white rounded-xl shadow-md active:scale-95 transition-all"><Save size={20} /></button>
      </div>
      
      <div className="space-y-6">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase px-1">基本情報</label>
          <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="手順タイトル" className="w-full p-4 bg-white border border-slate-100 rounded-2xl font-bold outline-none shadow-sm focus:border-teal-500 transition-all" />
          <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="カテゴリ" className="w-full p-4 bg-white border border-slate-100 rounded-2xl font-bold outline-none shadow-sm focus:border-teal-500 transition-all" />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-400 uppercase px-1 flex items-center gap-2"><ArrowDownUp size={12} /> ステップ解説</label>
          <div className="space-y-4">
            {form.steps.map((step, i) => (
              <div key={step.id} className="flex gap-2 items-stretch transition-all duration-300">
                <div className="flex flex-col w-12 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden shrink-0">
                  <button disabled={i === 0} onClick={() => moveStep(i, 'up')} className={`flex-1 flex items-center justify-center ${i === 0 ? 'text-slate-200' : 'text-teal-600 active:bg-teal-50'}`}><ChevronUp size={20} /></button>
                  <div className="bg-slate-50 flex items-center justify-center py-1 font-black text-[10px] text-slate-400">{i + 1}</div>
                  <button disabled={i === form.steps.length - 1} onClick={() => moveStep(i, 'down')} className={`flex-1 flex items-center justify-center ${i === form.steps.length - 1 ? 'text-slate-200' : 'text-teal-600 active:bg-teal-50'}`}><ChevronDown size={20} /></button>
                </div>
                <div className="flex-1 bg-white border border-slate-100 rounded-[28px] shadow-sm flex flex-col overflow-hidden">
                  <div className="bg-slate-50 px-4 py-1.5 flex justify-between items-center">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Description</span>
                    <button onClick={() => setForm({...form, steps: form.steps.filter((_, idx) => idx !== i)})} className="text-slate-200 hover:text-red-500"><Trash2 size={14}/></button>
                  </div>
                  <textarea 
                    value={step.text} 
                    onChange={(e) => {
                      const newSteps = [...form.steps];
                      newSteps[i].text = e.target.value;
                      setForm({...form, steps: newSteps});
                    }} 
                    placeholder={`ステップ${i + 1}の内容を入力...`} 
                    className="w-full p-4 bg-transparent border-none outline-none font-bold text-sm min-h-[90px] resize-none leading-relaxed" 
                  />
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setForm({...form, steps: [...form.steps, { id: Math.random().toString(36).substr(2, 9), text: '' }]})} 
            className="w-full py-4 border-2 border-dashed border-slate-100 rounded-[28px] text-[10px] font-black text-teal-600 uppercase tracking-widest hover:bg-white hover:border-teal-200 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} /> ステップを追加
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Container ---

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
    const unsubMemo = onSnapshot(doc(db, 'memos', user.id), snap => {
      if (snap.exists()) setMemoData(snap.data().entries || {});
    });
    return () => unsubMemo();
  }, [user]);

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
    try {
      await setDoc(doc(db, 'clinic_data', user?.clinicId || 'c1'), { [key]: list }, { merge: true });
    } catch (err) { alert("保存に失敗しました。"); }
    finally { setIsSaving(false); }
  };

  const handleSaveMemo = async (date: string, content: string) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const newMemoData = { ...memoData, [date]: content };
      setMemoData(newMemoData);
      await setDoc(doc(db, 'memos', user.id), { entries: newMemoData }, { merge: true });
    } catch (err) { alert("保存に失敗しました。"); }
    finally { setIsSaving(false); }
  };

  if (!user && location.pathname !== '/login') return (
    <div className="p-8 flex flex-col items-center justify-center min-h-screen space-y-8 animate-in fade-in">
      <div className="text-center space-y-2"><div className="w-20 h-20 bg-teal-600 rounded-[24px] mx-auto flex items-center justify-center shadow-2xl"><ClipboardList size={40} className="text-white" /></div><h2 className="text-2xl font-black text-slate-800 tracking-tight">なないろアプリ</h2><p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">{DEFAULT_CLINIC_NAME}</p></div>
      <div className="w-full space-y-3 max-w-sm">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Login as:</p>
        {allUsers.map(u => <button key={u.id} onClick={() => { setUser(u); localStorage.setItem(APP_STORAGE_KEYS.LOGGED_USER, JSON.stringify(u)); navigate('/'); }} className="w-full p-5 bg-white border border-slate-100 rounded-[28px] flex justify-between items-center shadow-sm active:scale-95 transition-all"><span className="font-black text-slate-700">{u.name}</span><ChevronRight size={18} className="text-slate-200" /></button>)}
      </div>
    </div>
  );

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
          <Route path="/skills" element={<SkillMapPage user={user!} skills={skills} allProgress={allSkillProgress} allUsers={allUsers} onUpdate={handleUpdateProgress} />} />
          <Route path="/skills/:userId" element={<SkillMapPage user={user!} skills={skills} allProgress={allSkillProgress} allUsers={allUsers} onUpdate={handleUpdateProgress} />} />
          <Route path="/qa" element={<QAPage qaList={qaList} user={user!} onSave={(q: QA) => handleSaveMaster('qa', qaList.some(oq => oq.id === q.id) ? qaList.map(oq => oq.id === q.id ? q : oq) : [...qaList, q])} onDelete={(id: string) => handleSaveMaster('qa', qaList.filter(q => q.id !== id))} />} />
          <Route path="/profile" element={<div className="p-8 text-center"><div className="w-24 h-24 bg-teal-50 text-teal-600 rounded-[32px] mx-auto mb-6 flex items-center justify-center"><UserIcon size={40} /></div><h2 className="text-xl font-black mb-6">{user?.name}</h2><button onClick={() => { setUser(null); localStorage.removeItem(APP_STORAGE_KEYS.LOGGED_USER); navigate('/login'); }} className="px-6 py-4 w-full bg-red-50 text-red-500 rounded-2xl font-black active:scale-95 transition-all">Logout</button></div>} />
        </Routes>
      </main>
      {user && <Navigation />}
      {isSaving && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-[9px] font-black tracking-widest flex items-center gap-3 z-[60] animate-in slide-in-from-bottom-2 shadow-2xl"><PartyPopper size={14} className="text-emerald-400" /> CLOUD SYNCED</div>}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
