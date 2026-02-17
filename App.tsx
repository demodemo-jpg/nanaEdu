
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
  Wifi,
  PartyPopper
} from 'lucide-react';

// --- Types & Config ---
import { UserRole, SkillLevel, SkillLevelLabels, UserSkillProgress, QA, Procedure, Skill, User } from './types';
import { MOCK_PROCEDURES, MOCK_SKILLS, MOCK_QA } from './constants';
// Note: In real setup, you'd import { db } from './firebase'; 
// For this demo, we'll keep the logic robust to handle both local and potential cloud.

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

// --- Common UI Components ---

const Header: React.FC<{ title: string; user: User | null; clinicName: string; isSyncing?: boolean }> = ({ title, user, clinicName, isSyncing }) => (
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
          <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">{isSyncing ? 'Syncing...' : 'Connected'}</span>
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

// --- Sub-Pages (High Fidelity Implementation) ---

/**
 * Procedures List & Detail
 */
const ProceduresPage: React.FC<{
  user: User;
  procedures: Procedure[];
  onSave: (p: Partial<Procedure>) => void;
  onDelete: (id: string) => void;
}> = ({ user, procedures, onSave, onDelete }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  const selected = procedures.find(p => p.id === id);
  const filtered = procedures.filter(p => p.title.includes(search) || p.category.includes(search));

  const toggleStep = (stepIdx: number) => {
    if (!id) return;
    const key = `${id}-${stepIdx}`;
    setCheckedSteps(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (selected) {
    return (
      <div className="p-4 space-y-6 pb-24 animate-in slide-in-from-right duration-300">
        <button onClick={() => navigate('/procedures')} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <ArrowLeft size={14} /> 手順一覧に戻る
        </button>

        <div className="bg-white rounded-[40px] overflow-hidden shadow-sm border border-slate-100">
          {selected.videoUrl && (
            <div className="aspect-video bg-slate-100 relative group">
              <iframe 
                className="w-full h-full border-none" 
                src={formatEmbedUrl(selected.videoUrl)} 
                title={selected.title} 
                allowFullScreen
              />
            </div>
          )}
          <div className="p-8 space-y-6">
            <div>
              <span className="px-3 py-1 bg-teal-50 text-teal-600 text-[9px] font-black rounded-full border border-teal-100 uppercase tracking-widest">{selected.category}</span>
              <h2 className="text-2xl font-black text-slate-800 mt-2">{selected.title}</h2>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <ClipboardList size={14} className="text-teal-600" /> チェックリスト形式
              </h3>
              {selected.steps.map((step, i) => (
                <div 
                  key={i} 
                  onClick={() => toggleStep(i)}
                  className={`p-4 rounded-2xl flex items-center gap-4 transition-all cursor-pointer border ${
                    checkedSteps[`${selected.id}-${i}`] 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                      : 'bg-slate-50 border-slate-50 text-slate-600'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                    checkedSteps[`${selected.id}-${i}`] ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-200 text-transparent'
                  }`}>
                    <CheckCircle2 size={16} />
                  </div>
                  <span className={`text-sm font-bold ${checkedSteps[`${selected.id}-${i}`] ? 'line-through opacity-50' : ''}`}>{step}</span>
                </div>
              ))}
            </div>

            {selected.tips && (
              <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-100 space-y-2">
                <div className="flex items-center gap-2 text-amber-700">
                  <Info size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">臨床アドバイス</span>
                </div>
                <p className="text-xs font-bold text-amber-900/70 leading-relaxed italic">{selected.tips}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="px-2">
        <h2 className="text-2xl font-black text-slate-800">手順マニュアル</h2>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Clinical Procedures</p>
      </div>

      <div className="relative group mx-2">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        <input 
          placeholder="手順名で検索..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-3xl text-sm font-black outline-none focus:ring-4 focus:ring-teal-50"
        />
      </div>

      <div className="space-y-3">
        {filtered.map(p => (
          <button 
            key={p.id} 
            onClick={() => navigate(`/procedures/${p.id}`)}
            className="w-full bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-all">
                {p.videoUrl ? <Video size={20} /> : <BookOpen size={20} />}
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{p.category}</span>
                <p className="font-black text-slate-800 text-sm mt-0.5">{p.title}</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-200 group-hover:translate-x-1 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Skill Map Page
 */
const SkillMapPage: React.FC<{
  user: User;
  skills: Skill[];
  allProgress: Record<string, UserSkillProgress[]>;
  allUsers: User[];
  onUpdate: (uId: string, sId: string, updates: any) => void;
}> = ({ user, skills, allProgress, allUsers, onUpdate }) => {
  const { userId } = useParams();
  const targetId = userId || user.id;
  const targetUser = allUsers.find(u => u.id === targetId) || user;
  const progressData = allProgress[targetId] || [];

  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [tempLevel, setTempLevel] = useState(0);
  const [tempComment, setTempComment] = useState('');

  const stats = calculateProgress(skills, progressData);
  const rank = getRankInfo(stats);

  const handleSave = () => {
    if (editingSkillId) {
      onUpdate(targetId, editingSkillId, { level: tempLevel, mentorComment: tempComment });
      setEditingSkillId(null);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[48px] shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex items-center justify-center text-teal-600 font-black text-2xl shadow-inner border border-white">
            {targetUser.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">{targetUser.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black text-white ${rank.color}`}>{rank.label}</span>
              <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase">Skill Grade</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black text-teal-600">{stats}%</span>
        </div>
      </div>

      <div className="space-y-4">
        {skills.map(skill => {
          const p = progressData.find(sp => sp.skillId === skill.id);
          const level = p?.level || 0;
          return (
            <div key={skill.id} className="bg-white p-6 rounded-[36px] border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{skill.category}</span>
                  <p className="font-black text-slate-800 text-sm">{skill.name}</p>
                </div>
                {user.role === UserRole.MENTOR ? (
                  <button 
                    onClick={() => {
                      setEditingSkillId(skill.id);
                      setTempLevel(level);
                      setTempComment(p?.mentorComment || '');
                    }}
                    className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-teal-600 transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                ) : (
                  <div className="flex gap-1">
                    {[1, 2, 3].map(l => (
                      <div key={l} className={`w-3 h-3 rounded-full ${l <= level ? 'bg-teal-500' : 'bg-slate-100'}`} />
                    ))}
                  </div>
                )}
              </div>

              {editingSkillId === skill.id ? (
                <div className="p-6 bg-slate-50 rounded-[32px] space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map(l => (
                      <button 
                        key={l} 
                        onClick={() => setTempLevel(l)}
                        className={`py-3 rounded-2xl text-[10px] font-black transition-all ${
                          tempLevel === l ? 'bg-teal-600 text-white shadow-lg' : 'bg-white text-slate-400'
                        }`}
                      >
                        {SkillLevelLabels[l as SkillLevel]}
                      </button>
                    ))}
                  </div>
                  <textarea 
                    placeholder="アドバイスを記入してください..." 
                    value={tempComment} 
                    onChange={e => setTempComment(e.target.value)}
                    className="w-full p-4 bg-white rounded-2xl text-xs font-bold outline-none min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingSkillId(null)} className="flex-1 py-3 bg-white text-slate-400 rounded-2xl text-[10px] font-black">閉じる</button>
                    <button onClick={handleSave} className="flex-1 py-3 bg-teal-600 text-white rounded-2xl text-[10px] font-black">保存</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{SkillLevelLabels[level as SkillLevel]}</p>
                  {p?.mentorComment && (
                    <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100/30 flex gap-3">
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
  );
};

// --- Dashboard Component (Polished) ---

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
            <p className="text-[10px] opacity-70 font-black uppercase tracking-widest">{clinicName} / {user.role === UserRole.MENTOR ? '管理者' : '新人スタッフ'}</p>
            
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

      <section className="grid grid-cols-2 gap-4">
        <div onClick={() => navigate('/procedures')} className="bg-white p-6 rounded-[36px] border border-slate-100 flex flex-col items-center text-center cursor-pointer active:scale-95 transition-all shadow-sm">
          <div className="w-14 h-14 bg-blue-50 rounded-[22px] flex items-center justify-center text-blue-600 mb-3 shadow-inner"><BookOpen size={28} /></div>
          <span className="text-xs font-black text-slate-800">手順書マニュアル</span>
          <span className="text-[8px] text-slate-300 font-black uppercase tracking-widest mt-1">{procedures.length} 手順</span>
        </div>
        <div onClick={() => navigate('/qa')} className="bg-white p-6 rounded-[36px] border border-slate-100 flex flex-col items-center text-center cursor-pointer active:scale-95 transition-all shadow-sm">
          <div className="w-14 h-14 bg-amber-50 rounded-[22px] flex items-center justify-center text-amber-600 mb-3 shadow-inner"><MessageSquare size={28} /></div>
          <span className="text-xs font-black text-slate-800">院内ナレッジ</span>
          <span className="text-[8px] text-slate-300 font-black uppercase tracking-widest mt-1">共有Q&A</span>
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

// --- Main App Implementation ---

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

  // Sync Simulation Logic
  useEffect(() => {
    setIsSyncing(true);
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

    setTimeout(() => setIsSyncing(false), 800);
  }, []);

  const persist = useCallback(async (key: string, data: any) => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 600)); // Latency Simulation
    localStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data));
    setIsSaving(false);
  }, []);

  const handleUpdateProgress = async (uId: string, sId: string, updates: any) => {
    const userProgress = [...(allSkillProgress[uId] || [])];
    const index = userProgress.findIndex(p => p.skillId === sId);
    const now = new Date().toISOString();
    
    if (index >= 0) {
      userProgress[index] = { ...userProgress[index], ...updates, updatedAt: now };
    } else {
      userProgress.push({ userId: uId, skillId: sId, level: updates.level, mentorComment: updates.mentorComment || '', updatedAt: now });
    }
    
    const newAllProgress = { ...allSkillProgress, [uId]: userProgress };
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

  if (!user && location.pathname !== '/login') return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 shadow-2xl relative flex flex-col font-sans border-x border-slate-100 overflow-hidden">
      <Header title="なないろ" user={user} clinicName={clinicName} isSyncing={isSyncing} />
      <main className="flex-1 overflow-y-auto no-scrollbar bg-slate-50/50">
        <Routes>
          <Route path="/login" element={<LoginPage users={allUsers} onLogin={handleLogin} clinicName={clinicName} />} />
          <Route path="/" element={<DashboardPage user={user!} procedures={proceduresList} allProgress={allSkillProgress} skills={MOCK_SKILLS} allUsers={allUsers} clinicName={clinicName} memo={userMemos[user?.id || ''] || ''} onSaveMemo={(m: string) => persist(APP_STORAGE_KEYS.MEMOS, { ...userMemos, [user!.id]: m })} isSaving={isSaving} />} />
          <Route path="/procedures" element={<ProceduresPage user={user!} procedures={proceduresList} onSave={() => {}} onDelete={() => {}} />} />
          <Route path="/procedures/:id" element={<ProceduresPage user={user!} procedures={proceduresList} onSave={() => {}} onDelete={() => {}} />} />
          <Route path="/skills" element={<SkillMapPage user={user!} skills={MOCK_SKILLS} allProgress={allSkillProgress} allUsers={allUsers} onUpdate={handleUpdateProgress} />} />
          <Route path="/skills/:userId" element={<SkillMapPage user={user!} skills={MOCK_SKILLS} allProgress={allSkillProgress} allUsers={allUsers} onUpdate={handleUpdateProgress} />} />
          <Route path="/qa" element={<div className="p-8 text-center text-slate-400 font-black uppercase tracking-[0.2em] py-20">Coming Soon: Q&A Feature</div>} />
          <Route path="/profile" element={<div className="p-8 text-center py-20"><button onClick={handleLogout} className="px-10 py-5 bg-red-500 text-white font-black rounded-3xl shadow-xl shadow-red-100 active:scale-95 transition-all">ログアウト</button></div>} />
        </Routes>
      </main>
      {user && <Navigation />}
      
      {isSaving && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-[9px] font-black tracking-[0.2em] flex items-center gap-3 shadow-2xl animate-in slide-in-from-bottom-2">
          <PartyPopper size={14} className="text-emerald-400" /> CLOUD SYNCED
        </div>
      )}
    </div>
  );
};

const LoginPage: React.FC<any> = ({ users, onLogin, clinicName }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  
  return (
    <div className="p-8 space-y-12 flex flex-col items-center justify-center min-h-[85vh]">
      <div className="text-center space-y-4">
        <div className="w-24 h-24 bg-teal-600 rounded-[32px] mx-auto flex items-center justify-center shadow-2xl shadow-teal-200">
          <ClipboardList size={48} className="text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">なないろアプリ</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">{clinicName}</p>
        </div>
      </div>

      {!selectedUser ? (
        <div className="w-full space-y-3">
          {users.map((u: User) => (
            <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full p-5 bg-white border border-slate-100 rounded-[32px] flex items-center justify-between shadow-sm active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${u.role === UserRole.MENTOR ? 'bg-amber-50 text-amber-500' : 'bg-teal-50 text-teal-600'}`}>
                  <UserIcon size={24} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-slate-800">{u.name}</p>
                  <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest">{u.role}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-200" />
            </button>
          ))}
        </div>
      ) : (
        <div className="w-full space-y-6 bg-white p-10 rounded-[48px] shadow-sm border border-slate-100 animate-in zoom-in-95 duration-200">
          <button onClick={() => setSelectedUser(null)} className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1"><ArrowLeft size={14}/> 戻る</button>
          <div className="text-center">
            <h3 className="text-xl font-black text-slate-800">{selectedUser.name}</h3>
          </div>
          <input 
            type="password" 
            autoFocus
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="••••" 
            className="w-full p-5 bg-slate-50 border-none rounded-2xl text-center text-2xl font-black outline-none focus:ring-4 focus:ring-teal-50 transition-all" 
          />
          <button onClick={() => onLogin(selectedUser)} className="w-full py-5 bg-teal-600 text-white rounded-[24px] font-black shadow-xl shadow-teal-100 active:scale-95 transition-all">ログイン</button>
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
