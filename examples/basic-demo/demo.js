import {
    initialize,
    createSession,
    startRecording,
    stopRecording,
    addGazeData,
    addEvent,
    downloadSessionData,
    downloadCompleteSession,
    downloadSessionComponents,
    downloadSessionAsZip,
    saveExperimentData,
    subscribe,
    getCurrentState,
    isRecording,
    getCurrentSession
} from '../../dist/index.js';

// Application state
class DemoApp {
    constructor() {
        this.sessionStartTime = null;
        this.durationInterval = null;
        this.mockGazeInterval = null;
        this.stopMockGaze = null;
        
        this.initializeDOMElements();
        this.setupEventListeners();
        this.setupStateSubscription();
        this.updateButtons('initial');
        this.updateRecordingGuidance();
        this.log('Web Eye Tracking Recorder Demo loaded');
        this.log('This demo uses mock gaze data generated from mouse movements');
    }

    // DOM Element References
    initializeDOMElements() {
        this.elements = {
            status: document.getElementById('status'),
            log: document.getElementById('log'),
            gazeData: document.getElementById('gazeData'),
            demoArea: document.getElementById('demoArea'),
            
            // Control buttons
            initBtn: document.getElementById('initBtn'),
            createBtn: document.getElementById('createBtn'),
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            
            // Download buttons
            downloadJsonBtn: document.getElementById('downloadJsonBtn'),
            downloadCsvBtn: document.getElementById('downloadCsvBtn'),
            downloadVideoBtn: document.getElementById('downloadVideoBtn'),
            downloadVideoMp4Btn: document.getElementById('downloadVideoMp4Btn'),
            downloadAllBtn: document.getElementById('downloadAllBtn'),
            downloadZipBtn: document.getElementById('downloadZipBtn'),
            
            // Metrics
            sessionDuration: document.getElementById('sessionDuration'),
            gazeDataCount: document.getElementById('gazeDataCount'),
            eventsCount: document.getElementById('eventsCount'),
            recordingStatus: document.getElementById('recordingStatus'),
            
            // Config inputs
            participantId: document.getElementById('participantId'),
            experimentType: document.getElementById('experimentType'),
            
            // Guidance
            recordingGuidance: document.querySelector('.recording-guidance')
        };
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Control buttons
        this.elements.initBtn.addEventListener('click', () => this.handleInitialize());
        this.elements.createBtn.addEventListener('click', () => this.handleCreateSession());
        this.elements.startBtn.addEventListener('click', () => this.handleStartRecording());
        this.elements.stopBtn.addEventListener('click', () => this.handleStopRecording());
        
        // Download buttons
        this.elements.downloadJsonBtn.addEventListener('click', () => this.handleDownloadJson());
        this.elements.downloadCsvBtn.addEventListener('click', () => this.handleDownloadCsv());
        this.elements.downloadVideoBtn.addEventListener('click', () => this.handleDownloadVideo('webm'));
        this.elements.downloadVideoMp4Btn.addEventListener('click', () => this.handleDownloadVideo('mp4'));
        this.elements.downloadAllBtn.addEventListener('click', () => this.handleDownloadAll());
        this.elements.downloadZipBtn.addEventListener('click', () => this.handleDownloadZip());
        
        // Demo area interaction
        this.elements.demoArea.addEventListener('click', (event) => this.handleDemoAreaClick(event));
    }

    // State Management
    setupStateSubscription() {
        subscribe((state) => {
            this.elements.gazeDataCount.textContent = state.gazeDataCount.toString();
            this.elements.eventsCount.textContent = state.eventsCount.toString();
            this.elements.recordingStatus.textContent = state.isRecording ? 'Recording' : 'Idle';
            
            if (state.error) {
                this.log(`Error: ${state.error}`);
                this.updateStatus(state.error, 'error');
            }
        });
    }

