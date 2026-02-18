
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

const formatEmbedUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith('data:')) return ""; 
  if (url.includes('youtube.com/embed')) return url;
  if (url.includes('youtube.com/watch?v=')) {
    const id = url.split('v=')[1]?.split('&')[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  return url;
};

const compressImage = (file: File, maxWidth = 1200, quality = 0.6): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width *= maxWidth / height;
            height = maxWidth;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Canvas context is null"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
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

  const entriesThisMonth = useMemo(() => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return Object.keys(memoData).filter(k => k.startsWith(prefix)).length;
  }, [memoData]);

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
          <button 
            onClick={() => navigate('/memo-calendar')} 
            className="flex items-center gap-2 text-[10px] font-black text-teal-600 hover:opacity-70 bg-teal-50 px-4 py-2 rounded-full shadow-sm"
          >
            <CalendarDays size={14} /> 全て見る
          </button>
        </div>

        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><StickyNote size={18} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Today's Log</p>
                <p className="text-xs font-black text-slate-800">{formatDisplayDate(today)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase">Monthly</p>
              <p className="text-xs font-black text-teal-600">{entriesThisMonth} entries</p>
            </div>
          </div>
          
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
            className="w-full py-3.5 bg-teal-600 text-white text-[11px] font-black rounded-full hover:bg-teal-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-100 active:scale-95"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} クラウドに同期
          </button>
        </div>
      </section>
    </div>
  );
};

