/**
 * Mock Eye Tracking WebSocket Server
 * Simulates an eye tracking device for testing purposes
 */

const server = Bun.serve({
    port: 8080,
    fetch(req, server) {
        const url = new URL(req.url);
        const method = req.method;
        
        // Enable CORS for all requests
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        };
        
        if (method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }
        
        if (url.pathname === '/') {
            return new Response(`
<!DOCTYPE html>
<html>
<head>
    <title>Mock Eye Tracking Server</title>
</head>
<body>
    <h1>Mock Eye Tracking Server (REST + WebSocket)</h1>
    <p>WebSocket: ws://localhost:8080/eye_tracking</p>
    <div id="stats">
        <h3>Connection Stats:</h3>
        <p>Connected clients: <span id="clientCount">0</span></p>
        <p>Messages sent: <span id="messageCount">0</span></p>
        <p>Calibration sessions: <span id="calibrationCount">0</span></p>
        <p>Current state: <span id="currentState">idle</span></p>
    </div>
    <div>
        <h3>REST API Endpoints:</h3>
        <ul>
            <li>POST /calibration:start - Start calibration session</li>
            <li>POST /calibration:collect - Send gaze point for calibration</li>
            <li>POST /calibration:end - End calibration and get results</li>
            <li>GET /stats - Get server statistics</li>
        </ul>
    </div>
    <script>
        setInterval(() => {
            fetch('/stats').then(r => r.json()).then(stats => {
                document.getElementById('clientCount').textContent = stats.clients;
                document.getElementById('messageCount').textContent = stats.messages;
                document.getElementById('calibrationCount').textContent = stats.calibrationSessions;
                document.getElementById('currentState').textContent = stats.currentState;
            });
        }, 1000);
    </script>
</body>
</html>
            `, {
                headers: { 'Content-Type': 'text/html', ...corsHeaders }
            });
        }
        
        if (url.pathname === '/stats') {
            return Response.json({
                clients: connectedClients.size,
                messages: totalMessagesSent,
                calibrationSessions: calibrationSessionCount,
                currentState: currentCalibrationState
            }, { headers: corsHeaders });
        }
        
        // REST API for calibration
        if (url.pathname === '/calibration:start' && method === 'POST') {
            return handleCalibrationStart(req, corsHeaders);
        }
        
        if (url.pathname === '/calibration:collect' && method === 'POST') {
            return handleCalibrationCollect(req, corsHeaders);
        }
        
        if (url.pathname === '/calibration:end' && method === 'POST') {
            return handleCalibrationEnd(req, corsHeaders);
        }
        
        // WebSocket upgrade for eye tracking data
        if (url.pathname === '/eye_tracking' && server.upgrade(req)) {
            return; // Upgraded to WebSocket
        }
        
        return new Response('Eye Tracking Server\nWebSocket: /eye_tracking\nREST API: /calibration:*', {
            status: 404,
            headers: corsHeaders
        });
    },
    
    websocket: {
        open(ws) {
            console.log('🔗 Client connected');
            connectedClients.add(ws);
            
            // Send initial connection confirmation
            ws.send(JSON.stringify({
                type: 'connection_established',
                timestamp: Date.now(),
                message: 'Connected to mock eye tracking server'
            }));
            
            // Start sending mock gaze data
            startGazeDataStream(ws);
        },
        
        message(ws, message) {
            try {
                const data = JSON.parse(message.toString());
                console.log('📨 Received WebSocket message:', data.type);
                
                switch (data.type) {
                    case 'start_tracking':
                        handleStartTracking(ws, data);
                        break;
                    case 'stop_tracking':
                        handleStopTracking(ws, data);
                        break;
                    case 'ping':
                        ws.send(JSON.stringify({
                            type: 'pong',
                            timestamp: Date.now()
                        }));
                        break;
                    default:
                        console.log('❓ Unknown WebSocket message type:', data.type);
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: `Unknown message type: ${data.type}`,
                            timestamp: Date.now()
                        }));
                }
            } catch (error) {
                console.error('❌ Error parsing WebSocket message:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Invalid message format',
                    timestamp: Date.now()
                }));
            }
        },
        
        close(ws) {
            console.log('🔌 Client disconnected');
            connectedClients.delete(ws);
            
            // Stop gaze data stream for this client
            if (gazeIntervals.has(ws)) {
                clearInterval(gazeIntervals.get(ws));
                gazeIntervals.delete(ws);
            }
        },
        
        error(ws, error) {
            console.error('❌ WebSocket error:', error);
        }
    }
});

// Global state
const connectedClients = new Set<any>();
const gazeIntervals = new Map<any, any>();
let totalMessagesSent = 0;
let isTrackingActive = false;
let calibrationSessionCount = 0;
let currentCalibrationState = 'idle'; // idle, calibrating, completed
let currentCalibrationSession: any = null;
let calibrationPoints: any[] = [];

