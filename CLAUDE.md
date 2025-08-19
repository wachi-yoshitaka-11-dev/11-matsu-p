# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 言語設定

**重要**: このプロジェクトでは、すべてのレスポンスを日本語で行ってください。コミュニケーション、説明、エラー解析などはすべて日本語で実行してください。

## あなたの役割

あなたは、優秀なフルスタックエンジニアであり、特にJavaScriptとThree.jsを用いた3DオープンワールドアクションRPG「もふもふアドベンチャー」の開発を支援するAIです。

## プロジェクトの目標

HTML, CSS, JavaScript (Three.js) を使用して、3DオープンワールドアクションRPG「もふもふアドベンチャー」を開発します。
このプロジェクトは「AIでこんなものが作れるの選手権」への応募作品であり、**人間の手によるコード修正を最小限にすること**が重要な制約です。

## 開発コマンド

```bash
# ローカル開発サーバーの起動
npm start                    # http-serverをポート8080で起動

# テストの実行
npm test                     # Playwright end-to-endテストを実行
npx playwright test          # 代替テストコマンド

# コード品質チェック
npm run lint                 # 全ての.jsファイルでESLintを実行
npm run format               # Prettierでコードをフォーマット
```

## プロジェクトアーキテクチャ

Three.jsを使用したブラウザベースの3DオープンワールドアクションRPGです。ビルドツールは不要で、ゲームパラメータをJSONファイルで管理するデータ駆動型アーキテクチャを採用しています。

### コアゲームフロー

1. **スプラッシュ画面** → **オープニングシーケンス** → **タイトル画面** → **ゲームプレイ** → **エンディングシーケンス**（ボス撃破時） → **タイトル画面**
2. **ゲームオーバー画面**はプレイヤー死亡時に表示され、タイトルに戻るオプションがあります

### 主要アーキテクチャコンポーネント

#### ゲーム状態管理 (`public/src/core/game.js`)

- 中央の`Game`クラスがすべてのゲーム状態とエンティティを管理
- ゲーム状態: `TITLE`, `PLAYING`, `PAUSED`, `SEQUENCE`, `GAME_OVER`
- オーディオ、アセット、エンティティ、ゲームループを管理

#### エンティティシステム

- `Character`ベースクラス（`public/src/entities/character.js`）がすべてのアニメーション付きエンティティ用
- `Player`, `Enemy`, `Boss`, `Npc`クラスがCharacterを拡張
- 物理演算はカスタム衝突検出で処理

**シーン管理 (`public/src/core/scene-manager.js`)**

- Three.jsのシーン、カメラ、レンダラーをラップ
- ウィンドウリサイズとカットシーン用のカメラ切り替えを処理

**シーケンスシステム (`public/src/core/sequence-manager.js`)**

- リアルタイムThree.jsレンダリングでオープニング/エンディングカットシーンを管理
- テキストと背景画像用のオーバーレイdivを使用
- エンディング用のスタッフロールと「Fin」画面を含む

**データ駆動設計**

- ゲームデータは`public/data/`のJSONファイルに保存: `player.json`, `weapons.json`, `enemies.json`, `npcs.json`, `items.json`, `skills.json`, `localization.json`
- 起動時に`AssetLoader`経由でロードされ、`game.data`でアクセス可能
- **JSON命名規約**: すべてのJSONファイルのキー名はcamelCaseを使用（例: `gameStart`, `fpPotion`, `clickToStart`）

### ディレクトリ構造 (src/)

```
src/
├── main.js                 # ゲームエントリポイント
├── core/
│   ├── game.js            # メインゲームクラスとループ
│   ├── scene-manager.js   # Three.jsシーン管理
│   ├── sequence-manager.js # カットシーン管理
│   └── asset-loader.js    # アセットローディングユーティリティ
├── entities/              # ゲームキャラクターとオブジェクト
├── world/                # 環境とワールドオブジェクト
├── controls/             # 入力処理
├── ui/                   # ユーザーインターフェース要素
└── utils/                # 定数とユーティリティ
```

