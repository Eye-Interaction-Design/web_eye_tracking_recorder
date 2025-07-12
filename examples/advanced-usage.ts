import {
	initializeExperiment,
	createSession,
	startExperiment,
	stopExperiment,
	calibrateEyeTracking,
	onGazeData,
	onSessionEvent,
	onCalibration,
	getCurrentSession,
	getQualityMetrics,
	disconnect,
} from "browser-eye-tracking";

// 高度な使用例：複数の実験セッションとエラーハンドリング
async function advancedUsage() {
	try {
		// 初期化
		await initializeExperiment({
			eyeTrackingServerUrl: "ws://localhost:8080",
			recording: {
				captureEntireScreen: true,
				frameRate: 60,
				quality: "high",
				chunkDuration: 30,
			},
			gazeTracking: {
				samplingRate: 120,
				calibrationPoints: 13,
				deviceType: "eyetracker",
			},
		});

		// 複数の参加者での実験
		const participants = ["P001", "P002", "P003"];
		const results = [];

		for (const participantId of participants) {
			console.log(`\nStarting experiment for participant: ${participantId}`);

			try {
				// セッション作成
				const sessionId = await createSession({
					participantId,
					experimentType: "visual_attention_study",
					recording: {
						captureEntireScreen: true,
						frameRate: 60,
						quality: "high",
					},
					gazeTracking: {
						samplingRate: 120,
						calibrationPoints: 13,
					},
				});

				// 詳細なイベントハンドラー
				let gazeDataCount = 0;
				let lastGazeData: any = null;

				onGazeData((gazePoint) => {
					gazeDataCount++;
					lastGazeData = gazePoint;
					
					// 品質チェック
					if (gazePoint.confidence < 0.7) {
						console.warn(`Low confidence gaze data: ${gazePoint.confidence}`);
					}

					// 1秒ごとにログ出力
					if (gazeDataCount % 120 === 0) {
						console.log(`Gaze data count: ${gazeDataCount}`);
					}
				});

				onSessionEvent((event) => {
					console.log(`[${participantId}] ${event.type}: ${event.timestamp}ms`);
				});

				onCalibration((result) => {
					console.log(`[${participantId}] Calibration result:`, result);
				});

				// キャリブレーションの実行
				const calibrationResult = await calibrateEyeTracking();
				if (calibrationResult.accuracy < 0.8) {
					console.warn(`Low calibration accuracy: ${calibrationResult.accuracy}`);
				}

				// 実験開始
				await startExperiment();

				// 5分間の実験をシミュレート
				await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));

				// 実験終了
				const experimentResult = await stopExperiment();
				
				// 品質メトリクスの取得
				const metrics = await getQualityMetrics();
				
				results.push({
					participantId,
					sessionId: experimentResult.sessionId,
					calibrationAccuracy: calibrationResult.accuracy,
					gazeDataCount,
					lastGazeData,
					metrics,
					success: true,
				});

			} catch (error) {
				console.error(`Error for participant ${participantId}:`, error);
				results.push({
					participantId,
					success: false,
					error: error.message,
				});
			}
		}

		// 結果の集計
		console.log("\n=== Experiment Results ===");
		const successfulResults = results.filter(r => r.success);
		const failedResults = results.filter(r => !r.success);

		console.log(`Successful experiments: ${successfulResults.length}`);
		console.log(`Failed experiments: ${failedResults.length}`);

		if (successfulResults.length > 0) {
			const avgAccuracy = successfulResults.reduce((sum, r) => sum + r.calibrationAccuracy, 0) / successfulResults.length;
			console.log(`Average calibration accuracy: ${avgAccuracy.toFixed(3)}`);
			
			const avgGazeDataCount = successfulResults.reduce((sum, r) => sum + r.gazeDataCount, 0) / successfulResults.length;
			console.log(`Average gaze data points: ${avgGazeDataCount.toFixed(0)}`);
		}

		// 詳細な結果をログ出力
		results.forEach(result => {
			console.log(`\n[${result.participantId}]:`);
			if (result.success) {
				console.log(`  Session ID: ${result.sessionId}`);
				console.log(`  Calibration accuracy: ${result.calibrationAccuracy}`);
				console.log(`  Gaze data count: ${result.gazeDataCount}`);
				console.log(`  Recording quality: ${result.metrics.recordingQuality.averageFrameRate}fps`);
				console.log(`  Sync quality: ${result.metrics.syncQuality.quality}`);
			} else {
				console.log(`  Error: ${result.error}`);
			}
		});

		disconnect();

	} catch (error) {
		console.error("Critical error:", error);
		disconnect();
	}
}

// エラーハンドリングの例
async function errorHandlingExample() {
	try {
		// 不正な設定での初期化
		await initializeExperiment({
			eyeTrackingServerUrl: "ws://invalid-url:8080",
			recording: {
				frameRate: -1, // 不正な値
			},
			gazeTracking: {
				samplingRate: 0, // 不正な値
			},
		});
	} catch (error) {
		console.error("Initialization error:", error.message);
	}
}

// 実行
advancedUsage();