// Mock gaze data generation
function generateMockGazeData(): any {
    const timestamp = Date.now();
    const time = timestamp / 1000;
    
    // Simulate realistic eye movement patterns
    const centerX = 960;
    const centerY = 540;
    
    // Create smooth, realistic eye movement with some noise
    const baseX = centerX + Math.sin(time * 0.5) * 300 + Math.sin(time * 2) * 50;
    const baseY = centerY + Math.cos(time * 0.3) * 200 + Math.cos(time * 1.5) * 30;
    
    // Add small random variations
    const noiseX = (Math.random() - 0.5) * 10;
    const noiseY = (Math.random() - 0.5) * 10;
    
    const screenX = Math.max(0, Math.min(1920, baseX + noiseX));
    const screenY = Math.max(0, Math.min(1080, baseY + noiseY));
    
    // Small offset between left and right eye
    const eyeOffset = 2;
    
    return {
        type: 'gaze_data',
        timestamp: timestamp,
        systemTimestamp: timestamp,
        browserTimestamp: performance.now(),
        screenX: screenX,
        screenY: screenY,
        windowX: screenX - 100, // Assuming window offset
        windowY: screenY - 50,
        confidence: 0.85 + Math.random() * 0.1,
        leftEye: {
            screenX: screenX - eyeOffset,
            screenY: screenY,
            windowX: screenX - 100 - eyeOffset,
            windowY: screenY - 50,
            positionX: 0.48 + (Math.random() - 0.5) * 0.04,
            positionY: 0.52 + (Math.random() - 0.5) * 0.04,
            positionZ: 0.6 + (Math.random() - 0.5) * 0.1,
            pupilSize: 3.2 + Math.sin(time * 0.1) * 0.3 + (Math.random() - 0.5) * 0.2
        },
        rightEye: {
            screenX: screenX + eyeOffset,
            screenY: screenY,
            windowX: screenX - 100 + eyeOffset,
            windowY: screenY - 50,
            positionX: 0.52 + (Math.random() - 0.5) * 0.04,
            positionY: 0.48 + (Math.random() - 0.5) * 0.04,
            positionZ: 0.6 + (Math.random() - 0.5) * 0.1,
            pupilSize: 3.1 + Math.sin(time * 0.1) * 0.3 + (Math.random() - 0.5) * 0.2
        },
        browserWindow: {
            innerWidth: 1920,
            innerHeight: 1080,
            scrollX: 0,
            scrollY: 0,
            devicePixelRatio: 1,
            screenX: 100,
            screenY: 50,
            outerWidth: 1920,
            outerHeight: 1080
        },
        screen: {
            width: 1920,
            height: 1080,
            availWidth: 1920,
            availHeight: 1040
        }
    };
}

function startGazeDataStream(ws: any) {
    // Send gaze data at 60Hz when tracking is active
    const interval = setInterval(() => {
        if (isTrackingActive) {
            const gazeData = generateMockGazeData();
            ws.send(JSON.stringify(gazeData));
            totalMessagesSent++;
        }
    }, 16.67); // ~60Hz
    
    gazeIntervals.set(ws, interval);
}

function handleStartTracking(ws: any, data: any) {
    console.log('👁️ Starting eye tracking for session:', data.sessionId);
    isTrackingActive = true;
    
    ws.send(JSON.stringify({
        type: 'tracking_started',
        sessionId: data.sessionId,
        timestamp: Date.now(),
        samplingRate: 60,
        message: 'Eye tracking started successfully'
    }));
}

function handleStopTracking(ws: any, data: any) {
    console.log('🛑 Stopping eye tracking for session:', data.sessionId);
    isTrackingActive = false;
    
    ws.send(JSON.stringify({
        type: 'tracking_stopped',
        sessionId: data.sessionId,
        timestamp: Date.now(),
        message: 'Eye tracking stopped successfully'
    }));
}

// REST API handlers for calibration
async function handleCalibrationStart(req: Request, corsHeaders: any) {
    try {
        const body = await req.json();
        console.log('🎯 Starting calibration session:', body);
        
        if (currentCalibrationState !== 'idle') {
            return Response.json({
                success: false,
                error: 'Calibration already in progress'
            }, { status: 400, headers: corsHeaders });
        }
        
        currentCalibrationState = 'calibrating';
        currentCalibrationSession = {
            sessionId: body.sessionId || `cal_${Date.now()}`,
            startTime: Date.now(),
            expectedPoints: body.calibrationPoints || 9,
            collectedPoints: []
        };
        calibrationPoints = [];
        calibrationSessionCount++;
        
        console.log(`✅ Calibration session started: ${currentCalibrationSession.sessionId}`);
        
        return Response.json({
            success: true,
            sessionId: currentCalibrationSession.sessionId,
            expectedPoints: currentCalibrationSession.expectedPoints,
            message: 'Calibration session started'
        }, { headers: corsHeaders });
        
    } catch (error) {
        console.error('❌ Error starting calibration:', error);
        return Response.json({
            success: false,
            error: 'Invalid request body'
        }, { status: 400, headers: corsHeaders });
    }
}

