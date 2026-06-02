import { Stack } from 'expo-router';

// Real layout for the card/ directory so expo-router doesn't synthesise a
// generated layout whose loadRoute() is undefined (a path to the
// "Cannot read property 'ErrorBoundary' of undefined" crash).
export default function CardLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
