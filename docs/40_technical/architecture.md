# 技術アーキテクチャ

## 1. 基本構成

本プロジェクトは、特別なサーバーサイドやビルド環境を必要としない、シンプルなフロントエンド技術のみで構成する。

- **実行環境:** モダンブラウザ (Google Chrome, Firefox, Safari, Edge)
- **主要言語:** HTML, CSS, JavaScript (ES6+)

## 2. 主要ライブラリ・フレームワーク

| 役割               | 技術             | 選定理由                                                                                                                                                 |
| ------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3Dレンダリング** | **Three.js**     | Web 3Dのデファクトスタンダードであり、豊富なドキュメントとコミュニティを持つ。AIによるコード生成においても、学習データが豊富で安定した出力を期待できる。 |
| **物理演算**       | **自前実装**     | 現在はライブラリに頼らず、自前の簡易的な当たり判定と重力計算を実装している。                                                                             |
| **UI**             | **素のHTML/CSS** | 素のHTML/CSSとDOM操作でUIを構築している。                                                                                                                |

## 3. ディレクトリ構成（src）

開発を進めるにあたり、`src`フォルダ内を機能ごとに分割して管理する。

```text
src/
├── main.js           # ゲーム初期化とAudioContext制御、クリック開始画面の管理
├── core/
│   ├── game.js         # ゲームのメインクラス
│   ├── scene-manager.js # シーン（舞台）の管理
│   ├── asset-loader.js  # アセットの読み込み
│   └── components/     # 再利用可能なコンポーネント
│       └── physics-component.js # 物理演算コンポーネント
├── entities/
│   ├── base-entity.js  # 全エンティティのベースクラス
│   ├── characters/     # キャラクター関連エンティティ
│   │   ├── character.js # 全キャラクターのベースクラス（物理、HP、アニメーション管理）
│   │   ├── player.js   # プレイヤー
│   │   ├── enemy.js    # 敵キャラクター
│   │   ├── boss.js     # ボス（敵の特殊タイプ）
│   │   └── npc.js      # NPC
│   ├── items/          # アイテム関連エンティティ
│   │   └── item.js     # アイテム
│   ├── skills/         # スキル関連エンティティ
│   │   ├── skill.js    # スキルベースクラス
│   │   ├── projectile.js # プロジェクタイルスキル
│   │   └── area-attack.js # エリア攻撃スキル
│   └── world/          # ワールド関連エンティティ
│       ├── environment.js # 環境オブジェクト（雲、地面など）
│       └── terrain.js  # 地形オブジェクト（木、岩、草など）
├── world/
│   ├── field.js        # 地形や背景の生成
│   └── light.js        # ライトの設定
├── controls/
│   └── input-controller.js # キーボード・マウス入力、およびカメラの管理
├── ui/
│   └── hud.js          # 画面表示（HPゲージなど）
├── utils/
│   └── constants.js    # 定数管理
└── public/data/      # ゲームデータ（JSONファイル）
    ├── player.json
    ├── weapons.json
    ├── enemies.json
    ├── npcs.json
    ├── items.json
    └── skills.json
```

## 4. データ駆動アーキテクチャ

ゲームの各種パラメータ（プレイヤーのステータス、武器の性能、敵のHPなど）は、コードから分離し、`public/data` ディレクトリ内のJSONファイルとして管理する「データ駆動型アーキテクチャ」を採用する。
これにより、ゲームバランスの調整やコンテンツの追加を、コードの変更なしにデータファイルの編集のみで柔軟に行える。

- **データ形式:** JSON (JavaScript Object Notation)
- **読み込み:** ゲーム起動時に `AssetLoader` がすべてのJSONデータを非同期で読み込み、`game.data` オブジェクトに格納する。
- **アクセス:** 各クラスは `this.game.data` を通じて、必要なパラメータにアクセスする。
- **地形アセットのデータ管理:** `public/data/terrains.json` と `public/data/environments.json` を導入し、地形オブジェクト（木、岩、草など）や環境要素（雲、地面など）のモデル名やテクスチャ名を一元管理する。これにより、ゲーム内の地形要素の追加や変更がデータ編集のみで可能になる。

## 5. アセット管理

### 5.1. アセットのディレクトリ構造

`public/assets` フォルダ内のアセットは、種類と用途に応じて以下の階層で管理する。

