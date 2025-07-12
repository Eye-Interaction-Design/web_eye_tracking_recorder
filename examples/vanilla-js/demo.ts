import {
  DEMO_TASKS,
  type DemoConfig,
  type DemoState,
  subscribeToDemoState,
  getCurrentDemoState,
  initializeRecorder,
  createNewSession,
  startRecordingSession,
  stopRecordingSession,
  recordTaskInteraction,
  downloadSessionJSON,
  downloadSessionComponents,
  downloadSessionZip,
  saveExperimentData,
  formatDuration,
  generateTimestamp
} from '../shared/demo-logic.js'

// Application state
interface AppState {
  logs: string[]
  participantId: string
  experimentType: string
}

const appState: AppState = {
  logs: [],
  participantId: 'participant-001',
  experimentType: 'usability-test'
}

// DOM elements
interface Elements {
  status: HTMLElement
  log: HTMLElement
  gazeData: HTMLElement
  demoArea: HTMLElement
  initBtn: HTMLButtonElement
  createBtn: HTMLButtonElement
  startBtn: HTMLButtonElement
  stopBtn: HTMLButtonElement
  downloadBtn: HTMLButtonElement
  downloadComponentsBtn: HTMLButtonElement
  downloadZipBtn: HTMLButtonElement
  autoSaveBtn: HTMLButtonElement
  participantId: HTMLInputElement
  experimentType: HTMLInputElement
}

let elements: Elements

// Utility functions
function log(message: string): void {
  const timestamp = generateTimestamp()
  const logEntry = `[${timestamp}] ${message}`
  appState.logs.push(logEntry)
  
  // Keep only last 20 log entries
  if (appState.logs.length > 20) {
    appState.logs = appState.logs.slice(-20)
  }
  
  elements.log.innerHTML = appState.logs.join('<br>')
  elements.log.scrollTop = elements.log.scrollHeight
}

// DOM element initialization
function initializeDOMElements(): void {
  elements = {
    status: document.getElementById('status')!,
    log: document.getElementById('log')!,
    gazeData: document.getElementById('gazeData')!,
    demoArea: document.getElementById('demoArea')!,
    
    // Control buttons
    initBtn: document.getElementById('initBtn') as HTMLButtonElement,
    createBtn: document.getElementById('createBtn') as HTMLButtonElement,
    startBtn: document.getElementById('startBtn') as HTMLButtonElement,
    stopBtn: document.getElementById('stopBtn') as HTMLButtonElement,
    
    // Download buttons
    downloadBtn: document.getElementById('downloadBtn') as HTMLButtonElement,
    downloadComponentsBtn: document.getElementById('downloadComponentsBtn') as HTMLButtonElement,
    downloadZipBtn: document.getElementById('downloadZipBtn') as HTMLButtonElement,
    autoSaveBtn: document.getElementById('autoSaveBtn') as HTMLButtonElement,
    
    // Input fields
    participantId: document.getElementById('participantId') as HTMLInputElement,
    experimentType: document.getElementById('experimentType') as HTMLInputElement
  }
}

// Event handlers
async function handleInitialize(): Promise<void> {
  try {
    log('Initializing recorder...')
    await initializeRecorder()
    log('Recorder initialized successfully')
  } catch (error) {
    log(`Initialization failed: ${error}`)
  }
}

async function handleCreateSession(): Promise<void> {
  try {
    log('Creating session...')
    const config: DemoConfig = {
      participantId: appState.participantId,
      experimentType: appState.experimentType
    }
    const sessionId = await createNewSession(config)
    log(`Session created: ${sessionId}`)
  } catch (error) {
    log(`Session creation failed: ${error}`)
  }
}

async function handleStartRecording(): Promise<void> {
  try {
    log('Starting recording...')
    await startRecordingSession()
    log('Recording started successfully')
    log('Move your mouse around to generate mock gaze data')
  } catch (error) {
    log(`Recording start failed: ${error}`)
  }
}

async function handleStopRecording(): Promise<void> {
  try {
    log('Stopping recording...')
    await stopRecordingSession()
    log('Recording stopped successfully')
  } catch (error) {
    log(`Recording stop failed: ${error}`)
  }
}

async function handleTaskClick(taskName: string): Promise<void> {
  try {
    await recordTaskInteraction(taskName)
    log(`Task interaction recorded: ${taskName}`)
  } catch (error) {
    log(`Failed to record task interaction: ${error}`)
  }
}

async function handleDownloadJSON(): Promise<void> {
  try {
    log('Downloading session data as JSON...')
    await downloadSessionJSON()
    log('JSON download completed')
  } catch (error) {
    log(`JSON download failed: ${error}`)
  }
}

