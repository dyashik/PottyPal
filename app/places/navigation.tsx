import MapboxNavigation from '@pawan-pk/react-native-mapbox-navigation';
import { StyleSheet, Alert, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

export default function Navigation() {
    const { originLat, originLng, destLat, destLng, destName, travelMode } = useLocalSearchParams();
    const router = useRouter();
    const [isNavigating, setIsNavigating] = useState(true);
    const [hasLocationPermission, setHasLocationPermission] = useState(false);

    // Parse the coordinates from params
    const originLatNum = parseFloat(originLat as string);
    const originLngNum = parseFloat(originLng as string);
    const destLatNum = parseFloat(destLat as string);
    const destLngNum = parseFloat(destLng as string);

    // Determine travel mode (Mapbox only supports walking, driving, driving-traffic, cycling)
    const mapboxTravelMode = travelMode === 'driving' ? 'driving-traffic' : 'walking';

    console.log('Navigation travel mode:', {
        received: travelMode,
        mapboxMode: mapboxTravelMode
    });

    // Request location permissions on mount
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                setHasLocationPermission(true);
                // Also request background location for continuous tracking
                await Location.requestBackgroundPermissionsAsync();
            } else {
                Alert.alert(
                    'Location Permission Required',
                    'Navigation requires location access to track your movement.',
                    [
                        {
                            text: 'OK',
                            onPress: () => router.back()
                        }
                    ]
                );
            }
        })();
    }, []);

    const handleLocationChange = (location: any) => {
        // Track user's location during navigation
        // console.log('Current location:', {
        //     latitude: location.latitude,
        //     longitude: location.longitude,
        //     heading: location.heading,
        //     accuracy: location.accuracy
        // });
    };

    const handleRouteProgress = (progress: any) => {
        // Track navigation progress
        // console.log('Route progress:', {
        //     distanceTraveled: progress.distanceTraveled,
        //     durationRemaining: progress.durationRemaining,
        //     fractionTraveled: progress.fractionTraveled,
        //     distanceRemaining: progress.distanceRemaining
        // });
    };

    const handleError = (error: any) => {
        console.error('Navigation error:', error.message);
        Alert.alert(
            'Navigation Error',
            error.message || 'An error occurred during navigation',
            [
                {
                    text: 'OK',
                    onPress: () => router.back()
                }
            ]
        );
    };

    const handleCancelNavigation = () => {
        Alert.alert(
            'Cancel Navigation',
            'Are you sure you want to exit navigation?',
            [
                {
                    text: 'No',
                    style: 'cancel'
                },
                {
                    text: 'Yes',
                    onPress: () => {
                        setIsNavigating(false);
                        router.back();
                    }
                }
            ]
        );
    };

    const handleArrive = (waypoint: any) => {
        console.log('Arrived at:', waypoint);
        // Alert.alert(
        //     'Destination Reached',
        //     `You have arrived at ${destName}!`,
        //     [
        //         {
        //             text: 'OK',
        //             onPress: () => router.back()
        //         }
        //     ]
        // );
    };

    if (!isNavigating || !hasLocationPermission) {
        return null;
    }

    return (
        <View style={styles.container}>
            <MapboxNavigation
                startOrigin={{ latitude: originLatNum, longitude: originLngNum }}
                destination={{
                    latitude: destLatNum,
                    longitude: destLngNum,
                    title: destName as string
                }}
                style={styles.navigation}
                // IMPORTANT: shouldSimulateRoute={false} means use REAL GPS
                // - On REAL DEVICE: Tracks your actual walking/driving movement
                // - On SIMULATOR: Use Features → Location → City Run/Freeway Drive to simulate movement
                // Set to {true} to simulate route automatically without needing to move
                shouldSimulateRoute={false}
                // Show cancel button on Android only
                showCancelButton={Platform.OS === 'android'}
                // Navigation language
                language="en"
                // Use imperial (miles) or metric (kilometers)
                distanceUnit="imperial"
                // Travel mode based on user selection (walking or driving-traffic)
                travelMode={mapboxTravelMode as 'walking' | 'driving-traffic'}
                // Show feedback when route is complete [iOS only]
                showsEndOfRouteFeedback={true}
                // Enable voice instructions
                mute={false}
                // Event handlers for full Google Maps-like functionality
                onLocationChange={handleLocationChange}
                onRouteProgressChange={handleRouteProgress}
                onError={handleError}
                onCancelNavigation={handleCancelNavigation}
                onArrive={handleArrive}
            />
            {/* <View style={styles.adContainer}>
                <BannerAd
                    unitId="ca-app-pub-3844546379677181/4302897388"
                    size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                    requestOptions={{
                        requestNonPersonalizedAdsOnly: false,
                    }}
                />
            </View> */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    navigation: {
        flex: 1,
    },
    adContainer: {
        // Not absolute positioned - will sit at bottom naturally
        width: '100%',
    },
});