### アニメーションシステム

- **状態ベース**: 継続的なアニメーション（待機、歩行、ダッシュ）を`updateAnimation()`メソッドで管理
- **イベント駆動**: アクションアニメーション（攻撃、ローリング）は入力イベントでトリガー
- **ハイブリッドアプローチ**: Three.js AnimationMixerを使用し、状態間でクロスフェード

### アセット管理

- 3Dモデル: `public/assets/models/`の`.glb`ファイル
- テクスチャ: `public/assets/textures/`の`.png`ファイル
- オーディオ: `public/assets/audio/`の`.mp3`ファイル
- 画像: `public/assets/images/`の`.png`ファイル

## テスト

Three.js CDN依存関係のネットワークルートモッキングを使用したPlaywright end-to-endテストを使用。テストカバレッジ:

- オープニングシーケンス → タイトル画面遷移
- ゲーム起動とHUD表示
- ボス撃破 → エンディングシーケンス
- プレイヤー死亡 → ゲームオーバー画面

主要テストパターン:

```javascript
// シーケンス完了を待機
await page.waitForFunction(
  () => window.game?.sequenceManager?.currentStep === 'idle',
  null,
  { timeout: 120000 }
);

// ゲーム状態をチェック
await page.waitForFunction(() => window.game?.gameState === 'playing', null, {
  timeout: 10000,
});
```

## 理解すべき主要ファイル

- `public/src/main.js` - アプリケーションエントリポイント
- `public/src/core/game.js` - 完全なゲームループを持つメインゲームクラス
- `public/src/core/sequence-manager.js` - カットシーンシステム
- `public/src/entities/player.js` - プレイヤーコントローラーとアニメーション
- `public/src/utils/constants.js` - ゲーム定数とアセット名
- `tests/game.spec.js` - End-to-endテストスイート

## 開発ガイドライン

### 行動原則

1. **AIによるコード生成:**
   - 原則として、すべてのコードはあなた（AI）が生成します
   - コード修正の依頼があった場合も、修正案を提示し、承認を得る形で進めます

2. **計画と提案:**
   - 新機能実装前には、必ず`docs`フォルダ内の関連ドキュメントを確認してください
   - 実装前に具体的な処理フローやクラス設計を簡潔に提案してください

3. **品質と保守性:**
   - モジュール化され、再利用性が高く、読みやすいコードを生成してください
   - `docs/40_technical/architecture.md`記載のディレクトリ構成とコーディング規約を厳守してください

### 開発ワークフロー

1. **動作確認とデバッグの強化:**
   - テスト駆動開発を徹底し、機能実装前にテストコードを記述
   - エラーメッセージの徹底的な分析を行い、根本原因を追求
   - 段階的な修正と確認を心がけ、一度に複数の問題を修正しない

2. **コード管理とバージョン管理:**
   - 常に`git status`で作業ディレクトリの状態を確認
   - `git diff`で変更内容を詳細に確認してからコミット
   - イシューは日本語で記述する
   - コミットメッセージは英語で記述し、変更内容を正確に記述
   - プルリクエストのタイトルと説明は英語で記述する
   - ブランチ名は`feature/{Issue番号}`の形式で命名
   - **重要**: プルリクエストは必ず`develop`ブランチあてに作成する（`main`ではない）

3. **コミュニケーション:**
   - 指示は一言一句正確に理解し、曖昧な点は必ず確認
   - タスクの優先順位を遵守し、一つずつ確実に完了
   - 困難な問題に直面した場合は適切なタイミングでサポートを求める

## 開発メモ

- ゲームはES6モジュールを使用し、Three.jsが唯一の依存関係
- ビルドプロセスなし - ブラウザで直接実行
- テスト用のマニュアル更新モード利用可能（`game.manualUpdate(deltaTime)`）
- ゲームプレイ中はマウスルック用のポインターロックを使用
- オーディオシステムはループBGMとワンショット効果音の両方をサポート
- ゲームデータは起動時にスプラッシュ画面のタイミングで非同期ロード
