import type {
	ExperimentSession,
	VideoChunk,
	GazePoint,
	SessionEvent,
	SyncMarker,
} from "../types";

export class ExperimentDatabase {
	private db: IDBDatabase | null = null;
	private readonly DB_NAME = "ExperimentDB";
	private readonly DB_VERSION = 1;

	async initialize(): Promise<void> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

			request.onerror = () => {
				reject(new Error("Failed to open database"));
			};

			request.onsuccess = () => {
				this.db = request.result;
				resolve();
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				this.createStores(db);
			};
		});
	}

	private createStores(db: IDBDatabase): void {
		if (!db.objectStoreNames.contains("sessions")) {
			const sessionsStore = db.createObjectStore("sessions", {
				keyPath: "sessionId",
			});
			sessionsStore.createIndex("startTime", "startTime", { unique: false });
			sessionsStore.createIndex("status", "status", { unique: false });
		}

		if (!db.objectStoreNames.contains("videoChunks")) {
			const videoStore = db.createObjectStore("videoChunks", { keyPath: "id" });
			videoStore.createIndex("sessionId", "sessionId", { unique: false });
			videoStore.createIndex("timestamp", "timestamp", { unique: false });
		}

		if (!db.objectStoreNames.contains("gazeData")) {
			const gazeStore = db.createObjectStore("gazeData", {
				keyPath: "id",
				autoIncrement: true,
			});
			gazeStore.createIndex("sessionId", "sessionId", { unique: false });
			gazeStore.createIndex("timestamp", "browserTimestamp", { unique: false });
		}

		if (!db.objectStoreNames.contains("events")) {
			const eventsStore = db.createObjectStore("events", {
				keyPath: "id",
				autoIncrement: true,
			});
			eventsStore.createIndex("sessionId", "sessionId", { unique: false });
			eventsStore.createIndex("timestamp", "timestamp", { unique: false });
			eventsStore.createIndex("type", "type", { unique: false });
		}

		if (!db.objectStoreNames.contains("syncMarkers")) {
			const syncStore = db.createObjectStore("syncMarkers", {
				keyPath: "id",
				autoIncrement: true,
			});
			syncStore.createIndex("sessionId", "sessionId", { unique: false });
			syncStore.createIndex("timestamp", "timestamp", { unique: false });
		}
	}

	async saveSession(session: ExperimentSession): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");

		const transaction = this.db.transaction(["sessions"], "readwrite");
		const store = transaction.objectStore("sessions");

		return new Promise((resolve, reject) => {
			const request = store.put(session);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	async getSession(sessionId: string): Promise<ExperimentSession | null> {
		if (!this.db) throw new Error("Database not initialized");

		const transaction = this.db.transaction(["sessions"], "readonly");
		const store = transaction.objectStore("sessions");

		return new Promise((resolve, reject) => {
			const request = store.get(sessionId);
			request.onsuccess = () => resolve(request.result || null);
			request.onerror = () => reject(request.error);
		});
	}

	async saveVideoChunk(chunk: VideoChunk): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");

		const transaction = this.db.transaction(["videoChunks"], "readwrite");
		const store = transaction.objectStore("videoChunks");

		return new Promise((resolve, reject) => {
			const request = store.put(chunk);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	async saveGazeData(gazePoints: GazePoint[]): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");

		const transaction = this.db.transaction(["gazeData"], "readwrite");
		const store = transaction.objectStore("gazeData");

		return new Promise((resolve, reject) => {
			let completed = 0;

			gazePoints.forEach((point) => {
				const request = store.add(point);
				request.onsuccess = () => {
					completed++;
					if (completed === gazePoints.length) resolve();
				};
				request.onerror = () => reject(request.error);
			});
		});
	}

	async saveEvent(event: SessionEvent): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");

		const transaction = this.db.transaction(["events"], "readwrite");
		const store = transaction.objectStore("events");

		return new Promise((resolve, reject) => {
			const request = store.add(event);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	async saveSyncMarker(marker: SyncMarker): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");

		const transaction = this.db.transaction(["syncMarkers"], "readwrite");
		const store = transaction.objectStore("syncMarkers");

		return new Promise((resolve, reject) => {
			const request = store.add(marker);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	async getSessionData(sessionId: string): Promise<{
		session: ExperimentSession | null;
		videoChunks: VideoChunk[];
		gazeData: GazePoint[];
		events: SessionEvent[];
		syncMarkers: SyncMarker[];
	}> {
		if (!this.db) throw new Error("Database not initialized");

		const [session, videoChunks, gazeData, events, syncMarkers] =
			await Promise.all([
				this.getSession(sessionId),
				this.getVideoChunks(sessionId),
				this.getGazeData(sessionId),
				this.getEvents(sessionId),
				this.getSyncMarkers(sessionId),
			]);

		return { session, videoChunks, gazeData, events, syncMarkers };
	}

	async getVideoChunks(sessionId: string): Promise<VideoChunk[]> {
		if (!this.db) throw new Error("Database not initialized");

		const transaction = this.db.transaction(["videoChunks"], "readonly");
		const store = transaction.objectStore("videoChunks");
		const index = store.index("sessionId");

		return new Promise((resolve, reject) => {
			const request = index.getAll(sessionId);
			request.onsuccess = () => resolve(request.result || []);
			request.onerror = () => reject(request.error);
		});
	}

	async getGazeData(sessionId: string): Promise<GazePoint[]> {
		if (!this.db) throw new Error("Database not initialized");

		const transaction = this.db.transaction(["gazeData"], "readonly");
		const store = transaction.objectStore("gazeData");
		const index = store.index("sessionId");

		return new Promise((resolve, reject) => {
			const request = index.getAll(sessionId);
			request.onsuccess = () => resolve(request.result || []);
			request.onerror = () => reject(request.error);
		});
	}

	async getEvents(sessionId: string): Promise<SessionEvent[]> {
		if (!this.db) throw new Error("Database not initialized");

		const transaction = this.db.transaction(["events"], "readonly");
		const store = transaction.objectStore("events");
		const index = store.index("sessionId");

		return new Promise((resolve, reject) => {
			const request = index.getAll(sessionId);
			request.onsuccess = () => resolve(request.result || []);
			request.onerror = () => reject(request.error);
		});
	}

	async getSyncMarkers(sessionId: string): Promise<SyncMarker[]> {
		if (!this.db) throw new Error("Database not initialized");

		const transaction = this.db.transaction(["syncMarkers"], "readonly");
		const store = transaction.objectStore("syncMarkers");
		const index = store.index("sessionId");

		return new Promise((resolve, reject) => {
			const request = index.getAll(sessionId);
			request.onsuccess = () => resolve(request.result || []);
			request.onerror = () => reject(request.error);
		});
	}

	async checkForIncompleteSessions(): Promise<ExperimentSession[]> {
		if (!this.db) throw new Error("Database not initialized");

		const transaction = this.db.transaction(["sessions"], "readonly");
		const store = transaction.objectStore("sessions");
		const index = store.index("status");

		return new Promise((resolve, reject) => {
			const request = index.getAll("recording");
			request.onsuccess = () => resolve(request.result || []);
			request.onerror = () => reject(request.error);
		});
	}

	async deleteSession(sessionId: string): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");

		const transaction = this.db.transaction(
			["sessions", "videoChunks", "gazeData", "events", "syncMarkers"],
			"readwrite",
		);

		const promises = [
			this.deleteFromStore(transaction, "sessions", sessionId),
			this.deleteFromIndex(transaction, "videoChunks", "sessionId", sessionId),
			this.deleteFromIndex(transaction, "gazeData", "sessionId", sessionId),
			this.deleteFromIndex(transaction, "events", "sessionId", sessionId),
			this.deleteFromIndex(transaction, "syncMarkers", "sessionId", sessionId),
		];

		await Promise.all(promises);
	}

	private deleteFromStore(
		transaction: IDBTransaction,
		storeName: string,
		key: string,
	): Promise<void> {
		return new Promise((resolve, reject) => {
			const store = transaction.objectStore(storeName);
			const request = store.delete(key);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	private deleteFromIndex(
		transaction: IDBTransaction,
		storeName: string,
		indexName: string,
		key: string,
	): Promise<void> {
		return new Promise((resolve, reject) => {
			const store = transaction.objectStore(storeName);
			const index = store.index(indexName);
			const request = index.getAllKeys(key);

			request.onsuccess = () => {
				const keys = request.result;
				let deleted = 0;

				keys.forEach((keyToDelete) => {
					const deleteRequest = store.delete(keyToDelete);
					deleteRequest.onsuccess = () => {
						deleted++;
						if (deleted === keys.length) resolve();
					};
					deleteRequest.onerror = () => reject(deleteRequest.error);
				});

				if (keys.length === 0) resolve();
			};

			request.onerror = () => reject(request.error);
		});
	}
}
