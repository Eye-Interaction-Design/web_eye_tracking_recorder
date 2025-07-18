import { SessionInfo } from "../../packages/eye-analysis/dist/recorder/types";

import {
  initialize,
  startRecording,
  stopRecording,
  onStateChanged,
  downloadSession,
  onGaze,
  type ExperimentConfig,
  type RecorderState,
  type RecordingMode,
} from "../../packages/eye-analysis/experiment";

import { addEvent } from "../../packages/eye-analysis/recorder/core";

import { exportExperimentDataset } from "../../packages/eye-analysis/recorder/export";

import {
  getCurrentTrackingMode,
  getTrackingQuality,
  isTrackingActive,
  websocketTrackingAdaptor,
  mouseTrackingAdaptor,
  TrackingAdaptor,
} from "../../packages/eye-analysis/tracking/index";

import {
  formatDuration,
  generateTimestamp,
  isValidWebSocketUrl,
} from "../../packages/eye-analysis/utils";

// Application state
interface AppState {
  logs: string[];
  participantId: string;
  eyeTrackingServerUrl: string;
  recordingMode: RecordingMode;
  sessions: Map<string, SessionInfo>;
  adaptorType: "eye-tracking" | "mouse-simulation" | null;
  experimentState: {
    isInitialized: boolean;
    isRecording: boolean;
    currentSession: SessionInfo | null;
    gazeDataCount: number;
    eventsCount: number;
    recordingDuration: number;
    error: string | null;
  };
}

const appState: AppState = {
  logs: [],
  participantId: "participant-001",
  eyeTrackingServerUrl: "ws://localhost:8000/eye_tracking",
  recordingMode: "current-tab",
  sessions: new Map(),
  adaptorType: null,
  experimentState: {
    isInitialized: false,
    isRecording: false,
    currentSession: null,
    gazeDataCount: 0,
    eventsCount: 0,
    recordingDuration: 0,
    error: null,
  },
};

// DOM elements
interface Elements {
  status: HTMLElement;
  log: HTMLElement;
  gazeDataCount: HTMLElement;
  demoArea: HTMLElement;
  initBtn: HTMLButtonElement;
  startBtn: HTMLButtonElement;
  stopBtn: HTMLButtonElement;
  downloadBtn: HTMLButtonElement;
  downloadComponentsBtn: HTMLButtonElement;
  downloadZipBtn: HTMLButtonElement;
  exportAllBtn: HTMLButtonElement;
  participantId: HTMLInputElement;
  eyeTrackingServerUrl: HTMLInputElement;
  recordingMode: HTMLSelectElement;
  urlValidation: HTMLElement;
  trackingMode: HTMLElement;
  modeText: HTMLElement;
  connectionStatus: HTMLElement;
  demoTitle: HTMLElement;
  demoDescription: HTMLElement;
  serverInfo: HTMLElement;
  sessionsList: HTMLElement;
  currentSessionInfo: HTMLElement;
  gazePointInfo: HTMLElement;
  windowStateInfo: HTMLElement;
}

let elements: Elements;
let latestGazePoint: any = null;

// Utility functions
async function recordTaskInteraction(taskName: string): Promise<void> {
  await addEvent("interaction", {
    action: "task_click",
    taskName: taskName,
    timestamp: Date.now(),
  });
}

function log(message: string): void {
  const timestamp = generateTimestamp();
  const logEntry = `[${timestamp}] ${message}`;
  appState.logs.push(logEntry);

  // Keep only last 20 log entries
  if (appState.logs.length > 20) {
    appState.logs = appState.logs.slice(-20);
  }

  elements.log.innerHTML = appState.logs.join("<br>");
  elements.log.scrollTop = elements.log.scrollHeight;
}

