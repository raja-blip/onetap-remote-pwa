import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logo from '../components/Logo';

export default function CastingScreen() {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes timeout
  const [castingStatus, setCastingStatus] = useState('waiting'); // waiting, connected, casting
  const [bridgeURL, setBridgeURL] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasViewedScreen, setHasViewedScreen] = useState(false);
  const [launcherURL, setLauncherURL] = useState('');
  const [roomName, setRoomName] = useState('Meeting Room 1');
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    loadBridgeConfig();
    loadRoomName();
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-navigate back to home after timeout
          router.replace('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const loadRoomName = async () => {
    try {
      const savedRoomName = await AsyncStorage.getItem('@room_name');
      if (savedRoomName) setRoomName(savedRoomName);
    } catch (error) {
      console.error('Error loading room name:', error);
    }
  };

  const loadBridgeConfig = async () => {
  try {
    const ip = await AsyncStorage.getItem('@bridge_ip');
    const bridgePort = await AsyncStorage.getItem('@bridge_port') || '9090';
    const launcherPort = await AsyncStorage.getItem('@launcher_port') || '8080';
    
    if (ip) {
      setBridgeURL(`http://${ip}:${bridgePort}`);
      setLauncherURL(`http://${ip}:${launcherPort}`);
      
      console.log('Loaded bridge URL:', `http://${ip}:${bridgePort}`);
      console.log('Loaded launcher URL:', `http://${ip}:${launcherPort}`);
    } else {
      console.warn('Bridge IP not configured. Please set in settings.');
    }
  } catch (error) {
    console.error('Error loading bridge config:', error);
  }
};

  const callBridgeAPI = async (endpoint: string, payload: any) => {
    setIsLoading(true);
    try {
      console.log('Calling bridge API:', `${bridgeURL}${endpoint}`, payload);
      const response = await fetch(`${bridgeURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Bridge API response:', data);

      if (data.status === 'success') {
        return data;
      } else {
        Alert.alert('Error', data.message || 'Action failed');
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Bridge API error:', error);
      Alert.alert('Connection Error', 'Failed to reach bridge service. Check settings.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCasting = async () => {
    try {
      // Step 1: Send home command to clear screensaver
      console.log('Step 1: Sending home command to clear screensaver...');
      await callBridgeAPI('/api/control', {
        action: 'go_home',
      });

      // Wait 2 seconds for screensaver to clear and home screen to load
      console.log('Waiting 2s for screensaver to clear and home screen to load...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Try to click "Cast Screen" using content description
      console.log('Step 2: Attempting to click Cast Screen button...');
      if (!launcherURL) {
        Alert.alert('Error', 'Launcher not configured. Please check settings.');
        return;
      }

      let clickSuccess = false;

      try {
        const response = await fetch(`${launcherURL}/commands/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'click_by_content_description',
            payload: {
              contentDescription: 'Cast Screen'
            }
          }),
        });

        const data = await response.json();
        console.log('Cast Screen click response:', data);

        if (data.status === 'success') {
          console.log('Successfully clicked Cast Screen using content description');
          clickSuccess = true;
        }
      } catch (error) {
        console.error('Launcher command failed:', error);
      }

      // If content description click failed, use coordinate fallback
      if (!clickSuccess) {
        console.log('Content description click failed, falling back to coordinates');
        await callBridgeAPI('/api/casting', {
          action: 'open_cast_app',
        });
      }

      setCastingStatus('ready');
    } catch (error) {
      console.error('Failed to start casting:', error);
      Alert.alert('Error', 'Failed to start casting. Please try again.');
    }
  };

  const handleViewScreen = async () => {
    try {
      await callBridgeAPI('/api/casting', {
        action: 'view_screen',
      });
      
      setHasViewedScreen(true); // Mark as viewed
    } catch (error) {
      console.error('Failed to view screen:', error);
    }
  };

  const handleFullScreen = async () => {
    try {
      if (isFullScreen) {
        // Exit full screen - execute back command
        console.log('Exiting full screen with back command');
        await callBridgeAPI('/api/control', {
          action: 'go_back',
        });
        setIsFullScreen(false);
      } else {
        // Enter full screen
        console.log('Entering full screen');
        await callBridgeAPI('/api/casting', {
          action: 'full_screen',
        });
        setIsFullScreen(true);
        setCastingStatus('casting');
      }
    } catch (error) {
      console.error('Failed to toggle full screen:', error);
    }
  };

  const handleStopCasting = async () => {
  if (!launcherURL) {
    Alert.alert('Error', 'Launcher not configured. Please check settings.');
    return;
  }

  try {
    setIsLoading(true);
    console.log('Stopping casting by closing Chrome tab...');
    
    // Close the Chrome tab using Launcher service
    const response = await fetch(`${launcherURL}/commands/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'click_by_content_description',
        payload: {
          contentDescription: 'Close tab'
        }
      }),
    });

    const data = await response.json();
    console.log('Stop casting response:', data);

    if (data.status === 'success') {
      setCastingStatus('waiting');
      Alert.alert('Success', 'Casting closed', [
        { text: 'OK', onPress: () => router.replace('/') }
      ]);
    } else {
      Alert.alert('Error', 'Failed to close casting');
    }
  } catch (error) {
    console.error('Failed to close casting:', error);
    Alert.alert('Error', 'Failed to close casting. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

    const getStatusColor = () => {
    switch (castingStatus) {
      case 'ready': return '#ffa502';
      case 'casting': return '#6c5ce7';
      default: return '#ff9ff3';
    }
  };

  const getStatusText = () => {
    switch (castingStatus) {
      case 'ready': return '🚀 Ready to Cast';
      case 'casting': return '📺 Screen Casting Active';
      default: return '⏳ Waiting for Connection';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header with Logo */}
      <View style={styles.header}>
        <Logo width={100} height={40} />
        
        <View style={styles.meetingInfo}>
          <Text style={styles.meetingTitle}>{roomName}</Text>
          <Text style={styles.timeoutText}>{formatTime(timeLeft)}</Text>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/')}
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

      {/* Main Content */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusSection}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>

        <View style={styles.instructionSection}>
          <Text style={styles.instructionTitle}>To present your screen:</Text>
          
          <View style={styles.stepContainer}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>Tap "Start Casting" button below</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>Visit <Text style={styles.highlightText}>cast.tifoh.com</Text> in your laptop and connect</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Once connected, tap "View Screen" button</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.stepText}>Tap "Full Screen" for optimal viewing only after Laptop screen is presented on the display</Text>
            </View>
          </View>
        </View>

        {/* Casting Control Buttons */}
        <View style={styles.buttonSection}>
          {/* Start Casting Button */}
          {castingStatus === 'waiting' && (
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleStartCasting}
              disabled={isLoading}
            >
              <Ionicons name="play-circle" size={26} color="#fff" />
              <Text style={styles.primaryButtonText}>Start Casting</Text>
            </TouchableOpacity>
          )}

          {/* View Screen Button */}
          {(castingStatus === 'ready' || castingStatus === 'casting') && (
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={handleViewScreen}
              disabled={isLoading}
            >
              <Ionicons name="eye" size={24} color="#fff" />
              <Text style={styles.secondaryButtonText}>View Screen</Text>
            </TouchableOpacity>
          )}

          {/* Full Screen Button */}
          {(castingStatus === 'ready' || castingStatus === 'casting') && (
            <TouchableOpacity 
              style={[
                styles.fullScreenButton,
                !hasViewedScreen && !isFullScreen && styles.disabledButton
              ]}
              onPress={handleFullScreen}
              disabled={isLoading || (!hasViewedScreen && !isFullScreen)}
            >
              <Ionicons name={isFullScreen ? "contract" : "expand"} size={24} color="#fff" />
              <Text style={styles.fullScreenText}>
                {!hasViewedScreen && !isFullScreen ? 'Full Screen (View First)' : (isFullScreen ? 'Exit Full Screen' : 'Full Screen')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Close Casting Button - visible when ready or casting */}
          {(castingStatus === 'ready' || castingStatus === 'casting') && (
            <TouchableOpacity 
              style={styles.stopCastingButton}
              onPress={handleStopCasting}
              disabled={isLoading}
            >
              <Ionicons name="close-circle" size={24} color="#fff" />
              <Text style={styles.stopCastingText}>Close Casting</Text>
            </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
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
    textAlign: 'center',
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
  roomName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 4,
  },
  timeoutText: {
    fontSize: 11,
    color: '#ff6b6b',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
    paddingVertical: 14,
    backgroundColor: 'rgba(118, 118, 128, 0.3)',
    borderRadius: 10,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  instructionSection: {
    marginBottom: 28,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 24,
    textAlign: 'center',
  },
  stepContainer: {
    gap: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6c5ce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#a0a0a0',
    lineHeight: 22,
    paddingTop: 3,
  },
  highlightText: {
    color: '#6c5ce7',
    fontWeight: '600',
  },
  buttonSection: {
    alignItems: 'center',
    marginTop: 28,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#6c5ce7',
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#6c5ce7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    minWidth: 220,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#1C1C1E',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#2ed573',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#2ed573',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    minWidth: 200,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '600',
  },
  fullScreenButton: {
    backgroundColor: '#ffa502',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#ffa502',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    minWidth: 200,
    justifyContent: 'center',
  },
  fullScreenText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '600',
  },
  fullScreenSection: {
    alignItems: 'center',
    marginTop: 24,
    gap: 10,
  },
  fullScreenHint: {
    color: '#8E8E93',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 17,
  },
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  stopCastingButton: {
    backgroundColor: '#ff4757',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#ff4757',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    minWidth: 200,
    justifyContent: 'center',
  },
  stopCastingText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '600',
  },
});
