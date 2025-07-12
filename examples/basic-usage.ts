import {
	initializeExperiment,
	createSession,
	startExperiment,
	stopExperiment,
	calibrateGazeTracking,
	onGazeData,
	onSessionEvent,
	getCurrentSession,
	isCurrentlyRecording,
	getQualityMetrics,
	disconnect,
} from "experiment-recorder";

// 基本的な使用例
async function basicUsage() {
	try {
		console.log("Initializing experiment...");
		
		// 実験システムの初期化
		await initializeExperiment({
			eyeTrackingServerUrl: "ws://localhost:8080",
			recording: {
				captureEntireScreen: false,
				frameRate: 30,
				quality: "high",
			},
			gazeTracking: {
				samplingRate: 60,
				calibrationPoints: 9,
				deviceType: "eyetracker",
			},
		});

		// セッションの作成
		const sessionId = await createSession({
			participantId: "P001",
			experimentType: "web_browsing_study",
			recording: {
				captureEntireScreen: false,
				frameRate: 30,
				quality: "high",
			},
			gazeTracking: {
				samplingRate: 60,
				calibrationPoints: 9,
			},
		});

		console.log(`Session created: ${sessionId}`);

		// イベントリスナーの設定
		onGazeData((gazePoint) => {
			console.log(`Gaze: (${gazePoint.screenX}, ${gazePoint.screenY})`);
		});

		onSessionEvent((event) => {
			console.log(`Event: ${event.type} at ${event.timestamp}ms`);
		});

		// キャリブレーションの実行
		console.log("Starting calibration...");
		const calibrationResult = await calibrateGazeTracking();
		console.log(`Calibration accuracy: ${calibrationResult.accuracy}`);

		// 実験の開始
		console.log("Starting experiment...");
		await startExperiment();

		// 実験の進行状況を確認
		console.log(`Recording: ${isCurrentlyRecording()}`);
		console.log(`Current session:`, getCurrentSession());

		// 15分間の実験をシミュレート
		console.log("Running experiment for 15 minutes...");
		await new Promise((resolve) => setTimeout(resolve, 15 * 60 * 1000));

		// 実験の終了
		console.log("Stopping experiment...");
		const result = await stopExperiment();
		console.log(`Experiment completed. Session: ${result.sessionId}`);

		// 品質メトリクスの確認
		const metrics = await getQualityMetrics();
		console.log("Quality metrics:", metrics);

		// 接続の切断
		disconnect();

	} catch (error) {
		console.error("Error during experiment:", error);
	}
}

// 実行
basicUsage();