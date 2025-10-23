import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// ADD THIS HELPER FUNCTION HERE
const fetchWithTimeout = (url, options = {}, timeout = 5000) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
};

export default function SetupScreen() {
  const [bridgeIP, setBridgeIP] = useState('192.168.68.102');
  const [bridgePort, setBridgePort] = useState('9090');
  const [launcherPort, setLauncherPort] = useState('8080');
  const [isConnecting, setIsConnecting] = useState(false);

  const testConnection = async () => {
    setIsConnecting(true);
    try {
      console.log('Testing connection to:', `http://${bridgeIP}:${bridgePort}/api/status`);
      console.log('User Agent:', navigator.userAgent);
      console.log('Platform:', navigator.platform);
      
      // First test with a simple HTTP request to see if basic connectivity works
      try {
        const testResponse = await fetchWithTimeout(`http://httpbin.org/get`, {
          method: 'GET',
        }, 5000);
        console.log('External HTTP test successful:', testResponse.status);
      } catch (testError) {
        console.log('External HTTP test failed:', testError.message);
      }
      
      const response = await fetchWithTimeout(`http://${bridgeIP}:${bridgePort}/api/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }, 10000); // 10 second timeout

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        const data = await response.json();
        console.log('Bridge connected:', data);

        // Save connection settings
        await AsyncStorage.setItem('@bridge_ip', bridgeIP);
        await AsyncStorage.setItem('@bridge_port', bridgePort);
        await AsyncStorage.setItem('@launcher_ip', bridgeIP);
        await AsyncStorage.setItem('@launcher_port', launcherPort);
        await AsyncStorage.setItem('@bridge_connected', 'true');

        Alert.alert('Success', `Connected to VC Bridge!\nDevice: ${data.device_name || 'Unknown'}\nIP: ${bridgeIP}:${bridgePort}`, [
          {
            text: 'OK',
            onPress: () => router.replace('/'),
          },
        ]);
      } else {
        console.error('Connection failed with status:', response.status);
        Alert.alert('Connection Failed', `Could not connect to Bridge. Status: ${response.status}\nCheck IP and port.`);
      }
    } catch (error) {
      console.error('Connection error:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack
      });
      
      let errorMessage = 'Failed to connect. Make sure Bridge is running and accessible.';
      if (error.message.includes('timeout')) {
        errorMessage = 'Connection timeout. Check if Bridge is running and accessible.';
      } else if (error.message.includes('Network request failed')) {
        errorMessage = 'Network request failed. Check network connectivity and Bridge IP.';
      } else if (error.message.includes('ERR_CLEARTEXT_NOT_PERMITTED')) {
        errorMessage = 'HTTP traffic blocked. This is a network security issue.';
      }
      
      Alert.alert('Error', `${errorMessage}\n\nError: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="videocam" size={80} color="#007AFF" />
        <Text style={styles.title}>VC Remote Setup</Text>
        <Text style={styles.subtitle}>Connect to your VC Bridge device</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Bridge IP Address</Text>
          <TextInput
            style={styles.input}
            value={bridgeIP}
            onChangeText={setBridgeIP}
            placeholder="192.168.1.100"
            placeholderTextColor="#666"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Bridge Port</Text>
          <TextInput
            style={styles.input}
            value={bridgePort}
            onChangeText={setBridgePort}
            placeholder="9090"
            placeholderTextColor="#666"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Launcher Port</Text>
          <TextInput
            style={styles.input}
            value={launcherPort}
            onChangeText={setLauncherPort}
            placeholder="8080"
            placeholderTextColor="#666"
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={styles.connectButton}
            onPress={testConnection}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="link" size={24} color="#fff" />
                <Text style={styles.connectButtonText}>Connect to Bridge</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            Make sure your Bridge device is running and accessible on the same network.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
    marginBottom: 40,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  label: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(118, 118, 128, 0.24)',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 32,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginTop: 40,
    maxWidth: 400,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
  },
});