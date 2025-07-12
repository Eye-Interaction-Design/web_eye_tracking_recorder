import type { SyncMarker } from "../types";

export class SyncSystem {
	private sessionStartTime: number = 0;
	private syncMarkers: SyncMarker[] = [];
	private syncIntervalId: number | null = null;
	private sessionId: string = "";

	initializeSync(sessionId: string): void {
		this.sessionId = sessionId;
		this.sessionStartTime = performance.now();
		this.syncMarkers = [];
		this.startAutoSyncMarkers();
	}

	getRelativeTimestamp(): number {
		return performance.now() - this.sessionStartTime;
	}

	addSyncMarker(type: string, data?: Record<string, unknown>): SyncMarker {
		const marker: SyncMarker = {
			id: this.generateMarkerId(),
			sessionId: this.sessionId,
			type,
			timestamp: this.getRelativeTimestamp(),
			systemTimestamp: Date.now(),
			browserTimestamp: performance.now(),
			data,
		};

		this.syncMarkers.push(marker);
		return marker;
	}

	syncTimestamps(
		systemTime: number,
		browserTime: number,
	): { offset: number; drift: number } {
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
	}

	validateDataSync(gazeTimestamp: number, videoTimestamp: number): boolean {
		const timeDiff = Math.abs(gazeTimestamp - videoTimestamp);
		return timeDiff <= 16; // 1フレーム以内
	}

	getSyncMarkers(): SyncMarker[] {
		return [...this.syncMarkers];
	}

	private startAutoSyncMarkers(): void {
		this.syncIntervalId = setInterval(() => {
			this.addSyncMarker("auto_sync", {
				markerId: `sync_${Date.now()}`,
				timestamp: this.getRelativeTimestamp(),
			});
		}, 1000) as unknown as number; // 1秒ごと
	}

	private generateMarkerId(): string {
		return `sync_${this.sessionId}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
	}

	stopSync(): void {
		if (this.syncIntervalId) {
			clearInterval(this.syncIntervalId);
			this.syncIntervalId = null;
		}
	}

	getSessionStartTime(): number {
		return this.sessionStartTime;
	}

	calculateSyncQuality(): {
		maxTimeOffset: number;
		averageOffset: number;
		quality: "excellent" | "good" | "fair" | "poor";
	} {
		if (this.syncMarkers.length <= 1) {
			return { maxTimeOffset: 0, averageOffset: 0, quality: "poor" };
		}

		let totalOffset = 0;
		let maxOffset = 0;

		for (let i = 1; i < this.syncMarkers.length; i++) {
			const prev = this.syncMarkers[i - 1];
			const curr = this.syncMarkers[i];

			if (prev && curr) {
				const expectedDiff = curr.timestamp - prev.timestamp;
				const actualDiff = curr.browserTimestamp - prev.browserTimestamp;
				const offset = Math.abs(expectedDiff - actualDiff);

				totalOffset += offset;
				maxOffset = Math.max(maxOffset, offset);
			}
		}

		const averageOffset = totalOffset / (this.syncMarkers.length - 1);

		let quality: "excellent" | "good" | "fair" | "poor";
		if (maxOffset <= 5) quality = "excellent";
		else if (maxOffset <= 16) quality = "good";
		else if (maxOffset <= 33) quality = "fair";
		else quality = "poor";

		return { maxTimeOffset: maxOffset, averageOffset, quality };
	}
}
