// app/login/_layout.tsx
import { Stack } from 'expo-router';

export default function Dashboard() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="about" />
      <Stack.Screen name="contacts/index" />
      <Stack.Screen name="help" />
      <Stack.Screen name="qr/index" />
      <Stack.Screen name="index" />
      <Stack.Screen name="privacy/index"/>
      <Stack.Screen name="forms/index" />
      <Stack.Screen name="formlist/index" />
      <Stack.Screen name="services" />
      <Stack.Screen name="set/index" />
      <Stack.Screen name="user-profiles" />
      <Stack.Screen name="updates/index" />
      <Stack.Screen name="broadcast/index" />
      <Stack.Screen name="profile/index" />
      <Stack.Screen name="starred/index" />
      <Stack.Screen name="garages/index" />
      <Stack.Screen name="chat/index" />
      <Stack.Screen name="admin/index" />
      
      <Stack.Screen name="theme/index" />


    </Stack>
  );
}