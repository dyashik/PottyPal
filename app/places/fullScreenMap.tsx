import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { View, StyleSheet, TouchableOpacity, Text, FlatList, Dimensions, Animated, Pressable, Linking } from 'react-native';
import { AntDesign, FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import getGoogleMapsKey from '@/config/getGoogleMapsKey';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
const polyline = require('@mapbox/polyline');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Place } from '@/utils/api';
import BrandingContainer from '@/components/BrandingContainer';
import CustomCallout from '@/components/CustomCallout';
import { BannerAd, BannerAdSize, InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';

type LatLng = { latitude: number; longitude: number };

// Create interstitial ad instance outside component to persist across renders
const interstitial = InterstitialAd.createForAdRequest('ca-app-pub-3844546379677181/3717603941', {
    requestNonPersonalizedAdsOnly: false,
});

export default function FullscreenMap() {
    const { id, lat, lng, name, type, walkingURL, travelMode, distanceInfo } = useLocalSearchParams();
    let parsedDistanceInfo: any = {};
    try {
        parsedDistanceInfo = distanceInfo ? JSON.parse(distanceInfo as string) : {};
    } catch (e) {
        parsedDistanceInfo = {};
    }
    const router = useRouter();
    const mapRef = useRef<MapView>(null);
    const markerRef = useRef<any>(null);
    const [mode, setMode] = useState(travelMode === 'driving' ? 'driving' : 'walking'); // default to walking if not driving
    const latNum = parseFloat(lat as string);
    const lngNum = parseFloat(lng as string);
    const insets = useSafeAreaInsets();

    const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
    const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
    const [steps, setSteps] = useState<any[]>([]); // Directions steps from API
    const [expanded, setExpanded] = useState(false);
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [interstitialLoaded, setInterstitialLoaded] = useState(false);
    const [routeDistance, setRouteDistance] = useState<number>(0); // Distance in meters

    // Snap points for bottom sheet - collapsed & expanded
    const snapPoints = useMemo(() => {
        const { height } = Dimensions.get('window');
        const availableHeight = height - insets.top - insets.bottom;

        // Calculate responsive percentages based on screen size
        // iPhone 13 Pro has ~844px height, so 11% ≈ 93px and 50% ≈ 422px
        const collapsedHeight = Math.max(80, availableHeight * 0.11);  // minimum 80px
        const expandedHeight = Math.max(350, availableHeight * 0.50);  // minimum 350px

        // Convert back to percentages of total screen height
        const collapsedPercent = Math.round((collapsedHeight / height) * 100);
        const expandedPercent = Math.round((expandedHeight / height) * 100);

        return [`${collapsedPercent}%`, `${expandedPercent}%`];
    }, [insets]);

    // Helper for stripping HTML
    const pottyPalMapStyle = [
        { elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#1e3a8a' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
        { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#1e3a8a' }] },
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'on' }] },
        { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#ecfdf5' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#e5e7eb' }] },
        { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#d1d5db' }] },
        { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#374151' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cceeff' }] },
        { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#60a5fa' }] },
    ];

    const openGoogleMaps = (walkingURL: string) => {
        let url = mode === 'walking' ? walkingURL.replace(/!3e\d/, '!3e2') : walkingURL;
        if (!url) return;
        Linking.openURL(url);
    };


    // Load interstitial ad on component mount
    useEffect(() => {
        const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
            setInterstitialLoaded(true);
            console.log('Interstitial ad loaded');
        });

        const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
            console.log('Interstitial ad closed');
            // Reload the ad for next time
            interstitial.load();
        });

        // Load the interstitial ad
        interstitial.load();

        // Cleanup listeners on unmount
        return () => {
            unsubscribeLoaded();
            unsubscribeClosed();
        };
    }, []);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Location permission denied');
                return;
            }
            const location = await Location.getCurrentPositionAsync({});
            setCurrentLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
        })();
    }, []);

    useEffect(() => {
        if (currentLocation) {
            fetchRoute(currentLocation, { latitude: latNum, longitude: lngNum });
        }
    }, [currentLocation]);

    useEffect(() => {
        if (routeCoords.length && mapRef.current) {
            const edgePadding = { top: 120, right: 120, bottom: 220, left: 120 };
            mapRef.current.fitToCoordinates(routeCoords, {
                edgePadding,
                animated: true,
            });
        }
    }, [routeCoords]);

    function cleanInstruction(html: string) {
        // Strip HTML tags first
        let text = html.replace(/<[^>]+>/g, '');

        // Remove unwanted phrases like "restricted usage road"
        text = text.replace(/restricted usage road/gi, '');

        // Trim extra spaces & new lines
        text = text.trim();

        return text;
    }

    async function fetchRoute(origin: LatLng, destination: LatLng) {
        try {
            const API_KEY = getGoogleMapsKey(true);
            const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=walking&key=${API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.routes.length) {
                const points = polyline.decode(data.routes[0].overview_polyline.points);
                const route = points.map(([latitude, longitude]: [number, number]) => ({ latitude, longitude }));
                setRouteCoords(route);

                // Get distance from the route data
                const distanceInMeters = data.routes[0].legs[0].distance.value;
                setRouteDistance(distanceInMeters);

                let rawSteps = data.routes[0].legs[0].steps;
                let processedSteps: any[] = [];

                rawSteps.forEach((step: any) => {
                    const cleaned = cleanInstruction(step.html_instructions);

                    // Check if the step includes "Destination will be" or similar phrases
                    const destRegex = /(Destination will be on the left|Arrive at Destination|Your destination)/gi;

                    if (destRegex.test(cleaned)) {
                        // Remove ALL occurrences of the phrase from original step text
                        const mainText = cleaned.replace(destRegex, '').trim();

                        if (mainText) {
                            processedSteps.push({ ...step, cleaned_instructions: mainText });
                        }

                        // Extract all matches (phrases)
                        const matches = cleaned.match(destRegex);

                        matches?.forEach(match => {
                            processedSteps.push({
                                ...step,
                                cleaned_instructions: match.trim(),
                                isDestinationNote: true,
                            });
                        });
                    } else {
                        processedSteps.push({ ...step, cleaned_instructions: cleaned });
                    }
                });

                setSteps(processedSteps);
            }
        } catch (err) {
            console.error('Error fetching route:', err);
        }
    }

    useEffect(() => {
        if (markerRef.current) {
            setTimeout(() => {
                markerRef.current?.showCallout(); // 👈 Show Callout after map renders
            }, 500); // Delay slightly to ensure map and marker are ready
        }
    }, []);


    // Helper to strip HTML from instructions
    const stripHtml = (html: string) => html.replace(/<[^>]+>/g, '');

    // Calculate dynamic polyline styling based on distance and travel mode
    const getPolylineStyle = () => {
        // Distance ranges (in meters)
        // < 500m: Very close - thin, subtle
        // 500m - 2km: Close - medium
        // 2km - 5km: Medium distance - thicker
        // > 5km: Far - thickest, more pronounced

        let strokeWidth = 4;
        let dashPattern: number[] = [15, 10];

        // Walking mode: PottyPal blue
        // Driving mode: Dark green
        const isWalking = mode === 'walking';
        const strokeColor = isWalking ? '#1e3a8a' : '#15803d'; // PottyPal blue / Dark green

        if (routeDistance < 500) {
            // Very close: thin, more dotted
            strokeWidth = 3;
            dashPattern = [10, 8];
        } else if (routeDistance < 2000) {
            // Close: normal
            strokeWidth = 4;
            dashPattern = [15, 10];
        } else if (routeDistance < 5000) {
            // Medium distance: thicker, less dotted
            strokeWidth = 5;
            dashPattern = [20, 8];
        } else {
            // Far: thickest, solid-ish
            strokeWidth = 6;
            dashPattern = [25, 6];
        }

        return { strokeWidth, dashPattern, strokeColor };
    };

    const polylineStyle = getPolylineStyle();

    return (
        <View style={{ flex: 1 }}>
            {/* Back Button */}
            <View style={[styles.backButtonContainer, { top: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* GPS Button */}
            <View style={{ top: 8, zIndex: 999 }}>
                <BrandingContainer />
            </View>

            {/* Branding Container */}
            {/* Map */}
            <MapView
                style={{ flex: 1 }}
                ref={mapRef}
                initialRegion={{
                    latitude: latNum,
                    longitude: lngNum,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
                showsUserLocation
                customMapStyle={pottyPalMapStyle}
                provider="google"
            >
                {/* Destination Marker */}
                <Marker ref={markerRef} coordinate={{ latitude: latNum, longitude: lngNum }} title={name as string} description={type as string} calloutAnchor={{ x: 0.5, y: -0.2 }}>
                    <CustomCallout place={{ displayName: { text: name as string }, primaryType: type as string, location: { latitude: latNum, longitude: lngNum } }} />
                </Marker>

                {/* Route Polyline */}
                {routeCoords.length > 0 && (
                    <Polyline
                        coordinates={routeCoords}
                        strokeColor={polylineStyle.strokeColor}
                        strokeWidth={polylineStyle.strokeWidth}
                        lineDashPattern={polylineStyle.dashPattern}
                        geodesic
                    />
                )}
            </MapView>

            {/* Combined Go Button with Walk/Drive Toggle */}
            <View style={[styles.combinedGoButtonContainer, { bottom: 80 }]}>
                <View style={styles.combinedGoButton}>
                    {/* Left side: Walk/Drive toggle */}
                    <View style={styles.modeToggleSection}>
                        <TouchableOpacity
                            style={[styles.modeOption, { backgroundColor: mode === 'walking' ? '#e0f2fe' : 'transparent' }]}
                            onPress={() => setMode('walking')}
                        >
                            <FontAwesome5 name="walking" size={18} color={mode === 'walking' ? '#1e3a8a' : '#666'} />
                        </TouchableOpacity>
                        <View style={styles.modeDivider} />
                        <TouchableOpacity
                            style={[styles.modeOption, { backgroundColor: mode === 'driving' ? '#e0f2fe' : 'transparent' }]}
                            onPress={() => setMode('driving')}
                        >
                            <FontAwesome5 name="car" size={18} color={mode === 'driving' ? '#1e3a8a' : '#666'} />
                        </TouchableOpacity>
                    </View>

                    {/* Center: Time/Distance Info */}
                    {parsedDistanceInfo[mode]?.duration && (
                        <View style={styles.timeDistanceSection}>
                            <Text style={styles.durationText}>{parsedDistanceInfo[mode]?.duration}</Text>
                            {parsedDistanceInfo[mode]?.distance && (
                                <Text style={styles.distanceText}>{parsedDistanceInfo[mode]?.distance}</Text>
                            )}
                        </View>
                    )}

                    {/* Right side: GO button */}
                    <TouchableOpacity
                        style={styles.goButtonSection}
                        onPress={() => {
                            if (currentLocation) {
                                // Show interstitial ad if loaded, otherwise navigate directly
                                if (interstitialLoaded) {
                                    // Set up listener for when ad is closed
                                    const unsubscribe = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
                                        unsubscribe();
                                        router.push({
                                            pathname: '/places/navigation',
                                            params: {
                                                originLat: currentLocation.latitude,
                                                originLng: currentLocation.longitude,
                                                destLat: latNum,
                                                destLng: lngNum,
                                                destName: name as string,
                                                travelMode: mode
                                            }
                                        });
                                    });
                                    interstitial.show();
                                } else {
                                    // Ad not loaded yet, navigate directly
                                    router.push({
                                        pathname: '/places/navigation',
                                        params: {
                                            originLat: currentLocation.latitude,
                                            originLng: currentLocation.longitude,
                                            destLat: latNum,
                                            destLng: lngNum,
                                            destName: name as string,
                                            travelMode: mode
                                        }
                                    });
                                }
                            }
                        }}
                    >
                        <Text style={styles.goButtonText}>GO</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Pressable
                style={[styles.directionsButtonContainer, { top: insets.top + 10 }]}
                onPress={() => {
                    const placeId = Array.isArray(id) ? id[0] : id || 'someId';
                    router.push({
                        pathname: '/places/[id]',
                        params: { id: placeId }
                    });
                }}
            >
                <View style={styles.directionsButton}>
                    <FontAwesome5 name="info-circle" size={24} color="white" />
                </View>
            </Pressable>
            <View>
                <BannerAd
                    unitId="ca-app-pub-3844546379677181/4302897388"
                    size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                    requestOptions={{
                        requestNonPersonalizedAdsOnly: false,
                    }}
                />
            </View>
        </View >
    );
}

const styles = StyleSheet.create({
    combinedGoButtonContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 999,
    },
    combinedGoButton: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 8,
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 8,
        gap: 12,
    },
    modeToggleSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    modeOption: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#d1d5db',
    },
    timeDistanceSection: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    durationText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e3a8a',
    },
    distanceText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6b7280',
        marginTop: -2,
    },
    goButtonSection: {
        backgroundColor: '#12d65aff',
        borderRadius: 24,
        paddingVertical: 10,
        paddingHorizontal: 24,
        minWidth: 70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    goButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 18,
        letterSpacing: 0.5,
    },
    brandingContainer: {
        position: 'absolute',
        alignSelf: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 25,
        flexDirection: 'row',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 5,
        zIndex: 1000, // ensure it stays above map
    },

    brandingText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e3a8a',
        fontFamily: 'HelveticaNeue',
        textShadowColor: 'rgba(30, 58, 138, 0.6)',  // softer, semi-transparent blue
    },
    backButton: {
        backgroundColor: '#1e3a8a', // PottyPal blue
        borderRadius: 999,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },

    backButtonContainer: {
        position: 'absolute',
        left: 20,
        zIndex: 999,
        backgroundColor: 'rgba(255,255,255,0.9)',  // match opacity like openMapsButton
        padding: 10,
        borderRadius: 999,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    directionsButtonContainer: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 999,
        backgroundColor: 'rgba(255,255,255,0.9)', // frosted glass outer container
        padding: 10,
        borderRadius: 999,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },

    directionsButton: {
        backgroundColor: '#1e3a8a', // PottyPal blue circle inside
        borderRadius: 999,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    openMapsButtonText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
    },
    directionsPanel: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: -3 },
        shadowRadius: 6,
        elevation: 10,
        overflow: 'hidden',
    },
    panelHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    panelHeader: {
        fontWeight: '700',
        fontSize: 18,
        color: '#1e3a8a',
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
        paddingRight: 10,
    },
    stepIndex: {
        fontWeight: '700',
        fontSize: 16,
        marginRight: 8,
        color: '#1e3a8a',
    },
    stepText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        lineHeight: 20, // better spacing for multiline
        // whiteSpace: 'pre-line', // honors \n line breaks in react-native Text
    },
    bottomSheet: {
        backgroundColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
        zIndex: 999, // keep above map
    },
    bottomSheetInner: {
        flexGrow: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.85)', // frosted glass-ish
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 10,
        overflow: 'hidden',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: '#999',
    },
});