// DOM element initialization
function initializeDOMElements(): void {
  elements = {
    status: document.getElementById("status")!,
    log: document.getElementById("log")!,
    gazeDataCount: document.getElementById("gazeDataCount")!,
    demoArea: document.getElementById("demoArea")!,

    // Control buttons
    initBtn: document.getElementById("initBtn") as HTMLButtonElement,
    startBtn: document.getElementById("startBtn") as HTMLButtonElement,
    stopBtn: document.getElementById("stopBtn") as HTMLButtonElement,

    // Download buttons
    downloadBtn: document.getElementById("downloadBtn") as HTMLButtonElement,
    downloadComponentsBtn: document.getElementById("downloadComponentsBtn") as HTMLButtonElement,
    downloadZipBtn: document.getElementById("downloadZipBtn") as HTMLButtonElement,
    exportAllBtn: document.getElementById("exportAllBtn") as HTMLButtonElement,

    // Input fields
    participantId: document.getElementById("participantId") as HTMLInputElement,
    eyeTrackingServerUrl: document.getElementById("eyeTrackingServerUrl") as HTMLInputElement,
    recordingMode: document.getElementById("recordingMode") as HTMLSelectElement,
    urlValidation: document.getElementById("urlValidation")!,
    trackingMode: document.getElementById("trackingMode")!,
    modeText: document.getElementById("modeText")!,
    connectionStatus: document.getElementById("connectionStatus")!,
    demoTitle: document.getElementById("demoTitle")!,
    demoDescription: document.getElementById("demoDescription")!,
    serverInfo: document.getElementById("serverInfo")!,
    sessionsList: document.getElementById("sessionsList")!,
    currentSessionInfo: document.getElementById("currentSessionInfo")!,
    gazePointInfo: document.getElementById("gazePointInfo")!,
    windowStateInfo: document.getElementById("windowStateInfo")!,
  };
}

// Event handlers
// Create tracking adaptor based on URL configuration
function createTrackingAdaptor(): {
  adaptor: TrackingAdaptor;
  type: "eye-tracking" | "mouse-simulation";
} {
  const url = appState.eyeTrackingServerUrl.trim();

  if (url && isValidWebSocketUrl(url)) {
    log(`Creating WebSocket adaptor for: ${url}`);
    return {
      adaptor: websocketTrackingAdaptor(url, {
        autoReconnect: true,
        timeout: 10000,
      }),
      type: "eye-tracking",
    };
  } else {
    log("Creating mouse simulation adaptor");
    return {
      adaptor: mouseTrackingAdaptor({
        confidenceRange: [0.7, 0.9],
        saccadeSimulation: true,
        blinkSimulation: true,
      }),
      type: "mouse-simulation",
    };
  }
}

async function handleInitialize(): Promise<void> {
  try {
    log("Initializing recorder...");

    // Create and configure tracking adaptor
    const { adaptor, type } = createTrackingAdaptor();

    // Store adaptor type for later use
    appState.adaptorType = type;

    // Initialize the experiment system with recording mode constraints
    await initialize({
      trackingAdaptor: adaptor,
      onlyCurrentTabAvailable: appState.recordingMode === "current-tab", // recording modeに基づいて制約
    });

    log(`Recorder initialized successfully with ${type} adaptor`);
  } catch (error) {
    log(`Initialization failed: ${error}`);
  }
}

async function handleStartRecording(): Promise<void> {
  try {
    log("Starting new recording session...");

    // Create session and start recording in one action
    const config: ExperimentConfig = {
      participantId: appState.participantId,
      experimentType: appState.adaptorType || "mouse-simulation",
      recording: {
        frameRate: 30,
        quality: "high",
        videoFormat: "webm",
        chunkDuration: 5,
        captureEntireScreen: appState.recordingMode === "full-screen",
      },
    };

    // Start recording (will create session automatically if needed)
    const sessionId = await startRecording(config);
    log(`Session created and recording started: ${sessionId}`);
    log(
      `Config used: participantId=${config.participantId}, experimentType=${config.experimentType}`
    );

    // Set up gaze data logging
    onGaze((gazePoint) => {
      // Gaze data is being processed
      console.log("gazePoint", gazePoint);
      latestGazePoint = gazePoint;
      updateDebugInfo();
    });

    const currentMode = getCurrentTrackingMode();
    if (currentMode.includes("WebSocket")) {
      log("WebSocket eye tracking is active");
    } else if (currentMode.includes("Mouse")) {
      log("Mouse simulation is active - move your mouse around to generate gaze data");
    } else {
      log("Tracking system ready");
    }
  } catch (error) {
    log(`Recording start failed: ${error}`);
  }
}

