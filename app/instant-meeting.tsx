import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logo from '../components/Logo';

export default function InstantMeetingScreen() {
  const [bridgeURL, setBridgeURL] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [showFallback, setShowFallback] = useState(false);
  const [roomName, setRoomName] = useState('Meeting Room 1');

  const platforms = [
    { 
      id: 'meet', 
      label: 'Google Meet', 
      icon: 'videocam', 
      color: '#34a853',
      available: true 
    },
    { 
      id: 'teams', 
      label: 'Microsoft Teams', 
      icon: 'people', 
      color: '#5b5fc7',
      available: true
    },
  ];

  useEffect(() => {
    loadBridgeConfig();
    loadRoomName();
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
    const port = await AsyncStorage.getItem('@bridge_port');
    
    if (ip && port) {
      setBridgeURL(`http://${ip}:${port}`);
    } else {
      console.warn('Bridge IP/Port not configured. Please set in Bridge Settings.');
    }
  } catch (error) {
    console.error('Error loading bridge config:', error);
  }
};

  const handleStartMeeting = async (platformId: string) => {
    const platform = platforms.find(p => p.id === platformId);
    
    if (!platform?.available) {
      Alert.alert('Coming Soon', `${platform?.label} instant meeting is not yet available.`);
      return;
    }

    setSelectedPlatform(platformId);
    setIsLoading(true);

    try {
      console.log('Starting instant meeting for:', platformId);

      // First, go to home screen
      await fetch(`${bridgeURL}/api/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'go_home' }),
      });

      // Wait 1 second for home screen
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Start instant meeting sequence
      const response = await fetch(`${bridgeURL}/api/instant-meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformId }),
      });

      const data = await response.json();
      console.log('=== START Instant Meeting Navigation ===');
      console.log('Instant meeting response:', data);

      if (data.status === 'success') {
        Alert.alert(
          'Success', 
          'Meeting started!',
          [
            { text: 'Go to Controls', onPress: () => router.push(`/meeting-controls?platform=${platformId}&meetingType=instant`) },
            { text: 'Stay Here', style: 'cancel', onPress: () => setShowFallback(true) }
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to start instant meeting');
        setShowFallback(true);
      }
    } catch (error) {
      console.error('Instant meeting error:', error);
      Alert.alert('Error', 'Failed to start instant meeting. Check connection.');
      setShowFallback(true);
    } finally {
      setIsLoading(false);
      setSelectedPlatform('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Logo width={100} height={40} />

        <View style={styles.meetingInfo}>
          <Text style={styles.meetingTitle}>{roomName}</Text>
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

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleSection}>
          <Ionicons name="flash" size={48} color="#6c5ce7" />
          <Text style={styles.title}>Start Instant Meeting</Text>
          <Text style={styles.subtitle}>Choose your meeting platform to begin</Text>
        </View>

        {/* Warning Box */}
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={20} color="#FF9500" />
          <Text style={styles.warningText}>
            You must be signed in to the platform on the device for instant meetings to work
          </Text>
        </View>

        {/* Platform Cards */}
        <View style={styles.platformsSection}>
          {platforms.map((platform) => (
            <TouchableOpacity
              key={platform.id}
              style={[
                styles.platformCard,
                !platform.available && styles.platformCardDisabled
              ]}
              onPress={() => handleStartMeeting(platform.id)}
              disabled={isLoading || !platform.available}
              activeOpacity={0.7}
            >
              <View style={styles.platformCardContent}>
                <View style={[styles.iconCircle, { backgroundColor: platform.color + '20' }]}>
                  <Ionicons name={platform.icon as any} size={36} color={platform.color} />
                </View>
                <View style={styles.platformInfo}>
                  <Text style={styles.platformLabel}>{platform.label}</Text>
                  {!platform.available && (
                    <Text style={styles.comingSoonBadge}>Coming Soon</Text>
                  )}
                  {platform.available && (
                    <Text style={styles.readyBadge}>Ready</Text>
                  )}
                </View>
                {isLoading && selectedPlatform === platform.id ? (
                  <ActivityIndicator color={platform.color} />
                ) : (
                  <Ionicons 
                    name="arrow-forward-circle" 
                    size={32} 
                    color={platform.available ? platform.color : '#48484A'} 
                  />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            Instant meetings start immediately without requiring a meeting ID
          </Text>
        </View>
      </View>
      {/* Fallback Button */}
        {showFallback && (
          <View style={styles.fallbackSection}>
            <Text style={styles.fallbackText}>
              Meeting may have started. Open controls if needed:
            </Text>
            <TouchableOpacity
              style={styles.fallbackButton}
              onPress={() => router.push(`/meeting-controls?platform=${selectedPlatform || 'meet'}&meetingType=instant`)}
            >
              <Ionicons name="settings" size={20} color="#fff" />
              <Text style={styles.fallbackButtonText}>Go to Meeting Controls</Text>
            </TouchableOpacity>
          </View>
        )}
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#FF9500',
    lineHeight: 18,
    fontWeight: '500',
  },
  platformsSection: {
    gap: 16,
  },
  platformCard: {
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(118, 118, 128, 0.24)',
    overflow: 'hidden',
  },
  platformCardDisabled: {
    opacity: 0.5,
  },
  platformCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformInfo: {
    flex: 1,
  },
  platformLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  readyBadge: {
    fontSize: 12,
    color: '#34a853',
    fontWeight: '600',
  },
  comingSoonBadge: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  fallbackSection: {
    marginTop: 24,
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6c5ce7',
  },
  fallbackText: {
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  fallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6c5ce7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  fallbackButtonText: {
    color: '#1C1C1E',
    fontSize: 15,
    fontWeight: '600',
  },
});