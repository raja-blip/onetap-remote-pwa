// Configuration
let bridgeIP = '192.168.68.102';
let bridgePort = '9090';
let launcherIP = '192.168.68.102';
let launcherPort = '8001';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    testConnections();
});

// Load settings from localStorage
function loadSettings() {
    bridgeIP = localStorage.getItem('bridgeIP') || '192.168.68.102';
    bridgePort = localStorage.getItem('bridgePort') || '9090';
    launcherIP = localStorage.getItem('launcherIP') || '192.168.68.102';
    launcherPort = localStorage.getItem('launcherPort') || '8001';
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('bridgeIP', bridgeIP);
    localStorage.setItem('bridgePort', bridgePort);
    localStorage.setItem('launcherIP', launcherIP);
    localStorage.setItem('launcherPort', launcherPort);
}

// Test connections
async function testConnections() {
    const bridgeStatus = document.getElementById('bridgeStatus');
    const bridgeStatusText = document.getElementById('bridgeStatusText');
    const launcherStatus = document.getElementById('launcherStatus');
    const launcherStatusText = document.getElementById('launcherStatusText');

    // Test Bridge
    try {
        const bridgeResponse = await fetch(`http://${bridgeIP}:${bridgePort}/api/control`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'ping' })
        });
        
        if (bridgeResponse.ok) {
            bridgeStatus.className = 'status-indicator connected';
            bridgeStatusText.textContent = 'Bridge: Connected';
        } else {
            throw new Error('Bridge not responding');
        }
    } catch (error) {
        bridgeStatus.className = 'status-indicator';
        bridgeStatusText.textContent = 'Bridge: Disconnected';
    }

    // Test Launcher
    try {
        const launcherResponse = await fetch(`http://${launcherIP}:${launcherPort}/discover`, {
            method: 'GET'
        });
        
        if (launcherResponse.ok) {
            launcherStatus.className = 'status-indicator connected';
            launcherStatusText.textContent = 'Launcher: Connected';
        } else {
            throw new Error('Launcher not responding');
        }
    } catch (error) {
        launcherStatus.className = 'status-indicator';
        launcherStatusText.textContent = 'Launcher: Disconnected';
    }
}

// Bridge API calls
async function callBridgeAPI(endpoint, data) {
    try {
        const response = await fetch(`http://${bridgeIP}:${bridgePort}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error('Bridge API error:', error);
        alert('Failed to reach bridge service');
    }
}

// Launcher API calls
async function callLauncherAPI(endpoint, data) {
    try {
        const response = await fetch(`http://${launcherIP}:${launcherPort}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error('Launcher API error:', error);
        alert('Failed to reach launcher service');
    }
}

// Navigation functions
function goHome() {
    callBridgeAPI('/api/control', { action: 'go_home' });
}

function goBack() {
    callBridgeAPI('/api/control', { action: 'go_back' });
}

// Navigation between pages
function navigateTo(page) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
    
    // Show target page
    const targetPage = document.getElementById(page);
    if (targetPage) {
        targetPage.classList.add('active');
    } else {
        // Create page if it doesn't exist
        createPage(page);
    }
}