async function handleStopRecording(): Promise<void> {
  try {
    log("Stopping recording and ending session...");
    const result = await stopRecording();

    log(
      `Stop recording result: sessionId=${result.sessionId}, sessionInfo=${
        result.sessionInfo ? "exists" : "null"
      }`
    );

    // Store completed session
    if (result.sessionInfo) {
      appState.sessions.set(result.sessionId, result.sessionInfo);
      log(`Session ${result.sessionId} completed and stored`);
      log(`Total sessions in store: ${appState.sessions.size}`);

      // Debug: List all session IDs in store
      const allIds = Array.from(appState.sessions.keys());
      log(`All session IDs in store: ${allIds.join(", ")}`);
    } else {
      log(`Warning: No session info returned for ${result.sessionId}`);
    }

    log("Recording stopped and session ended successfully");
  } catch (error) {
    log(`Recording stop failed: ${error}`);
  }
}

async function handleEndSession(): Promise<void> {
  try {
    log("Ending current session...");
    // If recording is active, stop it first
    if (appState.experimentState.isRecording) {
      await handleStopRecording();
    }

    // Clear current session to allow creating a new one
    log("Session ended - you can now create a new session");
  } catch (error) {
    log(`End session failed: ${error}`);
  }
}

async function handleTaskClick(taskName: string): Promise<void> {
  try {
    await recordTaskInteraction(taskName);
    log(`Task interaction recorded: ${taskName}`);
  } catch (error) {
    log(`Failed to record task interaction: ${error}`);
  }
}

async function handleDownloadJSON(): Promise<void> {
  try {
    log("Downloading metadata only...");
    await downloadSession(undefined, {
      include: { metadata: true, gaze: false, events: false, video: false },
      asZip: false,
    });
    log("Metadata download completed");
  } catch (error) {
    log(`Metadata download failed: ${error}`);
  }
}

async function handleDownloadComponents(): Promise<void> {
  try {
    log("Downloading all components as separate files...");
    await downloadSession(undefined, {
      include: { metadata: true, gaze: true, events: true, video: true },
      asZip: false,
    });
    log("Components download completed");
  } catch (error) {
    log(`Components download failed: ${error}`);
  }
}

async function handleDownloadZip(): Promise<void> {
  try {
    log("Downloading session as ZIP...");
    await downloadSession(undefined, {
      include: { metadata: true, gaze: true, events: true, video: true },
      asZip: true,
    });
    log("ZIP download completed");
  } catch (error) {
    log(`ZIP download failed: ${error}`);
  }
}

async function handleExportAll(): Promise<void> {
  try {
    log("Exporting all sessions as combined dataset...");

    if (appState.sessions.size === 0) {
      log("No completed sessions to export");
      return;
    }

    const sessionIds = Array.from(appState.sessions.keys());
    log(`Found ${sessionIds.length} session(s) to export`);
    log(`Session IDs: ${sessionIds.join(", ")}`);
    log(`Session store size: ${appState.sessions.size}`);

    // Debug: Show all sessions in store
    appState.sessions.forEach((session, id) => {
      log(`Session ${id}: ${session.participantId} (${session.experimentType})`);
    });

    // Export all sessions as a single combined ZIP file
    await exportExperimentDataset(sessionIds, {
      include: { metadata: true, gaze: true, events: true, video: true },
      asZip: true,
    });

    log("All sessions exported successfully as combined dataset");
  } catch (error) {
    log(`Export all failed: ${error}`);
  }
}

// Event listeners setup
function setupEventListeners(): void {
  elements.initBtn.addEventListener("click", handleInitialize);
  elements.startBtn.addEventListener("click", handleStartRecording);
  elements.stopBtn.addEventListener("click", handleStopRecording);

  elements.downloadBtn.addEventListener("click", handleDownloadJSON);
  elements.downloadComponentsBtn.addEventListener("click", handleDownloadComponents);
  elements.downloadZipBtn.addEventListener("click", handleDownloadZip);
  elements.exportAllBtn.addEventListener("click", handleExportAll);

  elements.participantId.addEventListener("input", (e) => {
    appState.participantId = (e.target as HTMLInputElement).value;
  });

  elements.eyeTrackingServerUrl.addEventListener("input", (e) => {
    appState.eyeTrackingServerUrl = (e.target as HTMLInputElement).value;
    updateUrlValidation();
    updateTrackingMode();
  });

  elements.recordingMode.addEventListener("change", (e) => {
    appState.recordingMode = (e.target as HTMLSelectElement).value as RecordingMode;
  });

  setupDemoTasks();
}

