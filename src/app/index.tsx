import { Text, View } from 'react-native';

// TEMP isolation build: zero imports beyond react-native. If this launches,
// the crash is in the previous index's imports (engine/store/bottom-bar). If it
// still shows the ErrorBoundary, the cause is the root _layout / expo-router.
export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fdf6e9' }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#e96997' }}>うちのモン  起動OK</Text>
    </View>
  );
}
