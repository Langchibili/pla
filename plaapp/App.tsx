import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppContent from './AppContent';

if (typeof DOMException === 'undefined') {
  Object.defineProperty(globalThis, 'DOMException', {
    configurable: true,
    writable: true,
    value: class DOMException extends Error {
      constructor(message?: string, name?: string) {
        super(message);
        this.name = name ?? 'DOMException';
      }
    },
  });
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}