    // UI Utilities
    log(message) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        this.elements.log.textContent += `[${timestamp}] ${message}\n`;
        this.elements.log.scrollTop = this.elements.log.scrollHeight;
        console.log(message);
    }

    updateStatus(message, className = 'idle') {
        this.elements.status.textContent = `Status: ${message}`;
        this.elements.status.className = `status ${className}`;
    }

    updateButtons(state) {
        const states = {
            initial: [true, false, false, false, false, false, false, false, false, false],
            initialized: [false, true, false, false, false, false, false, false, false, false],
            session_created: [false, false, true, false, false, false, false, false, false, false],
            recording: [false, false, false, true, false, false, false, false, false, false],
            stopped: [false, false, true, false, true, true, true, true, true, true]
        };
        
        const buttons = [
            this.elements.initBtn,
            this.elements.createBtn,
            this.elements.startBtn,
            this.elements.stopBtn,
            this.elements.downloadJsonBtn,
            this.elements.downloadCsvBtn,
            this.elements.downloadVideoBtn,
            this.elements.downloadVideoMp4Btn,
            this.elements.downloadAllBtn,
            this.elements.downloadZipBtn
        ];
        
        const buttonStates = states[state] || states.initial;
        buttons.forEach((btn, i) => {
            btn.disabled = !buttonStates[i];
        });
    }

    // Timer Management
    startDurationTimer() {
        this.sessionStartTime = Date.now();
        this.durationInterval = setInterval(() => {
            if (this.sessionStartTime) {
                const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
                this.elements.sessionDuration.textContent = `${duration}s`;
            }
        }, 1000);
    }

    stopDurationTimer() {
        if (this.durationInterval) {
            clearInterval(this.durationInterval);
            this.durationInterval = null;
        }
    }

    // Browser Detection
    detectBrowser() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
            return 'Chrome';
        } else if (userAgent.includes('Firefox')) {
            return 'Firefox';
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            return 'Safari';
        } else if (userAgent.includes('Edg')) {
            return 'Edge';
        }
        return 'Other';
    }

    updateRecordingGuidance() {
        const browser = this.detectBrowser();
        
        const messages = {
            'Chrome': '📍 Chrome detected: The system will automatically suggest this tab for recording.',
            'Firefox': '🦊 Firefox detected: Please manually select "This tab" from the sharing dialog.',
            'Safari': '🧭 Safari detected: Screen recording may have limited support. Please use Chrome or Firefox for best results.',
            'Edge': '🌐 Edge detected: Please manually select "This tab" from the sharing dialog.',
            'Other': '🌐 Please manually select "This tab" from the sharing dialog when prompted.'
        };
        
        if (this.elements.recordingGuidance) {
            this.elements.recordingGuidance.innerHTML = messages[browser];
        }
    }

    // Mock Gaze Data Generation
    startMockGazeData() {
        let lastMouseX = 0;
        let lastMouseY = 0;

        const mouseMoveHandler = (event) => {
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
        };
        
        document.addEventListener('mousemove', mouseMoveHandler);

        this.mockGazeInterval = setInterval(async () => {
            if (isRecording()) {
                const noise = () => (Math.random() - 0.5) * 20;
                const gazePointInput = {
                    systemTimestamp: Date.now(),
                    screenX: lastMouseX + noise(),
                    screenY: lastMouseY + noise(),
                    confidence: 0.8 + Math.random() * 0.2,
                    leftEye: {
                        screenX: lastMouseX - 5 + noise(),
                        screenY: lastMouseY + noise(),
                        positionX: 1254 + noise(),
                        positionY: 521 + noise(),
                        positionZ: 700 + noise() * 0.1,
                        pupilSize: 3.2 + Math.random() * 0.8
                    },
                    rightEye: {
                        screenX: lastMouseX + 5 + noise(),
                        screenY: lastMouseY + noise(),
                        positionX: 1258 + noise(),
                        positionY: 519 + noise(),
                        positionZ: 702 + noise() * 0.1,
                        pupilSize: 3.0 + Math.random() * 0.8
                    }
                };

                try {
                    await addGazeData(gazePointInput);
                    this.updateGazeDisplay(gazePointInput);
                    this.addVisualGazePoint(gazePointInput);
                } catch (error) {
                    console.error('Failed to add gaze data:', error);
                }
            }
        }, 16); // ~60 Hz

        return () => {
            document.removeEventListener('mousemove', mouseMoveHandler);
            if (this.mockGazeInterval) {
                clearInterval(this.mockGazeInterval);
                this.mockGazeInterval = null;
            }
        };
    }

    updateGazeDisplay(gazePointInput) {
        this.elements.gazeData.textContent = `Screen: (${gazePointInput.screenX.toFixed(1)}, ${gazePointInput.screenY.toFixed(1)})
Confidence: ${gazePointInput.confidence.toFixed(2)}
Left Eye: (${gazePointInput.leftEye.screenX.toFixed(1)}, ${gazePointInput.leftEye.screenY.toFixed(1)})
Right Eye: (${gazePointInput.rightEye.screenX.toFixed(1)}, ${gazePointInput.rightEye.screenY.toFixed(1)})
System Timestamp: ${gazePointInput.systemTimestamp}
Position Data: L(${gazePointInput.leftEye.positionX?.toFixed(1)}, ${gazePointInput.leftEye.positionY?.toFixed(1)}, ${gazePointInput.leftEye.positionZ?.toFixed(1)}) R(${gazePointInput.rightEye.positionX?.toFixed(1)}, ${gazePointInput.rightEye.positionY?.toFixed(1)}, ${gazePointInput.rightEye.positionZ?.toFixed(1)})`;
    }

    addVisualGazePoint(gazePointInput) {
        const rect = this.elements.demoArea.getBoundingClientRect();
        if (gazePointInput.screenX >= rect.left && gazePointInput.screenX <= rect.right &&
            gazePointInput.screenY >= rect.top && gazePointInput.screenY <= rect.bottom) {
            
            const gazePointElement = document.createElement('div');
            gazePointElement.className = 'gaze-point';
            gazePointElement.style.left = `${gazePointInput.screenX - rect.left}px`;
            gazePointElement.style.top = `${gazePointInput.screenY - rect.top}px`;
            this.elements.demoArea.appendChild(gazePointElement);

            setTimeout(() => {
                if (gazePointElement.parentNode) {
                    gazePointElement.parentNode.removeChild(gazePointElement);
                }
            }, 1000);
        }
    }

    // Action Handlers
    async handleInitialize() {
        try {
            this.updateStatus('Initializing...', 'recording');
            this.log('Initializing system...');
            
            await initialize();
            
            this.log('System initialized successfully');
            this.updateStatus('System initialized', 'completed');
            this.updateButtons('initialized');
            
        } catch (error) {
            this.log(`Initialization failed: ${error.message}`);
            this.updateStatus('Initialization failed', 'error');
            this.updateButtons('initial');
        }
    }

    async handleCreateSession() {
        try {
            this.updateStatus('Creating session...', 'recording');
            this.log('Creating session...');
            
            const config = {
                participantId: this.elements.participantId.value,
                experimentType: this.elements.experimentType.value
            };

            const recordingConfig = {
                frameRate: 30,
                quality: 'medium',
                chunkDuration: 5,
                captureEntireScreen: false,
                videoFormat: 'webm',
                videoCodec: 'vp9'
            };
            
            const sessionId = await createSession(config, recordingConfig);
            this.log(`Session created with ID: ${sessionId}`);
            this.updateStatus('Session created', 'completed');
            this.updateButtons('session_created');
            
        } catch (error) {
            this.log(`Session creation failed: ${error.message}`);
            this.updateStatus('Session creation failed', 'error');
        }
    }

    async handleStartRecording() {
        try {
            this.updateStatus('Starting recording...', 'recording');
            this.log('Starting recording...');
            
            const browser = this.detectBrowser();
            if (browser === 'Chrome') {
                this.log('💡 Chrome detected: The system will automatically suggest this tab');
            } else {
                this.log('💡 Please select "This tab" from the sharing dialog when prompted');
            }
            
            await startRecording();
            
            this.log('Recording started successfully');
            this.updateStatus('Recording in progress', 'recording');
            this.updateButtons('recording');
            this.startDurationTimer();
            
            this.stopMockGaze = this.startMockGazeData();
            this.log('Mock gaze data generation started (move mouse to simulate gaze)');
            
            await addEvent('recording_start', { note: 'User initiated recording' });
            
        } catch (error) {
            this.log(`Failed to start recording: ${error.message}`);
            this.updateStatus('Failed to start recording', 'error');
        }
    }

    async handleStopRecording() {
        try {
            this.updateStatus('Stopping recording...', 'recording');
            this.log('Stopping recording...');
            
            if (this.stopMockGaze) {
                this.stopMockGaze();
                this.stopMockGaze = null;
            }
            
            await stopRecording();
            
            const session = getCurrentSession();
            this.log(`Recording stopped. Session ID: ${session?.sessionId}`);
            
            this.updateStatus('Recording completed', 'completed');
            this.updateButtons('stopped');
            this.stopDurationTimer();
            
            await addEvent('recording_stop', { note: 'User stopped recording' });
            
            // Auto-save experiment data
            try {
                this.log('Auto-saving experiment data...');
                await saveExperimentData(session.sessionId, {
                    completedAt: new Date().toISOString(),
                    participantId: this.elements.participantId.value,
                    experimentType: this.elements.experimentType.value
                });
                this.log('Experiment data auto-saved successfully');
            } catch (error) {
                this.log(`Auto-save failed: ${error.message}`);
            }
            
        } catch (error) {
            this.log(`Failed to stop recording: ${error.message}`);
            this.updateStatus('Failed to stop recording', 'error');
        }
    }

    async handleDemoAreaClick(event) {
        if (isRecording()) {
            const rect = this.elements.demoArea.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            await addEvent('demo_click', { 
                x: x, 
                y: y, 
                note: 'User clicked in demo area' 
            });
            
            this.log(`Click event recorded at (${x.toFixed(1)}, ${y.toFixed(1)})`);
        }
    }

    // Download Handlers
    async handleDownloadJson() {
        await this.performDownloadAction('Downloading JSON...', 'JSON', async (session) => {
            await downloadSessionComponents(session.sessionId, {
                includeMetadata: true,
                includeGazeData: false,
                includeEvents: false,
                includeVideo: false
            });
        });
    }

    async handleDownloadCsv() {
        await this.performDownloadAction('Downloading CSV...', 'CSV', async (session) => {
            await downloadSessionComponents(session.sessionId, {
                includeMetadata: false,
                includeGazeData: true,
                includeEvents: true,
                includeVideo: false
            });
        });
    }

    async handleDownloadVideo(format) {
        const formatLabel = format.toUpperCase();
        await this.performDownloadAction(`Downloading Video (${formatLabel})...`, `Video (${formatLabel})`, async (session) => {
            await downloadSessionComponents(session.sessionId, {
                includeMetadata: false,
                includeGazeData: false,
                includeEvents: false,
                includeVideo: true,
                videoFormat: format
            });
        });
    }

    async handleDownloadAll() {
        await this.performDownloadAction('Downloading All Files...', 'All files', async (session) => {
            await downloadSessionComponents(session.sessionId, {
                includeMetadata: true,
                includeGazeData: true,
                includeEvents: true,
                includeVideo: true
            });
        });
    }

    async handleDownloadZip() {
        await this.performDownloadAction('Creating ZIP...', 'ZIP archive', async (session) => {
            await downloadSessionAsZip(session.sessionId, {
                includeMetadata: true,
                includeGazeData: true,
                includeEvents: true,
                includeVideo: true
            });
        });
    }

    // Helper method for download actions
    async performDownloadAction(loadingMessage, successType, downloadFunction) {
        try {
            this.updateStatus(loadingMessage, 'recording');
            this.log(`${loadingMessage.replace('...', '')}`);
            
            const session = getCurrentSession();
            if (!session) {
                throw new Error('No session available for download');
            }
            
            await downloadFunction(session);
            this.log(`${successType} downloaded successfully`);
            this.updateStatus(`${successType} download completed`, 'completed');
            
        } catch (error) {
            this.log(`${successType} download failed: ${error.message}`);
            this.updateStatus('Download failed', 'error');
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DemoApp();
});