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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Logo from '../components/Logo';
import LauncherService from '../services/LauncherService';

export default function LauncherSettingsScreen() {
  const [launcherIP, setLauncherIP] = useState('');
  const [launcherPort, setLauncherPort] = useState('8001');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  // Reload settings every time screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  const loadSettings = async () => {
  setIsLoading(true);
  try {
    // Load saved settings first
    const savedIP = await AsyncStorage.getItem('@launcher_ip');
    const savedPort = await AsyncStorage.getItem('@launcher_port');
    
    setLauncherIP(savedIP || '');
    setLauncherPort(savedPort || '8001');
    
    // Auto-test connection if IP is configured
    if (savedIP && savedIP.trim() !== '') {
      console.log('Auto-testing launcher connection...');
      
      // Re-initialize LauncherService with current settings
      await LauncherService.initialize();
      const connectionStatus = await LauncherService.testConnection();
      setIsConnected(connectionStatus);
      console.log('Launcher connection status:', connectionStatus);
    } else {
      setIsConnected(false);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    setIsConnected(false);
  } finally {
    setIsLoading(false);
  }
};

  const handleTestConnection = async () => {
    if (!launcherIP.trim()) {
      Alert.alert('Error', 'Please enter Launcher IP address');
      return;
    }

    setIsTesting(true);
    try {
      await LauncherService.setLauncherConnection(launcherIP.trim(), launcherPort.trim());
      
      const success = await LauncherService.testConnection();
      
      if (success) {
        setIsConnected(true);
        Alert.alert('Success', 'Successfully connected to Launcher!');
      } else {
        setIsConnected(false);
        Alert.alert('Connection Failed', 'Could not connect to Launcher. Please check IP and ensure Launcher is running.');
      }
    } catch (error: any) {
      setIsConnected(false);
      Alert.alert('Error', error.message || 'Failed to connect to Launcher');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
  if (!launcherIP.trim()) {
    Alert.alert('Error', 'Please enter Launcher IP address');
    return;
  }

  setIsLoading(true);
  try {
    await LauncherService.setLauncherConnection(launcherIP.trim(), launcherPort.trim());
    Alert.alert('Saved', 'Launcher settings saved successfully', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  } catch (error: any) {
    Alert.alert('Error', error.message || 'Failed to save settings');
  } finally {
    setIsLoading(false);
  }
};

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect',
      'Are you sure you want to disconnect from Launcher?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await LauncherService.disconnect();
            setIsConnected(false);
            Alert.alert('Disconnected', 'Disconnected from Launcher');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <Logo width={100} height={40} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Launcher Settings</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusLabel}>Connection Status</Text>
            <View style={[styles.statusIndicator, { backgroundColor: isConnected ? '#00c851' : '#ff4757' }]}>
              <Text style={styles.statusText}>{isConnected ? 'Connected' : 'Disconnected'}</Text>
            </View>
          </View>
          {isConnected && (
            <Text style={styles.statusDetail}>
              Connected to {launcherIP}:{launcherPort}
            </Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Launcher IP Address *</Text>
          <TextInput
            style={styles.input}
            value={launcherIP}
            onChangeText={setLauncherIP}
            placeholder="e.g., 192.168.1.100"
            placeholderTextColor="#666"
            keyboardType="numeric"
            autoCapitalize="none"
            editable={!isLoading && !isTesting}
          />
          <Text style={styles.hint}>Enter the IP address of your device (Bridge IP)</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Launcher Port</Text>
          <TextInput
            style={styles.input}
            value={launcherPort}
            onChangeText={setLauncherPort}
            placeholder="8001"
            placeholderTextColor="#666"
            keyboardType="numeric"
            editable={!isLoading && !isTesting}
          />
          <Text style={styles.hint}>Use 8001 for mock data testing</Text>
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity 
            style={styles.testButton}
            onPress={handleTestConnection}
            disabled={isLoading || isTesting}
          >
            {isTesting ? (
              <ActivityIndicator color="#007AFF" />
            ) : (
              <>
                <Ionicons name="wifi" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Test Connection</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isLoading || isTesting}
          >
            {isLoading ? (
              <ActivityIndicator color="#007AFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Save Settings</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {isConnected && (
          <TouchableOpacity 
            style={styles.disconnectButton}
            onPress={handleDisconnect}
          >
            <Ionicons name="close-circle" size={20} color="#ff4757" />
            <Text style={styles.disconnectText}>Disconnect</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#a0a0a0" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
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
  headerInfo: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  statusCard: {
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(118, 118, 128, 0.24)',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AEAEB2',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statusDetail: {
    fontSize: 12,
    color: '#a0a0a0',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(118, 118, 128, 0.24)',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  buttonGroup: {
    gap: 12,
    marginTop: 8,
  },
  testButton: {
    backgroundColor: '#2d8cff',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButton: {
    backgroundColor: '#00c851',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '600',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 24,
  },
  disconnectText: {
    color: '#ff4757',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  backButtonText: {
    fontSize: 15,
    color: '#a0a0a0',
  },
});