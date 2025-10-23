import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Logo from '../components/Logo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// ADD THIS HELPER FUNCTION HERE
const fetchWithTimeout = (url, options = {}, timeout = 5000) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
};

export default function HomeScreen() {
  const isSignedIn = true;
  const [roomName, setRoomName] = React.useState('Meeting Room 1');

  // Check if Bridge is connected on app load
  useEffect(() => {
    checkConnection();
  }, []);
  
  // Reload room name every time screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadRoomName();
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  const loadRoomName = async () => {
    try {
      const savedRoomName = await AsyncStorage.getItem('@room_name');
      if (savedRoomName) {
        setRoomName(savedRoomName);
      }
    } catch (error) {
      console.error('Error loading room name:', error);
    }
  };

  const checkConnection = async () => {
    try {
      // Always stay on home screen, no redirect to setup
      // User can configure via settings if needed
      console.log('App loaded - staying on home screen');
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const handleJoinMeeting = () => {
    router.push('/join-meeting');
  };

  const handleJoinFromCalendar = () => {
    router.push('/calendar');
  };

  const handlePresentScreen = () => {
    router.push('/casting');
  };

  const handleInstantMeeting = () => {
    router.push('/instant-meeting');
  };


  const handleWakeDevice = async () => {
    try {
      const ip = await AsyncStorage.getItem('@bridge_ip') || '192.168.68.102';
      const port = await AsyncStorage.getItem('@bridge_port') || '9090';
      const bridgeURL = `http://${ip}:${port}`;

      console.log('Waking device at:', bridgeURL);

      // Send a tap in the center of the screen to wake it
      const response = await fetch(`${bridgeURL}/api/touchpad`, {
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

      Alert.alert('Success', 'Device screen tapped to wake');
    } catch (error) {
      console.error('Failed to wake device:', error);
      Alert.alert('Error', 'Failed to wake device. Check connection.');
    }
  };

  const handleGoHome = async () => {
    try {
      const ip = await AsyncStorage.getItem('@bridge_ip') || '192.168.68.102';
      const port = await AsyncStorage.getItem('@bridge_port') || '9090';
      const bridgeURL = `http://${ip}:${port}`;

      console.log('=== GO HOME DEBUG ===');
      console.log('Bridge IP:', ip);
      console.log('Bridge Port:', port);
      console.log('Bridge URL:', bridgeURL);
      console.log('Full URL:', `${bridgeURL}/api/control`);

      const response = await fetch(`${bridgeURL}/api/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'go_home' }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const data = await response.json();
      console.log('Go home response:', data);
      console.log('Response keys:', Object.keys(data));
      console.log('Data success:', data.success);
      console.log('Data status:', data.status);

      if (data.success === true || data.status === 'success') {
        Alert.alert('Success', 'Navigated to home screen');
      } else {
        Alert.alert('Error', `Failed: ${data.message || JSON.stringify(data)}`);
      }
    } catch (error) {
      console.error('Failed to go home:', error);
      Alert.alert('Error', `Failed to navigate to home: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header with Logo and Settings */}
      <View style={styles.header}>
        <Logo width={100} height={40} />
        <View style={styles.headerInfo}>
          <Text style={styles.companyName}>{roomName}</Text>
        </View>
        <TouchableOpacity 
          onPress={() => router.push('/bridge-settings')}
          style={styles.settingsButton}
        >
          <Ionicons name="settings" size={24} color="#1C1C1E" />
        </TouchableOpacity>
      </View>

      {/* Control Buttons Row */}
      <View style={styles.controlButtonsRow}>
        <TouchableOpacity
          style={styles.wakeButton}
          onPress={handleWakeDevice}
          activeOpacity={0.7}
        >
          <Ionicons name="power" size={20} color="#ffa502" />
          <Text style={styles.wakeButtonText}>Wake Device</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.meetingControlsButton}
          onPress={() => router.push('/meeting-controls')}
          activeOpacity={0.7}
        >
          <Ionicons name="videocam" size={20} color="#34C759" />
          <Text style={styles.meetingControlsButtonText}>Meeting Controls</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={handleGoHome}
          activeOpacity={0.7}
        >
          <Ionicons name="home" size={20} color="#007AFF" />
          <Text style={styles.homeButtonText}>Go Home</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content - 2x2 Grid */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.buttonGrid}>
          {/* Top Row */}
          <TouchableOpacity
            style={[styles.gridButton, styles.greenButton]}
            onPress={handleJoinFromCalendar}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar" size={32} color="#fff" />
            <Text style={styles.buttonText}>Join from{"\n"}Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.gridButton,
              styles.purpleButton,
              !isSignedIn && styles.disabledButton
            ]}
            onPress={handleInstantMeeting}
            disabled={!isSignedIn}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={32} color={isSignedIn ? "#fff" : "#8E8E93"} />
            <Text style={[
              styles.buttonText,
              !isSignedIn && styles.disabledText
            ]}>Start Instant{"\n"} Meeting</Text>
            {!isSignedIn && <Text style={styles.signInHint}>Sign in required</Text>}
          </TouchableOpacity>

          {/* Bottom Row */}
          <TouchableOpacity
            style={[styles.gridButton, styles.blueButton]}
            onPress={handleJoinMeeting}
            activeOpacity={0.7}
          >
            <Ionicons name="link" size={32} color="#fff" />
            <Text style={styles.buttonText}>Join with a Link</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridButton, styles.orangeButton]}
            onPress={handlePresentScreen}
            activeOpacity={0.7}
          >
            <Ionicons name="tv" size={32} color="#fff" />
            <Text style={styles.buttonText}>Present Your Laptop Screen</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Tap any option to begin</Text>
      </View>
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
    borderBottomColor: '#C7C7CC',
    minHeight: 80,
  },
  headerInfo: {
    alignItems: 'center',
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  roomName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#636366',
  },
  settingsButton: {
    padding: 8,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  gridButton: {
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '45%',
    minHeight: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  blueButton: {
    backgroundColor: '#007AFF',
  },
  greenButton: {
    backgroundColor: '#34C759',
  },
  orangeButton: {
    backgroundColor: '#FF9500',
  },
  purpleButton: {
    backgroundColor: '#AF52DE',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  disabledButton: {
    backgroundColor: '#C7C7CC',
  },
  disabledText: {
    color: '#8E8E93',
  },
  signInHint: {
    fontSize: 11,
    color: '#FF3B30',
    marginTop: 4,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  controlButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 20,
  },
  wakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 165, 2, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 2, 0.3)',
  },
  wakeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffa502',
  },
  meetingControlsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  meetingControlsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },
  homeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  homeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});