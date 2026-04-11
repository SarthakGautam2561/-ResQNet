import { useState, useEffect, useCallback } from 'react';
import * as Network from 'expo-network';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  const checkNetwork = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setIsConnected(state.isConnected === true);
    } catch {
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkNetwork();
    // Poll every 5 seconds for network changes
    const interval = setInterval(checkNetwork, 5000);
    return () => clearInterval(interval);
  }, [checkNetwork]);

  return { isConnected, isChecking, refresh: checkNetwork };
}
