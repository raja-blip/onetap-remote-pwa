import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logo from '../components/Logo';
import LauncherService from '../services/LauncherService';

export default function JoinMeetingAssistScreen() {
  const params = useLocalSearchParams();
  const meetingUrl = params.meetingUrl as string;
  const meetingTitle = params.meetingTitle as string || 'Meeting';
  const meetingPlatform = params.platform as string || 'google';
  
  const [isSignedIn, setIsSignedIn] = useState(true);
  const [displayName, setDisplayName] = useState('Meeting Room 1');
  const [bridgeURL, setBridgeURL] = useState('');
  const [isEnteringName, setIsEnteringName] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [nameEntered, setNameEntered] = useState(false);
  const [webexStep, setWebexStep] = useState(1); // For WebEx 2-step process
  

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load room name for display name
      const savedRoomName = await AsyncStorage.getItem('@room_name');
      if (savedRoomName) {
        setDisplayName(savedRoomName);
      }

      // Load platform-specific sign-in status
      let storageKey = '@google_signed_in'; // Default
      if (meetingPlatform === 'teams') {
        storageKey = '@teams_signed_in';
      } else if (meetingPlatform === 'webex') {
        storageKey = '@webex_signed_in';
      }

      const signedIn = await AsyncStorage.getItem(storageKey);
      setIsSignedIn(signedIn === 'true' || signedIn === null);

      // Load display name
      const name = await AsyncStorage.getItem('@display_name');
      if (name) setDisplayName(name);

      // Load Bridge IP and Port
      const ip = await AsyncStorage.getItem('@bridge_ip') || '192.168.68.102';
      const port = await AsyncStorage.getItem('@bridge_port') || '9090';
      setBridgeURL(`http://${ip}:${port}`);
      console.log('Loaded bridge URL:', `http://${ip}:${port}`);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSignInToggle = async (value: boolean) => {
    try {
      // Save platform-specific sign-in status
      let storageKey = '@google_signed_in'; // Default
      if (meetingPlatform === 'teams') {
        storageKey = '@teams_signed_in';
      } else if (meetingPlatform === 'webex') {
        storageKey = '@webex_signed_in';
      }
      
      await AsyncStorage.setItem(storageKey, value.toString());
      setIsSignedIn(value);
    } catch (error) {
      console.error('Error saving sign-in status:', error);
    }
  };

  // Helper function to call Bridge API for coordinate taps
  const callBridgeAPI = async (x: number, y: number) => {
    try {
      if (!bridgeURL) {
        console.error('Bridge URL not configured');
        return false;
      }

      const url = `${bridgeURL}/api/touchpad`;
      console.log('Calling Bridge API:', url, 'with coords:', { x, y });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'click',
          x: x, 
          y: y 
        }),
      });

      const result = await response.json();
      console.log('Bridge API response:', result);
      return result.status === 'success';
    } catch (error) {
      console.error('Bridge API error:', error);
      return false;
    }
  };

  const handleJoinMeeting = async () => {
    setIsJoining(true);
    try {
      let joinButtonText = 'Join now';
      
      switch (meetingPlatform) {
        case 'teams':
          if (!isSignedIn && displayName) {
            console.log('Teams: Injecting name');
            await LauncherService.clickByText('Type your name');
            await new Promise(resolve => setTimeout(resolve, 500));
            await LauncherService.injectText(displayName);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          joinButtonText = 'Join now';
          break;
          
        case 'zoom':
          if (displayName) {
            console.log('Zoom: Entering name in dialog');
            await LauncherService.clickByText('Please enter your name');
            await new Promise(resolve => setTimeout(resolve, 500));
            await LauncherService.injectText(displayName);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          joinButtonText = 'OK';
          break;
          
        case 'webex':
          if (isSignedIn) {
            // Signed mode: just click JOIN
            console.log('WebEx: Signed mode - clicking JOIN');
            joinButtonText = 'JOIN';
          } else {
            // Unsigned mode: coordinate-based 4-step process
            console.log('WebEx: Unsigned mode starting');

            if (!displayName) {
              Alert.alert('Error', 'Please enter a display name');
              setIsJoining(false);
              return;
            }

            // Step 1: Tap "Join as a guest" at (1792, 1512)
            console.log('WebEx Step 1: Tapping "Join as a guest" at (1792, 1512)');
            const tap1 = await callBridgeAPI(1792, 1512);
            if (!tap1) {
              Alert.alert('Error', 'Failed to tap "Join as a guest" button');
              setIsJoining(false);
              return;
            }
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Step 2: Inject name via LauncherService (port 8080)
            console.log('WebEx Step 2: Injecting name:', displayName);
            const textInjected = await LauncherService.injectText(displayName);
            if (!textInjected) {
              Alert.alert('Error', 'Failed to inject display name');
              setIsJoining(false);
              return;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Step 3: Tap "Next" at (1792, 1052)
            console.log('WebEx Step 3: Tapping "Next" at (1792, 1052)');
            const tap2 = await callBridgeAPI(1792, 1052);
            if (!tap2) {
              Alert.alert('Error', 'Failed to tap "Next" button');
              setIsJoining(false);
              return;
            }
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Step 4: Tap "JOIN" at (1935, 1901)
            console.log('WebEx Step 4: Tapping "JOIN" at (1935, 1901)');
            const tap3 = await callBridgeAPI(1935, 1901);
            if (!tap3) {
              Alert.alert('Error', 'Failed to tap "JOIN" button');
              setIsJoining(false);
              return;
            }
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Success - navigate to meeting controls
            Alert.alert('Success', 'Joined meeting successfully!', [
              {
                text: 'OK',
                onPress: () => {
                  router.push({
                    pathname: '/meeting-controls',
                    params: { platform: meetingPlatform, meetingType: 'scheduled' }
                  });
                }
              }
            ]);
            setIsJoining(false);
            return;
          }
          break;
          
        case 'google':
          if (isSignedIn) {
            // Signed mode: just click Join now
            console.log('Google Meet: Signed mode - clicking Join now');
            joinButtonText = 'Join now';
          } else {
            // Unsigned mode: click field to focus, then inject text
            console.log('Google Meet: Unsigned mode starting');
            
            if (!displayName) {
              Alert.alert('Error', 'Please enter a display name');
              setIsJoining(false);
              return;
            }
            
            // Step 1: Click on the name field to focus it
            console.log('Step 1: Clicking name field to focus');
            await LauncherService.clickByText('Your name');
            
            // Step 2: Wait for field to be focused
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Step 3: Inject text into focused field
            console.log('Step 2: Injecting text:', displayName);
            const textSuccess = await LauncherService.injectText(displayName);
            console.log('Text injection result:', textSuccess);
            await new Promise(resolve => setTimeout(resolve, 1500));
            const textSuccess1 = await LauncherService.injectText(displayName);
            
            if (!textSuccess1) {
              console.error('Google Meet: Text injection failed');
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            joinButtonText = 'Ask to join';
          }
          break;
      }
      console.log(`Clicking "${joinButtonText}" button`);
      const clickSuccess = await LauncherService.clickByText(joinButtonText);

      if (clickSuccess) {
        // If Google Meet, trigger post-join setup (fullscreen, close dialogs)
        if (meetingPlatform === 'google') {
          console.log('Google Meet joined, triggering post-join setup...');
          try {
            const bridgeIP = await AsyncStorage.getItem('@bridge_ip') || '192.168.68.102';
            const bridgePort = await AsyncStorage.getItem('@bridge_port') || '9090';
            const bridgeURL = `http://${bridgeIP}:${bridgePort}`;
            
            // Call the setup endpoint (runs in background, don't wait)
            fetch(`${bridgeURL}/api/google-meet-setup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            }).catch(error => console.error('Google Meet setup error:', error));
            
            console.log('Google Meet setup initiated');
          } catch (error) {
            console.error('Error initiating Google Meet setup:', error);
          }
        }
        
        Alert.alert('Success', 'Joined meeting successfully!', [
          {
            text: 'OK',
            onPress: () => {
              router.push({
                pathname: '/meeting-controls',
                params: { platform: meetingPlatform, meetingType: 'scheduled' }
              });
            }
          }
        ]);
      } else {
        Alert.alert('Failed', `Could not find "${joinButtonText}" button.`);
      }
    } catch (error: any) {
      console.error('Error joining meeting:', error);
      Alert.alert('Error', error.message || 'Failed to join meeting');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerBackButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <Logo width={100} height={40} />
        
        <View style={styles.headerInfo}>
          <Text style={styles.companyName}>Join Meeting</Text>
          <Text style={styles.roomName}>{meetingTitle}</Text>
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsBox}>
        <Ionicons name="information-circle" size={24} color="#007AFF" />
        <Text style={styles.instructionsText}>
          Meeting is opening on the VC device. Follow the steps below.
        </Text>
      </View>

      {/* Platform-Specific Instructions */}
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <Text style={styles.stepTitle}>
            {meetingPlatform === 'zoom' ? 'Name Entry' : 'Sign-in Status'}
          </Text>
        </View>

        {/* Google Meet, Teams & WebEx: Sign-in toggle */}
        {(meetingPlatform === 'google' || meetingPlatform === 'teams' || meetingPlatform === 'webex') && (
          <>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons name="logo-google" size={20} color="#4285F4" />
                <Text style={styles.toggleLabel}>
                  Signed into {meetingPlatform === 'google' ? 'Google' : meetingPlatform === 'teams' ? 'Microsoft' : 'Cisco'} Account
                </Text>
              </View>
              <Switch
                value={isSignedIn}
                onValueChange={handleSignInToggle}
                trackColor={{ false: '#767577', true: '#34C759' }}
                thumbColor={isSignedIn ? '#fff' : '#f4f3f4'}
              />
            </View>
            <Text style={styles.stepDescription}>
              If you are signed into this app on your device, select this.
            </Text>
          </>
        )}

        {/* Zoom: Name entry (always unsigned) */}
        {meetingPlatform === 'zoom' && (
          <>
            <Text style={styles.stepDescription}>
              Enter your display name below:
            </Text>
            <TextInput
              style={styles.nameInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              placeholderTextColor="#666"
            />
          </>
        )}

        {/* Google Meet unsigned: Name entry */}
        {meetingPlatform === 'google' && !isSignedIn && (
          <>
            <Text style={styles.stepDescription}>
              Enter your display name below:
            </Text>
            <TextInput
              style={styles.nameInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              placeholderTextColor="#666"
            />
          </>
        )}

        {/* Teams unsigned: Name entry */}
        {meetingPlatform === 'teams' && !isSignedIn && (
          <>
            <Text style={styles.stepDescription}>
              Enter your display name below:
            </Text>
            <TextInput
              style={styles.nameInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              placeholderTextColor="#666"
            />
          </>
        )}

        {/* WebEx unsigned: Name entry */}
        {meetingPlatform === 'webex' && !isSignedIn && (
          <>
            <Text style={styles.stepDescription}>
              Enter your display name below:
            </Text>
            <TextInput
              style={styles.nameInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              placeholderTextColor="#666"
            />
          </>
        )}
      </View>
   
      {/* Join Meeting Button */}
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <Text style={styles.stepTitle}>
            {meetingPlatform === 'webex' && webexStep === 2 
              ? 'Complete Join' 
              : 'Join the Meeting'}
          </Text>
        </View>

        <Text style={styles.stepDescription}>
          When you see the join screen on the device, tap below:
        </Text>

        <TouchableOpacity
          style={[styles.joinButton, isJoining && styles.buttonDisabled]}
          onPress={handleJoinMeeting}
          disabled={isJoining}
          activeOpacity={0.7}
        >
          {isJoining ? (
            <ActivityIndicator color="#007AFF" />
          ) : (
            <>
              <Ionicons name="videocam" size={24} color="#FFFFFF" />
              <Text style={styles.joinButtonText}>
                  Join Meeting
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={20} color="#007AFF" />
        <Text style={styles.backButtonText}>Back to Calendar</Text>
      </TouchableOpacity>
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
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(118, 118, 128, 0.24)',
    minHeight: 80,
  },
  headerBackButton: {
    padding: 8,
    marginRight: 4,
  },
  headerInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  roomName: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 20,
    padding: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  instructionsText: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
  },
  stepContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    borderRadius: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  stepDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  nameInput: {
    backgroundColor: 'rgba(118, 118, 128, 0.24)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1C1C1E',
    marginTop: 8,
    marginBottom: 12,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#00c851',
    borderRadius: 12,
    paddingVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 20,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
});