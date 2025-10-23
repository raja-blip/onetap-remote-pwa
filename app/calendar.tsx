import React, { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LauncherService, { Meeting } from '../services/LauncherService';

export default function CalendarScreen() {
  const [timeLeft, setTimeLeft] = useState(120);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [roomName, setRoomName] = useState('Meeting Room 1');

 useEffect(() => {
    initializeAndFetch();
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

  const initializeAndFetch = async () => {
    await LauncherService.initialize();
    const connected = LauncherService.isLauncherConnected();
    setIsConnected(connected);
    
    if (connected) {
      await fetchMeetings();
    } else {
      setIsLoading(false);
    }
  };

  const fetchMeetings = async () => {
    try {
      setIsLoading(true);
      const fetchedMeetings = await LauncherService.fetchMeetings();
      setMeetings(fetchedMeetings);
      console.log('Fetched meetings:', fetchedMeetings);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      Alert.alert('Error', 'Failed to fetch meetings from Launcher');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMeetings();
  };

  const handleMeetingPress = (meeting: Meeting) => {
    const startTime = new Date(meeting.startTime);
    const endTime = new Date(meeting.endTime);
    const timeString = `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    // Use Alert for both PWA and native app
    Alert.alert(
      'Join Meeting',
      `${meeting.title}\n${timeString}\nPlatform: ${meeting.platform?.toUpperCase()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Join', 
          onPress: () => handleJoinMeeting(meeting)
        }
      ]
    );
  };

  const handleJoinMeeting = async (meeting: Meeting) => {
    console.log('=== START handleJoinMeeting ===');
    console.log('Meeting object:', meeting);
    
    if (!meeting.link) {
      console.log('ERROR: No meeting link');
      alert('Error: No meeting link available');
      return;
    }

    try {
      console.log('Sending meeting launch command to Launcher');
      const success = await LauncherService.launchMeeting(meeting.link, meeting.platform || 'teams');
      console.log('Launch result:', success);

      if (success) {
        console.log('Meeting launched successfully');

        if (['google', 'teams', 'zoom', 'webex'].includes(meeting.platform)) {
          router.push({
            pathname: '/join-meeting-assist',
            params: {
              meetingUrl: meeting.link,
              meetingTitle: meeting.title,
              platform: meeting.platform,
            }
          });
        } else {
          router.push({
            pathname: '/meeting-controls',
            params: { platform: meeting.platform, meetingType: 'scheduled' }
          });
        }
      } else {
        console.log('Launch failed');
        alert('Launch Failed: Failed to launch meeting on Launcher');
      }
    } catch (error: any) {
      console.error('Error launching meeting:', error);
      alert('Error: ' + (error.message || 'Failed to launch meeting'));
    }
    console.log('=== END handleJoinMeeting ===');
  };

  const handleGoToSettings = () => {
    router.push('/launcher-settings');
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPlatformIcon = (platform: string) => {
    switch(platform) {
      case 'teams': return 'people';
      case 'google': return 'videocam';
      case 'zoom': return 'videocam';
      case 'webex': return 'globe';
      default: return 'videocam';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch(platform) {
      case 'teams': return '#5558D9';
      case 'google': return '#34a853';
      case 'zoom': return '#2D8CFF';
      case 'webex': return '#00BCF2';
      default: return '#8E8E93';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'live': return '#FF3B30';
      case 'upcoming': return '#00c851';
      case 'completed': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  const formatTimeLeft = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container">
      <div className="header">
        <div className="logo">OneTap</div>
        
        <div className="meetingInfo">
          <div className="meetingTitle">{roomName}</div>
        </div>

        <div className="headerButtons">
          <button
            className="headerButton"
            onClick={() => router.push('/')}
          >
            <Ionicons name="home" size={18} color="#007AFF" />
            <span className="headerButtonText">Home</span>
          </button>
          <button
            className="headerButton"
            onClick={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color="#007AFF" />
            <span className="headerButtonText">Return</span>
          </button>
        </div>
      </div>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Meetings</Text>
          {!isConnected && (
            <TouchableOpacity style={styles.settingsButton} onPress={handleGoToSettings}>
              <Ionicons name="settings" size={20} color="#ff9500" />
              <Text style={styles.settingsText}>Connect</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00c851" />
            <Text style={styles.loadingText}>Loading meetings...</Text>
          </View>
        ) : !isConnected ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cloud-offline" size={60} color="#666" />
            <Text style={styles.emptyTitle}>Not Connected to Launcher</Text>
            <Text style={styles.emptyText}>
              Please connect to Launcher to view calendar events
            </Text>
            <TouchableOpacity style={styles.connectButton} onPress={handleGoToSettings}>
              <Ionicons name="settings" size={20} color="#fff" />
              <Text style={styles.connectButtonText}>Go to Settings</Text>
            </TouchableOpacity>
          </View>
        ) : meetings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={60} color="#666" />
            <Text style={styles.emptyTitle}>No Meetings Scheduled</Text>
            <Text style={styles.emptyText}>
              You have no meetings scheduled for today
            </Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.meetingList} 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor="#00c851"
              />
            }
          >
            {meetings.map((meeting) => (
              <TouchableOpacity 
                key={meeting.id}
                style={styles.meetingCard}
                onPress={() => handleMeetingPress(meeting)}
                activeOpacity={0.7}
              >
              <View style={styles.meetingHeader}>
                <View style={styles.meetingInfo}>
                  <Text style={styles.meetingTitle}>{meeting.title}</Text>
                  <Text style={styles.meetingTime}>
                    {formatTime(meeting.startTime)} – {formatTime(meeting.endTime)}
                  </Text>
                </View>
                <View style={styles.meetingMeta}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(meeting.status || 'upcoming') }]} />
                  <Ionicons 
                    name={getPlatformIcon(meeting.platform || 'unknown')} 
                    size={22} 
                    color={getPlatformColor(meeting.platform || 'unknown')} 
                  />
                </View>
              </View>
              
              <View style={styles.meetingFooter}>
                <Text style={[styles.platformText, { color: getPlatformColor(meeting.platform || 'unknown') }]}>
                  {(meeting.platform || 'unknown').toUpperCase()}
                </Text>
                <Text style={[styles.statusText, { color: getStatusColor(meeting.status || 'upcoming') }]}>
                  {(meeting.status || 'upcoming').toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={18} color="#a0a0a0" />
          <Text style={styles.timerText}>Auto-return: {formatTimeLeft()}</Text>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 8,
  },
  settingsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ff9500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 15,
    color: '#a0a0a0',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  connectButton: {
    backgroundColor: '#00c851',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  connectButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  meetingList: {
    flex: 1,
  },
  meetingCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#48484A',
  },
  meetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  meetingInfo: {
    flex: 1,
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  meetingTime: {
    fontSize: 14,
    color: '#8E8E93',
  },
  meetingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  meetingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#48484A',
  },
  platformText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#48484A',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  timerText: {
    fontSize: 13,
    color: '#a0a0a0',
  },
});