function setupDemoTasks(): void {
  // Just add a simple click handler for the demo area
  elements.demoArea.addEventListener("click", () => {
    if (appState.experimentState.currentSession) {
      handleTaskClick("Demo Area Click");
    }
  });
}

// UI updates
function updateUI(): void {
  const state = appState.experimentState;

  // Update button states
  elements.initBtn.disabled = state.isInitialized;
  elements.startBtn.disabled = !state.isInitialized || state.isRecording;
  elements.stopBtn.disabled = !state.isRecording;

  // Update download buttons
  const hasSession = !!state.currentSession;
  const hasCompletedSessions = appState.sessions.size > 0;
  const canDownloadCurrentSession = hasSession && !state.isRecording; // Can download if session exists and not recording
  elements.downloadBtn.disabled = !canDownloadCurrentSession;
  elements.downloadComponentsBtn.disabled = !canDownloadCurrentSession;
  elements.downloadZipBtn.disabled = !canDownloadCurrentSession;
  elements.exportAllBtn.disabled = !hasCompletedSessions;

  // Update input fields
  elements.participantId.disabled = state.isRecording; // Only disable during recording
  elements.eyeTrackingServerUrl.disabled = state.isInitialized; // Disable after initialization
  elements.recordingMode.disabled = state.isInitialized; // Disable after initialization
  elements.participantId.value = appState.participantId;
  elements.eyeTrackingServerUrl.value = appState.eyeTrackingServerUrl;
  elements.recordingMode.value = appState.recordingMode;

  // Update tracking mode display
  updateTrackingMode();
  updateDemoArea();
  updateSessionsList();
  updateCurrentSessionInfo();
  updateDebugInfo();
}

function updateStatus(state: typeof appState.experimentState): void {
  const statusText = `
    <strong>Status:</strong> ${
      state.isRecording ? "Recording" : state.isInitialized ? "Ready" : "Not Initialized"
    }<br>
    <strong>Session:</strong> ${state.currentSession ? state.currentSession.sessionId : "None"}<br>
    <strong>Duration:</strong> ${formatDuration(state.recordingDuration)}<br>
    <strong>Gaze Points:</strong> ${state.gazeDataCount}<br>
    <strong>Events:</strong> ${state.eventsCount}
  `;
  elements.status.innerHTML = statusText;
}

function updateGazeData(state: typeof appState.experimentState): void {
  if (state.gazeDataCount > 0) {
    elements.gazeDataCount.textContent = `${state.gazeDataCount}`;
  } else {
    elements.gazeDataCount.textContent = "0";
  }
}

function updateUrlValidation(): void {
  const url = appState.eyeTrackingServerUrl.trim();
  if (url && !isValidWebSocketUrl(url)) {
    elements.urlValidation.style.display = "block";
  } else {
    elements.urlValidation.style.display = "none";
  }
}

function updateTrackingMode(): void {
  const mode = appState.adaptorType === "eye-tracking" ? "Eye Tracking" : "Mouse Simulation";
  elements.modeText.textContent = mode;

  if (isTrackingActive()) {
    elements.connectionStatus.style.display = "inline";
  } else {
    elements.connectionStatus.style.display = "none";
  }
}

function updateDemoArea(): void {
  const trackingMode = getCurrentTrackingMode();
  const trackingQuality = getTrackingQuality();

  if (trackingMode.includes("WebSocket")) {
    elements.demoTitle.textContent = "Demo Area - Eye tracking active";
    elements.demoDescription.textContent = `Current mode: ${trackingMode} (Quality: ${trackingQuality})`;
    elements.serverInfo.textContent = `Eye tracking server connected`;
    elements.serverInfo.style.display = "block";
  } else if (trackingMode.includes("Mouse")) {
    elements.demoTitle.textContent = "Demo Area - Move your mouse to simulate gaze";
    elements.demoDescription.textContent = `Current mode: ${trackingMode} (Quality: ${trackingQuality})`;
    elements.serverInfo.style.display = "none";
  } else {
    elements.demoTitle.textContent = "Demo Area - No tracking active";
    elements.demoDescription.textContent = `Current mode: ${trackingMode}`;
    elements.serverInfo.style.display = "none";
  }
}

