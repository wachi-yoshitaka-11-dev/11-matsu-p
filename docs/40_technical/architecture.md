# 技術アーキテクチャ

## 1. 基本構成

本プロジェクトは、特別なサーバーサイドやビルド環境を必要としない、シンプルなフロントエンド技術のみで構成する。

- **実行環境:** モダンブラウザ (Google Chrome, Firefox, Safari, Edge)
- **主要言語:** HTML, CSS, JavaScript (ES6+)

## 2. 主要ライブラリ・フレームワーク

|役割|技術|選定理由|
|---|---|---|
|**3Dレンダリング**|**Three.js**|Web 3Dのデファクトスタンダードであり、豊富なドキュメントとコミュニティを持つ。AIによるコード生成においても、学習データが豊富で安定した出力を期待できる。|
|**物理演算**|**自前実装**|現在はライブラリに頼らず、自前の簡易的な当たり判定と重力計算を実装している。|
|**UI**|**素のHTML/CSS**|素のHTML/CSSとDOM操作でUIを構築している。|

## 3. ディレクトリ構成（src）

開発を進めるにあたり、`src`フォルダ内を機能ごとに分割して管理する。

```
src/
├── main.js           # ゲームのメインループ、全体管理
├── core/
│   ├── Game.js         # ゲームのメインクラス
│   ├── SceneManager.js # シーン（舞台）の管理
│   └── AssetLoader.js  # 3Dモデルやテクスチャの読み込み
├── entities/
│   ├── Player.js       # プレイヤーキャラクター
│   ├── Enemy.js        # 敵キャラクター
│   └── Npc.js          # NPC
├── world/
│   ├── Field.js        # 地形や背景の生成
│   └── Light.js        # ライトの設定
├── controls/
│   └── InputController.js # キーボード・マウス入力の管理
├── ui/
│   └── Hud.js          # 画面表示（HPゲージなど）
└── utils/
    └── constants.js    # 定数管理
```

## 4. アセット管理

- **3Dモデル/テクスチャ:** 当初はThree.jsのプリミティブ形状（`BoxGeometry`, `SphereGeometry`など）と基本的なマテリアル（`MeshStandardMaterial`など）で全てを表現する。
- **サウンド:** フリー素材サイトなどを活用し、必要に応じて追加する。

## 5. コーディング規約

- **スタイル:** [Prettier](https://prettier.io/) のデフォルト設定に準拠する。
- **命名規則:**
  - ファイル名: `kebab-case` (例: `input-controller.js`)
  - クラス名: `PascalCase` (例: `InputController`)
  - 関数・変数名: `camelCase` (例: `handleClick`)
- **モジュール:** ES Modules (`import`/`export`) を使用する。
