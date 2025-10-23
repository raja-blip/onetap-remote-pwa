import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          animation: 'none',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="join-meeting" />
        <Stack.Screen name="join-meeting-assist" />  {/* ADD THIS LINE */}
        <Stack.Screen name="calendar" />
        <Stack.Screen name="casting" />
        <Stack.Screen name="meeting-controls" />
        <Stack.Screen name="bridge-settings" />
        <Stack.Screen name="launcher-settings" />
        <Stack.Screen name="instant-meeting" />
      </Stack>
    </GestureHandlerRootView>
  );
}