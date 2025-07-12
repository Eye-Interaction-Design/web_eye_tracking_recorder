# Experiment Recorder Examples

実験用画面録画・視線追跡統合システムの使用例とデモ

## セットアップ

```bash
# examplesディレクトリに移動
cd examples

# 依存関係をインストール
bun install

# メインライブラリをビルド（必要に応じて）
cd ..
bun run build
cd examples
```

## 実行方法

### 1. 基本的な使用例

```bash
bun run basic
```

基本的なAPIの使用方法を示すサンプルです：
- システムの初期化
- セッションの作成
- キャリブレーションの実行
- 実験の開始・停止
- 品質メトリクスの確認

### 2. 高度な使用例

```bash
bun run advanced
```

より複雑なシナリオでの使用方法を示すサンプルです：
- 複数参加者での実験
- 詳細なエラーハンドリング
- リアルタイム品質監視
- 結果の集計と分析

### 3. ブラウザデモ

```bash
bun run serve
```

ブラウザで http://localhost:3000 にアクセスすると、インタラクティブなデモが実行できます：
- ウェブUI での実験制御
- リアルタイム視線位置表示
- キャリブレーション画面
- 品質メトリクスの可視化

## ファイル構成

```
examples/
├── package.json           # サンプル用の依存関係
├── basic-usage.ts         # 基本的な使用例
├── advanced-usage.ts      # 高度な使用例
├── browser-example.html   # ブラウザデモ
├── server.ts             # デモサーバー
└── README.md             # このファイル
```

## カスタマイズ

### 設定の変更

各サンプルファイルで設定を変更できます：

```typescript
await initializeExperiment({
  eyeTrackingServerUrl: 'ws://your-server:8080',
  recording: {
    captureEntireScreen: false,
    frameRate: 60,
    quality: 'high'
  },
  gazeTracking: {
    samplingRate: 120,
    calibrationPoints: 13
  }
});
```

### 視線追跡サーバー

実際の視線追跡を使用する場合は、WebSocketサーバーが必要です。
サーバーは以下のメッセージフォーマットに対応している必要があります：

```javascript
// キャリブレーション開始
{
  "type": "calibration:start",
  "points": 9
}

// 視線データ
{
  "screenX": 500,
  "screenY": 300,
  "confidence": 0.95,
  "leftEye": { /* eye data */ },
  "rightEye": { /* eye data */ }
}
```

## 注意事項

1. **HTTPS必須**: 画面録画機能は HTTPS 環境または localhost でのみ動作します
2. **ブラウザサポート**: Chrome 88+, Firefox 78+, Safari 14+, Edge 88+ が必要です
3. **权限**: 画面録画と WebSocket 接続には適切な権限が必要です

## トラブルシューティング

### よくある問題

1. **画面録画が開始されない**
   - HTTPS環境で実行しているか確認
   - ブラウザで画面共有権限を許可しているか確認

2. **視線追跡が接続されない**
   - WebSocketサーバーが起動しているか確認
   - URLが正しいか確認

3. **ビルドエラー**
   ```bash
   # メインライブラリを再ビルド
   cd ..
   bun run build
   cd examples
   bun install
   ```

## 参考資料

- [API Documentation](../docs/API.md)
- [Main Library](../src/)
- [Type Definitions](../src/types/)