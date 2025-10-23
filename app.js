// Configuration
let bridgeIP = '192.168.68.102';
let bridgePort = '9090';
let launcherIP = '192.168.68.102';
let launcherPort = '8001';
let roomName = 'Meeting Room 1';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    loadRoomName();
    checkConnection();
});

// Load settings from localStorage
function loadSettings() {
    bridgeIP = localStorage.getItem('bridgeIP') || '192.168.68.102';
    bridgePort = localStorage.getItem('bridgePort') || '9090';
    launcherIP = localStorage.getItem('launcherIP') || '192.168.68.102';
    launcherPort = localStorage.getItem('launcherPort') || '8001';
}

// Load room name
function loadRoomName() {
    const savedRoomName = localStorage.getItem('roomName');
    if (savedRoomName) {
        roomName = savedRoomName;
        document.getElementById('roomName').textContent = roomName;
    }
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('bridgeIP', bridgeIP);
    localStorage.setItem('bridgePort', bridgePort);
    localStorage.setItem('launcherIP', launcherIP);
    localStorage.setItem('launcherPort', launcherPort);
    localStorage.setItem('roomName', roomName);
}

// Check connection
async function checkConnection() {
    try {
        console.log('App loaded - staying on home screen');
    } catch (error) {
        console.error('Error checking connection:', error);
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
        showAlert('Error', 'Failed to reach bridge service');
        throw error;
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
        showAlert('Error', 'Failed to reach launcher service');
        throw error;
    }
}

// Wake Device
async function wakeDevice() {
    try {
        console.log('Waking device at:', `http://${bridgeIP}:${bridgePort}`);

        // Send a tap in the center of the screen to wake it
        const response = await fetch(`http://${bridgeIP}:${bridgePort}/api/touchpad`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                action: 'click',
                x: 1920,  // Center of 4K screen (3840/2)
                y: 1080   // Center of 4K screen (2160/2)
            }),
        });

        const data = await response.json();
        console.log('Wake tap response:', data);

        showAlert('Success', 'Device screen tapped to wake');
    } catch (error) {
        console.error('Failed to wake device:', error);
        showAlert('Error', 'Failed to wake device. Check connection.');
    }
}

// Go Home
async function goHome() {
    try {
        console.log('=== GO HOME DEBUG ===');
        console.log('Bridge IP:', bridgeIP);
        console.log('Bridge Port:', bridgePort);
        console.log('Bridge URL:', `http://${bridgeIP}:${bridgePort}`);
        console.log('Full URL:', `http://${bridgeIP}:${bridgePort}/api/control`);

        const data = await callBridgeAPI('/api/control', { action: 'go_home' });

        console.log('Go home response:', data);
        console.log('Response keys:', Object.keys(data));
        console.log('Data success:', data.success);
        console.log('Data status:', data.status);

        if (data.success === true || data.status === 'success') {
            showAlert('Success', 'Navigated to home screen');
        } else {
            showAlert('Error', `Failed: ${data.message || JSON.stringify(data)}`);
        }
    } catch (error) {
        console.error('Failed to go home:', error);
        showAlert('Error', `Failed to navigate to home: ${error.message}`);
    }
}

// Navigation functions
function goToSettings() {
    showPage('settings');
}

function goToMeetingControls() {
    showPage('meeting-controls');
}

function goToCalendar() {
    showPage('calendar');
}

function goToJoinMeeting() {
    showPage('join-meeting');
}

function goToInstantMeeting() {
    showPage('instant-meeting');
}

function goToCasting() {
    showPage('casting');
}

function goToQRScanner() {
    showPage('qr-scanner');
}

// Page navigation
function showPage(pageName) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
    
    // Show target page
    const targetPage = document.getElementById(pageName);
    if (targetPage) {
        targetPage.classList.add('active');
    } else {
        // Create page if it doesn't exist
        createPage(pageName);
    }
}

function goBack() {
    // Hide all pages to return to home
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
}

