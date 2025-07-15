import type { SyncMarker } from "../types";

interface SynchronizationState {
	sessionStartTime: number;
	syncMarkers: SyncMarker[];
	syncIntervalId: number | null;
	sessionId: string;
}

let synchronizationState: SynchronizationState = {
	sessionStartTime: 0,
	syncMarkers: [],
	syncIntervalId: null,
	sessionId: "",
};

export const initializeSynchronization = (sessionId: string): void => {
	synchronizationState.sessionId = sessionId;
	synchronizationState.sessionStartTime = performance.now();
	synchronizationState.syncMarkers = [];
	startAutomaticSyncMarkers();
};

export const getRelativeTimestamp = (): number => {
	return performance.now() - synchronizationState.sessionStartTime;
};

export const addSyncMarker = (
	type: string,
	data?: Record<string, unknown>,
): SyncMarker => {
	const marker: SyncMarker = {
		id: generateSyncMarkerId(),
		sessionId: synchronizationState.sessionId,
		type,
		timestamp: getRelativeTimestamp(),
		systemTimestamp: Date.now(),
		browserTimestamp: performance.now(),
		data,
	};

	synchronizationState.syncMarkers.push(marker);
	return marker;
};

export const syncTimestamps = (
	systemTime: number,
	browserTime: number,
): { offset: number; drift: number } => {
	const currentBrowserTime = performance.now();
	const currentSystemTime = Date.now();

	const browserTimeDiff = currentBrowserTime - browserTime;
	const systemTimeDiff = currentSystemTime - systemTime;

	const offset = systemTimeDiff - browserTimeDiff;
	const drift = Math.abs(offset);

	if (drift > 16) {
		console.warn(`Time drift detected: ${drift}ms`);
	}

	return { offset, drift };
};

export const validateDataSync = (
	gazeTimestamp: number,
	videoTimestamp: number,
): boolean => {
	const timeDiff = Math.abs(gazeTimestamp - videoTimestamp);
	return timeDiff <= 16; // 1フレーム以内
};

export const getSynchronizationMarkers = (): SyncMarker[] => {
	return [...synchronizationState.syncMarkers];
};

const startAutomaticSyncMarkers = (): void => {
	synchronizationState.syncIntervalId = setInterval(() => {
		addSyncMarker("auto_sync", {
			markerId: `sync_${Date.now()}`,
			timestamp: getRelativeTimestamp(),
		});
	}, 1000) as unknown as number; // 1秒ごと
};

const generateSyncMarkerId = (): string => {
	return `sync_${synchronizationState.sessionId}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

export const stopSynchronization = (): void => {
	if (synchronizationState.syncIntervalId) {
		clearInterval(synchronizationState.syncIntervalId);
		synchronizationState.syncIntervalId = null;
	}
};

export const getSessionStartTime = (): number => {
	return synchronizationState.sessionStartTime;
};

export const calculateSyncQuality = (): {
	maxTimeOffset: number;
	averageOffset: number;
	quality: "excellent" | "good" | "fair" | "poor";
} => {
	if (synchronizationState.syncMarkers.length <= 1) {
		return { maxTimeOffset: 0, averageOffset: 0, quality: "poor" };
	}

	let totalOffset = 0;
	let maxOffset = 0;

	for (let i = 1; i < synchronizationState.syncMarkers.length; i++) {
		const prev = synchronizationState.syncMarkers[i - 1];
		const curr = synchronizationState.syncMarkers[i];

		if (prev && curr) {
			const expectedDiff = curr.timestamp - prev.timestamp;
			const actualDiff = curr.browserTimestamp - prev.browserTimestamp;
			const offset = Math.abs(expectedDiff - actualDiff);

			totalOffset += offset;
			maxOffset = Math.max(maxOffset, offset);
		}
	}

	const averageOffset =
		totalOffset / (synchronizationState.syncMarkers.length - 1);

	let quality: "excellent" | "good" | "fair" | "poor";
	if (maxOffset <= 5) quality = "excellent";
	else if (maxOffset <= 16) quality = "good";
	else if (maxOffset <= 33) quality = "fair";
	else quality = "poor";

	return { maxTimeOffset: maxOffset, averageOffset, quality };
};

export const resetSynchronizationState = (): void => {
	stopSynchronization();
	synchronizationState = {
		sessionStartTime: 0,
		syncMarkers: [],
		syncIntervalId: null,
		sessionId: "",
	};
};
