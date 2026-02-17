
export enum UserRole {
  NEWBIE = 'NEWBIE',
  MENTOR = 'MENTOR',
  ADMIN = 'ADMIN'
}

export enum SkillLevel {
  UNEXPERIENCED = 0, // 未経験
  OBSERVED = 1,      // 見学
  ASSISTED = 2,      // 介助
  INDEPENDENT = 3    // 単独
}

export const SkillLevelLabels = {
  [SkillLevel.UNEXPERIENCED]: '未経験',
  [SkillLevel.OBSERVED]: '見学',
  [SkillLevel.ASSISTED]: '介助',
  [SkillLevel.INDEPENDENT]: '単独'
};

export interface Attachment {
  id: string;
  type: 'video' | 'image' | 'pdf';
  url: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  clinicId: string;
  password?: string;
}

export interface Procedure {
  id: string;
  title: string;
  category: string;
  steps: string[];
  tips?: string;
  videoUrl?: string; // 互換性のために残すが、基本はattachmentsを使用
  attachments?: Attachment[];
}

export interface Skill {
  id: string;
  name: string;
  category: string;
}

export interface UserSkillProgress {
  userId: string;
  skillId: string;
  level: SkillLevel;
  mentorComment?: string;
  updatedAt: string;
}

export interface QA {
  id: string;
  question: string;
  answer: string;
  tags: string[];
}
