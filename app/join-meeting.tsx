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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logo from '../components/Logo';
import LauncherService from '../services/LauncherService';

export default function JoinMeetingScreen() {
  const [meetingUrl, setMeetingUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [roomName, setRoomName] = useState('Meeting Room 1');
  
  // Detect platform from URL for showing relevant UI
  const [detectedPlatform, setDetectedPlatform] = useState('');

  useEffect(() => {
    LauncherService.initialize();
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

  useEffect(() => {
    // Auto-detect platform from URL
    if (meetingUrl) {
      if (meetingUrl.includes('teams.microsoft.com') || meetingUrl.includes('teams.live.com')) {
        setDetectedPlatform('teams');
      } else if (meetingUrl.includes('meet.google.com')) {
        setDetectedPlatform('google');
      } else if (meetingUrl.includes('zoom.us')) {
        setDetectedPlatform('zoom');
      } else if (meetingUrl.includes('webex.com')) {
        setDetectedPlatform('webex');
      } else {
        setDetectedPlatform('');
      }
    } else {
      setDetectedPlatform('');
    }
  }, [meetingUrl]);

  const saveSignInPreference = async (value: boolean) => {
    if (!detectedPlatform) return;
    
    try {
      const key = `@signin_default_${detectedPlatform}`;
      await AsyncStorage.setItem(key, value ? 'yes' : 'no');
      console.log(`Saved sign-in preference for ${detectedPlatform}: ${value ? 'yes' : 'no'}`);
    } catch (error) {
      console.error('Error saving sign-in preference:', error);
    }
  };

  const getPlatformLabel = (platform: string) => {
    const labels: { [key: string]: string } = {
      'teams': 'Microsoft Teams',
      'google': 'Google Meet',
      'zoom': 'Zoom',
      'webex': 'WebEx',
    };
    return labels[platform] || '';
  };

  const extractActualUrl = (url: string): string => {
    try {
      // Handle Google Calendar redirect URLs
      if (url.includes('google.com/url?')) {
        const urlObj = new URL(url);
        const actualUrl = urlObj.searchParams.get('q');
        if (actualUrl) {
          console.log('Extracted URL from Google redirect:', actualUrl);
          return decodeURIComponent(actualUrl);
        }
      }
      
      // Handle Microsoft Safe Links redirect URLs
      if (url.includes('safelinks.protection.outlook.com')) {
        const urlObj = new URL(url);
        const actualUrl = urlObj.searchParams.get('url');
        if (actualUrl) {
          console.log('Extracted URL from Microsoft Safe Links:', actualUrl);
          return decodeURIComponent(actualUrl);
        }
      }
      
      // Handle Outlook Web App redirects
      if (url.includes('outlook.office365.com/owa/') || url.includes('outlook.live.com/owa/')) {
        // These usually redirect to the actual meeting URL, extract if pattern matches
        const match = url.match(/https:\/\/teams\.microsoft\.com[^\s&]*/);
        if (match) {
          console.log('Extracted Teams URL from Outlook redirect:', match[0]);
          return match[0];
        }
      }
      
      // Return original URL if no redirect pattern detected
      return url;
    } catch (error) {
      console.error('Error extracting URL:', error);
      return url; // Return original on error
    }
  };

  const handleJoin = async () => {
    if (!meetingUrl.trim()) {
      Alert.alert('Error', 'Please paste a Meeting URL');
      return;
    }

    if (!detectedPlatform) {
      Alert.alert('Error', 'Could not detect meeting platform from URL. Please check the URL.');
      return;
    }

    setIsLoading(true);

    try {
      // Extract actual meeting URL from redirect URLs (Google Calendar, Outlook, etc.)
      const actualUrl = extractActualUrl(meetingUrl);
      console.log('Original URL:', meetingUrl);
      console.log('Actual URL to launch:', actualUrl);
      
      // Step 1: Launch the meeting URL via Launcher
      await LauncherService.initialize();
      const launchSuccess = await LauncherService.launchMeeting(actualUrl, detectedPlatform);
      
      if (!launchSuccess) {
        Alert.alert('Error', 'Failed to launch meeting on device');
        setIsLoading(false);
        return;
      }

      console.log('Meeting launched, navigating to join-meeting-assist');
      
      // Step 2: Navigate to join-meeting-assist screen for automated joining
      router.push({
        pathname: '/join-meeting-assist',
        params: {
          meetingUrl: meetingUrl,
          meetingTitle: 'Manual Join Meeting',
          platform: detectedPlatform,
        }
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Join meeting error:', error);
      Alert.alert('Error', 'Failed to join meeting. Check Launcher connection.');
      setIsLoading(false);
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
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inputSection}>

            {/* Meeting URL Field - PRIMARY */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Meeting URL *</Text>
              <TextInput
                style={[styles.input, styles.urlInput]}
                value={meetingUrl}
                onChangeText={setMeetingUrl}
                placeholder="Paste full meeting URL here"
                placeholderTextColor="#666"
                autoCapitalize="none"
                multiline
                numberOfLines={3}
              />
              {detectedPlatform && (
                <View style={styles.detectedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#00c851" />
                  <Text style={styles.detectedText}>
                    {getPlatformLabel(detectedPlatform)} detected
                  </Text>
                </View>
              )}
            </View>

            {detectedPlatform === 'zoom' && (
              <View style={styles.zoomNoteContainer}>
                <Text style={styles.zoomNote}>
                  ℹ️ Zoom doesn't support sign-in on this device
                </Text>
              </View>
            )}
          </View>

          <View style={styles.buttonSection}>
            {/* Join Button */}
            <TouchableOpacity 
              style={styles.joinButton} 
              onPress={handleJoin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <>
                  <Ionicons name="log-in" size={24} color="#FFFFFF" />
                  <Text style={styles.joinButtonText}>Join Meeting</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    color: '#007AFF',
  },
  roomName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  inputSection: {
    gap: 24,
    marginBottom: 40,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(118, 118, 128, 0.24)',
  },
  urlInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  detectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  detectedText: {
    fontSize: 13,
    color: '#00c851',
    fontWeight: '600',
  },
  signInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#AEAEB2',
  },
  zoomNoteContainer: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
  },
  zoomNote: {
    fontSize: 12,
    color: '#FF9500',
    fontStyle: 'italic',
  },
  buttonSection: {
    marginTop: 16,
    gap: 16,
  },
  joinButton: {
    backgroundColor: '#00c851',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#00c851',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});