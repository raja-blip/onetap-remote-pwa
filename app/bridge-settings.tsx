import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, StatusBar, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Logo from '../components/Logo';
import LauncherService from '../services/LauncherService';

const BRIDGE_IP_KEY = '@bridge_ip';
const BRIDGE_PORT_KEY = '@bridge_port';
const ROOM_NAME_KEY = '@room_name';

export default function SettingsScreen() {
  const [activeTab, setActiveTab] = useState<'bridge' | 'launcher'>('bridge');
  
  // Bridge settings
  const [bridgeIP, setBridgeIP] = useState('192.168.68.102');
  const [bridgePort, setBridgePort] = useState('9090');
  const [roomName, setRoomName] = useState('Meeting Room 1');
  const [isBridgeLoading, setIsBridgeLoading] = useState(false);

  // Launcher settings
  const [launcherIP, setLauncherIP] = useState('');
  const [launcherPort, setLauncherPort] = useState('8001');
  const [isLauncherConnected, setIsLauncherConnected] = useState(false);
  const [isLauncherLoading, setIsLauncherLoading] = useState(false);
  const [isLauncherTesting, setIsLauncherTesting] = useState(false);

  useEffect(() => {
    loadBridgeConfig();
    loadLauncherSettings();
  }, []);

  // Bridge Settings Functions
  const loadBridgeConfig = async () => {
    try {
      const savedIP = await AsyncStorage.getItem(BRIDGE_IP_KEY);
      const savedPort = await AsyncStorage.getItem(BRIDGE_PORT_KEY);
      const savedRoomName = await AsyncStorage.getItem(ROOM_NAME_KEY);
      if (savedIP) setBridgeIP(savedIP);
      if (savedPort) setBridgePort(savedPort);
      if (savedRoomName) setRoomName(savedRoomName);
    } catch (error) {
      console.error('Error loading bridge config:', error);
    }
  };

  const saveBridgeConfig = async () => {
    try {
      await AsyncStorage.setItem(BRIDGE_IP_KEY, bridgeIP);
      await AsyncStorage.setItem(BRIDGE_PORT_KEY, bridgePort);
      await AsyncStorage.setItem(ROOM_NAME_KEY, roomName);
      Alert.alert('Success', 'Bridge configuration saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save configuration');
    }
  };

  const testBridgeConnection = async () => {
    setIsBridgeLoading(true);
    try {
      const response = await fetch(`http://${bridgeIP}:${bridgePort}/api/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      Alert.alert('Success', `Connected to ${data.device_name || 'Bridge Service'}\nIP: ${bridgeIP}:${bridgePort}`);
    } catch (error) {
      Alert.alert('Connection Failed', 'Could not reach bridge service. Check IP and port.');
    } finally {
      setIsBridgeLoading(false);
    }
  };

  const refreshIP = async () => {
    setIsBridgeLoading(true);
    try {
      // Get current subnet from existing IP
      const ipParts = bridgeIP.split('.');
      if (ipParts.length !== 4) {
        Alert.alert('Error', 'Invalid IP format');
        setIsBridgeLoading(false);
        return;
      }
      
      const subnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
      console.log('Scanning subnet:', subnet);
      
      // Common IP range for devices (usually .100-110 or nearby)
      const startIP = Math.max(1, parseInt(ipParts[3]) - 10);
      const endIP = Math.min(254, parseInt(ipParts[3]) + 10);
      
      Alert.alert('Scanning', `Searching for bridge on ${subnet}.${startIP}-${endIP}...`);
      
      // Scan IPs
      for (let i = startIP; i <= endIP; i++) {
        const testIP = `${subnet}.${i}`;
        console.log('Testing IP:', testIP);
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 500); // 500ms timeout per IP
          
          const response = await fetch(`http://${testIP}:${bridgePort}/api/status`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            console.log('Found bridge at:', testIP);
            
            // Found the bridge!
            setBridgeIP(testIP);
            await AsyncStorage.setItem(BRIDGE_IP_KEY, testIP);
            
            Alert.alert(
              'Bridge Found!',
              `Successfully found bridge at ${testIP}:${bridgePort}\n\nDevice: ${data.device_name || 'VC Bridge'}\n\nSettings have been updated.`
            );
            setIsBridgeLoading(false);
            return;
          }
        } catch (error) {
          // Ignore errors, continue scanning
          continue;
        }
      }
      
      // No bridge found
      Alert.alert('Not Found', `Could not find bridge on subnet ${subnet}.x\n\nPlease enter the IP manually.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to scan for bridge');
    } finally {
      setIsBridgeLoading(false);
    }
  };

  // Launcher Settings Functions
  const loadLauncherSettings = async () => {
    setIsLauncherLoading(true);
    try {
      await LauncherService.initialize();
      const info = LauncherService.getConnectionInfo();
      setLauncherIP(info.ip);
      setLauncherPort(info.port);
      setIsLauncherConnected(info.connected);
    } catch (error) {
      console.error('Error loading launcher settings:', error);
    } finally {
      setIsLauncherLoading(false);
    }
  };

  const handleTestLauncherConnection = async () => {
    if (!launcherIP.trim()) {
      Alert.alert('Error', 'Please enter Launcher IP address');
      return;
    }

    setIsLauncherTesting(true);
    try {
      await LauncherService.setLauncherConnection(launcherIP.trim(), launcherPort.trim());
      const success = await LauncherService.testConnection();
      
      if (success) {
        setIsLauncherConnected(true);
        Alert.alert('Success', 'Successfully connected to Launcher!');
      } else {
        setIsLauncherConnected(false);
        Alert.alert('Connection Failed', 'Could not connect to Launcher. Please check IP and ensure Launcher is running.');
      }
    } catch (error: any) {
      setIsLauncherConnected(false);
      Alert.alert('Error', error.message || 'Failed to connect to Launcher');
    } finally {
      setIsLauncherTesting(false);
    }
  };

  const handleSaveLauncher = async () => {
    if (!launcherIP.trim()) {
      Alert.alert('Error', 'Please enter Launcher IP address');
      return;
    }

    setIsLauncherLoading(true);
    try {
      await LauncherService.setLauncherConnection(launcherIP.trim(), launcherPort.trim());
      Alert.alert('Saved', 'Launcher settings saved successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save settings');
    } finally {
      setIsLauncherLoading(false);
    }
  };

  const handleDisconnectLauncher = async () => {
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
            setIsLauncherConnected(false);
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'bridge' && styles.activeTab]}
          onPress={() => setActiveTab('bridge')}
        >
          <Ionicons name="hardware-chip" size={20} color={activeTab === 'bridge' ? '#007AFF' : '#8E8E93'} />
          <Text style={[styles.tabText, activeTab === 'bridge' && styles.activeTabText]}>
            Bridge
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'launcher' && styles.activeTab]}
          onPress={() => setActiveTab('launcher')}
        >
          <Ionicons name="rocket" size={20} color={activeTab === 'launcher' ? '#007AFF' : '#8E8E93'} />
          <Text style={[styles.tabText, activeTab === 'launcher' && styles.activeTabText]}>
            Launcher
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'bridge' ? (
          // Bridge Settings Tab
          <View style={styles.content}>
            <View style={styles.logoSection}>
              <Logo width={120} height={50} />
              <Text style={styles.subtitle}>Configure VC Bridge Connection</Text>
            </View>

            <Text style={styles.label}>Meeting Room Name</Text>
            <TextInput
              style={styles.input}
              value={roomName}
              onChangeText={setRoomName}
              placeholder="Meeting Room 1"
              placeholderTextColor="#666"
            />

            <View style={styles.inputWithButton}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Bridge IP Address</Text>
                <TextInput
                  style={styles.input}
                  value={bridgeIP}
                  onChangeText={setBridgeIP}
                  placeholder="192.168.68.102"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              </View>
              <TouchableOpacity 
                style={styles.qrButton}
                onPress={() => router.push('/qr-scanner')}
              >
                <Ionicons name="qr-code" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Bridge Port</Text>
            <TextInput
              style={styles.input}
              value={bridgePort}
              onChangeText={setBridgePort}
              placeholder="9090"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />

            <TouchableOpacity style={styles.saveButton} onPress={saveBridgeConfig}>
              <Ionicons name="save" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Configuration</Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.testButton, styles.halfButton, isBridgeLoading && styles.disabledButton]} 
                onPress={testBridgeConnection}
                disabled={isBridgeLoading}
              >
                <Ionicons name="wifi" size={20} color="#FFFFFF" />
                <Text style={styles.testButtonText}>
                  {isBridgeLoading ? 'Testing...' : 'Test'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.refreshButton, styles.halfButton, isBridgeLoading && styles.disabledButton]} 
                onPress={refreshIP}
                disabled={isBridgeLoading}
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.refreshButtonText}>
                  {isBridgeLoading ? 'Scanning...' : 'Refresh IP'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#007AFF" />
              <Text style={styles.infoText}>
                Tap "Refresh IP" to automatically find the bridge on your network, or enter the IP manually. The bridge IP is shown on the VC device bridge app screen.
              </Text>
            </View>
          </View>
        ) : (
          // Launcher Settings Tab
          <View style={styles.content}>
            <View style={styles.logoSection}>
              <Logo width={120} height={50} />
              <Text style={styles.subtitle}>Configure Launcher Connection</Text>
            </View>

            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <Text style={styles.statusLabel}>Connection Status</Text>
                <View style={[styles.statusIndicator, { backgroundColor: isLauncherConnected ? '#00c851' : '#ff4757' }]}>
                  <Text style={styles.statusText}>{isLauncherConnected ? 'Connected' : 'Disconnected'}</Text>
                </View>
              </View>
              {isLauncherConnected && (
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
                editable={!isLauncherLoading && !isLauncherTesting}
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
                editable={!isLauncherLoading && !isLauncherTesting}
              />
              <Text style={styles.hint}>Use 8001 for mock data testing</Text>
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                style={styles.testButton}
                onPress={handleTestLauncherConnection}
                disabled={isLauncherTesting || isLauncherLoading}
              >
                <Ionicons name="wifi" size={20} color="#FFFFFF" />
                <Text style={styles.testButtonText}>
                  {isLauncherTesting ? 'Testing...' : 'Test Connection'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveLauncher}
                disabled={isLauncherLoading || isLauncherTesting}
              >
                <Ionicons name="save" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Settings</Text>
              </TouchableOpacity>
            </View>

            {isLauncherConnected && (
              <TouchableOpacity 
                style={styles.disconnectButton}
                onPress={handleDisconnectLauncher}
              >
                <Ionicons name="unlink" size={20} color="#FF3B30" />
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </TouchableOpacity>
            )}

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#007AFF" />
              <Text style={styles.infoText}>
                The Launcher service provides calendar integration and text-based commands. Use the same IP as Bridge.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#48484A',
    minHeight: 80,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#48484A',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#007AFF',
  },
  
  scrollContent: {
    flex: 1,
  },
  content: { padding: 20 },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#AEAEB2',
    marginTop: 12,
  },
  label: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 8, marginTop: 16 },
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
  inputGroup: {
    marginBottom: 16,
  },
  hint: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 6,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 32,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  halfButton: {
    flex: 1,
  },
  testButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  testButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  refreshButton: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  refreshButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  disabledButton: { opacity: 0.5 },
  
  // Launcher specific
  statusCard: {
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statusDetail: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 8,
  },
  buttonGroup: {
    gap: 16,
    marginTop: 24,
  },
  disconnectButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  disconnectButtonText: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
    gap: 12,
  },
  infoText: { flex: 1, fontSize: 14, color: '#AEAEB2', lineHeight: 20 },
  inputWithButton: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
  },
  qrButton: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