```text
public/assets/
├── audio/
│   ├── bgm/          # BGM (General)
│   ├── sfx/          # 効果音
│   └── sequences/    # BGM (Sequences)
├── images/
│   ├── enemies/      # 敵キャラクター画像
│   ├── items/        # アイテム画像
│   ├── npcs/         # NPC画像
│   ├── players/      # プレイヤー画像
│   ├── shields/      # 盾画像
│   ├── skills/       # スキル画像
│   ├── weapons/      # 武器画像
│   ├── terrains/     # 地形オブジェクト画像
│   └── sequences/    # シーケンス関連画像
├── models/
│   ├── enemies/      # 敵キャラクター3Dモデル
│   ├── items/        # アイテム3Dモデル
│   ├── npcs/         # NPC3Dモデル
│   ├── players/      # プレイヤー3Dモデル
│   ├── shields/      # 盾3Dモデル
│   ├── skills/       # スキル3Dモデル
│   ├── weapons/      # 武器3Dモデル
│   ├── terrains/     # 地形オブジェクト3Dモデル
│   └── sequences/    # シーケンス関連3Dモデル
├── textures/
│   ├── enemies/      # 敵キャラクターテクスチャ
│   ├── items/        # アイテムテクスチャ
│   ├── npcs/         # NPCテクスチャ
│   ├── players/      # プレイヤーテクスチャ
│   ├── shields/      # 盾テクスチャ
│   ├── skills/       # スキルテクスチャ
│   ├── weapons/      # 武器テクスチャ
│   ├── terrains/     # 地形オブジェクトテクスチャ
│   └── sequences/    # シーケンス関連テクスチャ
└── videos/
    └── sequences/    # シーケンス関連動画
```

## 6. コーディング規約

