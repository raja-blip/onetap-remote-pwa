import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logo from '../components/Logo';
//import LauncherService from '../services/LauncherService';

export default function MeetingControlsScreen() {
  const params = useLocalSearchParams();
  const platformFromRoute = params.platform as string;
  const meetingTypeFromRoute = params.meetingType as string || 'scheduled';

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [volume, setVolume] = useState(75);
  const [showJoinButton, setShowJoinButton] = useState(false);
  const [focusMode, setFocusMode] = useState('panoramic');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [bridgeURL, setBridgeURL] = useState('http://192.168.68.102:9090');
  const [selectedPlatform, setSelectedPlatform] = useState(platformFromRoute || 'teams');
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);
  const [roomName, setRoomName] = useState('Meeting Room 1');
  const [platformKnown, setPlatformKnown] = useState(false); // Track if platform is known

  const platforms = [
    { label: 'Microsoft Teams', value: 'teams', icon: 'people', supported: true },
    { label: 'Google Meet', value: 'meet', icon: 'videocam', supported: true },
    { label: 'Zoom', value: 'zoom', icon: 'videocam-outline', supported: true },
    { label: 'WebEx', value: 'webex', icon: 'desktop', supported: true },
  ];

  const meetingInfo = {
    title: roomName,
    room: '',
    duration: '00:15:42',
    participants: 8
  };
  
  useEffect(() => {
    loadBridgeConfig();
    loadCurrentCameraMode();
    loadRoomName();
    loadActiveMeetingPlatform();
    
    // Check if coming from calendar join
    if (params?.joinedAt) {
      const joinedAt = parseInt(params.joinedAt as string);
      const elapsed = Date.now() - joinedAt;
      const remaining = Math.max(0, 10000 - elapsed);
      
      console.log('Join button will appear in:', remaining, 'ms');
      
      setTimeout(() => {
        console.log('Showing join button now');
        setShowJoinButton(true);
      }, remaining);
    } else {
      console.log('No joinedAt param found, button will not appear');
    }
  }, [params]);

  const loadActiveMeetingPlatform = async () => {
    try {
      // If platform passed from route, save it as active and mark as known
      if (platformFromRoute) {
        await AsyncStorage.setItem('@active_meeting_platform', platformFromRoute);
        setPlatformKnown(true);
        console.log('Platform from route:', platformFromRoute, '- saved as active');
      } else {
        // No platform from route, check if there's a saved active meeting
        const savedPlatform = await AsyncStorage.getItem('@active_meeting_platform');
        if (savedPlatform) {
          setSelectedPlatform(savedPlatform);
          setPlatformKnown(true);
          console.log('Using saved active platform:', savedPlatform);
        } else {
          // Truly unknown - show dropdown
          setPlatformKnown(false);
          console.log('No platform info - will show dropdown');
        }
      }
    } catch (error) {
      console.error('Error loading active meeting platform:', error);
      setPlatformKnown(false);
    }
  };

  const loadBridgeConfig = async () => {
    try {
      const ip = await AsyncStorage.getItem('@bridge_ip') || '192.168.68.102';
      const port = await AsyncStorage.getItem('@bridge_port') || '9090';
      setBridgeURL(`http://${ip}:${port}`);
      console.log('Loaded bridge URL:', `http://${ip}:${port}`);
    } catch (error) {
      console.error('Error loading bridge config:', error);
    }
  };

  const loadRoomName = async () => {
    try {
      const savedRoomName = await AsyncStorage.getItem('@room_name');
      if (savedRoomName) setRoomName(savedRoomName);
    } catch (error) {
      console.error('Error loading room name:', error);
    }
  };

  const loadCurrentCameraMode = async () => {
    try {
      const ip = await AsyncStorage.getItem('@bridge_ip') || '192.168.68.102';
      const port = await AsyncStorage.getItem('@bridge_port') || '9090';
      const url = `http://${ip}:${port}`;

      console.log('Fetching current camera mode from:', `${url}/api/camera/mode`);
      
      const response = await fetch(`${url}/api/camera/mode`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('Current camera mode response:', data);

      if (data.status === 'success') {
        const mode = data.mode === 0 ? 'panoramic' : 'smart';
        setFocusMode(mode);
        console.log('Set initial focus mode to:', mode);
      }
    } catch (error) {
      console.error('Error loading camera mode:', error);
      setFocusMode('panoramic');
    }
  };

  const callBridgeAPI = async (endpoint: string, payload: any) => {
    setIsLoading(true);
    try {
      // Load bridge URL dynamically to ensure we have the latest IP
      const ip = await AsyncStorage.getItem('@bridge_ip') || '192.168.68.102';
      const port = await AsyncStorage.getItem('@bridge_port') || '9090';
      const currentBridgeURL = `http://${ip}:${port}`;
      
      console.log('=== BRIDGE API DEBUG ===');
      console.log('Stored IP:', ip);
      console.log('Stored Port:', port);
      console.log('Current Bridge URL:', currentBridgeURL);
      console.log('Endpoint:', endpoint);
      console.log('Full URL:', `${currentBridgeURL}${endpoint}`);
      console.log('Payload:', payload);
      
      const response = await fetch(`${currentBridgeURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const data = await response.json();
      console.log('Bridge API response:', data);

      if (data.status === 'success') {
        // Success - no alert needed for regular controls
        console.log('Success:', `${payload.action} executed`);
      } else {
        // Only show error alerts
        Alert.alert('Error', data.message || 'Action failed');
      }

      return data;
    } catch (error) {
      console.error('Bridge API error:', error);
      Alert.alert('Connection Error', 'Failed to reach bridge service. Check settings.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlatformChange = (value: string) => {
    const platform = platforms.find(p => p.value === value);
    if (platform && !platform.supported) {
      Alert.alert('Not Supported Yet', `${platform.label} coordinates are pending calibration.`);
      return;
    }
    setSelectedPlatform(value);
    setShowPlatformPicker(false);
  };

  const getPlatformLabel = () => {
    return platforms.find(p => p.value === selectedPlatform)?.label || 'Select Platform';
  };

  const handleMute = async () => {
    setIsLoading(true);
    try {
      // Determine expected button text based on current UI state
      const expectedButtonText = isMuted ? {
        'teams': 'Unmute',
        'zoom': 'Unmute',
        'webex': 'Unmute',
        'meet': null,
      }[selectedPlatform] : {
        'teams': 'Mute',
        'zoom': 'Mute',
        'webex': 'Mute',
        'meet': null,
      }[selectedPlatform];

      // Opposite button text (in case state is out of sync)
      const oppositeButtonText = isMuted ? {
        'teams': 'Mute',
        'zoom': 'Mute',
        'webex': 'Mute',
        'meet': null,
      }[selectedPlatform] : {
        'teams': 'Unmute',
        'zoom': 'Unmute',
        'webex': 'Unmute',
        'meet': null,
      }[selectedPlatform];

      let success = false;

      // Try text-based command first if available (using Bridge)
      if (expectedButtonText) {
        console.log(`Trying expected mute button via Bridge: "${expectedButtonText}"`);
        
        try {
          const ip = await AsyncStorage.getItem('@launcher_ip') || '192.168.68.102';
          const port = await AsyncStorage.getItem('@launcher_port') || '8080';
          const currentLauncherURL = `http://${ip}:${port}`;
          
          console.log('=== LAUNCHER SERVICE DEBUG ===');
          console.log('Launcher IP:', ip);
          console.log('Launcher Port:', port);
          console.log('Launcher URL:', currentLauncherURL);
          console.log('Trying text command:', expectedButtonText);
          
          const response = await fetch(`${currentLauncherURL}/commands/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'click_by_text',
              payload: { clickText: expectedButtonText }
            }),
          });
          const data = await response.json();
          console.log('Launcher text click response:', data);
          console.log('Response status:', response.status);
          console.log('Response ok:', response.ok);
          success = data.status === 'success';
        } catch (error) {
          console.log('Bridge text click failed:', error);
        }

        // If failed, try opposite (state might be out of sync)
        if (!success && oppositeButtonText) {
          console.log(`Expected button failed, trying opposite: "${oppositeButtonText}"`);
          try {
            const response = await fetch(`${bridgeURL}/commands/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'click_by_text',
                payload: { clickText: oppositeButtonText }
              }),
            });
            const data = await response.json();
            success = data.status === 'success';
            
            // If opposite worked, we were out of sync - don't toggle UI state
            if (success) {
              console.log('State was out of sync, corrected without toggling UI');
              setIsLoading(false);
              return;
            }
          } catch (error) {
            console.log('Opposite button also failed:', error);
          }
        }
      }

      // Fallback to coordinate-based if text failed or not available (Google Meet)
      if (!success) {
        console.log('Text-based failed or unavailable, falling back to Bridge Service coordinates');
        // Use Bridge Service for coordinate-based controls
        const ip = await AsyncStorage.getItem('@bridge_ip') || '192.168.68.102';
        const port = await AsyncStorage.getItem('@bridge_port') || '9090';
        const currentBridgeURL = `http://${ip}:${port}`;
        
        const response = await fetch(`${currentBridgeURL}/api/meeting`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'toggle_mute',
            app: selectedPlatform,
            meeting_type: meetingTypeFromRoute
          }),
        });
        const data = await response.json();
        console.log('Bridge meeting response:', data);
        success = data.status === 'success';
      }

      // Toggle UI state only if we clicked the expected button
      setIsMuted(!isMuted);
      
    } catch (error) {
      console.error('Error toggling mute:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCamera = async () => {
    setIsLoading(true);
    try {
      // Determine expected button text based on current UI state
      const expectedButtonText = isCameraOn ? {
        'teams': 'Turn off camera',
        'zoom': 'Stop video',
        'webex': 'Stop video',
        'meet': null,
      }[selectedPlatform] : {
        'teams': 'Turn on camera',
        'zoom': 'Start video',
        'webex': 'Start video',
        'meet': null,
      }[selectedPlatform];

      // Opposite button text (in case state is out of sync)
      const oppositeButtonText = isCameraOn ? {
        'teams': 'Turn on camera',
        'zoom': 'Start video',
        'webex': 'Start video',
        'meet': null,
      }[selectedPlatform] : {
        'teams': 'Turn off camera',
        'zoom': 'Stop video',
        'webex': 'Stop video',
        'meet': null,
      }[selectedPlatform];

      let success = false;

      // Try text-based command first if available (using Bridge)
      if (expectedButtonText) {
        console.log(`Trying expected camera button via Bridge: "${expectedButtonText}"`);
        
        try {
          const ip = await AsyncStorage.getItem('@launcher_ip') || '192.168.68.102';
          const port = await AsyncStorage.getItem('@launcher_port') || '8080';
          const currentLauncherURL = `http://${ip}:${port}`;
          
          console.log('=== LAUNCHER SERVICE DEBUG ===');
          console.log('Launcher IP:', ip);
          console.log('Launcher Port:', port);
          console.log('Launcher URL:', currentLauncherURL);
          console.log('Trying text command:', expectedButtonText);
          
          const response = await fetch(`${currentLauncherURL}/commands/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'click_by_text',
              payload: { clickText: expectedButtonText }
            }),
          });
          const data = await response.json();
          console.log('Launcher text click response:', data);
          console.log('Response status:', response.status);
          console.log('Response ok:', response.ok);
          success = data.status === 'success';
        } catch (error) {
          console.log('Bridge text click failed:', error);
        }

        // If failed, try opposite (state might be out of sync)
        if (!success && oppositeButtonText) {
          console.log(`Expected button failed, trying opposite: "${oppositeButtonText}"`);
          try {
            const response = await fetch(`${bridgeURL}/commands/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'click_by_text',
                payload: { clickText: oppositeButtonText }
              }),
            });
            const data = await response.json();
            success = data.status === 'success';
            
            // If opposite worked, we were out of sync - don't toggle UI state
            if (success) {
              console.log('State was out of sync, corrected without toggling UI');
              setIsLoading(false);
              return;
            }
          } catch (error) {
            console.log('Opposite button also failed:', error);
          }
        }
      }

      // Fallback to coordinate-based if text failed or not available (Google Meet)
      if (!success) {
        console.log('Text-based failed or unavailable, falling back to Bridge Service coordinates');
        // Use Bridge Service for coordinate-based controls
        const ip = await AsyncStorage.getItem('@bridge_ip') || '192.168.68.102';
        const port = await AsyncStorage.getItem('@bridge_port') || '9090';
        const currentBridgeURL = `http://${ip}:${port}`;
        
        const response = await fetch(`${currentBridgeURL}/api/meeting`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'toggle_camera',
            app: selectedPlatform,
            meeting_type: meetingTypeFromRoute
          }),
        });
        const data = await response.json();
        console.log('Bridge meeting response:', data);
        success = data.status === 'success';
      }

      // Toggle UI state only if we clicked the expected button
      setIsCameraOn(!isCameraOn);
      
    } catch (error) {
      console.error('Error toggling camera:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEndMeeting = () => {
    console.log('=== END MEETING BUTTON CLICKED ===');
    Alert.alert(
      'End Meeting',
      'Are you sure you want to end the meeting?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Meeting',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              // Text-based button mapping per platform
              const endButtonText = {
                'teams': 'Hang up',
                'zoom': 'Leave',
                'webex': 'End call',
                'meet': 'End call',
              }[selectedPlatform];

              // Confirmation button (if needed)
              const confirmButtonText = {
                'teams': null, // Teams doesn't need confirmation
                'zoom': 'Leave meeting',
                'webex': 'End meeting',
                'meet': null, // Google Meet doesn't need confirmation
              }[selectedPlatform];

              let success = false;

              // Try content-description-based command first (using Launcher)
              if (endButtonText) {
                console.log(`Trying content-description end call via Launcher: "${endButtonText}"`);
                
                try {
                  const ip = await AsyncStorage.getItem('@launcher_ip') || '192.168.68.102';
                  const port = await AsyncStorage.getItem('@launcher_port') || '8080';
                  const currentLauncherURL = `http://${ip}:${port}`;
                  
                  const response = await fetch(`${currentLauncherURL}/commands/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      type: 'click_by_content_description',
                      payload: { contentDescription: endButtonText }
                    }),
                  });
                  const data = await response.json();
                  console.log('Launcher end call response:', data);
                  success = data.status === 'success';

                  // If successful and confirmation needed, click confirm button
                  if (success && confirmButtonText) {
                    console.log(`Clicking confirmation via Launcher: "${confirmButtonText}"`);
                    await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for dialog
                    
                    const confirmResponse = await fetch(`${currentLauncherURL}/commands/send`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        type: 'click_by_content_description',
                        payload: { contentDescription: confirmButtonText }
                      }),
                    });
                    const confirmData = await confirmResponse.json();
                    console.log('Launcher confirmation response:', confirmData);
                  }
                } catch (error) {
                  console.log('Launcher end call failed:', error);
                }
              }

              // Fallback to coordinate-based if text failed
              if (!success) {
                console.log('Text-based failed, falling back to Bridge Service coordinates');
                // Use Bridge Service for coordinate-based controls
                const ip = await AsyncStorage.getItem('@bridge_ip') || '192.168.68.102';
                const port = await AsyncStorage.getItem('@bridge_port') || '9090';
                const currentBridgeURL = `http://${ip}:${port}`;
                
                const response = await fetch(`${currentBridgeURL}/api/meeting`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'leave_call',
                    app: selectedPlatform,
                    meeting_type: meetingTypeFromRoute
                  }),
                });
                const data = await response.json();
                console.log('Bridge meeting response:', data);
                success = data.status === 'success';
              }

              // Clear active meeting platform
              await AsyncStorage.removeItem('@active_meeting_platform');
              console.log('Cleared active meeting platform');

              // For Google Meet, add double go back commands to close Chrome
              if ((selectedPlatform === 'meet' || selectedPlatform === 'google') && success) {
                console.log('Google Meet ended, executing double go back commands to close Chrome...');
                try {
                  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for meeting to fully end
                  
                  const ip = await AsyncStorage.getItem('@bridge_ip') || '192.168.68.102';
                  const port = await AsyncStorage.getItem('@bridge_port') || '9090';
                  const currentBridgeURL = `http://${ip}:${port}`;
                  
                  // First go back command
                  console.log('Executing first go back command...');
                  const backResponse1 = await fetch(`${currentBridgeURL}/api/control`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'go_back' }),
                  });
                  
                  const backData1 = await backResponse1.json();
                  console.log('First go back response:', backData1);
                  
                  // Wait 1 second between commands
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  // Second go back command
                  console.log('Executing second go back command...');
                  const backResponse2 = await fetch(`${currentBridgeURL}/api/control`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'go_back' }),
                  });
                  
                  const backData2 = await backResponse2.json();
                  console.log('Second go back response:', backData2);
                } catch (error) {
                  console.error('Error executing go back commands:', error);
                }
              }

              router.replace('/');
            } catch (error) {
              console.error('Error ending meeting:', error);
              Alert.alert('Error', 'Failed to end meeting');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleManualGoogleMeetJoin = async () => {
  try {
    setIsLoading(true);
    
    // Read Google sign-in status from settings
    const googleSignedIn = await AsyncStorage.getItem('@google_signed_in');
    const isSignedIn = googleSignedIn === 'true' || googleSignedIn === null; // Default to true
    
    const ip = await AsyncStorage.getItem('@launcher_ip') || '192.168.68.102';
    const port = await AsyncStorage.getItem('@launcher_port') || '8080';
    const currentLauncherURL = `http://${ip}:${port}`;
    const url = `${currentLauncherURL}/api/google-meet-join`;
    console.log('Manually triggering Google Meet join:', url, 'SignedIn:', isSignedIn);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signedIn: isSignedIn,  // <--- NOW DYNAMIC
        roomName: roomName,
      }),
    });

      const data = await response.json();
      console.log('Google Meet join result:', data);
      
      if (data.status === 'success') {
        Alert.alert('Success', 'Joined Google Meet successfully!');
      } else {
        Alert.alert('Failed', data.message || 'Failed to join meeting');
      }
    } catch (error: any) {
      console.error('Error joining Google Meet:', error);
      Alert.alert('Error', error.message || 'Failed to trigger join');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVolumeChange = async (direction: 'up' | 'down') => {
    const newVolume = direction === 'up'
      ? Math.min(100, volume + 10)
      : Math.max(0, volume - 10);
    setVolume(newVolume);

    await callBridgeAPI('/api/control', {
      action: direction === 'up' ? 'volume_up' : 'volume_down',
      value: newVolume,
    });
  };

  const handleFocusMode = async () => {
    const nextMode = focusMode === 'panoramic' ? 'smart' : 'panoramic';
    setFocusMode(nextMode);

    const modeValue = nextMode === 'panoramic' ? 0 : 1;

    console.log('Focus mode changing to:', nextMode, 'mode value:', modeValue);

    await callBridgeAPI('/api/control', {
      action: 'focus_mode',
      mode: modeValue,
    });
  };

  const handleZoom = async (direction: 'in' | 'out') => {
    const newZoom = direction === 'in'
      ? Math.min(300, zoomLevel + 5)
      : Math.max(50, zoomLevel - 5);
    setZoomLevel(newZoom);

    console.log('Zoom changing to:', newZoom, 'direction:', direction);

    await callBridgeAPI('/api/control', {
      action: direction === 'in' ? 'zoom_in' : 'zoom_out',
    });

    setTimeout(async () => {
      await callBridgeAPI('/api/control', {
        action: 'zoom_stop',
      });
    }, 150);
  };

  const handleCameraDirection = async (direction: 'up' | 'down' | 'left' | 'right' | 'reset') => {
    console.log('Camera direction:', direction);
    
    // Flip all directions due to OEM SDK behavior
    let actualDirection = direction;
    if (direction === 'left') {
      actualDirection = 'right';
    } else if (direction === 'right') {
      actualDirection = 'left';
    } else if (direction === 'up') {
      actualDirection = 'down';
    } else if (direction === 'down') {
      actualDirection = 'up';
    }
    
    console.log('Actual direction sent to bridge:', actualDirection);
    
    await callBridgeAPI('/api/control', {
      action: `camera_${actualDirection}`,
    });

    if (direction !== 'reset') {
      setTimeout(async () => {
        await callBridgeAPI('/api/control', {
          action: 'camera_stop',
        });
      }, 300);
    }
  };

  const handleGoHome = async () => {
    await callBridgeAPI('/api/control', {
      action: 'go_home',
    });
  };

  const getFocusModeIcon = () => {
    return focusMode === 'panoramic' ? 'scan' : 'people';
  };

  const getFocusModeText = () => {
    return focusMode === 'panoramic' ? 'Panoramic' : 'Smart Framing';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <Logo width={100} height={40} />

        <View style={styles.meetingInfo}>
          <Text style={styles.meetingTitle}>{meetingInfo.title}</Text>
          <Text style={styles.meetingSubtitle}>{meetingInfo.room}</Text>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleGoHome}
            activeOpacity={0.7}
          >
            <Ionicons name="home" size={18} color="#007AFF" />
            <Text style={styles.headerButtonText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color="#007AFF" />
            <Text style={styles.headerButtonText}>Return</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Platform Selector - Only show if platform is truly unknown */}
      {!platformKnown && (
        <View style={styles.platformSection}>
          <Text style={styles.platformLabel}>Meeting Platform</Text>
          <TouchableOpacity
            style={styles.platformSelector}
            onPress={() => setShowPlatformPicker(!showPlatformPicker)}
          >
            <View style={styles.platformSelectorContent}>
              <Ionicons
                name={platforms.find(p => p.value === selectedPlatform)?.icon || 'videocam'}
                size={20}
                color="#1C1C1E"
              />
              <Text style={styles.platformText}>{getPlatformLabel()}</Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#1C1C1E" />
          </TouchableOpacity>

          {showPlatformPicker && (
            <View style={styles.platformOptions}>
              {platforms.map((platform) => (
                <TouchableOpacity
                  key={platform.value}
                  style={[
                    styles.platformOption,
                    selectedPlatform === platform.value && styles.platformOptionSelected
                  ]}
                  onPress={() => handlePlatformChange(platform.value)}
                >
                  <View style={styles.platformOptionContent}>
                    <Ionicons name={platform.icon as any} size={20} color="#fff" />
                    <Text style={[
                      styles.platformOptionText,
                      selectedPlatform === platform.value && styles.platformOptionTextSelected
                    ]}>
                      {platform.label}
                    </Text>
                    {!platform.supported && (
                      <Text style={styles.pendingBadge}>Pending</Text>
                    )}
                  </View>
                  {selectedPlatform === platform.value && (
                    <Ionicons name="checkmark" size={20} color="#00c851" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.statusSection}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Platform</Text>
          <Text style={styles.statusValue}>{selectedPlatform.toUpperCase()}</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Zoom</Text>
          <Text style={styles.statusValue}>{zoomLevel}%</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Mode</Text>
          <Text style={styles.statusValue}>{getFocusModeText()}</Text>
        </View>
      </View>

        {/* Join Meeting Button - Only shows after 10s from calendar */}
      {showJoinButton && (
        <TouchableOpacity
          style={styles.testJoinButton}
          onPress={handleManualGoogleMeetJoin}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Ionicons name="enter" size={20} color="#fff" />
          <Text style={styles.testJoinButtonText}>
            {isLoading ? 'Joining...' : 'Join Meeting'}
          </Text>
        </TouchableOpacity>
      )}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.controlsSection}>
          {/* First Row: Mute, Vol+, Camera */}
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleMute}
              activeOpacity={0.6}
              disabled={isLoading}
            >
              <View style={[styles.controlCircle, isMuted && styles.activeCircle]}>
                <Ionicons
                  name={isMuted ? 'mic-off' : 'mic'}
                  size={32}
                  color={isMuted ? '#fff' : '#D1D1D6'}
                />
              </View>
              <Text style={styles.controlLabel}>Mute</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => handleVolumeChange('up')}
              activeOpacity={0.6}
              disabled={isLoading}
            >
              <View style={styles.controlCircle}>
                <Ionicons name="volume-high" size={32} color="#D1D1D6" />
              </View>
              <Text style={styles.controlLabel}>Vol +</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleCamera}
              activeOpacity={0.6}
              disabled={isLoading}
            >
              <View style={[styles.controlCircle, !isCameraOn && styles.activeCircle]}>
                <Ionicons
                  name={isCameraOn ? 'videocam' : 'videocam-off'}
                  size={32}
                  color={!isCameraOn ? '#fff' : '#D1D1D6'}
                />
              </View>
              <Text style={styles.controlLabel}>Camera</Text>
            </TouchableOpacity>
          </View>

          {/* Second Row: End Call, Vol-, Focus */}
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleEndMeeting}
              activeOpacity={0.6}
              disabled={isLoading}
            >
              <View style={styles.endMeetingCircle}>
                <Ionicons name="call" size={32} color="#fff" />
              </View>
              <Text style={styles.endMeetingLabel}>End Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => handleVolumeChange('down')}
              activeOpacity={0.6}
              disabled={isLoading}
            >
              <View style={styles.controlCircle}>
                <Ionicons name="volume-low" size={32} color="#D1D1D6" />
              </View>
              <Text style={styles.controlLabel}>Vol -</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleFocusMode}
              activeOpacity={0.6}
              disabled={isLoading}
            >
              <View style={styles.controlCircle}>
                <Ionicons name={getFocusModeIcon()} size={32} color="#D1D1D6" />
              </View>
              <Text style={styles.controlLabel}>Focus</Text>
            </TouchableOpacity>
          </View>

          {/* Camera Pan/Tilt/Zoom - Only in Panoramic Mode */}
          {focusMode === 'panoramic' && (
            <View style={styles.dpadSection}>
              <Text style={styles.dpadTitle}>Camera Pan/Tilt/Zoom</Text>
              
              <View style={styles.dpadContainer}>
                {/* Top Row - Zoom Out, Up, Zoom In */}
                <View style={styles.dpadRow}>
                  <TouchableOpacity
                    style={styles.dpadButton}
                    onPress={() => handleZoom('out')}
                    activeOpacity={0.6}
                    disabled={isLoading}
                  >
                    <View style={styles.dpadCircle}>
                      <Ionicons name="remove-circle-outline" size={28} color="#D1D1D6" />
                    </View>
                    <Text style={styles.dpadLabel}>Zoom Out</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dpadButton}
                    onPress={() => handleCameraDirection('up')}
                    activeOpacity={0.6}
                    disabled={isLoading}
                  >
                    <View style={styles.dpadCircle}>
                      <Ionicons name="arrow-up" size={28} color="#D1D1D6" />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dpadButton}
                    onPress={() => handleZoom('in')}
                    activeOpacity={0.6}
                    disabled={isLoading}
                  >
                    <View style={styles.dpadCircle}>
                      <Ionicons name="add-circle-outline" size={28} color="#D1D1D6" />
                    </View>
                    <Text style={styles.dpadLabel}>Zoom In</Text>
                  </TouchableOpacity>
                </View>

                {/* Middle Row - Left, Reset, Right */}
                <View style={styles.dpadRow}>
                  <TouchableOpacity
                    style={styles.dpadButton}
                    onPress={() => handleCameraDirection('left')}
                    activeOpacity={0.6}
                    disabled={isLoading}
                  >
                    <View style={styles.dpadCircle}>
                      <Ionicons name="arrow-back" size={28} color="#D1D1D6" />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dpadButton}
                    onPress={() => handleCameraDirection('reset')}
                    activeOpacity={0.6}
                    disabled={isLoading}
                  >
                    <View style={styles.dpadCircleCenter}>
                      <Ionicons name="home" size={28} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dpadButton}
                    onPress={() => handleCameraDirection('right')}
                    activeOpacity={0.6}
                    disabled={isLoading}
                  >
                    <View style={styles.dpadCircle}>
                      <Ionicons name="arrow-forward" size={28} color="#D1D1D6" />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Bottom Row - Down */}
                <View style={styles.dpadRow}>
                  <View style={styles.dpadSpacer} />
                  <TouchableOpacity
                    style={styles.dpadButton}
                    onPress={() => handleCameraDirection('down')}
                    activeOpacity={0.6}
                    disabled={isLoading}
                  >
                    <View style={styles.dpadCircle}>
                      <Ionicons name="arrow-down" size={28} color="#D1D1D6" />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.dpadSpacer} />
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#48484A',
    minHeight: 80,
  },
  meetingInfo: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  meetingSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
  },
  headerButtons: {
    flexDirection: 'column',
    gap: 6,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(118, 118, 128, 0.24)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  platformSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#48484A',
  },
  platformLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 8,
  },
  platformSelector: {
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(118, 118, 128, 0.24)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  platformSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  platformText: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  platformOptions: {
    backgroundColor: 'rgba(118, 118, 128, 0.18)',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(118, 118, 128, 0.24)',
    overflow: 'hidden',
  },
  platformOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(118, 118, 128, 0.24)',
  },
  platformOptionSelected: {
    backgroundColor: 'rgba(0, 200, 81, 0.1)',
  },
  platformOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  platformOptionText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  platformOptionTextSelected: {
    color: '#00c851',
    fontWeight: '600',
  },
  pendingBadge: {
    fontSize: 11,
    color: '#FF9500',
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 10,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 3,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  testJoinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    marginVertical: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  testJoinButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  controlsSection: {
    gap: 32,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlButton: {
    alignItems: 'center',
    gap: 6,
  },
  controlCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(118, 118, 128, 0.18)',
    borderWidth: 2,
    borderColor: 'rgba(118, 118, 128, 0.36)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCircle: {
    backgroundColor: '#8E8E93',
    borderColor: '#636366',
  },
  endMeetingCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  controlLabel: {
    fontSize: 12,
    color: '#AEAEB2',
    fontWeight: '500',
  },
  endMeetingLabel: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '600',
  },
  // D-Pad Styles
  dpadSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(118, 118, 128, 0.24)',
  },
  dpadTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AEAEB2',
    textAlign: 'center',
    marginBottom: 20,
  },
  dpadContainer: {
    alignItems: 'center',
    gap: 12,
  },
  dpadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dpadButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(118, 118, 128, 0.18)',
    borderWidth: 2,
    borderColor: 'rgba(118, 118, 128, 0.36)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadCircleCenter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
  },
  dpadLabel: {
    fontSize: 10,
    color: '#AEAEB2',
    fontWeight: '500',
    marginTop: 4,
  },
  dpadSpacer: {
    width: 64,
    height: 64,
  },
});