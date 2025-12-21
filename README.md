# YouTube Timestamp Memo

YouTubeで動画を見ながら、タイムスタンプ付きのメモを簡単に保存できるChrome拡張機能です。
保存したメモはGoogleスプレッドシートに記録され、後から見返すことができます。

## 機能

- **ショートカットでメモ入力**: `Ctrl + M` でメモパネルを開閉
- **自動タイムスタンプ**: メモ保存時に自動で動画の再生位置を記録（5秒前の位置）
- **ワンクリックで該当箇所へジャンプ**: タイムスタンプをクリックするとその時点に移動
- **Googleスプレッドシート連携**: メモはすべてスプレッドシートに保存され、後から確認可能

## 導入方法

### 1. ファイルをダウンロード

このリポジトリをダウンロードまたはクローンしてください。

```
git clone https://github.com/your-username/youtube-timestamp-memo.git
```

または、緑色の「Code」ボタンから「Download ZIP」でダウンロードできます。

### 2. Googleスプレッドシートの準備

1. [Googleスプレッドシート](https://sheets.google.com)で新しいスプレッドシートを作成
2. メニューから「拡張機能」→「Apps Script」を開く
3. 表示されたエディタに、`gas/server.js` の内容をすべてコピー＆ペースト
4. 右上の「デプロイ」→「新しいデプロイ」をクリック
5. 種類で「ウェブアプリ」を選択
6. 以下のように設定:
   - 説明: 任意（例: YouTube Memo API）
   - 次のユーザーとして実行: 自分
   - アクセスできるユーザー: 全員
7. 「デプロイ」をクリックし、表示されたURLをコピー

### 3. 設定ファイルの作成

1. `extension` フォルダ内の `config.sample.js` を `config.js` という名前で保存
2. `config.js` を開き、先ほどコピーしたURLを貼り付け:

```javascript
const GAS_API_URL = "https://script.google.com/macros/s/xxxxx/exec";
```

### 4. Chrome拡張機能のインストール

1. Chromeで `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. ダウンロードした `extension` フォルダを選択

これでインストール完了です。

## 使い方

1. YouTubeで動画を開く
2. `Ctrl + M` を押すか、画面右端のペンアイコンをクリックしてメモパネルを開く
3. メモを入力して `Enter` で保存
4. 保存したメモは一覧に表示され、タイムスタンプをクリックするとその位置にジャンプ
5. 「シートを開く」ボタンでGoogleスプレッドシートを直接開ける

## ファイル構成

```
youtube-timestamp-memo/
├── extension/          # Chrome拡張機能
│   ├── manifest.json   # 拡張機能の設定
│   ├── config.sample.js # 設定ファイルのサンプル
│   ├── content.js      # メインのスクリプト
│   └── style.css       # スタイル
└── gas/                # Google Apps Script
    └── server.js       # サーバー側スクリプト
```
