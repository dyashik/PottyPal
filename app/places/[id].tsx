import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Linking, FlatList, Switch, Share, Pressable, Modal, Dimensions } from 'react-native';
import { useLocalSearchParams, useNavigationContainerRef, useRouter } from 'expo-router';
import { usePlaceStore } from '@/utils/usePlaceStore';
import * as Location from 'expo-location';
const polyline = require('@mapbox/polyline');
// TEMP: Extend Place type to include 'photos' if not presentimport { BlurView } from 'expo-blur';
import { AntDesign, Feather, FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons, Octicons } from '@expo/vector-icons';
import MapView, { Callout, Marker, Polyline } from 'react-native-maps';
import getGoogleMapsApiKey from '@/config/getGoogleMapsKey';
import CustomCallout from '@/components/CustomCallout';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

function formatType(type?: string) {
    if (!type) return '';
    // Example: convert 'PUBLIC_TOILET' to 'Public Toilet'
    return type
        .toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export default function PlaceDetails() {
    const { id, travelMode } = useLocalSearchParams();
    const place = usePlaceStore((state) => state.selectedPlace);
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);
    const [mode, setMode] = useState<'walking' | 'driving'>('walking');  // toggle between walking or driving if you want
    const router = useRouter();
    const [infoVisible, setInfoVisible] = useState(false);
    const navRef = useNavigationContainerRef();
    const { width } = Dimensions.get('window');
    const markerRef = useRef<any>(null); // 👈 Add Marker ref

    const pottyPalMapStyle = [
        {
            elementType: 'geometry',
            stylers: [{ color: '#ffffff' }],
        },
        {
            elementType: 'labels.text.fill',
            stylers: [{ color: '#1e3a8a' }], // PottyPal blue
        },
        {
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#ffffff' }],
        },
        {
            featureType: 'administrative.locality',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#1e3a8a' }],
        },
        {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }], // hide random POI names
        },
        {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [{ color: '#ecfdf5' }], // soft green for parks
        },
        {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#e5e7eb' }], // light gray roads
        },
        {
            featureType: 'road',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#6b7280' }], // medium gray labels
        },
        {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [{ color: '#d1d5db' }],
        },
        {
            featureType: 'road.highway',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#374151' }],
        },
        {
            featureType: 'transit',
            stylers: [{ visibility: 'off' }],
        },
        {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#cceeff' }], // light blue water
        },
        {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#60a5fa' }], // blue water labels
        },
    ];

    const scale = width / 375; // 375 is the base width (iPhone 11)

    function normalize(size: number): number {
        return Math.round(scale * size);
    }

    useEffect(() => {
        if (markerRef.current) {
            setTimeout(() => {
                markerRef.current?.showCallout(); // 👈 Show Callout after map renders
            }, 500); // Delay slightly to ensure map and marker are ready
        }
    }, []);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Permission to access location was denied');
                return;
            }
            let location = await Location.getCurrentPositionAsync({});
            setCurrentLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
        })();
    }, []);

    if (!id || !place) {
        return (
            <View style={styles.center}>
                <Text>Loading or place not found...</Text>
            </View>
        );
    }

    useEffect(() => {
        if (currentLocation && place.location) {
            fetchRoute(currentLocation, place.location, mode);
        }
    }, [currentLocation, place.location, mode]);


    const toggleSwitch = () => {
        setMode((prev) => (prev === 'walking' ? 'driving' : 'walking'));
    };


    async function fetchRoute(origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }, mode: 'walking' | 'driving') {
        try {
            const API_KEY = getGoogleMapsApiKey(true);
            const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=${mode}&key=${API_KEY}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.routes.length) {
                const points = polyline.decode(data.routes[0].overview_polyline.points);
                interface Point {
                    0: number;
                    1: number;
                }
                interface RouteCoord {
                    latitude: number;
                    longitude: number;
                }
                const route: RouteCoord[] = (points as Point[]).map((point: Point): RouteCoord => ({
                    latitude: point[0],
                    longitude: point[1],
                }));
                setRouteCoords(route);
            } else {
                console.log("No routes found");
            }
        } catch (error) {
            console.error("Error fetching route:", error);
        }
    }

    const handleShare = async () => {
        try {
            await Share.share({
                message: place.googleMapsLinks?.placeUri ?? 'https://maps.google.com',
            });
        } catch (error) {
            console.error('Share failed:', error);
        }
    };


    function getPrimaryTypeFromFilter(filter: string): string | null {
        const groceryTypes = ['grocery_store', 'supermarket'];
        const cafeTypes = ['cafe', 'coffee_shop'];

        if ("fast_food_restaurant" === filter) {
            return 'fast_food_restaurant';
        }

        const restaurantConditions =
            filter.endsWith('_restaurant') ||
            filter.endsWith('dessert_restaurant') ||
            filter.endsWith('dessert_cafe') ||
            filter.endsWith('sandwich_shop') ||
            filter.startsWith('meal') ||
            [
                'restaurant',
                'bar',
                'bar_and_grill',
                'pub',
                'wine_bar',
                'food_court',
                'fine_dining_restaurant',
                'buffet_restaurant',
                'fast_food_restaurant',
                'diner',
                'cafeteria',
                'brunch_restaurant',
                'breakfast_restaurant',
                'barbecue_restaurant',
                'steak_house',
                'pizzeria',
                'pizza_restaurant',
                'seafood_restaurant',
                'asian_restaurant',
                'american_restaurant',
                'indian_restaurant',
                'chinese_restaurant',
                'italian_restaurant',
                'mexican_restaurant',
                'japanese_restaurant',
                'thai_restaurant',
                'korean_restaurant',
                'lebanese_restaurant',
                'mediterranean_restaurant',
                'brazilian_restaurant',
                'afghani_restaurant',
                'african_restaurant',
                'french_restaurant',
                'greek_restaurant',
                'hamburger_restaurant',
                'ramen_restaurant',
                'sushi_restaurant',
                'vegetarian_restaurant',
                'vegan_restaurant',
                'turkish_restaurant',
                'vietnamese_restaurant',
                'spanish_restaurant',
            ].includes(filter);

        if (groceryTypes.includes(filter)) return 'grocery_store';
        if (cafeTypes.includes(filter)) return 'cafe';
        if (restaurantConditions) return 'restaurant';

        return filter; // fallback to raw type if not matched
    }

    const entryInstructionsMap: Record<string, string> = {
        restaurant: "Ask the host or walk toward the back near the kitchen or hallway.",
        cafe: "Check near the back; sometimes they require a code—ask at the counter.",
        bar: "Restroom is usually in the back or down a hallway—might need to walk past the bar.",
        coffee_shop: "Ask for the bathroom code at the register or look near the seating area.",
        grocery_store: "Look near customer service or ask a staff member; often toward the back.",
        supermarket: "Usually at the back or near the employee/service area. Ask if unclear.",
        public_bathroom: "Freely accessible—just follow signs or the restroom symbol nearby.",
        convenience_store: "Restroom may be locked—ask the cashier for a key or directions.",
        fast_food_restaurant: "Restroom access often requires staff to unlock it—ask at the counter.",
    };

    const openGoogleMaps = (walkingURL: string) => {
        let url = walkingURL;
        if (!url) return;
        console.log('Mode: ' + travelMode);
        // Use the mode from state to determine travel mode
        if (travelMode === 'driving') {
            // Replace any !3eX with !3e0 for driving
            url = url.replace(/!3e\d/, '!3e0');
        } else {
            // Replace any !3eX with !3e2 for walking
            url = url.replace(/!3e\d/, '!3e2');
        }

        console.log(`Opening Google Maps with ${travelMode} directions:`, url);
        Linking.openURL(url);
    };


    const primaryType = getPrimaryTypeFromFilter(place.primaryType ?? '');
    const entryTip = primaryType ? entryInstructionsMap[primaryType] : undefined;


    return (
        <>
            {/* Top-level absolute header buttons */}
            <View style={{ position: 'absolute', top: 50, left: 0, right: 0, zIndex: 999, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 }} pointerEvents="box-none">
                <TouchableOpacity
                    onPress={() => { router.back(); }}
                    style={{ backgroundColor: 'transparent', borderRadius: 22, padding: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 }}
                >
                    <AntDesign name="back" size={28} color="#1e3a8a" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setInfoVisible(true)}
                    style={{ backgroundColor: 'transparent', borderRadius: 22, padding: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 }}
                >
                    <Feather name="info" size={26} color="#1e3a8a" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.container}>
                {/* ...existing code... */}
                <View style={styles.infoSection}>
                    <Text
                        style={styles.placeName}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                    >
                        {place.displayName?.text}{" "}
                    </Text>
                    <Text style={styles.address}>
                        🚶{place.distanceInfo?.walking?.duration} | 🚘 {place.distanceInfo?.driving?.duration}
                        {place.accessibilityOptions?.wheelchairAccessibleRestroom && " | ♿️"}
                        {['bar', 'pub'].includes((place.primaryType || '').toLowerCase()) && (
                            <>
                                {' | '}
                                <Text style={{ color: '#d90429', fontWeight: 'bold', fontSize: styles.address.fontSize * 1.15 }}>21+</Text>
                            </>
                        )}
                    </Text>
                    <Text style={styles.typeText}>{formatType(place.primaryType)}</Text>

                </View>

                {/* Quick Action Buttons */}
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => {
                            openGoogleMaps(place.googleMapsLinks?.directionsUri!);
                        }}
                    >
                        <View style={styles.iconTextRow}>
                            <FontAwesome5 name="directions" size={15} color="white" />
                            <Text style={styles.actionText}>Google Maps</Text>
                        </View>
                    </TouchableOpacity>
                    {place.googleMapsLinks?.directionsUri && (
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => Linking.openURL(place.googleMapsLinks?.placeUri!)}
                        >
                            <View style={styles.iconTextRow}>
                                <MaterialIcons name="rate-review" size={16} color="white" />
                                <Text style={styles.actionText}>Reviews</Text>
                            </View>
                        </TouchableOpacity>

                    )}
                    {place.googleMapsLinks?.placeUri && (
                        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                            <Text style={styles.actionText}><Octicons name="share" size={15} color="white" />  Share</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.metaRow}>
                    <Text style={styles.meta}>
                        🕒 {place.currentOpeningHours?.openNow ? 'Open Now' : 'Closed'}
                    </Text>
                    <Text style={styles.meta}>⭐️ {place.rating ?? 0} / 5</Text>
                    <Text style={styles.meta}>📍 {place.distanceInfo?.walking?.distance ?? 'N/A'}</Text>
                </View>

                {currentLocation && place.location && (

                    <View style={{ margin: 20, height: 200, borderRadius: 20, marginBottom: 15, marginTop: 15, overflow: 'hidden' }}>

                        <MapView
                            style={{ flex: 1 }}
                            initialRegion={{
                                latitude: (currentLocation.latitude + place.location.latitude) / 2,
                                longitude: (currentLocation.longitude + place.location.longitude) / 2,
                                latitudeDelta: Math.abs(currentLocation.latitude - place.location.latitude) * 2.5 || 0.05,
                                longitudeDelta: Math.abs(currentLocation.longitude - place.location.longitude) * 2.5 || 0.05,
                            }}
                            showsUserLocation={true}
                            loadingEnabled={true}
                            customMapStyle={pottyPalMapStyle}
                            provider='google'
                        >
                            <Marker ref={markerRef} coordinate={place.location} calloutAnchor={{ x: 0.5, y: -0.2 }}>
                                <CustomCallout place={place} />
                            </Marker>


                            <Polyline
                                coordinates={routeCoords}
                                strokeColor="#1e3a8a"
                                strokeWidth={4}
                                lineDashPattern={[15, 10]} // ← Dotted effect (dash length, space length)
                                geodesic={true}
                            />
                        </MapView>
                        <TouchableOpacity style={styles.fullscreenBtn} onPress={() => {
                            router.push({
                                pathname: '/places/fullScreenMap',
                                params: {
                                    id: id,
                                    lat: place.location.latitude.toString(),
                                    lng: place.location.longitude.toString(),
                                    name: place.displayName?.text ?? '',
                                    type: place.primaryType ?? '',
                                    walkingURL: place.googleMapsLinks?.directionsUri,
                                    walkingTime: place.distanceInfo?.walking?.duration ?? '',
                                    travelMode: travelMode,
                                    distanceInfo: JSON.stringify(place.distanceInfo),
                                }
                            });
                        }}>
                            <MaterialCommunityIcons name="arrow-expand" size={22} color="#1e3a8a" />
                        </TouchableOpacity>


                    </View>
                )}
                {/* About */}
                <View style={styles.aboutCard}>
                    <Text style={styles.aboutTitle}>{place.displayName?.text} Hours</Text>
                    {place.currentOpeningHours?.weekdayDescriptions ? (
                        // For other places, show regular hours
                        place.currentOpeningHours.weekdayDescriptions.map((desc, idx) => {
                            // Split at first colon to separate day and hours
                            const [day, ...rest] = desc.split(':');
                            const hours = rest.join(':').trim();
                            return (
                                <Text key={idx} style={styles.aboutText}>
                                    <Text style={{ fontWeight: 'bold' }}>{day}:</Text> {hours}
                                </Text>
                            );
                        })
                    ) : (
                        <Text style={styles.aboutText}>No opening hours available.</Text>
                    )}
                </View>

                <View style={{ marginBottom: 20 }}>
                    <BannerAd
                        unitId={TestIds.BANNER}
                        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                        requestOptions={{
                            requestNonPersonalizedAdsOnly: false,
                        }}
                    />
                </View>

                {/* About Section */}
            </ScrollView>
            <Modal
                animationType="fade"
                transparent={true}
                visible={infoVisible}
                onRequestClose={() => setInfoVisible(false)}
            >
                <Pressable
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                    onPress={() => setInfoVisible(false)}
                >
                    <View
                        style={{
                            backgroundColor: '#ffffff',        // pure white, crisp
                            paddingVertical: 28,
                            paddingHorizontal: 24,
                            borderRadius: 24,                  // smoother round edges, more modern
                            maxWidth: 340,
                            width: '90%',
                            alignSelf: 'center',
                            shadowColor: '#1e3a8a',           // your signature dark blue shadow for brand consistency
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.15,
                            shadowRadius: 12,
                            elevation: 8,
                            borderWidth: 1,
                            borderColor: '#d1d5db',           // subtle light gray border for clean separation
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <MaterialCommunityIcons
                                name="toilet"
                                size={30}
                                color="#1e3a8a"
                                style={{ marginRight: 14 }}
                            />
                            <Text
                                style={{
                                    fontSize: 22,
                                    fontWeight: '800',
                                    color: '#1e3a8a',
                                    letterSpacing: 0.5,
                                }}
                            >
                                Bathroom Info
                            </Text>
                        </View>

                        {entryTip && (
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                <MaterialCommunityIcons
                                    name="door-open"
                                    size={26}
                                    color="#1e3a8a"
                                    style={{ marginRight: 14, marginTop: 3 }}
                                />
                                <Text
                                    style={{
                                        fontSize: 16,
                                        color: '#4b5563', // darker gray text for readability
                                        flex: 1,
                                        lineHeight: 24,
                                    }}
                                >
                                    <Text style={{ fontWeight: '700' }}>How to enter: </Text>
                                    {entryTip}
                                </Text>
                            </View>
                        )}
                    </View>

                </Pressable>

            </Modal>



        </>
    );
}

// Move scale and normalize outside the component so they are available for styles
const { width } = Dimensions.get('window');
const scale = width / 375; // 375 is the base width (iPhone 11)
function normalize(size: number) {
    return Math.round(scale * size);
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 90,
        backgroundColor: '#f0f4ff',
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerImage: {
        width: '100%',
        height: 220,
    },
    infoSection: {
        paddingHorizontal: 24,
        paddingTop: 6,
        paddingBottom: 10,
        alignSelf: 'center',
    },
    placeName: {
        fontSize: normalize(34),
        fontWeight: 'bold',
        color: '#1e3a8a',
        alignSelf: 'center',
        textAlign: 'center',
        marginBottom: normalize(8),
    },
    address: {
        fontSize: normalize(18),
        marginVertical: normalize(6),
        color: 'black',
        textAlign: 'center',
    },
    typeText: {
        fontSize: normalize(18),
        color: '#4b5563',
        textAlign: 'center',
        marginVertical: 8,
    },
    actionBtn: {
        backgroundColor: '#1e3a8a',
        paddingVertical: 12,
        paddingHorizontal: 16, // enough space around icon/text
        marginHorizontal: 4,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        minHeight: 44, // ensure minimum height for touch targets
        maxHeight: 44,
        alignSelf: 'flex-start', // so it only grows as needed

    },
    actionText: {
        fontSize: normalize(14),
        color: '#fff',
        fontWeight: '600',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'nowrap', // make sure they don’t wrap
        columnGap: 3, // 🔥 small standard spacing
        paddingHorizontal: normalize(16), // add some horizontal padding
        marginBottom: normalize(12), // space below the buttons
    },
    iconTextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    calloutContainer: {
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 6,
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 0,
        borderColor: 'transparent',
    },
    title: {
        fontWeight: '700',
        fontSize: 18,
        color: '#1e3a8a',
        marginBottom: 4,
        textAlign: 'left',
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 20,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#e5e7eb',
        marginHorizontal: 20,
    },
    meta: {
        fontSize: 17,
        color: '#374151',
        fontWeight: '500',
    },
    actionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },

    aboutCard: {
        marginHorizontal: 20,
        padding: 18,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 12,
    },
    aboutTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e3a8a',
        marginBottom: 10,
        alignSelf: 'center',
    },
    aboutText: {
        fontSize: 16,
        color: '#333',
        lineHeight: 28,
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        alignSelf: 'center',
    },
    emoji: {
        fontSize: 28,
        marginHorizontal: 14,
    },
    fullscreenBtn: {
        position: 'absolute',
        bottom: 14,
        right: 16,
        backgroundColor: 'white',
        borderRadius: 28,
        padding: 12,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 3,
        elevation: 5,
        zIndex: 10,
    },
    fullscreenBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
});
