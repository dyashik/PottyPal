import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { View, StyleSheet, TouchableOpacity, Text, FlatList, Dimensions, Animated, Pressable, Linking } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import getGoogleMapsKey from '@/config/getGoogleMapsKey';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
const polyline = require('@mapbox/polyline');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Place } from '@/utils/api';
import BrandingContainer from '@/components/BrandingContainer';
import CustomCallout from '@/components/CustomCallout';

type LatLng = { latitude: number; longitude: number };

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

                {/* Route Polyline with dashed line */}
                <Polyline
                    coordinates={routeCoords}
                    strokeColor="#1e3a8a"
                    strokeWidth={4}
                    lineDashPattern={[15, 10]} // Dotted walking style
                    geodesic
                />
            </MapView>

            {/* Walk/Drive Toggle - always directly under branding container, styled like search this area button, width smaller than branding */}
            <View style={[styles.toggleContainer, { top: insets.top + 10 + 46 + 22 }]}>
                <View style={styles.toggleButton}>
                    <TouchableOpacity
                        style={[styles.toggleOption, styles.toggleOptionLeft, { backgroundColor: mode === 'walking' ? '#e0f2fe' : '#fff' }]}
                        onPress={() => setMode('walking')}
                    >
                        <FontAwesome5 name="walking" size={22} color={mode === 'walking' ? '#1e3a8a' : '#888'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleOption, styles.toggleOptionRight, { backgroundColor: mode === 'driving' ? '#e0f2fe' : '#fff' }]}
                        onPress={() => setMode('driving')}
                    >
                        <FontAwesome5 name="car" size={22} color={mode === 'driving' ? '#1e3a8a' : '#888'} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Estimated Walk Time Vertical Pill */}
            {parsedDistanceInfo[mode]?.duration && (
                <View style={styles.walkTimePillContainer} pointerEvents="none">
                    <View style={styles.walkTimePill}>
                        <FontAwesome5 name={mode === 'walking' ? 'walking' : 'car'} size={20} color="#fff" style={{ marginBottom: 2 }} />
                        <Text style={styles.walkTimePillTime}>
                            {parsedDistanceInfo[mode]?.duration}
                        </Text>
                        <Text style={styles.walkTimePillLabel}>{mode === 'walking' ? 'walk' : 'drive'}</Text>
                        {parsedDistanceInfo[mode]?.distance && (
                            <Text style={[styles.walkTimePillLabel, { fontSize: 11, opacity: 0.7 }]}>{parsedDistanceInfo[mode]?.distance}</Text>
                        )}
                    </View>
                </View>
            )}

            {/* Bottom Sheet */}
            <BottomSheet
                ref={bottomSheetRef}
                index={0}
                snapPoints={snapPoints}
                enablePanDownToClose={false}
                backgroundStyle={styles.bottomSheet}
                handleIndicatorStyle={{ backgroundColor: '#1e3a8a' }}
            >
                {/* Directions Header */}
                <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', paddingHorizontal: 20, paddingBottom: 16 }}>
                    <Text style={{ fontSize: 29, paddingVertical: 5, fontWeight: '600', color: '#1e3a8a', textAlign: 'center' }}>
                        Directions
                    </Text>
                </View>

                <BottomSheetFlatList
                    data={steps}
                    keyExtractor={(_, i) => i.toString()}
                    contentContainerStyle={styles.bottomSheetInner}
                    renderItem={({ item, index }) => (
                        <View style={styles.stepRow}>
                            <Text style={styles.stepIndex}>{index + 1}.</Text>
                            <Text style={styles.stepText}>{item.cleaned_instructions}</Text>
                        </View>
                    )}
                    ListEmptyComponent={() => <Text style={styles.emptyText}>No directions available.</Text>}
                    showsVerticalScrollIndicator={false}
                />
                <View style={{ alignItems: 'center', paddingVertical: 25, backgroundColor: 'rgba(255,255,255,0.85)' }}>
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e3a8a', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 24, marginTop: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 4 }}
                        onPress={() => {
                            openGoogleMaps(walkingURL as string);
                        }}
                    >
                        <FontAwesome5 name="map-marked-alt" size={20} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Open in Google Maps</Text>
                    </TouchableOpacity>
                </View>
            </BottomSheet>
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
        </View >
    );
}

const styles = StyleSheet.create({
    walkTimePillContainer: {
        position: 'absolute',
        bottom: 90, // above the bottom sheet/directions button
        right: 15,
        pointerEvents: 'none',
    },
    walkTimePill: {
        backgroundColor: '#1e3a8a',
        borderRadius: 18,
        paddingVertical: 10,
        paddingHorizontal: 12,
        minWidth: 38,
        minHeight: 60,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        shadowColor: '#000',
        shadowOpacity: 0.13,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 8,
        gap: 2,
    },
    walkTimePillTime: {
        color: 'white',
        fontWeight: '700',
        fontSize: 13,
        marginBottom: 0,
        textAlign: 'center',
    },
    walkTimePillLabel: {
        color: 'white',
        fontWeight: '600',
        fontSize: 12,
        marginTop: -1,
        textAlign: 'center',
        letterSpacing: 0.2,
        opacity: 0.85,
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
    toggleContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 999,
    },
    toggleButton: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOpacity: 0.10,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 6,
        minWidth: 110,
    },
    toggleOption: {
        width: 55, // Fixed width instead of percentage for better centering
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    toggleOptionLeft: {
        borderTopLeftRadius: 22,
        borderBottomLeftRadius: 22,
    },
    toggleOptionRight: {
        borderTopRightRadius: 22,
        borderBottomRightRadius: 22,
    },
});
