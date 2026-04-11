import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Default coordinates (Delhi) if location unavailable
const DEFAULT_COORDS: Coordinates = {
  latitude: 28.6139,
  longitude: 77.2090,
};

// Request location permissions
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Location Permission',
        'Location access helps rescuers find you. Your SOS will still be sent without it.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Get current GPS coordinates
export async function getCurrentLocation(): Promise<Coordinates> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return DEFAULT_COORDS;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch {
    // Fall back to last known location
    try {
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        return {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
      }
    } catch {
      // Ignore
    }
    return DEFAULT_COORDS;
  }
}
