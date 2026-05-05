# レシート管理アプリ（Receipt Tracker）

同居人との共有生活費を管理するためのサーバーレスアプリ。

## 概要

レシート画像をアップロードして、商品ごとに「共有 / 自分」に分類。月別で集計して、共有口座からの振替金額を自動計算する。

## 現在の実装状況（MVP）

- ✅ レシート画像のアップロード（S3保存）
- ✅ OCRで店名・日付・合計金額を抽出（Claude API）
- ✅ DynamoDBに保存
- ✅ カテゴリ分類API（PATCH /update）
- ✅ 月別集計API（GET /monthly）
- 🚧 フロントエンド（次のスプリント）
- 🚧 商品別OCR

## 技術スタック

- **Lambda**: Python 3.14
- **API Gateway**: HTTP API
- **DynamoDB**: NoSQL DB
- **S3**: 画像保存
- **Claude API**: OCR（Haiku 4.5）

## API仕様

### POST /upload
レシート画像をアップロード＋OCR＋DB保存

**Request Body:**
```json
{
  "image": "base64-encoded-image"
}
```

**Response:**
```json
{
  "message": "Success",
  "receipt_id": "receipt_20260503_125844",
  "extracted": {
    "store": "ドラッグストア",
    "date": "2026年05月03日",
    "amount": 1328
  }
}
```

### PATCH /update
カテゴリ更新

**Request Body:**
```json
{
  "receipt_id": "receipt_20260503_125844",
  "category": "共有"
}
```

### GET /monthly?year_month=202605
月別集計

**Response:**
```json
{
  "year_month": "202605",
  "total_shared": 5000,
  "total_personal": 3000,
  "total": 8000
}
```

## 開発ログ

### スプリント1（2026/05/03）
- S3バケット作成
- DynamoDBテーブル作成
- Lambda関数作成
- API Gateway設定

### スプリント2（2026/05/04）
- Claude APIでOCR実装
- DynamoDBへの保存機能

### スプリント3（2026/05/04）
- カテゴリ更新API
- 月別集計API

### 改善（2026/05/05）
- OCRプロンプトを修正：合計金額の抽出精度向上
  （「レシートの「合計」「小計」のうち最も大きな金額。消費税込みの金額を抽出。」を明示）
- エラーハンドリング追加：JSONパース失敗時のログ出力

## 次のステップ

- [ ] React UIの作成
- [ ] CDK/SAMでインフラコード化
- [ ] 商品別OCR対応
- [ ] 精算金額の自動計算

## 関連記事

- [同居人との生活費管理を楽にしたくてレシート管理アプリを作った（前編）](https://zenn.dev/machis/articles/7abe5e3199a91d)