async function handleCalibrationCollect(req: Request, corsHeaders: any) {
    try {
        const body = await req.json();
        console.log('📍 Collecting calibration point:', body);
        
        if (currentCalibrationState !== 'calibrating') {
            return Response.json({
                success: false,
                error: 'No active calibration session'
            }, { status: 400, headers: corsHeaders });
        }
        
        const point = {
            targetX: body.targetX,
            targetY: body.targetY,
            gazeX: body.gazeX || (body.targetX + (Math.random() - 0.5) * 50), // Simulate small error
            gazeY: body.gazeY || (body.targetY + (Math.random() - 0.5) * 50),
            timestamp: Date.now(),
            confidence: 0.8 + Math.random() * 0.15
        };
        
        calibrationPoints.push(point);
        currentCalibrationSession.collectedPoints.push(point);
        
        const progress = calibrationPoints.length / currentCalibrationSession.expectedPoints;
        
        return Response.json({
            success: true,
            pointIndex: calibrationPoints.length - 1,
            totalPoints: calibrationPoints.length,
            expectedPoints: currentCalibrationSession.expectedPoints,
            progress: progress,
            message: `Point ${calibrationPoints.length}/${currentCalibrationSession.expectedPoints} collected`
        }, { headers: corsHeaders });
        
    } catch (error) {
        console.error('❌ Error collecting calibration point:', error);
        return Response.json({
            success: false,
            error: 'Invalid request body'
        }, { status: 400, headers: corsHeaders });
    }
}

async function handleCalibrationEnd(req: Request, corsHeaders: any) {
    try {
        console.log('🏁 Ending calibration session');
        
        if (currentCalibrationState !== 'calibrating') {
            return Response.json({
                success: false,
                error: 'No active calibration session'
            }, { status: 400, headers: corsHeaders });
        }
        
        // Calculate accuracy based on collected points
        let totalError = 0;
        calibrationPoints.forEach(point => {
            const errorX = Math.abs(point.targetX - point.gazeX);
            const errorY = Math.abs(point.targetY - point.gazeY);
            totalError += Math.sqrt(errorX * errorX + errorY * errorY);
        });
        
        const averageError = calibrationPoints.length > 0 ? totalError / calibrationPoints.length : 100;
        const accuracy = Math.max(0.5, Math.min(0.95, 1 - (averageError / 100))); // 50-95% accuracy
        const success = accuracy > 0.75;
        
        const result = {
            success: success,
            sessionId: currentCalibrationSession.sessionId,
            accuracy: accuracy,
            points: calibrationPoints.length,
            expectedPoints: currentCalibrationSession.expectedPoints,
            averageError: averageError,
            duration: Date.now() - currentCalibrationSession.startTime,
            errorMessage: success ? undefined : 'Calibration accuracy too low, please retry',
            calibrationData: calibrationPoints
        };
        
        // Reset calibration state
        currentCalibrationState = success ? 'completed' : 'idle';
        if (success) {
            setTimeout(() => {
                currentCalibrationState = 'idle';
            }, 5000); // Reset to idle after 5 seconds
        }
        
        console.log(`✅ Calibration completed: ${(accuracy * 100).toFixed(1)}% accuracy`);
        
        return Response.json(result, { headers: corsHeaders });
        
    } catch (error) {
        console.error('❌ Error ending calibration:', error);
        currentCalibrationState = 'idle'; // Reset on error
        return Response.json({
            success: false,
            error: 'Failed to end calibration session'
        }, { status: 500, headers: corsHeaders });
    }
}

console.log('🚀 Mock Eye Tracking Server starting...');
console.log(`🌐 Web interface: http://localhost:${server.port}`);
console.log(`👁️ WebSocket endpoint: ws://localhost:${server.port}/eye_tracking`);
console.log('');
console.log('📡 REST API Endpoints:');
console.log(`  POST http://localhost:${server.port}/calibration:start`);
console.log(`  POST http://localhost:${server.port}/calibration:collect`);
console.log(`  POST http://localhost:${server.port}/calibration:end`);
console.log(`  GET  http://localhost:${server.port}/stats`);
console.log('');
console.log('✨ Features:');
console.log('- REST API for calibration workflow (as per TASK.md spec)');
console.log('- WebSocket for 60Hz gaze data stream');
console.log('- Realistic eye movement simulation');
console.log('- CORS enabled for browser integration');
console.log('- Session management and error handling');
console.log('');
console.log('🔗 Use with browser-eye-tracking library for testing.');