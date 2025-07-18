import { SessionInfo } from "../../packages/eye-analysis/dist/recorder/types";

import {
  initialize,
  createSession,
  startRecording,
  stopRecording,
  onStateChanged,
  downloadSession,
  onGaze,
  type ExperimentConfig,
  type RecorderState,
} from "../../packages/eye-analysis/experiment";

import { addEvent } from "../../packages/eye-analysis/recorder/core";

import {
  connectTrackingAdaptor,
  disconnectAllTrackingAdaptors,
  getCurrentTrackingMode,
  getTrackingQuality,
  isTrackingActive,
  websocketTrackingAdaptor,
  mouseTrackingAdaptor,
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
  eyeTrackingServerUrl: "",
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
  gazeData: HTMLElement;
  demoArea: HTMLElement;
  initBtn: HTMLButtonElement;
  createBtn: HTMLButtonElement;
  startBtn: HTMLButtonElement;
  stopBtn: HTMLButtonElement;
  downloadBtn: HTMLButtonElement;
  downloadComponentsBtn: HTMLButtonElement;
  downloadZipBtn: HTMLButtonElement;
  autoSaveBtn: HTMLButtonElement;
  participantId: HTMLInputElement;
  eyeTrackingServerUrl: HTMLInputElement;
  urlValidation: HTMLElement;
  trackingMode: HTMLElement;
  modeText: HTMLElement;
  connectionStatus: HTMLElement;
  demoTitle: HTMLElement;
  demoDescription: HTMLElement;
  serverInfo: HTMLElement;
}

let elements: Elements;

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
    gazeData: document.getElementById("gazeData")!,
    demoArea: document.getElementById("demoArea")!,

    // Control buttons
    initBtn: document.getElementById("initBtn") as HTMLButtonElement,
    createBtn: document.getElementById("createBtn") as HTMLButtonElement,
    startBtn: document.getElementById("startBtn") as HTMLButtonElement,
    stopBtn: document.getElementById("stopBtn") as HTMLButtonElement,

    // Download buttons
    downloadBtn: document.getElementById("downloadBtn") as HTMLButtonElement,
    downloadComponentsBtn: document.getElementById("downloadComponentsBtn") as HTMLButtonElement,
    downloadZipBtn: document.getElementById("downloadZipBtn") as HTMLButtonElement,
    autoSaveBtn: document.getElementById("autoSaveBtn") as HTMLButtonElement,

    // Input fields
    participantId: document.getElementById("participantId") as HTMLInputElement,
    eyeTrackingServerUrl: document.getElementById("eyeTrackingServerUrl") as HTMLInputElement,
    urlValidation: document.getElementById("urlValidation")!,
    trackingMode: document.getElementById("trackingMode")!,
    modeText: document.getElementById("modeText")!,
    connectionStatus: document.getElementById("connectionStatus")!,
    demoTitle: document.getElementById("demoTitle")!,
    demoDescription: document.getElementById("demoDescription")!,
    serverInfo: document.getElementById("serverInfo")!,
  };
}

// Event handlers
async function handleInitialize(): Promise<void> {
  try {
    log("Initializing recorder...");
    await initialize();
    log("Recorder initialized successfully");
  } catch (error) {
    log(`Initialization failed: ${error}`);
  }
}

async function handleCreateSession(): Promise<void> {
  try {
    log("Creating session...");
    const config: ExperimentConfig = {
      participantId: appState.participantId,
      experimentType: appState.eyeTrackingServerUrl.trim() ? "eye-tracking" : "mouse-simulation",
      eyeTrackingServerUrl: appState.eyeTrackingServerUrl.trim(),
    };
    const sessionId = await createSession(config);
    log(`Session created: ${sessionId}`);

    // Set up tracking adaptor based on configuration
    if (config.eyeTrackingServerUrl && isValidWebSocketUrl(config.eyeTrackingServerUrl)) {
      log(`Setting up WebSocket eye tracker: ${config.eyeTrackingServerUrl}`);
      const eyeTracker = websocketTrackingAdaptor(config.eyeTrackingServerUrl, {
        autoReconnect: true,
        timeout: 10000,
        reconnectInterval: 5000,
      });
      await connectTrackingAdaptor(eyeTracker);
      log("WebSocket eye tracker connected");
    } else {
      log("Setting up mouse simulation tracker");
      const mouseSimulator = mouseTrackingAdaptor({
        confidenceRange: [0.7, 0.9],
        saccadeSimulation: true,
        blinkSimulation: true,
        noiseAmount: 2,
      });
      await connectTrackingAdaptor(mouseSimulator);
      log("Mouse simulation tracker connected");
    }

    onGaze((gazeData) => {
      console.log("gazeData", gazeData);
    });
  } catch (error) {
    log(`Session creation failed: ${error}`);
  }
}