async function handleDownloadComponents(): Promise<void> {
  try {
    log('Downloading session components...')
    await downloadSessionComponents()
    log('Components download completed')
  } catch (error) {
    log(`Components download failed: ${error}`)
  }
}

async function handleDownloadZip(): Promise<void> {
  try {
    log('Downloading session as ZIP...')
    await downloadSessionZip()
    log('ZIP download completed')
  } catch (error) {
    log(`ZIP download failed: ${error}`)
  }
}

async function handleAutoSave(): Promise<void> {
  try {
    log('Auto-saving experiment data...')
    await saveExperimentData({
      participantId: appState.participantId,
      experimentType: appState.experimentType
    })
    log('Experiment data auto-saved successfully')
  } catch (error) {
    log(`Auto-save failed: ${error}`)
  }
}

// Event listeners setup
function setupEventListeners(): void {
  elements.initBtn.addEventListener('click', handleInitialize)
  elements.createBtn.addEventListener('click', handleCreateSession)
  elements.startBtn.addEventListener('click', handleStartRecording)
  elements.stopBtn.addEventListener('click', handleStopRecording)
  
  elements.downloadBtn.addEventListener('click', handleDownloadJSON)
  elements.downloadComponentsBtn.addEventListener('click', handleDownloadComponents)
  elements.downloadZipBtn.addEventListener('click', handleDownloadZip)
  elements.autoSaveBtn.addEventListener('click', handleAutoSave)
  
  elements.participantId.addEventListener('input', (e) => {
    appState.participantId = (e.target as HTMLInputElement).value
  })
  
  elements.experimentType.addEventListener('input', (e) => {
    appState.experimentType = (e.target as HTMLInputElement).value
  })

  setupDemoTasks()
}

function setupDemoTasks(): void {
  // Create demo task buttons
  DEMO_TASKS.forEach((task) => {
    const button = document.createElement('button')
    button.className = 'target-button'
    button.textContent = task.name
    button.addEventListener('click', () => handleTaskClick(task.name))
    elements.demoArea.appendChild(button)
  })

  // Add some demo text areas
  for (let i = 1; i <= 3; i++) {
    const textArea = document.createElement('div')
    textArea.className = 'target-text'
    textArea.textContent = `Demo text area ${i} - Move your mouse over this text to simulate gaze tracking`
    textArea.addEventListener('mouseenter', () => handleTaskClick(`Text Area ${i}`))
    elements.demoArea.appendChild(textArea)
  }
}

// UI updates
function updateUI(): void {
  const state = getCurrentDemoState()
  
  // Update button states
  elements.initBtn.disabled = state.isInitialized
  elements.createBtn.disabled = !state.isInitialized || !!state.currentSession
  elements.startBtn.disabled = !state.currentSession || state.isRecording
  elements.stopBtn.disabled = !state.isRecording
  
  // Update download buttons
  const hasSession = !!state.currentSession
  elements.downloadBtn.disabled = !hasSession
  elements.downloadComponentsBtn.disabled = !hasSession
  elements.downloadZipBtn.disabled = !hasSession
  elements.autoSaveBtn.disabled = !hasSession
  
  // Update input fields
  elements.participantId.disabled = !!state.currentSession
  elements.experimentType.disabled = !!state.currentSession
  elements.participantId.value = appState.participantId
  elements.experimentType.value = appState.experimentType
}

function updateStatus(state: DemoState): void {
  const statusText = `
    <strong>Status:</strong> ${state.isRecording ? 'Recording' : state.isInitialized ? 'Ready' : 'Not Initialized'}<br>
    <strong>Session:</strong> ${state.currentSession ? state.currentSession.sessionId : 'None'}<br>
    <strong>Duration:</strong> ${formatDuration(state.recordingDuration)}<br>
    <strong>Gaze Points:</strong> ${state.gazeDataCount}<br>
    <strong>Events:</strong> ${state.eventsCount}
  `
  elements.status.innerHTML = statusText
}

function updateGazeData(state: DemoState): void {
  if (state.gazeDataCount > 0) {
    elements.gazeData.textContent = `Collecting gaze data... (${state.gazeDataCount} points)`
  } else {
    elements.gazeData.textContent = 'No gaze data yet'
  }
}

// State subscription
function setupStateSubscription(): void {
  subscribeToDemoState((state) => {
    updateUI()
    updateStatus(state)
    updateGazeData(state)
    
    if (state.error) {
      log(`Error: ${state.error}`)
    }
  })
}

// Initialize the application
function initializeApp(): void {
  initializeDOMElements()
  setupEventListeners()
  setupStateSubscription()
  updateUI()
  log('Web Eye Tracking Recorder Demo loaded')
  log('This demo uses mock gaze data generated from mouse movements')
}

// Start the application
initializeApp()