// --- Calendar Component ---
const CalendarPage: React.FC<any> = ({ memoData, onSaveMemo, isSaving }) => {
  const navigate = useNavigate();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [memoDraft, setMemoDraft] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  useEffect(() => {
    setMemoDraft(memoData[selectedDate] || '');
  }, [selectedDate, memoData]);

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, dateStr });
    }
    return days;
  }, [year, month, startDay, daysInMonth]);

  const recentEntries = useMemo(() => {
    return Object.entries(memoData)
      .filter(([_, content]) => (content as string).trim().length > 0)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 5);
  }, [memoData]);

  const changeMonth = (offset: number) => {
    setViewDate(new Date(year, month + offset, 1));
  };

  const jumpToToday = () => {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(getTodayStr());
    editorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="p-4 space-y-6 pb-32 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 bg-white rounded-xl shadow-sm"><ArrowLeft size={20} /></button>
          <h2 className="text-xl font-black text-slate-800">振り返りカレンダー</h2>
        </div>
        <button 
          onClick={jumpToToday}
          className="px-4 py-2 bg-white text-[10px] font-black text-teal-600 rounded-full border border-teal-100 shadow-sm active:scale-95 transition-all"
        >
          今日に戻る
        </button>
      </div>

      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-black text-slate-800 text-lg">{year}年 {month + 1}月</h3>
          <div className="flex gap-1">
            <button onClick={() => changeMonth(-1)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 active:scale-90 transition-all"><ChevronLeft size={18}/></button>
            <button onClick={() => changeMonth(1)} className="p-2 bg-slate-50 text-slate-400 rounded-xl rotate-180 hover:bg-slate-100 active:scale-90 transition-all"><ChevronLeft size={18}/></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {['日','月','火','水','木','金','土'].map((d, i) => (
            <div key={d} className={`text-[10px] font-black py-2 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-300'}`}>{d}</div>
          ))}
          {calendarDays.map((d, i) => (
            <div key={i} className="aspect-square flex flex-col items-center justify-center relative p-0.5">
              {d && (
                <button 
                  onClick={() => {
                    setSelectedDate(d.dateStr);
                    editorRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`w-full h-full rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 relative overflow-hidden
                    ${selectedDate === d.dateStr 
                      ? 'bg-teal-600 text-white shadow-lg shadow-teal-200 scale-110 z-10' 
                      : memoData[d.dateStr] 
                        ? 'bg-teal-50 text-teal-700 border border-teal-100' 
                        : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  {d.day}
                  {memoData[d.dateStr] && selectedDate !== d.dateStr && (
                    <div className="w-1 h-1 rounded-full bg-teal-400 absolute bottom-1.5" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div ref={editorRef} className="space-y-4 animate-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[11px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest">
            <StickyNote size={14} className="text-teal-600" /> {formatDisplayDate(selectedDate)} のメモ
          </h3>
        </div>
        <div className="bg-amber-50 rounded-[32px] p-6 border border-amber-100 shadow-sm space-y-4">
          <textarea 
            value={memoDraft} 
            onChange={(e) => setMemoDraft(e.target.value)} 
            placeholder="この日の気づきや学びを入力..." 
            className="w-full bg-transparent border-none outline-none text-sm text-amber-950 min-h-[140px] font-bold leading-relaxed resize-none placeholder:text-amber-200" 
          />
          <button 
            onClick={() => onSaveMemo(selectedDate, memoDraft)} 
            className="w-full py-4 bg-amber-200 text-amber-900 text-[11px] font-black rounded-full hover:bg-amber-300 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} 内容を更新して保存
          </button>
        </div>
      </div>

      {recentEntries.length > 0 && (
        <div className="space-y-4 pt-4 pb-8">
          <h3 className="text-[11px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest px-2">
            <History size={14} className="text-teal-600" /> 直近のログ
          </h3>
          <div className="space-y-3">
            {recentEntries.map(([date, content]) => (
              <button 
                key={date}
                onClick={() => {
                  setSelectedDate(date);
                  const d = new Date(date);
                  setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
                  editorRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm text-left active:scale-[0.98] transition-all"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{formatDisplayDate(date)}</span>
                  <ChevronRight size={14} className="text-slate-300" />
                </div>
                <p className="text-xs font-bold text-slate-600 line-clamp-2 leading-relaxed">{(content as string)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Procedures List with Sort Mode ---
const ProceduresPage: React.FC<any> = ({ procedures, user, onSaveMaster }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isSortMode, setIsSortMode] = useState(false);
  const isMentor = user.role === UserRole.MENTOR;
  
  // ソートモード時は全件表示して正確な入れ替えを可能にする
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
    <div className="p-4 space-y-6 pb-32 animate-in fade-in relative min-h-full">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 bg-white rounded-xl shadow-sm"><ArrowLeft size={20} /></button>
          <h2 className="text-xl font-black text-slate-800">手順書マニュアル</h2>
        </div>
        {isMentor && (
          <button 
            onClick={() => {
              setIsSortMode(!isSortMode);
              if (!isSortMode) setSearch('');
            }} 
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${isSortMode ? 'bg-teal-600 text-white shadow-lg' : 'bg-white text-slate-400 shadow-sm'}`}
          >
            <ArrowDownUp size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">{isSortMode ? '完了' : '並べ替え'}</span>
          </button>
        )}
      </div>

      {!isSortMode && (
        <div className="relative animate-in zoom-in-95">
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

      {isSortMode && (
        <div className="bg-teal-50 border border-teal-100 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
          <GripVertical size={16} className="text-teal-600" />
          <p className="text-[10px] font-black text-teal-800 uppercase tracking-widest">ドラッグは非対応です。矢印で順序を変更してください。</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((p: Procedure, idx: number) => {
          const originalIdx = isSortMode ? idx : procedures.findIndex(item => item.id === p.id);
          return (
            <div key={p.id} className="flex gap-2 items-stretch animate-in slide-in-from-left-2 transition-all">
              {isSortMode && (
                <div className="flex flex-col gap-1 pr-1 bg-white/50 rounded-xl">
                  <button 
                    disabled={originalIdx === 0} 
                    onClick={() => moveProcedure(originalIdx, 'up')} 
                    className={`p-2 rounded-xl flex-1 flex items-center justify-center transition-all ${originalIdx === 0 ? 'text-slate-100' : 'text-teal-600 bg-white shadow-sm hover:bg-teal-50 active:scale-90'}`}
                  >
                    <ChevronUp size={20} />
                  </button>
                  <button 
                    disabled={originalIdx === procedures.length - 1} 
                    onClick={() => moveProcedure(originalIdx, 'down')} 
                    className={`p-2 rounded-xl flex-1 flex items-center justify-center transition-all ${originalIdx === procedures.length - 1 ? 'text-slate-100' : 'text-teal-600 bg-white shadow-sm hover:bg-teal-50 active:scale-90'}`}
                  >
                    <ChevronDown size={20} />
                  </button>
                </div>
              )}
              <button 
                onClick={() => !isSortMode && navigate(`/procedures/${p.id}`)} 
                className={`flex-1 bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between group transition-all ${isSortMode ? 'opacity-90' : 'active:scale-[0.98]'}`}
              >
                <div className="flex items-center gap-4 text-left">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isSortMode ? 'bg-teal-50 text-teal-600' : 'bg-blue-50 text-blue-600'}`}>
                    <BookOpen size={20} />
                  </div>
                  <div className="max-w-[180px]">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{p.category}</span>
                    <p className="font-black text-slate-800 text-sm leading-tight truncate">{p.title}</p>
                  </div>
                </div>
                {!isSortMode && <div className="p-2 bg-slate-50 rounded-xl text-slate-300 group-hover:text-teal-600 transition-colors"><ChevronRight size={18} /></div>}
              </button>
            </div>
          );
        })}
      </div>
      
      {!isSortMode && isMentor && (
        <button 
          onClick={() => navigate('/procedures/new')} 
          className="fixed bottom-24 right-6 w-14 h-14 bg-teal-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-all z-40 border-4 border-white"
        >
          <Plus size={28} />
        </button>
      )}
    </div>
  );
};

// --- Procedure Edit with Improved Sorting UI ---
const ProcedureEditPage: React.FC<any> = ({ procedures, onSave }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const existing = procedures.find((p: Procedure) => p.id === id);

  // 編集画面内でのステップ管理（ID付与で並べ替えバグを防止）
  const [form, setForm] = useState<{
    title: string;
    category: string;
    steps: { id: string; text: string }[];
    tips: string;
    attachments: Attachment[];
    id?: string;
  }>(() => {
    if (existing) {
      return {
        ...existing,
        steps: (existing.steps || []).map((s: string) => ({ id: Math.random().toString(36).substr(2, 9), text: s }))
      };
    }
    return { title: '', category: '基本準備', steps: [{ id: 'init', text: '' }], tips: '', attachments: [] };
  });

  const [isReadingFile, setIsReadingFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeAttIdForUpload, setActiveAttIdForUpload] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeAttIdForUpload) return;
    setIsReadingFile(activeAttIdForUpload);
    try {
      const compressedBase64 = await compressImage(file, 1200, 0.6);
      setForm(prev => ({...prev, attachments: (prev.attachments || []).map(a => a.id === activeAttIdForUpload ? {...a, url: compressedBase64, name: file.name} : a)}));
    } catch (err) { alert("画像の読み込み・圧縮に失敗しました。"); } finally { setIsReadingFile(null); setActiveAttIdForUpload(null); }
  };

  const triggerFileUpload = (attId: string) => { setActiveAttIdForUpload(attId); fileInputRef.current?.click(); };
  const addAttachment = (type: 'video' | 'image' | 'pdf') => setForm(prev => ({ ...prev, attachments: [...(prev.attachments || []), { id: `att_${Date.now()}`, type, name: '', url: '' }] }));
  
  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...form.steps];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newSteps.length) return;
    [newSteps[index], newSteps[target]] = [newSteps[target], newSteps[index]];
    setForm({ ...form, steps: newSteps });
  };

  const updateStepText = (index: number, text: string) => {
    const newSteps = [...form.steps];
    newSteps[index].text = text;
    setForm({ ...form, steps: newSteps });
  };

  const removeStep = (index: number) => {
    if (form.steps.length <= 1) return;
    setForm({ ...form, steps: form.steps.filter((_, i) => i !== index) });
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
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf" />
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
          <label className="text-[10px] font-black text-slate-400 uppercase px-1 flex items-center gap-2">
            <ArrowDownUp size={12} /> ステップ解説（並べ替え対応）
          </label>
          <div className="space-y-4">
            {form.steps.map((step, i) => (
              <div key={step.id} className="flex gap-2 items-stretch animate-in slide-in-from-left-2 transition-all duration-300">
                {/* 並べ替えコントロール */}
                <div className="flex flex-col w-12 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden shrink-0">
                  <button 
                    disabled={i === 0} 
                    onClick={() => moveStep(i, 'up')} 
                    className={`flex-1 flex items-center justify-center transition-all ${i === 0 ? 'bg-slate-50 text-slate-200' : 'text-teal-600 hover:bg-teal-50 active:bg-teal-100'}`}
                  >
                    <ChevronUp size={20} />
                  </button>
                  <div className="h-px bg-slate-50" />
                  <div className="bg-slate-50 flex items-center justify-center py-1 font-black text-[10px] text-slate-400">
                    {i + 1}
                  </div>
                  <div className="h-px bg-slate-50" />
                  <button 
                    disabled={i === form.steps.length - 1} 
                    onClick={() => moveStep(i, 'down')} 
                    className={`flex-1 flex items-center justify-center transition-all ${i === form.steps.length - 1 ? 'bg-slate-50 text-slate-200' : 'text-teal-600 hover:bg-teal-50 active:bg-teal-100'}`}
                  >
                    <ChevronDown size={20} />
                  </button>
                </div>

                {/* 内容入力エリア */}
                <div className="flex-1 bg-white border border-slate-100 rounded-[28px] shadow-sm flex flex-col overflow-hidden">
                  <div className="bg-slate-50 px-4 py-1.5 flex justify-between items-center">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Description</span>
                    <button onClick={() => removeStep(i)} className="text-slate-200 hover:text-red-500 transition-colors p-1">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                  <textarea 
                    value={step.text} 
                    onChange={(e) => updateStepText(i, e.target.value)} 
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
            <Plus size={16} /> 新しいステップを追加
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase px-1">参考資料・チップス</label>
          <textarea 
            value={form.tips} 
            onChange={e => setForm({...form, tips: e.target.value})} 
            placeholder="コツや注意点、よくあるミスなど..." 
            className="w-full p-4 bg-emerald-50 border-none rounded-2xl font-bold text-sm min-h-[100px] resize-none text-emerald-900 placeholder:text-emerald-300" 
          />
          <div className="space-y-3 mt-4">
            {(form.attachments || []).map((att) => (
              <div key={att.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex justify-between items-center"><span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase bg-teal-50 text-teal-600">{att.type}</span><button onClick={() => setForm(prev => ({...prev, attachments: (prev.attachments || []).filter(a => a.id !== att.id)}))} className="text-slate-200 hover:text-red-500"><Trash2 size={14}/></button></div>
                <input value={att.name} onChange={e => setForm(prev => ({...prev, attachments: (prev.attachments || []).map(a => a.id === att.id ? {...a, name: e.target.value} : a)}))} placeholder="タイトル" className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold outline-none" />
                <div className="flex gap-2"><input value={att.url} onChange={e => setForm(prev => ({...prev, attachments: (prev.attachments || []).map(a => a.id === att.id ? {...a, url: e.target.value} : a)}))} placeholder="URL or Base64" className="flex-1 p-2 bg-slate-50 rounded-xl text-[8px] font-bold outline-none font-mono truncate" />{att.type !== 'video' && (<button onClick={() => triggerFileUpload(att.id)} className="p-2 bg-teal-50 text-teal-600 rounded-xl active:scale-95 transition-all">{isReadingFile === att.id ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={18} />}</button>)}</div>
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => addAttachment('image')} className="flex flex-col items-center gap-1 p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-teal-600 active:scale-95 transition-all"><ImageIcon size={20} /><span className="text-[8px] font-black">IMAGE</span></button>
              <button onClick={() => addAttachment('pdf')} className="flex flex-col items-center gap-1 p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-teal-600 active:scale-95 transition-all"><FileUp size={20} /><span className="text-[8px] font-black">PDF</span></button>
              <button onClick={() => addAttachment('video')} className="flex flex-col items-center gap-1 p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-teal-600 active:scale-95 transition-all"><PlayCircle size={20} /><span className="text-[8px] font-black">YOUTUBE</span></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const QAPage: React.FC<any> = ({ qaList, user, onSave, onDelete }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingQA, setEditingQA] = useState<QA | null>(null);
  const filtered = qaList.filter((q: QA) => q.question.toLowerCase().includes(search.toLowerCase()) || q.answer.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="p-4 space-y-6 pb-32 animate-in fade-in">
      <div className="flex justify-between items-center px-1"><h2 className="text-xl font-black text-slate-800">院内ナレッジQ&A</h2><div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full"><UsersIcon size={12} /><span className="text-[8px] font-black uppercase">Shared</span></div></div>
      <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input type="text" placeholder="検索..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[24px] text-sm font-bold outline-none shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <div className="space-y-4">
        {filtered.map((q: QA) => (
          <div key={q.id} className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex justify-between items-start p-5"><button onClick={() => setExpandedId(expandedId === q.id ? null : q.id)} className="flex-1 text-left flex gap-4"><div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">Q</div><p className="font-black text-slate-800 text-sm">{q.question}</p></button><div className="flex gap-2"><button onClick={() => setEditingQA(q)} className="p-1.5 text-slate-300 hover:text-amber-500 transition-colors"><Edit2 size={16} /></button><button onClick={() => { if(window.confirm('削除しますか？')) onDelete(q.id); }} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button></div></div>
            {expandedId === q.id && (<div className="px-5 pb-6 animate-in slide-in-from-top-2"><div className="flex gap-4"><div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">A</div><div className="bg-slate-50 p-4 rounded-2xl flex-1 text-sm font-bold text-slate-600 leading-relaxed">{q.answer}</div></div></div>)}
          </div>
        ))}
      </div>
      <button onClick={() => setEditingQA({ id: `qa_${Date.now()}`, question: '', answer: '', tags: [] })} className="fixed bottom-24 right-6 w-14 h-14 bg-amber-500 text-white rounded-full shadow-2xl flex items-center justify-center z-40 border-4 border-white active:scale-95 transition-all"><Plus size={28} /></button>
      {editingQA && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] p-4 flex items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 space-y-4 animate-in zoom-in-95">
            <h3 className="font-black text-lg text-slate-800">共有</h3>
            <textarea placeholder="質問" value={editingQA.question} onChange={e => setEditingQA({...editingQA, question: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm h-24 resize-none" />
            <textarea placeholder="回答" value={editingQA.answer} onChange={e => setEditingQA({...editingQA, answer: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm h-32 resize-none" />
            <div className="flex gap-2 pt-2"><button onClick={() => setEditingQA(null)} className="flex-1 py-4 text-slate-400 font-black text-sm">キャンセル</button><button onClick={() => { onSave(editingQA); setEditingQA(null); }} className="flex-1 py-4 bg-teal-600 text-white rounded-2xl font-black text-sm">保存</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

const SkillMapPage: React.FC<any> = ({ user, skills, allProgress, allUsers, onUpdate, onSaveSkill, onDeleteSkill, onSaveMaster }) => {
  const { userId } = useParams();
  const targetId = userId || user.id;
  const targetUser = allUsers.find((u:any) => u.id === targetId) || user;
  const progressData = allProgress[targetId] || [];
  const stats = calculateProgress(skills, progressData);
  const rank = getRankInfo(stats);
  const [editingProgressId, setEditingProgressId] = useState<string | null>(null);
  const [isManagingMaster, setIsManagingMaster] = useState(false);
  const [editingMasterSkill, setEditingMasterSkill] = useState<Skill | null>(null);
  
  const moveSkill = (index: number, direction: 'up' | 'down') => {
    const newSkills = [...skills];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= skills.length) return;
    [newSkills[index], newSkills[targetIndex]] = [newSkills[targetIndex], newSkills[index]];
    onSaveMaster('skills', newSkills);
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in">
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-teal-600 font-black text-xl">{targetUser.name.charAt(0)}</div><div><h2 className="text-lg font-black text-slate-800">{targetUser.name}</h2><div className={`px-2 py-0.5 rounded-full text-[8px] font-black text-white ${rank.color} inline-block`}>{rank.label}</div></div></div><div className="flex items-center gap-4"><div className="text-2xl font-black text-teal-600">{stats}%</div>{user.role === UserRole.MENTOR && (<button onClick={() => setIsManagingMaster(!isManagingMaster)} className={`p-2 rounded-xl transition-all ${isManagingMaster ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Settings size={18} /></button>)}</div></div>
      <div className="space-y-4">
        {skills.map((skill: Skill, index: number) => {
          const p = progressData.find((sp: any) => sp.skillId === skill.id);
          const level = p?.level || 0;
          return (
            <div key={skill.id} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm transition-all duration-300"><div className="flex justify-between items-center"><div><span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{skill.category}</span><p className="font-black text-slate-800 text-sm">{skill.name}</p></div><div className="flex gap-1 items-center">{isManagingMaster ? (<div className="flex gap-1 items-center"><div className="flex flex-col gap-1 mr-2 border-r border-slate-100 pr-2"><button onClick={() => moveSkill(index, 'up')} className="p-1 text-teal-500 bg-teal-50 rounded-md"><ChevronUp size={14} /></button><button onClick={() => moveSkill(index, 'down')} className="p-1 text-teal-500 bg-teal-50 rounded-md"><ChevronDown size={14} /></button></div><button onClick={() => setEditingMasterSkill(skill)} className="p-2 text-slate-300 hover:text-teal-600"><Edit2 size={14} /></button><button onClick={() => onDeleteSkill(skill.id)} className="p-2 text-slate-200 hover:text-red-500"><Trash2 size={14} /></button></div>) : (user.role === UserRole.MENTOR && <button onClick={() => setEditingProgressId(editingProgressId === skill.id ? null : skill.id)} className="p-2 bg-slate-50 rounded-xl text-slate-400"><Edit2 size={14} /></button>)}</div></div><div className="mt-3 flex gap-1">{[1, 2, 3].map(l => (<div key={l} className={`h-1.5 flex-1 rounded-full ${l <= level ? 'bg-teal-500' : 'bg-slate-100'}`} />))}</div>{editingProgressId === skill.id && !isManagingMaster && (<div className="mt-4 grid grid-cols-4 gap-2 animate-in zoom-in-95">{[0, 1, 2, 3].map(l => (<button key={l} onClick={() => { onUpdate(targetId, skill.id, { level: l }); setEditingProgressId(null); }} className={`py-2 rounded-xl text-[8px] font-black ${level === l ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>{SkillLevelLabels[l as SkillLevel]}</button>))}</div>)}</div>
          );
        })}
      </div>
      {isManagingMaster && <button onClick={() => setEditingMasterSkill({ id: `s_${Date.now()}`, name: '', category: '基本' })} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"><Plus size={16} /> 追加</button>}
      {editingMasterSkill && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] p-4 flex items-center justify-center"><div className="bg-white w-full max-w-sm rounded-[40px] p-8 space-y-4 animate-in zoom-in-95"><h3 className="font-black text-lg text-slate-800">マスター項目の編集</h3><input type="text" value={editingMasterSkill.name} onChange={e => setEditingMasterSkill({...editingMasterSkill, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" placeholder="項目名"/><input type="text" value={editingMasterSkill.category} onChange={e => setEditingMasterSkill({...editingMasterSkill, category: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" placeholder="カテゴリ"/><div className="flex gap-2"><button onClick={() => setEditingMasterSkill(null)} className="flex-1 py-4 text-slate-400 font-black text-sm">キャンセル</button><button onClick={() => { onSaveSkill(editingMasterSkill); setEditingMasterSkill(null); }} className="flex-1 py-4 bg-teal-600 text-white rounded-2xl font-black text-sm">保存</button></div></div></div>)}
    </div>
  );
};

const ProfilePage: React.FC<{ user: User; allUsers: User[]; onDeleteUser: (id: string) => void; onLogout: () => void }> = ({ user, allUsers, onDeleteUser, onLogout }) => (
  <div className="p-8 space-y-8 pb-32 animate-in fade-in">
    <div className="text-center space-y-4"><div className="w-24 h-24 bg-teal-50 text-teal-600 rounded-[32px] mx-auto flex items-center justify-center shadow-inner border-2 border-white"><UserIcon size={40} /></div><div><h2 className="text-2xl font-black text-slate-800">{user.name}</h2><p className="text-xs font-black text-slate-300 uppercase tracking-widest mt-1">{user.role}</p></div></div>
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm text-left space-y-4"><div className="flex justify-between items-center pb-4 border-b border-slate-50"><span className="text-[10px] font-black text-slate-400 uppercase">Clinic</span><span className="text-sm font-black text-slate-800">{DEFAULT_CLINIC_NAME}</span></div><div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase">Version</span><span className="text-xs font-black text-teal-600">v2.5.0 SmoothSort</span></div></div>
    <button onClick={onLogout} className="w-full py-5 bg-red-50 text-red-500 rounded-[28px] font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">ログアウト</button>
  </div>
);

const LoginPage: React.FC<any> = ({ users, onLogin, onCreateUser }) => {
  const [mode, setMode] = useState<'select' | 'auth' | 'create'>('select');
  const [selected, setSelected] = useState<User | null>(null);
  const [pass, setPass] = useState('');
  const [newName, setNewName] = useState('');
  const [newPass, setNewPass] = useState('');
  const [isError, setIsError] = useState(false);
  const handleLoginClick = () => { if (selected && pass === selected.password) onLogin(selected); else { setIsError(true); setTimeout(() => setIsError(false), 2000); } };
  const handleCreate = () => { if(!newName || !newPass) return alert('名前とパスワードを入力してください'); onCreateUser(newName, newPass); setMode('select'); setNewName(''); setNewPass(''); };
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[80vh] space-y-8 animate-in fade-in">
      <div className="text-center space-y-2"><div className="w-20 h-20 bg-teal-600 rounded-[24px] mx-auto flex items-center justify-center shadow-2xl"><ClipboardList size={40} className="text-white" /></div><h2 className="text-2xl font-black text-slate-800 tracking-tight">なないろアプリ</h2><p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">{DEFAULT_CLINIC_NAME}</p></div>
      {mode === 'select' && (<div className="w-full space-y-3"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">ユーザーを選択</p><div className="space-y-3 max-h-[40vh] overflow-y-auto no-scrollbar pb-4">{users.map((u:any) => (<button key={u.id} onClick={() => { setSelected(u); setMode('auth'); }} className="w-full p-5 bg-white border border-slate-100 rounded-[28px] flex justify-between items-center shadow-sm active:scale-95 transition-all"><span className="font-black text-slate-700">{u.name}</span><ChevronRight size={18} className="text-slate-200" /></button>))}</div><button onClick={() => setMode('create')} className="w-full py-4 border-2 border-dashed border-slate-200 text-slate-400 rounded-[28px] flex items-center justify-center gap-2 font-black text-xs active:scale-95 transition-all"><UserPlus size={16} /> スタッフ登録</button></div>)}
      {mode === 'auth' && selected && (<div className="w-full space-y-4 bg-white p-10 rounded-[40px] border border-slate-100 animate-in zoom-in-95"><div className="text-center mb-4"><div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-2 font-black text-xl">{selected.name.charAt(0)}</div><p className="text-sm font-black text-slate-700">{selected.name}</p></div><input type="password" value={pass} onChange={e => {setPass(e.target.value); setIsError(false);}} className={`w-full p-5 bg-slate-50 border-2 rounded-2xl text-center text-xl font-black outline-none transition-all ${isError ? 'border-red-400 bg-red-50' : 'border-transparent focus:border-teal-500'}`} placeholder="Password" autoFocus /><button onClick={handleLoginClick} className="w-full py-5 bg-teal-600 text-white rounded-2xl font-black active:scale-95 transition-all">ログイン</button><button onClick={() => {setMode('select'); setPass('');}} className="w-full text-[10px] text-slate-300 font-black uppercase tracking-widest pt-2">戻る</button></div>)}
      {mode === 'create' && (<div className="w-full space-y-4 bg-white p-10 rounded-[40px] border border-slate-100 animate-in zoom-in-95"><h3 className="text-center font-black text-slate-800 mb-4">登録</h3><input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="名前" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none" /><input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="パスワード" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none text-center" /><button onClick={handleCreate} className="w-full py-5 bg-teal-600 text-white rounded-2xl font-black active:scale-95 transition-all mt-4">作成</button><button onClick={() => setMode('select')} className="w-full text-[10px] text-slate-300 font-black uppercase tracking-widest pt-2">キャンセル</button></div>)}
    </div>
  );
};

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
  const [saveError, setSaveError] = useState<string | null>(null);

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
        else if (procedures.length === 0) setProcedures(MOCK_PROCEDURES);
        if (data.skills) setSkills(data.skills);
        else if (skills.length === 0) setSkills(MOCK_SKILLS);
        if (data.qa) setQaList(data.qa);
        else if (qaList.length === 0) setQaList(MOCK_QA);
      } else {
        setDoc(doc(db, 'clinic_data', clinicId), { users: INITIAL_USERS, procedures: MOCK_PROCEDURES, skills: MOCK_SKILLS, qa: MOCK_QA, allProgress: {} });
      }
      setIsSyncing(false);
    }, () => setIsSyncing(false));
    return () => unsubClinic();
  }, [user?.clinicId]);

  useEffect(() => {
    if (!user) return;
    const unsubMemo = onSnapshot(doc(db, 'memos', user.id), snap => {
      if (snap.exists()) setMemoData(snap.data().entries || {});
    });
    return () => unsubMemo();
  }, [user]);

  const handleCreateUser = async (name: string, pass: string) => {
    const newUser: User = { id: `u_${Date.now()}`, name, password: pass, role: UserRole.NEWBIE, clinicId: user?.clinicId || 'c1' };
    const nextUsers = [...allUsers, newUser];
    setAllUsers(nextUsers);
    await setDoc(doc(db, 'clinic_data', user?.clinicId || 'c1'), { users: nextUsers }, { merge: true });
  };

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
    setIsSaving(true); setSaveError(null);
    try {
      await setDoc(doc(db, 'clinic_data', user?.clinicId || 'c1'), { [key]: list }, { merge: true });
    } catch (err: any) {
      setSaveError("保存に失敗しました。容量制限の可能性があります。");
      setTimeout(() => setSaveError(null), 5000);
    } finally { setIsSaving(false); }
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

  if (!user && location.pathname !== '/login') return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 shadow-2xl relative flex flex-col font-sans border-x border-slate-100 overflow-hidden text-slate-900">
      <Header user={user} clinicName={DEFAULT_CLINIC_NAME} isSyncing={isSyncing} />
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <Routes>
          <Route path="/login" element={<LoginPage users={allUsers} onLogin={(u:User) => { setUser(u); localStorage.setItem(APP_STORAGE_KEYS.LOGGED_USER, JSON.stringify(u)); navigate('/'); }} onCreateUser={handleCreateUser} />} />
          <Route path="/" element={<DashboardPage user={user!} allProgress={allSkillProgress} skills={skills} allUsers={allUsers} clinicName={DEFAULT_CLINIC_NAME} memoData={memoData} onSaveMemo={handleSaveMemo} isSaving={isSaving} />} />
          <Route path="/memo-calendar" element={<CalendarPage memoData={memoData} onSaveMemo={handleSaveMemo} isSaving={isSaving} />} />
          <Route path="/procedures" element={<ProceduresPage procedures={procedures} user={user!} onSaveMaster={handleSaveMaster} />} />
          <Route path="/procedures/new" element={<ProcedureEditPage procedures={procedures} onSave={(p: Procedure) => handleSaveMaster('procedures', [...procedures, p])} />} />
          <Route path="/procedures/edit/:id" element={<ProcedureEditPage procedures={procedures} onSave={(p: Procedure) => handleSaveMaster('procedures', procedures.map(old => old.id === p.id ? p : old))} />} />
          <Route path="/procedures/:id" element={<ProcedureDetailPage procedures={procedures} onDelete={(id: string) => handleSaveMaster('procedures', procedures.filter(p => p.id !== id))} />} />
          <Route path="/skills" element={<SkillMapPage user={user!} skills={skills} allProgress={allSkillProgress} allUsers={allUsers} onUpdate={handleUpdateProgress} onSaveSkill={(s: Skill) => handleSaveMaster('skills', skills.some(os => os.id === s.id) ? skills.map(os => os.id === s.id ? s : os) : [...skills, s])} onDeleteSkill={(id: string) => handleSaveMaster('skills', skills.filter(s => s.id !== id))} onSaveMaster={handleSaveMaster} />} />
          <Route path="/skills/:userId" element={<SkillMapPage user={user!} skills={skills} allProgress={allSkillProgress} allUsers={allUsers} onUpdate={handleUpdateProgress} onSaveSkill={(s: Skill) => handleSaveMaster('skills', skills.some(os => os.id === s.id) ? skills.map(os => os.id === s.id ? s : os) : [...skills, s])} onDeleteSkill={(id: string) => handleSaveMaster('skills', skills.filter(s => s.id !== id))} onSaveMaster={handleSaveMaster} />} />
          <Route path="/qa" element={<QAPage qaList={qaList} user={user!} onSave={(q: QA) => handleSaveMaster('qa', qaList.some(oq => oq.id === q.id) ? qaList.map(oq => oq.id === q.id ? q : oq) : [...qaList, q])} onDelete={(id: string) => handleSaveMaster('qa', qaList.filter(q => q.id !== id))} />} />
          <Route path="/profile" element={<ProfilePage user={user!} allUsers={allUsers} onDeleteUser={() => {}} onLogout={() => { setUser(null); localStorage.removeItem(APP_STORAGE_KEYS.LOGGED_USER); navigate('/login'); }} />} />
        </Routes>
      </main>
      {user && <Navigation />}
      {isSaving && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-[9px] font-black tracking-widest flex items-center gap-3 z-[60] animate-in slide-in-from-bottom-2 shadow-2xl"><PartyPopper size={14} className="text-emerald-400" /> CLOUD SYNCED</div>}
      {saveError && <div className="fixed bottom-24 left-4 right-4 bg-red-600 text-white p-4 rounded-2xl text-xs font-black z-[60] flex items-center gap-3 animate-bounce shadow-xl"><AlertCircle size={20} /><span>{saveError}</span></div>}
    </div>
  );
};

const ProcedureDetailPage: React.FC<any> = ({ procedures, onDelete }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const procedure = procedures.find((p: Procedure) => p.id === id);
  if (!procedure) return <div>Not Found</div>;
  const renderAttachment = (att: Attachment) => {
    switch (att.type) {
      case 'video':
        const embedUrl = formatEmbedUrl(att.url);
        return (<div key={att.id} className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><PlayCircle size={12}/> {att.name}</p><div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-md border border-slate-100"><iframe src={embedUrl} title={att.name} className="w-full h-full" allowFullScreen /></div></div>);
      case 'image':
        return (<div key={att.id} className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><ImageIcon size={12}/> {att.name}</p><img src={att.url} alt={att.name} className="w-full rounded-2xl shadow-md border border-slate-100 object-cover max-h-[500px]" /></div>);
      case 'pdf':
        return (<a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 hover:bg-blue-100 transition-colors group"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-500 group-hover:scale-110 transition-transform"><FileText size={20} /></div><div className="text-left"><p className="text-xs font-black leading-tight">{att.name}</p><p className="text-[8px] font-bold opacity-60 uppercase mt-0.5">PDF Documents</p></div></div><FileDown size={18} className="opacity-40" /></a>);
      default: return null;
    }
  };
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
      {procedure.attachments && procedure.attachments.length > 0 && (<div className="space-y-6">{procedure.attachments.map(renderAttachment)}</div>)}
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

export default function App() { return ( <Router> <AppContent /> </Router> ); }
