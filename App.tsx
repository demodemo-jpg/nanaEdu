
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Info,
  ExternalLink,
  AlertCircle,
  Lock,
  Plus,
  Trash2,
  MoreVertical,
  X,
  Settings,
  Lightbulb,
  UserPlus,
  ShieldAlert,
  Calendar,
  History,
  Clock,
  ArrowUp,
  ArrowDown,
  FileText,
  ImageIcon,
  PlayCircle,
  FileDown,
  UploadCloud,
  FileUp,
  Loader2
} from 'lucide-react';

// Firebase integration
import { db } from './firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

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
  { id: 'u2', name: '鈴木 院長', role: UserRole.MENTOR, clinicId: 'c1', password: '1234' },
];

// --- Helpers ---
const getTodayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const formatDisplayDate = (dateStr: string) => {
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
            <StickyNote size={14} className="text-teal-600" /> 本日の学びログ
          </h3>
          <button 
            onClick={() => navigate('/memo-history')} 
            className="flex items-center gap-1 text-[10px] font-black text-teal-600 hover:opacity-70"
          >
            <History size={12} /> 過去の記録を見る
          </button>
        </div>
        <div className="bg-amber-50 rounded-[32px] p-6 border border-amber-100 shadow-sm space-y-4">
          <textarea 
            value={tempMemo} 
            onChange={(e) => setTempMemo(e.target.value)} 
            placeholder="今日学んだこと、気づいたことをメモ..." 
            className="w-full bg-transparent border-none outline-none text-sm text-amber-950 min-h-[140px] font-bold leading-relaxed resize-none" 
          />
          <button 
            onClick={() => onSaveMemo(today, tempMemo)} 
            className="w-full py-3 bg-amber-200 text-amber-900 text-[11px] font-black rounded-full hover:bg-amber-300 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} クラウドに保存して同期
          </button>
        </div>
      </section>
    </div>
  );
};