function updateSessionsList(): void {
  const sessions = Array.from(appState.sessions.values());
  const sessionCount = sessions.length;

  if (sessionCount === 0) {
    elements.sessionsList.innerHTML = "<p>No completed sessions yet</p>";
  } else {
    const sessionItems = sessions
      .map(
        (session) => `
      <div class="session-item">
        <strong>${session.sessionId}</strong>
        <br>
        <small>
          Participant: ${session.participantId} | 
          Type: ${session.experimentType} | 
          Started: ${new Date(session.startTime).toLocaleString()}
          ${session.endTime ? ` | Ended: ${new Date(session.endTime).toLocaleString()}` : ""}
        </small>
      </div>
    `
      )
      .join("");

    elements.sessionsList.innerHTML = `
      <h4>Completed Sessions (${sessionCount})</h4>
      ${sessionItems}
    `;
  }
}

function updateCurrentSessionInfo(): void {
  const currentSession = appState.experimentState.currentSession;

  if (currentSession) {
    elements.currentSessionInfo.innerHTML = `
      <h4>Current Session</h4>
      <p><strong>ID:</strong> ${currentSession.sessionId}</p>
      <p><strong>Participant:</strong> ${currentSession.participantId}</p>
      <p><strong>Type:</strong> ${currentSession.experimentType}</p>
      <p><strong>Started:</strong> ${new Date(currentSession.startTime).toLocaleString()}</p>
    `;
  } else {
    elements.currentSessionInfo.innerHTML = "<p>No active session</p>";
  }
}

// State subscription
function setupStateSubscription(): void {
  onStateChanged((state: RecorderState) => {
    // Update local state
    appState.experimentState = {
      isInitialized:
        state.status === "initialized" ||
        state.status === "recording" ||
        state.status === "stopped",
      isRecording: state.isRecording,
      currentSession: state.currentSession,
      gazeDataCount: state.gazeDataCount,
      eventsCount: state.eventsCount,
      recordingDuration: state.recordingDuration,
      error: state.error,
    };

    updateUI();
    updateStatus(appState.experimentState);
    updateGazeData(appState.experimentState);

    if (state.error) {
      log(`Error: ${state.error}`);
    }
  });

  // Initial UI update
  updateUrlValidation();
  updateTrackingMode();
  updateDemoArea();
  updateDebugInfo();
}

// Update debug information display
function updateDebugInfo(): void {
  // Get current window state
  const windowState = {
    screenX: window.screenX,
    screenY: window.screenY,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
  };

  // Display window state
  elements.windowStateInfo.innerHTML = `
screenX: ${windowState.screenX}
screenY: ${windowState.screenY}
scrollX: ${windowState.scrollX}
scrollY: ${windowState.scrollY}
innerWidth: ${windowState.innerWidth}
innerHeight: ${windowState.innerHeight}
outerWidth: ${windowState.outerWidth}
outerHeight: ${windowState.outerHeight}
  `;

  // Display latest gaze point
  if (latestGazePoint) {
    elements.gazePointInfo.innerHTML = `
screenX: ${latestGazePoint.screenX ?? "N/A"}
screenY: ${latestGazePoint.screenY ?? "N/A"}
contentX: ${latestGazePoint.contentX ?? "N/A"}
contentY: ${latestGazePoint.contentY ?? "N/A"}
confidence: ${latestGazePoint.confidence ?? "N/A"}
browserTimestamp: ${latestGazePoint.browserTimestamp ?? "N/A"}
systemTimestamp: ${latestGazePoint.systemTimestamp ?? "N/A"}
    `;
  } else {
    elements.gazePointInfo.innerHTML = "No gaze data yet";
  }
}

// Initialize the application
function initializeApp(): void {
  initializeDOMElements();
  setupEventListeners();
  setupStateSubscription();
  updateUI();

  // Update debug info periodically to show window state changes
  setInterval(() => {
    if (elements.windowStateInfo) {
      updateDebugInfo();
    }
  }, 100); // Update every 100ms

  log("Web Eye Tracking Recorder Demo loaded");
  log("Multiple session management enabled - create, record, and export sessions");
}

// Start the application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});