// Create page content
function createPage(pageName) {
    const content = document.querySelector('.content');
    const pageDiv = document.createElement('div');
    pageDiv.id = pageName;
    pageDiv.className = 'page active';
    
    switch(pageName) {
        case 'join-meeting':
            pageDiv.innerHTML = `
                <div class="meeting-info">
                    <div class="meeting-title">Join Meeting</div>
                    <div class="meeting-subtitle">Enter meeting details</div>
                </div>
                <div class="input-group">
                    <label class="input-label">Meeting URL</label>
                    <input type="text" class="input" id="meetingURL" placeholder="https://meet.google.com/abc-defg-hij">
                </div>
                <button class="button" onclick="joinMeeting()">Join Meeting</button>
                <button class="button secondary-button" onclick="navigateTo('qr-scanner')">Scan QR Code</button>
            `;
            break;
            
        case 'calendar':
            pageDiv.innerHTML = `
                <div class="meeting-info">
                    <div class="meeting-title">Calendar</div>
                    <div class="meeting-subtitle">Upcoming meetings</div>
                </div>
                <div class="meeting-info">
                    <div class="meeting-title">Team Standup</div>
                    <div class="meeting-subtitle">Today, 10:00 AM - 10:30 AM</div>
                    <button class="button" onclick="joinMeetingFromCalendar('https://meet.google.com/standup')">Join</button>
                </div>
                <div class="meeting-info">
                    <div class="meeting-title">Project Review</div>
                    <div class="meeting-subtitle">Tomorrow, 2:00 PM - 3:00 PM</div>
                    <button class="button" onclick="joinMeetingFromCalendar('https://teams.microsoft.com/project-review')">Join</button>
                </div>
            `;
            break;
            
        case 'casting':
            pageDiv.innerHTML = `
                <div class="status-section">
                    <div class="status-title">Casting Status</div>
                    <div class="status-text" id="castingStatus">Ready to cast</div>
                </div>
                <button class="button" onclick="startCasting()">Start Casting</button>
                <button class="button secondary-button" onclick="stopCasting()">Stop Casting</button>
            `;
            break;
            
        case 'meeting-controls':
            pageDiv.innerHTML = `
                <div class="meeting-info">
                    <div class="meeting-title">Meeting Controls</div>
                    <div class="meeting-subtitle">Active meeting controls</div>
                </div>
                <div class="controls-grid">
                    <button class="control-button" onclick="meetingControl('mute')">🔇 Mute</button>
                    <button class="control-button" onclick="meetingControl('camera')">📹 Camera</button>
                    <button class="control-button" onclick="meetingControl('leave')">📞 Leave</button>
                    <button class="control-button" onclick="meetingControl('chat')">💬 Chat</button>
                </div>
                <div class="settings-title">Camera Controls</div>
                <div class="controls-grid">
                    <button class="control-button" onclick="cameraControl('up')">↑ Up</button>
                    <button class="control-button" onclick="cameraControl('down')">↓ Down</button>
                    <button class="control-button" onclick="cameraControl('left')">← Left</button>
                    <button class="control-button" onclick="cameraControl('right')">→ Right</button>
                    <button class="control-button" onclick="cameraControl('zoom_in')">🔍+ Zoom In</button>
                    <button class="control-button" onclick="cameraControl('zoom_out')">🔍- Zoom Out</button>
                </div>
            `;
            break;
            
        case 'instant-meeting':
            pageDiv.innerHTML = `
                <div class="meeting-info">
                    <div class="meeting-title">Start Instant Meeting</div>
                    <div class="meeting-subtitle">Quick meeting setup</div>
                </div>
                <button class="button" onclick="startInstantMeeting('google')">Google Meet</button>
                <button class="button" onclick="startInstantMeeting('teams')">Microsoft Teams</button>
                <button class="button" onclick="startInstantMeeting('zoom')">Zoom</button>
            `;
            break;
            
        case 'settings':
            pageDiv.innerHTML = `
                <div class="settings-section">
                    <div class="settings-title">Settings</div>
                    
                    <div class="input-group">
                        <label class="input-label">Bridge IP</label>
                        <input type="text" class="input" id="bridgeIP" placeholder="192.168.68.102" value="${bridgeIP}">
                    </div>
                    
                    <div class="input-group">
                        <label class="input-label">Bridge Port</label>
                        <input type="text" class="input" id="bridgePort" placeholder="9090" value="${bridgePort}">
                    </div>
                    
                    <div class="input-group">
                        <label class="input-label">Launcher IP</label>
                        <input type="text" class="input" id="launcherIP" placeholder="192.168.68.102" value="${launcherIP}">
                    </div>
                    
                    <div class="input-group">
                        <label class="input-label">Launcher Port</label>
                        <input type="text" class="input" id="launcherPort" placeholder="8001" value="${launcherPort}">
                    </div>
                    
                    <button class="button" onclick="testConnections()">Test Connections</button>
                    <button class="button secondary-button" onclick="saveSettings()">Save Settings</button>
                </div>
            `;
            break;
            
        case 'qr-scanner':
            pageDiv.innerHTML = `
                <div class="meeting-info">
                    <div class="meeting-title">QR Code Scanner</div>
                    <div class="meeting-subtitle">Scan QR code to connect</div>
                </div>
                <div style="background-color: #000; height: 300px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; margin: 20px 0;">
                    📷 Camera Preview<br>
                    <small>QR Scanner would be active here</small>
                </div>
                <button class="button secondary-button" onclick="navigateTo('join-meeting')">Manual Entry</button>
            `;
            break;
    }
    
    content.appendChild(pageDiv);
}

// Meeting functions
async function joinMeeting() {
    const url = document.getElementById('meetingURL')?.value || prompt('Enter meeting URL:');
    if (url) {
        window.open(url, '_blank');
    }
}

async function joinMeetingFromCalendar(meetingUrl) {
    window.open(meetingUrl, '_blank');
}

async function startCasting() {
    try {
        // Step 1: Send home command to clear screensaver
        await callBridgeAPI('/api/control', { action: 'go_home' });
        
        // Wait 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 2: Try to click "Cast Screen" using launcher
        await callLauncherAPI('/commands/send', {
            type: 'click_by_content_description',
            payload: { contentDescription: 'Cast Screen' }
        });
        
        document.getElementById('castingStatus').textContent = 'Casting active';
        alert('Casting started!');
    } catch (error) {
        alert('Failed to start casting: ' + error.message);
    }
}

async function stopCasting() {
    await callBridgeAPI('/api/control', { action: 'go_home' });
    document.getElementById('castingStatus').textContent = 'Ready to cast';
}

async function startInstantMeeting(platform) {
    let url = '';
    switch(platform) {
        case 'google':
            url = 'https://meet.google.com/new';
            break;
        case 'teams':
            url = 'https://teams.microsoft.com/meeting/new';
            break;
        case 'zoom':
            url = 'https://zoom.us/meeting/schedule';
            break;
    }
    if (url) {
        window.open(url, '_blank');
    }
}

// Camera controls
async function cameraControl(direction) {
    // Flip directions due to OEM SDK behavior
    let actualDirection = direction;
    if (direction === 'left') actualDirection = 'right';
    else if (direction === 'right') actualDirection = 'left';
    else if (direction === 'up') actualDirection = 'down';
    else if (direction === 'down') actualDirection = 'up';
    
    await callBridgeAPI('/api/control', { action: `camera_${actualDirection}` });
    
    if (direction !== 'zoom_in' && direction !== 'zoom_out') {
        setTimeout(() => {
            callBridgeAPI('/api/control', { action: 'camera_stop' });
        }, 300);
    }
}

// Meeting controls
async function meetingControl(action) {
    if (action === 'mute') {
        await callBridgeAPI('/api/control', { action: 'mute' });
    } else if (action === 'camera') {
        await callBridgeAPI('/api/control', { action: 'camera_toggle' });
    } else if (action === 'leave') {
        await callBridgeAPI('/api/control', { action: 'leave_meeting' });
        // Double back for Google Meet
        setTimeout(() => {
            callBridgeAPI('/api/control', { action: 'go_back' });
        }, 2000);
        setTimeout(() => {
            callBridgeAPI('/api/control', { action: 'go_back' });
        }, 3000);
    } else if (action === 'chat') {
        await callBridgeAPI('/api/control', { action: 'open_chat' });
    }
}