// Create page content
function createPage(pageName) {
    const app = document.getElementById('app');
    const pageDiv = document.createElement('div');
    pageDiv.id = pageName;
    pageDiv.className = 'page active';
    
    switch(pageName) {
        case 'join-meeting':
            pageDiv.innerHTML = `
                <div class="header">
                    <button class="settingsButton" onclick="goBack()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M19 12H5M12 19L5 12L12 5" stroke="#1C1C1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <div class="headerInfo">
                        <div class="companyName">Join Meeting</div>
                    </div>
                    <div style="width: 24px;"></div>
                </div>
                <div class="meeting-info">
                    <div class="meeting-title">Enter Meeting Details</div>
                    <div class="meeting-subtitle">Join with a meeting link or code</div>
                </div>
                <div style="padding: 20px;">
                    <div class="input-group">
                        <label class="input-label">Meeting URL</label>
                        <input type="text" class="input" id="meetingURL" placeholder="https://meet.google.com/abc-defg-hij">
                    </div>
                    <button class="button" onclick="joinMeeting()">Join Meeting</button>
                    <button class="button secondary-button" onclick="goToQRScanner()">Scan QR Code</button>
                </div>
            `;
            break;
            
        case 'calendar':
            pageDiv.innerHTML = `
                <div class="header">
                    <button class="settingsButton" onclick="goBack()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M19 12H5M12 19L5 12L12 5" stroke="#1C1C1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <div class="headerInfo">
                        <div class="companyName">Calendar</div>
                    </div>
                    <div style="width: 24px;"></div>
                </div>
                <div class="meeting-info">
                    <div class="meeting-title">Today's Meetings</div>
                    <div class="meeting-subtitle">Upcoming meetings from your calendar</div>
                </div>
                <div style="padding: 20px;">
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
                </div>
            `;
            break;
            
        case 'casting':
            pageDiv.innerHTML = `
                <div class="header">
                    <button class="settingsButton" onclick="goBack()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M19 12H5M12 19L5 12L12 5" stroke="#1C1C1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <div class="headerInfo">
                        <div class="companyName">Present Screen</div>
                    </div>
                    <div style="width: 24px;"></div>
                </div>
                <div class="status-section">
                    <div class="status-title">Casting Status</div>
                    <div class="status-text" id="castingStatus">Ready to cast</div>
                </div>
                <div style="padding: 20px;">
                    <button class="button" onclick="startCasting()">Start Casting</button>
                    <button class="button secondary-button" onclick="stopCasting()">Stop Casting</button>
                </div>
            `;
            break;
            
        case 'meeting-controls':
            pageDiv.innerHTML = `
                <div class="header">
                    <button class="settingsButton" onclick="goBack()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M19 12H5M12 19L5 12L12 5" stroke="#1C1C1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <div class="headerInfo">
                        <div class="companyName">Meeting Controls</div>
                    </div>
                    <div style="width: 24px;"></div>
                </div>
                <div class="meeting-info">
                    <div class="meeting-title">Active Meeting Controls</div>
                    <div class="meeting-subtitle">Control your meeting</div>
                </div>
                <div style="padding: 20px;">
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
                </div>
            `;
            break;
            
        case 'instant-meeting':
            pageDiv.innerHTML = `
                <div class="header">
                    <button class="settingsButton" onclick="goBack()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M19 12H5M12 19L5 12L12 5" stroke="#1C1C1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <div class="headerInfo">
                        <div class="companyName">Start Instant Meeting</div>
                    </div>
                    <div style="width: 24px;"></div>
                </div>
                <div class="meeting-info">
                    <div class="meeting-title">Quick Meeting Setup</div>
                    <div class="meeting-subtitle">Start a meeting instantly</div>
                </div>
                <div style="padding: 20px;">
                    <button class="button" onclick="startInstantMeeting('google')">Google Meet</button>
                    <button class="button" onclick="startInstantMeeting('teams')">Microsoft Teams</button>
                    <button class="button" onclick="startInstantMeeting('zoom')">Zoom</button>
                </div>
            `;
            break;
            
        case 'settings':
            pageDiv.innerHTML = `
                <div class="header">
                    <button class="settingsButton" onclick="goBack()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M19 12H5M12 19L5 12L12 5" stroke="#1C1C1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <div class="headerInfo">
                        <div class="companyName">Settings</div>
                    </div>
                    <div style="width: 24px;"></div>
                </div>
                <div class="settings-section">
                    <div class="settings-title">Bridge Settings</div>
                    <div class="input-group">
                        <label class="input-label">Bridge IP</label>
                        <input type="text" class="input" id="bridgeIP" placeholder="192.168.68.102" value="${bridgeIP}">
                    </div>
                    <div class="input-group">
                        <label class="input-label">Bridge Port</label>
                        <input type="text" class="input" id="bridgePort" placeholder="9090" value="${bridgePort}">
                    </div>
                    <div class="settings-title">Launcher Settings</div>
                    <div class="input-group">
                        <label class="input-label">Launcher IP</label>
                        <input type="text" class="input" id="launcherIP" placeholder="192.168.68.102" value="${launcherIP}">
                    </div>
                    <div class="input-group">
                        <label class="input-label">Launcher Port</label>
                        <input type="text" class="input" id="launcherPort" placeholder="8001" value="${launcherPort}">
                    </div>
                    <div class="input-group">
                        <label class="input-label">Room Name</label>
                        <input type="text" class="input" id="roomNameInput" placeholder="Meeting Room 1" value="${roomName}">
                    </div>
                    <button class="button" onclick="testConnections()">Test Connections</button>
                    <button class="button secondary-button" onclick="saveSettings()">Save Settings</button>
                </div>
            `;
            break;
            
        case 'qr-scanner':
            pageDiv.innerHTML = `
                <div class="header">
                    <button class="settingsButton" onclick="goBack()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M19 12H5M12 19L5 12L12 5" stroke="#1C1C1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <div class="headerInfo">
                        <div class="companyName">QR Scanner</div>
                    </div>
                    <div style="width: 24px;"></div>
                </div>
                <div class="meeting-info">
                    <div class="meeting-title">Scan QR Code</div>
                    <div class="meeting-subtitle">Scan QR code to connect</div>
                </div>
                <div style="padding: 20px;">
                    <div style="background-color: #000; height: 300px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; margin: 20px 0;">
                        📷 Camera Preview<br>
                        <small>QR Scanner would be active here</small>
                    </div>
                    <button class="button secondary-button" onclick="goToJoinMeeting()">Manual Entry</button>
                </div>
            `;
            break;
    }
    
    app.appendChild(pageDiv);
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
        showAlert('Success', 'Casting started!');
    } catch (error) {
        showAlert('Error', 'Failed to start casting: ' + error.message);
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

// Test connections
async function testConnections() {
    try {
        // Test Bridge
        const bridgeResponse = await fetch(`http://${bridgeIP}:${bridgePort}/api/control`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'ping' })
        });
        
        if (bridgeResponse.ok) {
            showAlert('Success', 'Bridge connection successful!');
        } else {
            throw new Error('Bridge not responding');
        }
    } catch (error) {
        showAlert('Error', 'Bridge connection failed: ' + error.message);
    }
}

// Save settings
function saveSettings() {
    bridgeIP = document.getElementById('bridgeIP').value;
    bridgePort = document.getElementById('bridgePort').value;
    launcherIP = document.getElementById('launcherIP').value;
    launcherPort = document.getElementById('launcherPort').value;
    roomName = document.getElementById('roomNameInput').value;
    
    saveSettings();
    document.getElementById('roomName').textContent = roomName;
    
    showAlert('Success', 'Settings saved!');
}

// Alert system
function showAlert(title, message) {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert';
    alertDiv.innerHTML = `
        <div class="alert-title">${title}</div>
        <div class="alert-message">${message}</div>
        <div class="alert-buttons">
            <button class="alert-button primary" onclick="closeAlert()">OK</button>
        </div>
    `;
    
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.onclick = closeAlert;
    
    document.body.appendChild(overlay);
    document.body.appendChild(alertDiv);
}

function closeAlert() {
    const alert = document.querySelector('.alert');
    const overlay = document.querySelector('.overlay');
    if (alert) alert.remove();
    if (overlay) overlay.remove();
}