/**
 * Mock Eye Tracking WebSocket Server
 * Simulates an eye tracking device for testing purposes
 */

const server = Bun.serve({
    port: 8080,
    fetch(req, server) {
        const url = new URL(req.url);
        
        if (url.pathname === '/') {
            return new Response(`
<!DOCTYPE html>
<html>
<head>
    <title>Mock Eye Tracking Server</title>
</head>
<body>
    <h1>Mock Eye Tracking WebSocket Server</h1>
    <p>Status: Running on ws://localhost:8080</p>
    <p>This server simulates eye tracking data for testing the browser-eye-tracking library.</p>
    <div id="stats">
        <h3>Connection Stats:</h3>
        <p>Connected clients: <span id="clientCount">0</span></p>
        <p>Messages sent: <span id="messageCount">0</span></p>
    </div>
    <script>
        let messageCount = 0;
        setInterval(() => {
            fetch('/stats').then(r => r.json()).then(stats => {
                document.getElementById('clientCount').textContent = stats.clients;
                document.getElementById('messageCount').textContent = stats.messages;
            });
        }, 1000);
    </script>
</body>
</html>
            `, {
                headers: { 'Content-Type': 'text/html' }
            });
        }
        
        if (url.pathname === '/stats') {
            return Response.json({
                clients: connectedClients.size,
                messages: totalMessagesSent
            });
        }
        
        // Upgrade to WebSocket
        if (server.upgrade(req)) {
            return; // Upgraded to WebSocket
        }
        
        return new Response('WebSocket server running on ws://localhost:8080', {
            status: 426,
            statusText: 'Upgrade Required'
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
                console.log('📨 Received message:', data.type);
                
                switch (data.type) {
                    case 'start_tracking':
                        handleStartTracking(ws, data);
                        break;
                    case 'stop_tracking':
                        handleStopTracking(ws, data);
                        break;
                    case 'calibrate':
                        handleCalibration(ws, data);
                        break;
                    case 'ping':
                        ws.send(JSON.stringify({
                            type: 'pong',
                            timestamp: Date.now()
                        }));
                        break;
                    default:
                        console.log('❓ Unknown message type:', data.type);
                }
            } catch (error) {
                console.error('❌ Error parsing message:', error);
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

function handleCalibration(ws: any, data: any) {
    console.log('🎯 Starting calibration...');
    
    // Simulate calibration process
    setTimeout(() => {
        const accuracy = 0.85 + Math.random() * 0.1; // 85-95% accuracy
        
        ws.send(JSON.stringify({
            type: 'calibration_result',
            timestamp: Date.now(),
            success: accuracy > 0.8,
            accuracy: accuracy,
            points: data.calibrationPoints || 9,
            errorMessage: accuracy <= 0.8 ? 'Calibration accuracy too low' : undefined
        }));
        
        console.log(`✅ Calibration completed with ${(accuracy * 100).toFixed(1)}% accuracy`);
    }, 2000); // 2 second calibration process
}

console.log('🚀 Mock Eye Tracking Server starting...');
console.log(`👁️ WebSocket server running on ws://localhost:${server.port}`);
console.log(`🌐 Web interface available at http://localhost:${server.port}`);
console.log('');
console.log('This server simulates:');
console.log('- 60Hz gaze data stream');
console.log('- Calibration process');
console.log('- Realistic eye movement patterns');
console.log('- Connection management');
console.log('');
console.log('Use this with the browser-eye-tracking library for testing.');