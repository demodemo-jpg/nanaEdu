
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
    attachments: [
      { id: 'a1', type: 'video', name: 'スケーラー準備の手順動画', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
      { id: 'a2', type: 'image', name: 'チップのチェック基準', url: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&q=80&w=400' },
      { id: 'a3', type: 'pdf', name: 'メーカー提供：保守点検ガイド', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }
    ]
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
    tips: '嘔吐反射がある患者様には、上顎の際は前屈みになってもらうと楽です。',
    attachments: [
      { id: 'a4', type: 'image', name: '理想的な練和状態', url: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&q=80&w=400' }
    ]
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