- **スタイル:** [Prettier](https://prettier.io/) のデフォルト設定に準拠する。
- **命名規則:**
  - ファイル名: `kebab-case` (例: `input-controller.js`)
  - クラス名: `PascalCase` (例: `InputController`)
  - 関数・変数名: `camelCase` (例: `handleClick`)
- **モジュール:** ES Modules (`import`/`export`) を使用する。

### UI表示制御規約

- **重要:** UI要素の表示/非表示制御は、`style.display`を直接操作するのではなく、CSSクラスを使用する
- **使用するクラス:**
  - `hidden`: 要素を非表示にする
  - `visible`: 要素を表示する（通常のblock/inline要素用）
  - `visible-flex`: 要素を表示する（flex要素用）
- **例:**

  ```javascript
  // 正しい方法
  element.classList.remove('hidden');
  element.classList.add('visible-flex');

  // 間違った方法（使用禁止）
  element.style.display = 'flex';
  ```

## 7. アニメーションシステム

本プロジェクトのアニメーションは、状態ベースとイベント駆動を組み合わせたハイブリッドなアプローチを採用している。

- **`Character.js`:**
  - `THREE.AnimationMixer`を保持し、アニメーションの再生、切り替え（クロスフェード）、ループ設定を管理する責務を持つ。
  - `playAnimation`メソッドは、指定されたアニメーションクリップを再生するための汎用的なインターフェースを提供する。

- **`Player.js` (`updateAnimation`メソッド):**
  - 継続的な状態（待機、歩行、ダッシュ、ジャンプなど）を管理する。
  - `update`ループ内でプレイヤーの現在の速度や状態フラグを評価し、適切なループアニメーションを`playAnimation`メソッドを介してリクエストする。

- **`InputController.js`:**
  - 攻撃やローリングといった、プレイヤーの入力に直接起因する一回再生のアクション（イベント）を管理する。
  - クリックやキープレスを検知した際に、直接`player.playAnimation`を呼び出し、即座にアクションアニメーションをトリガーする。

- **`Player.js` (イベントリスナー):**
  - `AnimationMixer`の`finished`イベントをリッスンする。
  - 一回再生のアニメーション（攻撃など）が完了したことを検知し、キャラクターの状態フラグ（例: `isAttacking`）をリセットする。これにより、キャラクターは次の行動（待機や歩行など）にスムーズに移行できる。

この設計により、継続的な状態と瞬間的なアクションを明確に分離し、複雑な状況下でも堅牢で自然なアニメーション遷移を実現している。

## 8. シーケンス演出の技術的検討

### 8.1. カットシーン（シーケンス演出）の実現方法

- **採用方針:** Three.jsによるリアルタイムレンダリングで実装。AIによるコード生成とゲームの没入感を最大化するため。
- **実装詳細:**
  - `Game` クラス内にシーケンス演出を管理するメソッド（`playOpeningSequence()`, `playEndingSequence()`など）を実装。
  - 各シーケンスは、Three.jsのシーン内でカメラワーク、オブジェクトの配置・アニメーション、テキスト表示などを組み合わせることで実現する。
  - シーケンス中は、`Game.gameState` を新しい状態（例: `GameState.SEQUENCE`）に設定し、プレイヤーの入力や通常のゲームロジックの更新を停止する。
  - シーケンスの進行は、時間経過や特定のアニメーション完了イベントに基づいて制御する。
  - シーケンス終了後、ゲーム状態を元に戻し、次の画面へ遷移させる。

## 9. AudioContext初期化とユーザーインタラクション

### 9.1. ブラウザのAudioContext制約への対応

モダンブラウザでは、AudioContextはユーザーのインタラクション（クリックやタッチ）なしに自動的に開始できない制約がある。この制約に対応するため、以下の仕組みを実装している：

- **クリック開始画面:** `main.js`で「タッチしてはじめる」画面を表示し、ユーザーのクリック/タッチを待機
- **AudioContext初期化:** ユーザーのインタラクション後に`AudioContext.resume()`を実行してオーディオを有効化
- **動的モジュール読み込み:** ユーザーインタラクション後に`import()`でGameクラスを動的に読み込み、初期化を開始

この仕組みにより、ゲーム中のBGMや効果音が確実に再生されるようになっている。

## 10. コーディング規約

### 10.1. スタイルとUI設計規約

- **CSS分離:** インラインスタイル（`style.cssText`）の使用を避け、すべてのスタイルを`public/styles/style.css`に定義する
- **クラスベーススタイル:** HTML要素にはIDまたはクラス名を付与し、CSSで一元管理する
- **スタイル命名規約:**
  - ID: `kebab-case` (例: `stage-info`, `exit-prompt`)
  - クラス: `kebab-case` (例: `.stage-loading`, `.equipment-slot`)

### 10.2. ローカライゼーション規約

- **メッセージ外部化:** ハードコードされたユーザー向けメッセージを`public/data/localization.json`に移動する
- **localizationの使用:**

  ```javascript
  // ❌ 悪い例
  element.textContent = 'ステージ情報';

  // ✅ 良い例
  element.textContent = localization.getText('stages.info');
  ```

- **プレースホルダー対応:** 動的テキストには`{0}`, `{1}`のプレースホルダーを使用

  ```javascript
  // localization.json
  "enemiesRemaining": "敵を倒そう (残り: {0})"

  // JavaScript
  const text = localization.getText('stages.enemiesRemaining').replace('{0}', count);
  ```

### 10.3. ログメッセージ規約

- **言語統一:** すべてのコンソールログメッセージは英語で記述する
- **ログレベル:**
  - `console.log()`: 正常な処理の完了や状態変更
  - `console.warn()`: 警告レベルの問題
  - `console.error()`: エラーや例外的な状況
- **メッセージ形式:**

  ```javascript
  // ✅ 良い例
  console.log(`Stage "${stage.name}" loaded successfully`);
  console.error(`Failed to load stage "${stage.name}":`, error);

  // ❌ 悪い例
  console.log(`ステージ "${stage.name}" をロードしました`);
  ```

### 10.4. UI要素の作成規約

- **DOM要素作成:** UI要素はJavaScriptで動的作成し、CSSクラスを適用する
- **要素識別:** 重要なUI要素には一意のIDを設定する
- **階層構造:** 論理的な親子関係を明確にする

  ```javascript
  // ✅ 良い例
  const container = document.createElement('div');
  container.id = 'stage-info';

  const title = document.createElement('div');
  title.id = 'current-stage-name';
  title.textContent = localization.getText('stages.info');

  container.appendChild(title);
  ```

### 10.5. エラーハンドリング規約

- **try-catch使用:** 非同期処理や外部データアクセスには必ずtry-catchを使用
- **フォールバック実装:** エラー時の代替処理を用意する
- **ユーザー通知:** 必要に応じてユーザーにエラー状況を通知する（ローディング画面など）

この規約に従うことで、コードの保守性、国際化対応、および開発者体験の向上を図る。

## 11. 戦闘システムアーキテクチャ

### 11.1. 攻撃パターンシステム

- **弱攻撃/強攻撃:** キャラクターごとに異なる攻撃パターンを実装
- **範囲攻撃（AoE）:** スキルシステムを通じた範囲攻撃の実装
- **ボス専用AI:** ユニークな行動パターンを持つボスエンティティ

### 11.2. スキルシステム

- **バフスキル:** プレイヤー能力向上効果
- **プロジェクタイルスキル:** 飛び道具による攻撃
- **エリア攻撃スキル:** 範囲内の敵に対する攻撃

## 12. オーディオシステム

### 12.1. 動的オーディオ管理

- **足音システム:** 距離に基づく音量調整とプレイヤー/敵の足音管理
- **BGM管理:** シーケンス、レベル、タイトル用のBGM分類
- **効果音システム:** アクション、UI、環境音の統合管理

### 12.2. 3D音響

- **距離減衰:** プレイヤーからの距離に基づく音量制御
- **方向性オーディオ:** Three.jsの3D空間での音源定位

## 13. CSSアーキテクチャ

### 13.1. コンポーネント分割

CSSは機能別に分割し、`public/styles/components/` ディレクトリで管理：

- `_base.css` - 基本スタイル（html, body, canvas）
- `_hud.css` - HUD関連UI
- `_pause-menu.css` - ポーズメニュー
- `_dialog-box.css` - ダイアログボックス
- `_title-screen.css` - タイトル画面、スプラッシュ画面
- `_sequence.css` - シーケンス関連
- `_animations.css` - キーフレームアニメーション
- `_utilities.css` - 表示制御ユーティリティクラス

### 13.2. インポート構造

`public/styles/style.css` は分割ファイルを `@import` するメインファイルとして機能し、依存関係を考慮した順序でインポートを行う。
