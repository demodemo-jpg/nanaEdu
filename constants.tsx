
import { UserRole, SkillLevel, Procedure, Skill, QA } from './types';

export const MOCK_PROCEDURES: Procedure[] = [
  {
    id: 'p1',
    title: 'SC（スケーリング）準備',
    category: '基本準備',
    steps: [
      '基本セット（ミラー・探針・ピンセット）の用意',
      '超音波スケーラーチップの滅菌確認',
      '水回り・排唾管の動作確認',
      '患者エプロンの装着',
      '対診用パントモ写真の表示'
    ],
    tips: 'チップは摩耗していないか、使用前に必ずチェックしてください。',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' // サンプル動画
  },
  {
    id: 'p2',
    title: '印象採得（アルジネート）',
    category: '臨床補助',
    steps: [
      'トレーのサイズ選択（試適）',
      '粉と水の計量（気温に合わせて微調整）',
      '練和（気泡が入らないように）',
      '口腔内挿入・保持',
      '撤去・水洗・消毒'
    ],
    tips: '嘔吐反射がある患者様には、上顎の際は前屈みになってもらうと楽です。'
  }
];

export const MOCK_SKILLS: Skill[] = [
  { id: 's1', name: 'バキューム操作', category: '基本スキル' },
  { id: 's2', name: 'レントゲン補助', category: '基本スキル' },
  { id: 's3', name: 'SC（超音波）', category: '歯周治療' },
  { id: 's4', name: 'TBI', category: '予防処置' },
  { id: 's5', name: '印象採得', category: '臨床補助' }
];

export const MOCK_QA: QA[] = [
  {
    id: 'q1',
    question: '消毒液の交換頻度は？',
    answer: '基本的に毎朝診療前に交換します。汚れがひどい場合は昼休みにも確認してください。',
    tags: ['院内ルール', '衛生管理']
  },
  {
    id: 'q2',
    question: '急患対応時の優先順位は？',
    answer: 'まず痛みの部位を確認し、院長に報告。既存予約の方をお待たせしないよう、カルテ準備を最優先してください。',
    tags: ['業務フロー']
  }
];
