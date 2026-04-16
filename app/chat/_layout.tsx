import { Stack } from 'expo-router';

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="[id]" 
        options={{
          title: 'Chat',
        }}
      />
      <Stack.Screen 
        name="group/[id]" 
        options={{
          title: 'Group Chat',
        }}
      />
    </Stack>
  );
}