const MemoHistoryPage: React.FC<any> = ({ memoData }) => {
  const navigate = useNavigate();
  const sortedDates = Object.keys(memoData).sort().reverse();

  return (
    <div className="p-4 space-y-6 pb-24 animate-in slide-in-from-right-10 duration-500">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm"><ArrowLeft size={20} /></button>
        <h2 className="text-xl font-black text-slate-800">ラーニング・ログ履歴</h2>
      </div>

      {sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300 space-y-4">
          <Calendar size={48} strokeWidth={1} />
          <p className="font-black text-sm">まだ記録がありません</p>
        </div>
      ) : (
        <div className="space-y-6 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-100">
          {sortedDates.map((date) => (
            <div key={date} className="relative pl-10">
              <div className="absolute left-2.5 top-1 w-3.5 h-3.5 bg-white border-2 border-teal-500 rounded-full z-10" />
              <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                    {formatDisplayDate(date)}
                  </span>
                  <Clock size={12} className="text-slate-200" />
                </div>
                <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {memoData[date]}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ProceduresPage: React.FC<any> = ({ procedures, user }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const filtered = procedures.filter((p: Procedure) => p.title.includes(search) || p.category.includes(search));

  return (
    <div className="p-4 space-y-6 pb-32 animate-in fade-in relative min-h-full">
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
        {filtered.map((p: Procedure) => (
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

      {user.role === UserRole.MENTOR && (
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

const ProcedureDetailPage: React.FC<any> = ({ procedures, user, onDelete }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const procedure = procedures.find((p: Procedure) => p.id === id);

  if (!procedure) return <div>Not Found</div>;

  const renderAttachment = (att: Attachment) => {
    switch (att.type) {
      case 'video':
        const embedUrl = formatEmbedUrl(att.url);
        if (!embedUrl) {
           return (
             <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100">
               <div className="flex items-center gap-3">
                 <PlayCircle size={20} className="text-amber-500" />
                 <p className="text-xs font-black">{att.name || '動画ファイル'}</p>
               </div>
               <ExternalLink size={14} />
             </a>
           );
        }
        return (
          <div key={att.id} className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><PlayCircle size={12}/> {att.name}</p>
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-md border border-slate-100">
              <iframe src={embedUrl} className="w-full h-full" allowFullScreen />
            </div>
          </div>
        );
      case 'image':
        return (
          <div key={att.id} className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><ImageIcon size={12}/> {att.name}</p>
            <img src={att.url} alt={att.name} className="w-full rounded-2xl shadow-md border border-slate-100 object-cover max-h-[500px]" />
          </div>
        );
      case 'pdf':
        return (
          <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 hover:bg-blue-100 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-500 group-hover:scale-110 transition-transform"><FileText size={20} /></div>
              <div className="text-left">
                <p className="text-xs font-black leading-tight">{att.name}</p>
                <p className="text-[8px] font-bold opacity-60 uppercase mt-0.5">PDF Documents</p>
              </div>
            </div>
            <FileDown size={18} className="opacity-40" />
          </a>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-in slide-in-from-right-10 duration-500">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/procedures')} className="p-2 bg-white rounded-xl shadow-sm"><ArrowLeft size={20} /></button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{procedure.category}</span>
          {user.role === UserRole.MENTOR && (
            <div className="flex gap-1 ml-2">
              <button onClick={() => navigate(`/procedures/edit/${procedure.id}`)} className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Edit2 size={16} /></button>
              <button onClick={() => { if(window.confirm('削除しますか？')) { onDelete(procedure.id); navigate('/procedures'); } }} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={16} /></button>
            </div>
          )}
        </div>
      </div>

      <h2 className="text-2xl font-black text-slate-800 leading-tight">{procedure.title}</h2>

      {procedure.attachments && procedure.attachments.length > 0 && (
        <div className="space-y-6">
          {procedure.attachments.map(renderAttachment)}
        </div>
      )}

      <div className="space-y-4 pt-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ステップ解説</h3>
        {procedure.steps.map((step: string, i: number) => (
          <div key={i} className="bg-white p-5 rounded-[24px] border border-slate-100 flex gap-4 items-start shadow-sm hover:border-teal-100 transition-colors">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">{i+1}</div>
            <p className="text-sm font-bold text-slate-700 leading-relaxed">{step}</p>
          </div>
        ))}
      </div>

      {procedure.tips && (
        <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100 flex gap-4 items-start">
          <div className="p-2 bg-white rounded-xl text-emerald-600 shadow-sm"><CheckCircle2 size={18} /></div>
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Clinic Tips</p>
            <p className="text-sm font-bold text-emerald-800 leading-relaxed">{procedure.tips}</p>
          </div>
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
  const [form, setForm] = useState<Partial<Procedure>>(existing || { title: '', category: '基本準備', steps: [''], tips: '', attachments: [] });
  const [isReadingFile, setIsReadingFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeAttIdForUpload, setActiveAttIdForUpload] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeAttIdForUpload) return;

    if (file.size > 1024 * 1024) {
      alert("ファイルが大きすぎます (最大1MB)。画像サイズを小さくしてください。");
      return;
    }

    setIsReadingFile(activeAttIdForUpload);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      updateAttachment(activeAttIdForUpload, { url: base64, name: file.name });
      setIsReadingFile(null);
      setActiveAttIdForUpload(null);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileUpload = (attId: string) => {
    setActiveAttIdForUpload(attId);
    fileInputRef.current?.click();
  };

  const addAttachment = (type: 'video' | 'image' | 'pdf') => {
    const newAtt: Attachment = { id: `att_${Date.now()}`, type, name: '', url: '' };
    setForm({ ...form, attachments: [...(form.attachments || []), newAtt] });
  };

  const updateAttachment = (attId: string, updates: Partial<Attachment>) => {
    setForm({
      ...form,
      attachments: (form.attachments || []).map(a => a.id === attId ? { ...a, ...updates } : a)
    });
  };

  const removeAttachment = (attId: string) => {
    setForm({ ...form, attachments: (form.attachments || []).filter(a => a.id !== attId) });
  };

  const handleSubmit = () => {
    if(!form.title) return alert('タイトルを入力してください');
    onSave({...form, id: form.id || `p_${Date.now()}`});
    navigate('/procedures');
  };

  return (
    <div className="p-4 space-y-6 pb-32 animate-in slide-in-from-bottom-5">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf" />

      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm"><X size={20} /></button>
        <h2 className="text-lg font-black text-slate-800">{isNew ? '新規作成' : '編集'}</h2>
        <button onClick={handleSubmit} className="p-2 bg-teal-600 text-white rounded-xl shadow-md"><Save size={20} /></button>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase px-1">基本情報</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="手順タイトル" className="w-full p-4 bg-white border border-slate-100 rounded-2xl font-bold outline-none shadow-sm focus:border-teal-500 transition-all" />
            <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="カテゴリ" className="w-full p-4 bg-white border border-slate-100 rounded-2xl font-bold outline-none shadow-sm focus:border-teal-500 transition-all" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase px-1">ステップ</label>
            {form.steps?.map((step, i) => (
              <div key={i} className="flex gap-2 group">
                <textarea value={step} onChange={e => { const s = [...form.steps!]; s[i] = e.target.value; setForm({...form, steps: s}); }} placeholder={`ステップ ${i+1}`} className="w-full p-4 bg-white border border-slate-100 rounded-2xl font-bold text-sm min-h-[60px] resize-none shadow-sm focus:border-teal-500 transition-all" />
                <button onClick={() => setForm({...form, steps: form.steps!.filter((_, idx) => idx !== i)})} className="p-2 text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
              </div>
            ))}
            <button onClick={() => setForm({...form, steps: [...form.steps!, '']})} className="w-full py-3 border-2 border-dashed border-slate-100 rounded-2xl text-[10px] font-black text-teal-600 uppercase tracking-widest hover:bg-white transition-all">+ ステップを追加</button>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase px-1">関連資料 (写真・PDF・YouTube)</label>
            
            <div className="space-y-3">
              {(form.attachments || []).map((att) => (
                <div key={att.id} className="p-5 bg-white rounded-[28px] border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                        att.type === 'video' ? 'bg-amber-100 text-amber-600' :
                        att.type === 'image' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                      }`}>{att.type}</span>
                      {att.url && <CheckCircle2 size={12} className="text-emerald-500" />}
                    </div>
                    <button onClick={() => removeAttachment(att.id)} className="text-slate-200 hover:text-red-500"><Trash2 size={14}/></button>
                  </div>

                  <div className="space-y-3">
                    <input value={att.name} onChange={e => updateAttachment(att.id, { name: e.target.value })} placeholder="表示名" className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none" />
                    <div className="flex gap-2">
                      <input value={att.url} onChange={e => updateAttachment(att.id, { url: e.target.value })} placeholder="URLを入力" className="flex-1 p-3 bg-slate-50 rounded-xl text-[10px] font-bold outline-none font-mono truncate" />
                      {att.type !== 'video' && (
                        <button onClick={() => triggerFileUpload(att.id)} disabled={isReadingFile === att.id} className="px-4 bg-teal-50 text-teal-600 rounded-xl active:scale-95 transition-all">
                          {isReadingFile === att.id ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={18} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => addAttachment('image')} className="flex flex-col items-center gap-1 p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-teal-600 active:scale-95 transition-all">
                  <ImageIcon size={20} />
                  <span className="text-[8px] font-black uppercase">Add Photo</span>
                </button>
                <button onClick={() => addAttachment('pdf')} className="flex flex-col items-center gap-1 p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-teal-600 active:scale-95 transition-all">
                  <FileUp size={20} />
                  <span className="text-[8px] font-black uppercase">Add PDF</span>
                </button>
                <button onClick={() => addAttachment('video')} className="flex flex-col items-center gap-1 p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-teal-600 active:scale-95 transition-all">
                  <PlayCircle size={20} />
                  <span className="text-[8px] font-black uppercase">YouTube</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Q&A Page ---

const QAPage: React.FC<any> = ({ qaList, user, onSave, onDelete }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingQA, setEditingQA] = useState<QA | null>(null);

  const filtered = qaList.filter((q: QA) => q.question.includes(search) || q.answer.includes(search));

  const handleEdit = (q: QA) => setEditingQA(q);
  const handleCreate = () => setEditingQA({ id: `qa_${Date.now()}`, question: '', answer: '', tags: [] });

  const handleSaveInternal = () => {
    if (editingQA) {
      onSave(editingQA);
      setEditingQA(null);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-32 animate-in fade-in">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-black text-slate-800">院内ナレッジQ&A</h2>
        <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full">
          <UsersIcon size={12} />
          <span className="text-[8px] font-black uppercase">Shared Workspace</span>
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
                <p className="font-black text-slate-800 text-sm">{q.question}</p>
              </button>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(q)} className="p-1.5 text-slate-300 hover:text-amber-500 transition-colors"><Edit2 size={16} /></button>
                <button onClick={() => { if(window.confirm('削除しますか？')) onDelete(q.id); }} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>
            {expandedId === q.id && (
              <div className="px-5 pb-6 animate-in slide-in-from-top-2">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">A</div>
                  <div className="bg-slate-50 p-4 rounded-2xl flex-1 text-sm font-bold text-slate-600 leading-relaxed">{q.answer}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={handleCreate} className="fixed bottom-24 right-6 w-14 h-14 bg-amber-500 text-white rounded-full shadow-2xl flex items-center justify-center z-40 border-4 border-white active:scale-95 transition-all"><Plus size={28} /></button>

      {editingQA && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] p-4 flex items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Lightbulb size={20} /></div>
              <h3 className="font-black text-lg text-slate-800">ナレッジを共有</h3>
            </div>
            <textarea placeholder="質問" value={editingQA.question} onChange={e => setEditingQA({...editingQA, question: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm h-24 resize-none" />
            <textarea placeholder="回答" value={editingQA.answer} onChange={e => setEditingQA({...editingQA, answer: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm h-32 resize-none" />
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditingQA(null)} className="flex-1 py-4 text-slate-400 font-black text-sm">キャンセル</button>
              <button onClick={handleSaveInternal} className="flex-1 py-4 bg-teal-600 text-white rounded-2xl font-black text-sm">保存して公開</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Skill Map Page ---

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

  const handleEditMaster = (s: Skill) => setEditingMasterSkill(s);

  const moveSkill = (index: number, direction: 'up' | 'down') => {
    const newSkills = [...skills];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= skills.length) return;
    const temp = newSkills[index];
    newSkills[index] = newSkills[targetIndex];
    newSkills[targetIndex] = temp;
    onSaveMaster('skills', newSkills);
  };

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
        <div className="flex items-center gap-4">
          <div className="text-2xl font-black text-teal-600">{stats}%</div>
          {user.role === UserRole.MENTOR && (
            <button onClick={() => setIsManagingMaster(!isManagingMaster)} className={`p-2 rounded-xl transition-all ${isManagingMaster ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Settings size={18} /></button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {skills.map((skill: Skill, index: number) => {
          const p = progressData.find((sp: any) => sp.skillId === skill.id);
          const level = p?.level || 0;
          return (
            <div key={skill.id} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm transition-all duration-300">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{skill.category}</span>
                  <p className="font-black text-slate-800 text-sm">{skill.name}</p>
                </div>
                <div className="flex gap-1 items-center">
                  {isManagingMaster ? (
                    <div className="flex gap-1 items-center">
                       <div className="flex flex-col gap-1 mr-2 border-r border-slate-100 pr-2">
                          {index > 0 && (
                            <button onClick={() => moveSkill(index, 'up')} className="p-1 text-teal-500 bg-teal-50 rounded-md hover:bg-teal-100"><ArrowUp size={12} /></button>
                          )}
                          {index < skills.length - 1 && (
                            <button onClick={() => moveSkill(index, 'down')} className="p-1 text-teal-500 bg-teal-50 rounded-md hover:bg-teal-100"><ArrowDown size={12} /></button>
                          )}
                       </div>
                       <button onClick={() => handleEditMaster(skill)} className="p-2 text-slate-300 hover:text-teal-600"><Edit2 size={14} /></button>
                       <button onClick={() => { if(window.confirm('スキル項目を削除しますか？')) onDeleteSkill(skill.id); }} className="p-2 text-slate-200 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  ) : (
                    user.role === UserRole.MENTOR && (
                      <button onClick={() => setEditingProgressId(editingProgressId === skill.id ? null : skill.id)} className="p-2 bg-slate-50 rounded-xl text-slate-400"><Edit2 size={14} /></button>
                    )
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-1">
                {[1, 2, 3].map(l => (
                  <div key={l} className={`h-1.5 flex-1 rounded-full ${l <= level ? 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.3)]' : 'bg-slate-100'}`} />
                ))}
              </div>
              {editingProgressId === skill.id && !isManagingMaster && (
                <div className="mt-4 grid grid-cols-4 gap-2 animate-in zoom-in-95">
                  {[0, 1, 2, 3].map(l => (
                    <button key={l} onClick={() => { onUpdate(targetId, skill.id, { level: l }); setEditingProgressId(null); }} className={`py-2 rounded-xl text-[8px] font-black ${level === l ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>
                      {SkillLevelLabels[l as SkillLevel]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isManagingMaster && (
        <button 
          onClick={() => setEditingMasterSkill({ id: `s_${Date.now()}`, name: '', category: '基本スキル' })} 
          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Plus size={16} /> スキル項目を追加
        </button>
      )}

      {editingMasterSkill && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] p-4 flex items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 space-y-4 animate-in zoom-in-95">
            <h3 className="font-black text-lg text-slate-800">マスター項目の編集</h3>
            <div className="space-y-1">
               <label className="text-[9px] font-black text-slate-400 uppercase">項目名</label>
               <input 
                type="text" 
                value={editingMasterSkill.name}
                onChange={e => setEditingMasterSkill({...editingMasterSkill, name: e.target.value})}
                className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm"
              />
            </div>
            <div className="space-y-1">
               <label className="text-[9px] font-black text-slate-400 uppercase">カテゴリ</label>
               <input 
                type="text" 
                value={editingMasterSkill.category}
                onChange={e => setEditingMasterSkill({...editingMasterSkill, category: e.target.value})}
                className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingMasterSkill(null)} className="flex-1 py-4 text-slate-400 font-black text-sm">キャンセル</button>
              <button onClick={() => { onSaveSkill(editingMasterSkill); setEditingMasterSkill(null); }} className="flex-1 py-4 bg-teal-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-teal-100">保存する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProfilePage: React.FC<{ user: User; allUsers: User[]; onDeleteUser: (id: string) => void; onLogout: () => void }> = ({ user, allUsers, onDeleteUser, onLogout }) => (
  <div className="p-8 space-y-8 pb-32 animate-in fade-in">
    <div className="text-center space-y-4">
      <div className="w-24 h-24 bg-teal-50 text-teal-600 rounded-[32px] mx-auto flex items-center justify-center shadow-inner border-2 border-white">
        <UserIcon size={40} />
      </div>
      <div>
        <h2 className="text-2xl font-black text-slate-800">{user.name}</h2>
        <p className="text-xs font-black text-slate-300 uppercase tracking-widest mt-1">{user.role === UserRole.MENTOR ? 'Education Mentor' : 'Dental Hygienist'}</p>
      </div>
    </div>

    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm text-left space-y-4">
       <div className="flex justify-between items-center pb-4 border-b border-slate-50">
          <span className="text-[10px] font-black text-slate-400 uppercase">Clinic</span>
          <span className="text-sm font-black text-slate-800">{DEFAULT_CLINIC_NAME}</span>
       </div>
       <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-400 uppercase">Version</span>
          <span className="text-xs font-black text-teal-600">v2.1.2 Cloud Stabilized</span>
       </div>
    </div>

    {user.role === UserRole.MENTOR && (
      <div className="space-y-4 pt-4">
        <h3 className="text-[11px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest px-2">
          <ShieldAlert size={14} className="text-red-500" /> スタッフ管理（管理者限定）
        </h3>
        <div className="space-y-2">
          {allUsers.map((u: User) => (
            <div key={u.id} className="bg-white p-4 rounded-[24px] border border-slate-50 shadow-sm flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${u.role === UserRole.MENTOR ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'}`}>
                  {u.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">{u.name} {u.id === user.id && <span className="text-[8px] bg-slate-100 px-1 rounded ml-1 text-slate-400">自分</span>}</p>
                  <p className="text-[9px] font-bold text-slate-300 uppercase">{u.role}</p>
                </div>
              </div>
              {u.id !== user.id && (
                <button 
                  onClick={() => { if(window.confirm(`${u.name}さんを削除してもよろしいですか？学習データも削除されます。`)) onDeleteUser(u.id); }}
                  className="p-2 text-slate-200 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    )}

    <button onClick={onLogout} className="w-full py-5 bg-red-50 text-red-500 rounded-[28px] font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">ログアウトして終了</button>
  </div>
);

const LoginPage: React.FC<any> = ({ users, onLogin, onCreateUser }) => {
  const [mode, setMode] = useState<'select' | 'auth' | 'create'>('select');
  const [selected, setSelected] = useState<User | null>(null);
  const [pass, setPass] = useState('');
  const [newName, setNewName] = useState('');
  const [newPass, setNewPass] = useState('');
  const [isError, setIsError] = useState(false);

  const handleLoginClick = () => {
    if (selected && pass === selected.password) onLogin(selected);
    else { setIsError(true); setTimeout(() => setIsError(false), 2000); }
  };

  const handleCreate = () => {
    if(!newName || !newPass) return alert('名前とパスワードを入力してください');
    onCreateUser(newName, newPass);
    setMode('select');
    setNewName('');
    setNewPass('');
  };

  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[80vh] space-y-8 animate-in fade-in">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-teal-600 rounded-[24px] mx-auto flex items-center justify-center shadow-2xl"><ClipboardList size={40} className="text-white" /></div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">なないろアプリ</h2>
        <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">{DEFAULT_CLINIC_NAME}</p>
      </div>

      {mode === 'select' && (
        <div className="w-full space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">ユーザーを選択</p>
          <div className="space-y-3 max-h-[40vh] overflow-y-auto no-scrollbar pb-4">
            {users.map((u:any) => (
              <button key={u.id} onClick={() => { setSelected(u); setMode('auth'); }} className="w-full p-5 bg-white border border-slate-100 rounded-[28px] flex justify-between items-center shadow-sm active:scale-95 transition-all">
                <span className="font-black text-slate-700">{u.name}</span>
                <ChevronRight size={18} className="text-slate-200" />
              </button>
            ))}
          </div>
          <button onClick={() => setMode('create')} className="w-full py-4 border-2 border-dashed border-slate-200 text-slate-400 rounded-[28px] flex items-center justify-center gap-2 font-black text-xs active:scale-95 transition-all">
            <UserPlus size={16} /> 新しいスタッフを登録
          </button>
        </div>
      )}

      {mode === 'auth' && selected && (
        <div className="w-full space-y-4 bg-white p-10 rounded-[40px] border border-slate-100 animate-in zoom-in-95">
          <div className="text-center mb-4">
             <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-2 font-black text-xl">{selected.name.charAt(0)}</div>
             <p className="text-sm font-black text-slate-700">{selected.name}</p>
          </div>
          <input type="password" value={pass} onChange={e => {setPass(e.target.value); setIsError(false);}} className={`w-full p-5 bg-slate-50 border-2 rounded-2xl text-center text-xl font-black outline-none transition-all ${isError ? 'border-red-400 bg-red-50' : 'border-transparent focus:border-teal-500'}`} placeholder="Password" autoFocus />
          <button onClick={handleLoginClick} className="w-full py-5 bg-teal-600 text-white rounded-2xl font-black shadow-lg shadow-teal-100 active:scale-95 transition-all">ログイン</button>
          <button onClick={() => {setMode('select'); setPass('');}} className="w-full text-[10px] text-slate-300 font-black uppercase tracking-widest pt-2">戻る</button>
        </div>
      )}

      {mode === 'create' && (
        <div className="w-full space-y-4 bg-white p-10 rounded-[40px] border border-slate-100 animate-in zoom-in-95">
          <h3 className="text-center font-black text-slate-800 mb-4">スタッフ登録</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">お名前</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="例: 佐藤 結衣" className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold outline-none focus:border-teal-500 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">ログイン用パスワード</label>
              <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="••••" className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold outline-none focus:border-teal-500 transition-all text-center" />
            </div>
          </div>
          <button onClick={handleCreate} className="w-full py-5 bg-teal-600 text-white rounded-2xl font-black shadow-lg shadow-teal-100 active:scale-95 transition-all mt-4">アカウント作成</button>
          <button onClick={() => setMode('select')} className="w-full text-[10px] text-slate-300 font-black uppercase tracking-widest pt-2">キャンセル</button>
        </div>
      )}
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

  useEffect(() => {
    const savedLogged = localStorage.getItem(APP_STORAGE_KEYS.LOGGED_USER);
    if (savedLogged) {
        try {
            setUser(JSON.parse(savedLogged));
        } catch (e) {
            localStorage.removeItem(APP_STORAGE_KEYS.LOGGED_USER);
        }
    }
  }, []);

  useEffect(() => {
    const clinicId = user?.clinicId || 'c1';
    setIsSyncing(true);
    
    // Firestore同期
    const unsubClinic = onSnapshot(doc(db, 'clinic_data', clinicId), snap => {
      if (snap.exists()) {
        const data = snap.data();
        // データの部分的な欠落を防ぐため、存在する場合のみ更新する
        if (data.users) setAllUsers(data.users);
        if (data.allProgress) setAllSkillProgress(data.allProgress);
        
        // マスターデータが存在しない場合は、初期状態で上書きされないようにガード
        if (data.procedures && data.procedures.length > 0) {
          setProcedures(data.procedures);
        } else if (procedures.length === 0) {
          setProcedures(MOCK_PROCEDURES);
        }
        
        if (data.skills && data.skills.length > 0) {
          setSkills(data.skills);
        } else if (skills.length === 0) {
          setSkills(MOCK_SKILLS);
        }
        
        if (data.qa && data.qa.length > 0) {
          setQaList(data.qa);
        } else if (qaList.length === 0) {
          setQaList(MOCK_QA);
        }
      } else {
        // ドキュメントが存在しない初回のみ初期値を書き込む
        setDoc(doc(db, 'clinic_data', clinicId), { 
          users: INITIAL_USERS,
          procedures: MOCK_PROCEDURES, 
          skills: MOCK_SKILLS, 
          qa: MOCK_QA, 
          allProgress: {} 
        });
      }
      setIsSyncing(false);
    }, (err) => {
        console.error("Firestore sync error:", err);
        setIsSyncing(false);
    });

    return () => unsubClinic();
  }, [user?.clinicId]);

  useEffect(() => {
    if (!user) return;
    const unsubMemo = onSnapshot(doc(db, 'memos', user.id), snap => {
      if (snap.exists()) {
        const data = snap.data();
        setMemoData(data.entries || {});
      }
    });
    return () => unsubMemo();
  }, [user]);

  const handleCreateUser = async (name: string, pass: string) => {
    const newUser: User = {
      id: `u_${Date.now()}`,
      name,
      password: pass,
      role: UserRole.NEWBIE,
      clinicId: user?.clinicId || 'c1'
    };
    const nextUsers = [...allUsers, newUser];
    setAllUsers(nextUsers);
    try {
      await setDoc(doc(db, 'clinic_data', user?.clinicId || 'c1'), { users: nextUsers }, { merge: true });
    } catch (err) {
      alert("保存に失敗しました。ネットワークを確認してください。");
    }
  };

  const handleDeleteUser = async (targetId: string) => {
    const nextUsers = allUsers.filter(u => u.id !== targetId);
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
    setIsSaving(true);
    try {
      const cleanList = JSON.parse(JSON.stringify(list));
      const clinicId = user?.clinicId || 'c1';
      await setDoc(doc(db, 'clinic_data', clinicId), { [key]: cleanList }, { merge: true });
      console.log(`Saved ${key} to clinic ${clinicId}`);
    } catch (err) {
      console.error("Save error:", err);
      alert(`保存エラーが発生しました: ${key}を保存できませんでした。`);
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleSaveMemo = async (date: string, content: string) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const newMemoData = { ...memoData, [date]: content };
      setMemoData(newMemoData);
      await setDoc(doc(db, 'memos', user.id), { entries: newMemoData });
    } catch (err) {
      alert("メモの保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogin = (u: User) => { 
    setUser(u); 
    localStorage.setItem(APP_STORAGE_KEYS.LOGGED_USER, JSON.stringify(u)); 
    navigate('/'); 
  };
  
  const handleLogout = () => { 
    setUser(null); 
    setMemoData({}); 
    localStorage.removeItem(APP_STORAGE_KEYS.LOGGED_USER); 
    navigate('/login'); 
  };

  if (!user && location.pathname !== '/login') return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 shadow-2xl relative flex flex-col font-sans border-x border-slate-100 overflow-hidden">
      <Header user={user} clinicName={DEFAULT_CLINIC_NAME} isSyncing={isSyncing} />
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <Routes>
          <Route path="/login" element={<LoginPage users={allUsers} onLogin={handleLogin} onCreateUser={handleCreateUser} />} />
          <Route path="/" element={<DashboardPage user={user!} allProgress={allSkillProgress} skills={skills} allUsers={allUsers} clinicName={DEFAULT_CLINIC_NAME} memoData={memoData} onSaveMemo={handleSaveMemo} isSaving={isSaving} />} />
          <Route path="/memo-history" element={<MemoHistoryPage memoData={memoData} />} />
          <Route path="/procedures" element={<ProceduresPage procedures={procedures} user={user!} />} />
          <Route path="/procedures/new" element={<ProcedureEditPage procedures={procedures} onSave={(p: Procedure) => handleSaveMaster('procedures', [...procedures, p])} />} />
          <Route path="/procedures/edit/:id" element={<ProcedureEditPage procedures={procedures} onSave={(p: Procedure) => handleSaveMaster('procedures', procedures.map(old => old.id === p.id ? p : old))} />} />
          <Route path="/procedures/:id" element={<ProcedureDetailPage procedures={procedures} user={user!} onDelete={(id: string) => handleSaveMaster('procedures', procedures.filter(p => p.id !== id))} />} />
          <Route path="/skills" element={<SkillMapPage user={user!} skills={skills} allProgress={allSkillProgress} allUsers={allUsers} onUpdate={handleUpdateProgress} onSaveSkill={(s: Skill) => handleSaveMaster('skills', skills.some(os => os.id === s.id) ? skills.map(os => os.id === s.id ? s : os) : [...skills, s])} onDeleteSkill={(id: string) => handleSaveMaster('skills', skills.filter(s => s.id !== id))} onSaveMaster={handleSaveMaster} />} />
          <Route path="/skills/:userId" element={<SkillMapPage user={user!} skills={skills} allProgress={allSkillProgress} allUsers={allUsers} onUpdate={handleUpdateProgress} onSaveSkill={(s: Skill) => handleSaveMaster('skills', skills.some(os => os.id === s.id) ? skills.map(os => os.id === s.id ? s : os) : [...skills, s])} onDeleteSkill={(id: string) => handleSaveMaster('skills', skills.filter(s => s.id !== id))} onSaveMaster={handleSaveMaster} />} />
          <Route path="/qa" element={<QAPage qaList={qaList} user={user!} onSave={(q: QA) => handleSaveMaster('qa', qaList.some(oq => oq.id === q.id) ? qaList.map(oq => oq.id === q.id ? q : oq) : [...qaList, q])} onDelete={(id: string) => handleSaveMaster('qa', qaList.filter(q => q.id !== id))} />} />
          <Route path="/profile" element={<ProfilePage user={user!} allUsers={allUsers} onDeleteUser={handleDeleteUser} onLogout={handleLogout} />} />
        </Routes>
      </main>
      {user && <Navigation />}
      {isSaving && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-[9px] font-black tracking-widest flex items-center gap-3 shadow-2xl z-[60] animate-in slide-in-from-bottom-2">
          <PartyPopper size={14} className="text-emerald-400" /> CLOUD SYNCED
        </div>
      )}
    </div>
  );
};

export default function App() { return ( <Router> <AppContent /> </Router> ); }