async function handleStartRecording(): Promise<void> {
  try {
    log("Starting recording...");

    // The adaptor is already connected in createSession, so we just need to start recording
    await startRecording({});
    log("Recording started successfully");

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
    log("Stopping recording...");
    await stopRecording();
    
    // Disconnect all tracking adaptors
    await disconnectAllTrackingAdaptors();
    log("Recording stopped and tracking adaptors disconnected");
  } catch (error) {
    log(`Recording stop failed: ${error}`);
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

async function handleAutoSave(): Promise<void> {
  try {
    log("Auto-saving experiment data...");
    // Download only gaze data as CSV for quick analysis
    await downloadSession(undefined, {
      include: { metadata: false, gaze: true, events: false, video: false },
      asZip: false,
    });
    log("Gaze data auto-saved successfully");
  } catch (error) {
    log(`Auto-save failed: ${error}`);
  }
}

// Event listeners setup
function setupEventListeners(): void {
  elements.initBtn.addEventListener("click", handleInitialize);
  elements.createBtn.addEventListener("click", handleCreateSession);
  elements.startBtn.addEventListener("click", handleStartRecording);
  elements.stopBtn.addEventListener("click", handleStopRecording);

  elements.downloadBtn.addEventListener("click", handleDownloadJSON);
  elements.downloadComponentsBtn.addEventListener("click", handleDownloadComponents);
  elements.downloadZipBtn.addEventListener("click", handleDownloadZip);
  elements.autoSaveBtn.addEventListener("click", handleAutoSave);

  elements.participantId.addEventListener("input", (e) => {
    appState.participantId = (e.target as HTMLInputElement).value;
  });

  elements.eyeTrackingServerUrl.addEventListener("input", (e) => {
    appState.eyeTrackingServerUrl = (e.target as HTMLInputElement).value;
    updateUrlValidation();
    updateTrackingMode();
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
  elements.createBtn.disabled = !state.isInitialized || !!state.currentSession;
  elements.startBtn.disabled = !state.currentSession || state.isRecording;
  elements.stopBtn.disabled = !state.isRecording;

  // Update download buttons
  const hasSession = !!state.currentSession;
  elements.downloadBtn.disabled = !hasSession;
  elements.downloadComponentsBtn.disabled = !hasSession;
  elements.downloadZipBtn.disabled = !hasSession;
  elements.autoSaveBtn.disabled = !hasSession;

  // Update input fields
  elements.participantId.disabled = !!state.currentSession;
  elements.eyeTrackingServerUrl.disabled = !!state.currentSession;
  elements.participantId.value = appState.participantId;
  elements.eyeTrackingServerUrl.value = appState.eyeTrackingServerUrl;

  // Update tracking mode display
  updateTrackingMode();
  updateDemoArea();
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
    elements.gazeData.textContent = `Collecting gaze data... (${state.gazeDataCount} points)`;
  } else {
    elements.gazeData.textContent = "No gaze data yet";
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
  const url = appState.eyeTrackingServerUrl.trim();
  const mode = url ? "Eye Tracking" : "Mouse Simulation";
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
}

// Initialize the application
function initializeApp(): void {
  initializeDOMElements();

  // Check if all required elements exist
  if (
    !elements.initBtn ||
    !elements.createBtn ||
    !elements.startBtn ||
    !elements.stopBtn ||
    !elements.downloadBtn ||
    !elements.downloadComponentsBtn ||
    !elements.downloadZipBtn ||
    !elements.autoSaveBtn ||
    !elements.participantId ||
    !elements.eyeTrackingServerUrl
  ) {
    console.error("Required DOM elements not found");
    return;
  }

  setupEventListeners();
  setupStateSubscription();
  updateUI();
  log("Web Eye Tracking Recorder Demo loaded");
  log("This demo uses mock gaze data generated from mouse movements");
}

// Start the application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});
