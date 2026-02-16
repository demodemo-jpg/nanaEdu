
# DH-Path (歯科衛生士新人教育支援システム) 設計書

## 1. アプリ全体の画面構成

### 新人歯科衛生士（Newbie）
- **ホーム**: 最近の学習状況、今月の目標、完了率の可視化
- **手順カード**: カテゴリ別マニュアル、チェックリスト（チェアサイドでの即時確認用）
- **スキルマップ**: 自身のスキル到達度（未経験〜単独）の確認と教育係からのフィードバック
- **院内Q&A**: 検索可能な知識ベース
- **プロフィール**: 基本設定、所属医院情報

### 教育係・院長（Mentor/Admin）
- **管理ホーム**: 担当新人の進捗状況、未評価項目の通知
- **評価入力**: スキルマップ上での直接評価、コメント入力
- **手順編集**: 自院ルールの追加・編集（カスタマイズ機能）
- **Q&A管理**: よくある質問の追加

---

## 2. UI/UX設計のポイント
- **親指アクション**: スマホ操作を前提に、重要なボタンは画面下部に配置（モバイルファースト）。
- **清潔感のあるUI**: 歯科医院に馴染むよう、白とミントグリーン（ティールカラー）を基調としたクリーンなデザイン。
- **視認性**: 忙しい現場でも一目で状況が分かるよう、アイコンと進捗バーを多用。
- **ダークモード対応（オプション）**: キャビネット内などの暗い場所でも見やすく調整。

---

## 3. データベース設計（テーブル定義案）

### `clinics` (医院)
- `id`: string (PK)
- `name`: string
- `subscription_plan`: string

### `users` (ユーザー)
- `id`: string (PK)
- `clinic_id`: string (FK)
- `name`: string
- `role`: enum ('newbie', 'mentor', 'admin')
- `avatar_url`: string

### `procedures` (手順)
- `id`: string (PK)
- `clinic_id`: string (FK)
- `category`: string
- `title`: string
- `steps`: string[] (JSONB or separate table)
- `tips`: text
- `is_custom`: boolean (医院独自かどうか)

### `skills` (スキル項目)
- `id`: string (PK)
- `category`: string
- `name`: string
- `description`: text

### `user_skills` (スキル進捗)
- `user_id`: string (FK)
- `skill_id`: string (FK)
- `level`: integer (0:未経験, 1:見学, 2:介助, 3:単独)
- `mentor_id`: string (FK)
- `mentor_comment`: text
- `updated_at`: timestamp

---

## 4. 推奨技術スタック
- **Frontend**: React 18+, TypeScript, Tailwind CSS
- **State Management**: React Query (Server state), Zustand (Global UI state)
- **Backend/DB**: Supabase (PostgreSQL, Auth, Realtime) または Firebase
  - 選定理由: RLS（Row Level Security）により「医院間でのデータ隔離」が容易。
- **Icons**: Lucide React
- **PWA**: vite-plugin-pwa (Vite環境想定)

---

## 5. 初期リリースまでの開発ステップ

### Step 1: 要件定義とプロトタイプ作成 (1週間)
- 実際の歯科医院へのヒアリングを通じたコア手順の抽出。
- デザインツール（Figma等）での全画面フローの確定。

### Step 2: 基盤構築 (1週間)
- 認証基盤（Auth）の実装、医院ごとのデータ分離ロジックの実装。
- PWA対応（オフラインキャッシュ設定）。

### Step 3: MVP開発 (3週間)
- 手順カード、スキルマップ、Q&Aの各機能を実装。
- 評価コメント通知機能の実装。

### Step 4: プレリリース・テスト (1週間)
- 特定の提携医院でのテスト利用。
- フィードバックに基づくUIの微調整。

### Step 5: 正式リリース
- 医院管理画面（手順の編集・追加機能）を完全に開放。
