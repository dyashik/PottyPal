import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import MapView, { Callout, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import {
    StyleSheet,
    TouchableOpacity,
    View,
    Text,
    Linking,
    Dimensions,
    useColorScheme,
    Platform,
    InteractionManager,
    Modal,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { DUMMY_PLACE, FetchNearbyPlacesResponse, Place } from '@/utils/api';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { usePlaceStore } from '@/utils/usePlaceStore';
import { Picker } from '@react-native-picker/picker';
import SortDropdown from '@/components/SortDropDown';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import getGoogleMapsKey from '@/config/getGoogleMapsKey';
import { Portal, PortalProvider } from '@gorhom/portal';
import { Image } from 'expo-image';
import BrandingContainer from '@/components/BrandingContainer';
import CustomCallout from '@/components/CustomCallout';
import LoadingIndicator from '@/components/LoadingIndicator';


const { width } = Dimensions.get('window');

export default function App() {
    const mapRef = useRef<MapView>(null);
    const checkedAreasRef = useRef<{ latitude: number, longitude: number, radius: number }[]>([]);
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [region, setRegion] = useState<Region | null>(null);
    const [isRegionChanged, setIsRegionChanged] = useState(false);
    const [places, setPlaces] = useState<Place[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastFetchedRef = useRef<{ center: { latitude: number; longitude: number }; radius: number } | null>(null);
    const initialRegionTimeoutRef = useRef<number | NodeJS.Timeout | null>(null);
    const ignoreRegionChangeRef = useRef(true); const [filters, setFilters] = useState({
        restaurant: true,
        cafe: true,
        grocery_store: true,
        public_bathroom: true,
    });
    const [openNowOnly, setOpenNowOnly] = useState(false);
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [showNoBathroomsAlert, setShowNoBathroomsAlert] = useState(true);
    const [sortType, setSortType] = useState<'distance' | 'popularity'>('distance');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingTimeout, setLoadingTimeout] = useState<number | null>(null);
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
            stylers: [{ visibility: 'on' }], // Hide all POI labels
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

    useEffect(() => {
        let sub: Location.LocationSubscription;

        const startWatchingLocation = async () => {
            sub = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Highest,
                    distanceInterval: 20, // in meters
                    timeInterval: 5000,   // optional: every 5 sec
                },
                (loc) => {
                    maybeUpdateDistances(loc.coords);
                }
            );
        };

        startWatchingLocation();

        return () => {
            sub?.remove();
        };
    }, [places]);

    const lastKnownUserCoordsRef = useRef<Location.LocationObjectCoords | null>(null);

    const maybeUpdateDistances = async (newCoords: Location.LocationObjectCoords) => {
        if (!lastKnownUserCoordsRef.current) {
            lastKnownUserCoordsRef.current = newCoords;
            return;
        }

        const { latitude: prevLat, longitude: prevLng } = lastKnownUserCoordsRef.current;
        const { latitude, longitude } = newCoords;

        const R = 6371000; // Earth radius in meters
        const dLat = (latitude - prevLat) * Math.PI / 180;
        const dLng = (longitude - prevLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(prevLat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceMoved = R * c;

        if (distanceMoved > 160) { // Only if user moves more than 50 meters
            lastKnownUserCoordsRef.current = newCoords;

            const updated = await Promise.all(
                places.map(async place => {
                    try {
                        const distanceInfo = await fetchWalkingTimeAndDistance(place);
                        return { ...place, distanceInfo };
                    } catch (err) {
                        console.log('Refetch distance failed for:', place.displayName?.text);
                        return place;
                    }
                })
            );

            setPlaces(updated.filter(
                (p): p is Place =>
                    typeof p === 'object' &&
                    p !== null &&
                    'distanceInfo' in p &&
                    typeof p.distanceInfo === 'object' &&
                    'walking' in p.distanceInfo &&
                    'driving' in p.distanceInfo
            ));
        }
    };





    function mapToFilterCategory(type: string | undefined): 'restaurant' | 'cafe' | 'grocery_store' | 'public_bathroom' | null {
        if (!type) return null;

        // Lowercase just in case
        const filter = type.toLowerCase();

        // Grocery-related
        const groceryTypes = ['grocery_store', 'supermarket', 'convenience_store'];

        // Cafe-related
        const cafeTypes = ['cafe', 'coffee_shop', 'cat_cafe', 'dog_cafe', 'tea_house', 'bagel_shop', 'juice_shop', 'candy_store', 'chocolate_shop', 'dessert_shop', 'juice_shop', 'bakery', 'ice_cream_shop'];

        // Restaurant-related catch-all: ends with _restaurant OR specific meal places or food courts
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
                'dessert_restaurant',
                'buffet_restaurant'
            ].includes(filter);

        const publicBathroomTypes = ['public_bathroom', 'restroom', 'toilet', 'washroom', 'bathroom'];

        if (groceryTypes.includes(filter)) return 'grocery_store';
        if (cafeTypes.includes(filter)) return 'cafe';
        if (restaurantConditions) return 'restaurant';
        if (publicBathroomTypes.includes(filter)) return 'public_bathroom';

        return null;
    }

    const filteredPlaces = places.filter(place => {
        const category = mapToFilterCategory(place.primaryType);
        if (!category) return false;
        return filters[category] && (!openNowOnly || place.currentOpeningHours?.openNow);
    });

    useEffect(() => {
        if (filteredPlaces == null) {
            return;
        }

        if (filteredPlaces.length === 0 && !isLoading) {
            setIsLoading(false);
            setShowNoBathroomsAlert(true);
        }

        if (filteredPlaces.length === 0) {
            setIsLoading(false);
            setShowNoBathroomsAlert(true);
        }

        if (filteredPlaces != null && filteredPlaces.length > 0) {
            setShowNoBathroomsAlert(false);
            setIsLoading(false);
        }
        setShowNoBathroomsAlert(false);
    }, [filteredPlaces.length]);

    const snapPoints = useMemo(() => {    // Use immediate timeout to break out of potential batching
        return selectedPlace ? ['31%'] : ['13%', '50%'];
    }, [selectedPlace]);



    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                router.push('/locationDenied');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;

            const userRegion: Region = {
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };

            setRegion(userRegion);
            mapRef.current?.animateToRegion(userRegion, 1000);

            const latRad = userRegion.latitude * (Math.PI / 180);
            const metersPerDegreeLongitude = Math.cos(latRad) * (Math.PI / 180) * 6371000;
            const widthInMeters = userRegion.longitudeDelta * metersPerDegreeLongitude;
            const radius = widthInMeters / 1.75;

            setShowNoBathroomsAlert(false);
            const results = await fetchNearbyPlaces(latitude, longitude, radius);
            setShowNoBathroomsAlert(false);
            setPlaces(results);

            if (mapRef.current && results.length > 0) {
                const coordinates = results.map(place => ({
                    latitude: place.location.latitude,
                    longitude: place.location.longitude,
                }));
                coordinates.push({ latitude, longitude }); // include user
                mapRef.current.fitToCoordinates(coordinates, {
                    edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
                    animated: true,
                });

                ignoreRegionChangeRef.current = true;
                if (initialRegionTimeoutRef.current) clearTimeout(initialRegionTimeoutRef.current);
                initialRegionTimeoutRef.current = setTimeout(() => {
                    ignoreRegionChangeRef.current = false;
                }, 3000);

                setShowNoBathroomsAlert(false);

            }
        })();

        return () => {
            // Proper cleanup
            if (initialRegionTimeoutRef.current) clearTimeout(initialRegionTimeoutRef.current);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (loadingTimeout) clearTimeout(loadingTimeout);
        };
    }, []);

    const parseDistanceToMiles = (distanceStr: string): number => {
        if (!distanceStr) return NaN;

        const [valueStr, unit] = distanceStr.split(' ');

        const value = parseFloat(valueStr);
        if (isNaN(value)) return NaN;

        if (unit.startsWith('ft')) {
            return value / 5280;
        } else if (unit.startsWith('mi')) {
            return value;
        }

        return value;
    };

    // Parse time like "12 mins" or "1 hour 5 mins" into total minutes (number)
    const parseDurationToMinutes = (durationStr: string): number => {
        if (!durationStr) return NaN;

        const lower = durationStr.toLowerCase();
        let totalMinutes = 0;

        // Match hours and minutes (both optional)
        const hourMatch = lower.match(/(\d+)\s*hour/);
        const minMatch = lower.match(/(\d+)\s*min/);

        if (hourMatch) {
            totalMinutes += parseInt(hourMatch[1], 10) * 60;
        }
        if (minMatch) {
            totalMinutes += parseInt(minMatch[1], 10);
        }

        // If no match, try just number
        if (!hourMatch && !minMatch) {
            const num = parseInt(lower, 10);
            if (!isNaN(num)) return num;
            return NaN;
        }

        return totalMinutes;
    };

    const sortedPlaces = filteredPlaces.slice().sort((a, b) => {
        if (sortType === 'popularity') {
            const ratingA = a.rating ?? 0;
            const ratingB = b.rating ?? 0;
            return ratingB - ratingA; // High to low
        } else {
            const distA = a.distanceInfo?.walking?.distance ?? '';
            const distB = b.distanceInfo?.walking?.distance ?? '';
            const durA = a.distanceInfo?.walking?.duration ?? '';
            const durB = b.distanceInfo?.walking?.duration ?? '';

            const milesA = parseDistanceToMiles(distA);
            const milesB = parseDistanceToMiles(distB);

            if (isNaN(milesA)) return 1;
            if (isNaN(milesB)) return -1;

            if (milesA !== milesB) {
                return milesA - milesB;
            }

            const minA = parseDurationToMinutes(durA);
            const minB = parseDurationToMinutes(durB);

            if (isNaN(minA)) return 1;
            if (isNaN(minB)) return -1;

            return minA - minB;
        }
    });


    const mergeUniquePlaces = (oldPlaces: Place[], newPlaces: Place[]): Place[] => {
        const placeMap = new Map<string, Place>();
        oldPlaces.forEach(place => {
            if (place.googleMapsUri) placeMap.set(place.googleMapsUri, place);
        });
        newPlaces.forEach(place => {
            if (place.googleMapsUri && !placeMap.has(place.googleMapsUri)) {
                placeMap.set(place.googleMapsUri, place);
            }
        });
        return Array.from(placeMap.values());
    };

    const shouldFetchNewData = (region: Region) => {
        const latRad = region.latitude * (Math.PI / 180);
        const metersPerDegreeLongitude = Math.cos(latRad) * (Math.PI / 180) * 6371000;
        const widthInMeters = region.longitudeDelta * metersPerDegreeLongitude;
        const radius = widthInMeters / 1.75;

        const last = lastFetchedRef.current;
        if (!last) return true;

        const dx = region.latitude - last.center.latitude;
        const dy = region.longitude - last.center.longitude;
        const distanceMoved = Math.sqrt(dx * dx + dy * dy) * 111139; // rough meters per degree

        const radiusChanged = Math.abs(radius - last.radius) > (last.radius * 0.2); // 25% zoom diff
        const movedFarEnough = distanceMoved > (last.radius * 0.3); // moved >50% radius

        return radiusChanged || movedFarEnough;
    };

    const fetchNearbyPlaces = async (
        latitude: number,
        longitude: number,
        radius: number
    ): Promise<Place[]> => {
        // Only show loading indicator if fetch takes more than 500ms
        const loadingTimer = setTimeout(() => {
            setIsLoading(true);
        }, 500);
        setLoadingTimeout(loadingTimer);

        try {
            const apiKey = getGoogleMapsKey(true);
            if (!apiKey) throw new Error("Google API key is missing");

            const body = {
                includedTypes: [
                    "fast_food_restaurant",
                    "restaurant",
                    "cafe",
                    "bar",
                    "coffee_shop",
                    "grocery_store",
                    "supermarket",
                    "public_bathroom",
                    "convenience_store",
                ],
                maxResultCount: 20,
                rankPreference: "DISTANCE",
                locationRestriction: {
                    circle: {
                        center: { latitude, longitude },
                        radius,
                    },
                },
            };

            const response = await fetch(
                "https://places.googleapis.com/v1/places:searchNearby",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Goog-Api-Key": apiKey as string,
                        "X-Goog-FieldMask":
                            "places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.restroom,places.accessibilityOptions,places.primaryType,places.googleMapsUri,places.googleMapsLinks.directionsUri,places.googleMapsLinks.placeUri,places.currentOpeningHours.openNow,places.currentOpeningHours.weekdayDescriptions",
                    } as Record<string, string>,
                    body: JSON.stringify(body),
                }
            );

            const data: FetchNearbyPlacesResponse = await response.json();

            if (!data.places) return [];

            // Enhance each place with distance info
            const updatedPlaces = await Promise.all(
                data.places.map(async (place) => {
                    if (!place.location) return place;

                    try {
                        const distanceInfo = await fetchWalkingTimeAndDistance(place);
                        // Ensure distanceInfo has both walking and driving keys
                        if (
                            distanceInfo &&
                            typeof distanceInfo === 'object' &&
                            'walking' in distanceInfo &&
                            'driving' in distanceInfo
                        ) {
                            return {
                                ...place,
                                distanceInfo,
                            } as Place;
                        } else {
                            return place;
                        }
                    } catch (err) {
                        console.warn("Error fetching distance for place:", place.displayName?.text);
                        return place; // fallback to original if fetch fails
                    }
                })
            );

            // Only return those with restrooms and correct type
            return updatedPlaces.filter(
                (place): place is Place =>
                (
                    ((place as Place)?.restroom === true ||
                        (place as Place)?.primaryType === 'public_bathroom')
                )
            );
        } catch (error) {
            console.error("Error fetching places:", error);
            return [];
        } finally {
            // Clear timeout and hide loading indicator
            if (loadingTimeout) clearTimeout(loadingTimeout);
            setIsLoading(false);
        }
    };


    const fetchWalkingTimeAndDistance = async (place: Place) => {
        const apiKey = getGoogleMapsKey(true);
        if (!apiKey) throw new Error("Google API key is missing");

        const userLocation = await Location.getCurrentPositionAsync({});
        const { latitude: userLat, longitude: userLng } = userLocation.coords;

        const destinationLat = place.location.latitude;
        const destinationLng = place.location.longitude;

        const origins = `${userLat},${userLng}`;
        const destinations = `${destinationLat},${destinationLng}`;
        const baseUrl = "https://maps.googleapis.com/maps/api/distancematrix/json";

        const modes = ["walking", "driving"];

        const results: Record<string, { duration: string; distance: string }> = {};

        for (const mode of modes) {
            const url = `${baseUrl}?origins=${origins}&destinations=${destinations}&mode=${mode}&units=imperial&key=${apiKey}`;

            const response = await fetch(url);
            const data = await response.json();

            if (
                data.status === "OK" &&
                data.rows.length > 0 &&
                data.rows[0].elements.length > 0 &&
                data.rows[0].elements[0].status === "OK"
            ) {
                const element = data.rows[0].elements[0];
                results[mode] = {
                    duration: element.duration.text,
                    distance: element.distance.text,
                };
            } else {
                console.warn(`Distance Matrix error for mode: ${mode}`, data);
                results[mode] = { duration: "Unavailable", distance: "Unavailable" };
            }
        }

        return results;
    };



    const focusMap = async () => {
        let location = await Location.getCurrentPositionAsync({});
        const focusRegion = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
        mapRef.current?.animateToRegion(focusRegion, 1000);
    };

    const onRegionChange = (region: Region) => {
        setRegion(region);
        if (!ignoreRegionChangeRef.current) {
            setIsRegionChanged(true);
        }
    };

    const lastRequestIdRef = useRef<number>(0);

    const [debugInfo, setDebugInfo] = useState<string>('No debug info yet');

    const searchNewBathroom = () => {
        if (!region) {
            setIsLoading(false);
            return;
        }

        // Store region at the time of function call
        const currentRegion = { ...region };

        // Always clear the timeout first
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }

        // Create a unique request ID
        const requestId = Date.now();
        lastRequestIdRef.current = requestId;

        // Use setTimeout directly instead of NodeJS.Timeout
        debounceRef.current = setTimeout(() => {
            InteractionManager.runAfterInteractions(() => {

                // Show loading after a delay if the fetch is still ongoing
                const loadingTimer = setTimeout(() => {
                    setIsLoading(true);
                }, 500);
                setLoadingTimeout(loadingTimer);

                // 👇 All your logic stays the same here
                if (lastRequestIdRef.current !== requestId) {
                    return;
                }

                const shouldFetch = shouldFetchNewData(currentRegion);
                if (!shouldFetch) {
                    setIsLoading(false);
                    setIsRegionChanged(false);
                    return;
                }

                const latRad = currentRegion.latitude * (Math.PI / 180);
                const metersPerDegreeLongitude = Math.cos(latRad) * (Math.PI / 180) * 6371000;
                const widthInMeters = currentRegion.longitudeDelta * metersPerDegreeLongitude;
                const radius = widthInMeters / 1.75;

                if (isRegionCovered(currentRegion.latitude, currentRegion.longitude, radius)) {
                    setIsLoading(false);
                    setIsRegionChanged(false);
                    return;
                }

                fetchNearbyPlaces(currentRegion.latitude, currentRegion.longitude, radius)
                    .then(newPlaces => {
                        setIsRegionChanged(false);

                        setPlaces(oldPlaces => {
                            const merged = mergeUniquePlaces(oldPlaces, newPlaces);
                            // If no new bathrooms were added, show alert
                            if (merged.length === oldPlaces.length) {

                                setShowNoBathroomsAlert(true);
                                setTimeout(() => {
                                    setIsLoading(false);
                                    setShowNoBathroomsAlert(false);
                                }, 3000); // Hide after 2.5s

                            }   
                            return merged;
                        });

                        lastFetchedRef.current = {
                            center: { latitude: currentRegion.latitude, longitude: currentRegion.longitude },
                            radius,
                        };
                        checkedAreasRef.current.push({
                            latitude: currentRegion.latitude,
                            longitude: currentRegion.longitude,
                            radius,
                        });
                    })
                    .catch(err => {
                        console.error("Error fetching places:", err);
                        setIsRegionChanged(false);
                        setIsLoading(false);
                    })
                    .finally(() => {
                        setIsLoading(false);
                        if (loadingTimeout) clearTimeout(loadingTimeout);
                    });
            });
        }, 700);
    }

    const isRegionCovered = (lat: number, lng: number, radius: number): boolean => {
        return checkedAreasRef.current.some(area => {
            const dx = lat - area.latitude;
            const dy = lng - area.longitude;
            const distance = Math.sqrt(dx * dx + dy * dy) * 111320; // meters

            // Check if the new region is fully within the existing area (+ optional small margin)
            return area.radius >= distance + radius * 0.9; // 90% just to be safe
        });
    };



    // Marker press: select the place and snap bottom sheet to 50%
    const onMarkerPress = (place: Place) => {

        // Use immediate timeout to break out of potential batching
        setTimeout(() => {
            setSelectedPlace(place);
        }, 0);

        bottomSheetRef.current?.snapToIndex(0);


        // Zoom and center map on marker location
        if (place.location) {
            mapRef.current?.animateToRegion({
                latitude: place.location.latitude,
                longitude: place.location.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            }, 500);
        }

        setIsRegionChanged(false);
    };

    // Close bottom sheet and deselect place
    const closeDetails = () => {
        setSelectedPlace(null);
        bottomSheetRef.current?.snapToIndex(0);
    };


    // Open Google Maps walking directions for place
    const openGoogleMaps = (place: Place) => {
        let url = place.googleMapsLinks?.directionsUri;
        if (!url) return;

        // Replace any !3eX with !3e2 for walking
        url = url.replace(/!3e\d/, '!3e2');

        console.log('Opening Google Maps with walking directions:', url);
        Linking.openURL(url);
    };

    const openMap = (item: Place) => {
        router.push({
            pathname: '/places/fullScreenMap', params: {
                lat: item.location.latitude,
                lng: item.location.longitude,
                name: item.displayName?.text || 'Unnamed Place',
                type: item.primaryType || 'Unknown',
                walkingURL: item.googleMapsLinks?.directionsUri || '',
            }
        });
        usePlaceStore.getState().setSelectedPlace(item);
    };

    const handleInfoButtonPress = (place: Place, id: string) => {
        usePlaceStore.getState().setSelectedPlace(place);

        // Short delay to ensure store is updated before navigating
        setTimeout(() => {
            router.push({ pathname: '/places/[id]', params: { id } });
        }, 50);
    };



    // Render each place in bottom sheet list
    const renderPlaceItem = ({ item }: { item: Place }) => {

        return (
            <View style={styles.placeItemContainer}>
                {/* Left: Info */}
                <TouchableOpacity onPress={() => onMarkerPress(item)} style={styles.placeInfoContainer}>
                    <Text style={styles.placeName} numberOfLines={1}>
                        {item.displayName?.text ?? 'Unnamed Place'}
                    </Text>

                    {item.rating != null && (
                        <Text style={styles.placeRating}>
                            ⭐ {item.rating.toFixed(1)} ({item.userRatingCount ?? 0} reviews)
                        </Text>
                    )}

                    <Text style={styles.distanceInfo}>
                        {item.distanceInfo?.walking
                            ? `🚶 ${item.distanceInfo.walking.duration} (${item.distanceInfo.walking.distance})`
                            : 'Distance unavailable'}
                    </Text>

                    <Text
                        style={[
                            styles.placeOpenStatus,
                            { color: item.primaryType === 'public_bathroom' || item.currentOpeningHours?.openNow ? '#059669' : '#dc2626' },
                        ]}
                    >
                        {item.currentOpeningHours?.openNow ? 'Open Now' : 'Closed'}
                    </Text>
                </TouchableOpacity>

                {/* Right: Individual Rounded Buttons with Spacing */}
                <View style={styles.sideButtonsContainer}>
                    <TouchableOpacity
                        style={[styles.sideButton, styles.infoSideButton]}
                        onPress={() => handleInfoButtonPress(item, item.googleMapsUri || Math.random().toString())}
                    >
                        <MaterialCommunityIcons name="information-outline" size={24} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.sideButton, styles.goSideButton]}
                        onPress={() => openMap(item)}
                    >
                        <FontAwesome5 name="directions" size={27} color="#1e3a8a" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };











    const toggleFilter = (filterName: 'restaurant' | 'cafe' | 'grocery_store' | 'public_bathroom') => {
        setFilters(prevFilters => {
            const isOnlyThisFilterActive =
                prevFilters[filterName] &&
                Object.entries(prevFilters).filter(([key, val]) => val).length === 1;

            let newFilters;
            if (isOnlyThisFilterActive) {
                newFilters = {
                    restaurant: true,
                    cafe: true,
                    grocery_store: true,
                    public_bathroom: true,
                };
            } else {
                newFilters = {
                    restaurant: false,
                    cafe: false,
                    grocery_store: false,
                    public_bathroom: false,
                    [filterName]: true,
                };
            }

            // Check if the new filter selection results in zero bathrooms
            const categoryPlaces = places.filter(place => {
                const category = mapToFilterCategory(place.primaryType);
                if (!category) return false;
                return newFilters[category] && (!openNowOnly || place.currentOpeningHours?.openNow);
            });

            if (categoryPlaces.length === 0) {
                setShowNoBathroomsAlert(true);
            }

            return newFilters;
        });
    };




    return (
        <PortalProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={{ flex: 1 }}>
                    {/* 🗺️ The Map */}
                    {region && (
                        <MapView
                            style={styles.map}
                            provider={PROVIDER_GOOGLE}
                            initialRegion={region}
                            showsUserLocation
                            onRegionChangeComplete={onRegionChange}
                            customMapStyle={pottyPalMapStyle}
                            ref={mapRef}
                            key={`map-${filteredPlaces.length}`} // 👈 force re-init
                            onPress={() => closeDetails()}
                        >
                            {filteredPlaces.map((place, index) => (
                                <Marker
                                    key={place.googleMapsUri || `marker-${index}`}
                                    coordinate={{
                                        latitude: place.location.latitude,
                                        longitude: place.location.longitude,
                                    }}
                                    onPress={() => {
                                        onMarkerPress(place);
                                    }}
                                    tracksViewChanges={false}
                                    calloutAnchor={{ x: 0.5, y: -0.2 }}
                                >
                                    <CustomCallout
                                        place={place}
                                    />
                                </Marker>
                            ))}
                        </MapView>
                    )}
                    {/* 🧻 Branding - moved OUT of MapView */}
                    <BrandingContainer />


                    {/* 🔍 Search This Area - moved OUT of MapView */}
                    {isRegionChanged && (
                        <Animated.View
                            key="search-area"
                            style={[
                                styles.searchThisAreaContainer,
                                { top: insets.top + 80, position: 'absolute' }
                            ]}
                        >
                            <TouchableOpacity
                                style={styles.searchThisAreaButton}
                                onPress={() => {
                                    searchNewBathroom();
                                    setIsRegionChanged(false);
                                }}
                            >
                                <Text style={styles.searchThisAreaText}>Search This Area</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* 🎯 GPS Button */}
                    <View style={[styles.gpsButtonContainer, { position: 'absolute' }]}>
                        <TouchableOpacity onPress={focusMap} style={[styles.filterButton, styles.filterButtonInActive]}>
                            <MaterialCommunityIcons name="crosshairs-gps" size={24} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* 🔘 Filter Buttons */}
                    <View style={[styles.filterContainer, { position: 'absolute' }]}>
                        {/* <TouchableOpacity
                            onPress={() => setFilters({ restaurant: true, cafe: true, grocery_store: true })}
                            style={[
                                styles.filterButton,
                                Object.values(filters).every(v => v) && styles.filterButtonInActive,
                            ]}
                        >
                            <MaterialCommunityIcons name="select-all" size={24} color={Object.values(filters).every(v => v) ? 'white' : '#333'} />
                        </TouchableOpacity> */}
                        <TouchableOpacity
                            onPress={() => toggleFilter('restaurant')}
                            style={[styles.filterButton, filters.restaurant && styles.filterButtonInActive]}
                        >
                            <MaterialCommunityIcons name="silverware-fork-knife" size={24} color={filters.restaurant ? 'white' : '#333'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => toggleFilter('cafe')}
                            style={[styles.filterButton, filters.cafe && styles.filterButtonInActive]}
                        >
                            <MaterialCommunityIcons name="coffee" size={24} color={filters.cafe ? 'white' : '#333'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => toggleFilter('grocery_store')}
                            style={[styles.filterButton, filters.grocery_store && styles.filterButtonInActive]}
                        >
                            <MaterialCommunityIcons name="cart" size={24} color={filters.grocery_store ? 'white' : '#333'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => toggleFilter('public_bathroom')}
                            style={[styles.filterButton, filters.public_bathroom && styles.filterButtonInActive]}
                        >
                            <FontAwesome5 name="toilet" size={24} color={filters.public_bathroom ? 'white' : '#333'} />
                        </TouchableOpacity>
                    </View>


                    <BottomSheet
                        ref={bottomSheetRef}
                        index={0}
                        snapPoints={snapPoints}
                        enablePanDownToClose={true}
                        onClose={closeDetails}
                        style={[styles.bottomSheet]}
                        backgroundComponent={() => <View style={{ backgroundColor: 'transparent' }} />}
                    >
                        <View style={styles.bottomSheetInner}>
                            {!selectedPlace && (
                                <View style={{ paddingHorizontal: 20, paddingVertical: 5, paddingTop: 11, paddingBottom: 16 }}>
                                    <Text style={{ fontSize: 29, paddingVertical: 15, fontWeight: '600', color: '#1e3a8a', textAlign: 'center' }}>
                                        {filteredPlaces.length}{" "}
                                        {(() => {
                                            const activeFilters = Object.entries(filters).filter(([_, v]) => v).map(([k]) => k);
                                            if (activeFilters.length === 4) return "Bathroom" + (filteredPlaces.length === 1 ? "" : "s");
                                            if (activeFilters.length === 1) {
                                                switch (activeFilters[0]) {
                                                    case "restaurant": return "Restaurant" + (filteredPlaces.length === 1 ? "" : "s");
                                                    case "cafe": return "Cafe" + (filteredPlaces.length === 1 ? "" : "s");
                                                    case "grocery_store": return "Grocery Store" + (filteredPlaces.length === 1 ? "" : "s");
                                                    case "public_bathroom": return "Public Bathroom" + (filteredPlaces.length === 1 ? "" : "s");
                                                    default: return "Bathroom" + (filteredPlaces.length === 1 ? "" : "s");
                                                }
                                            }

                                            if(filteredPlaces.length === 0) {
                                                setIsLoading(false);
                                                setShowNoBathroomsAlert(true);
                                            }
                                            // Multiple selected, but not all
                                            return "Bathroom" + (filteredPlaces.length === 1 ? "" : "s");
                                        })()} Found
                                    </Text>
                                </View>
                            )}

                            {selectedPlace ? (
                                <View style={styles.detailsContainer}>
                                    <View style={styles.titleRow}>
                                        <Text
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.7}
                                            style={[styles.placeName, { flex: 1, fontSize: 29, marginBottom: 4 }]}>
                                            {selectedPlace.displayName?.text ?? 'Unnamed Place'}
                                        </Text>
                                        <TouchableOpacity onPress={closeDetails} style={[styles.closeIcon, { marginBottom: -2 }]} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                            <View style={styles.closeIconCircle}>
                                                <MaterialCommunityIcons name="close" size={20} color="#333" />
                                            </View>
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={[
                                        styles.detailOpenStatus,
                                        {
                                            color: selectedPlace.currentOpeningHours?.openNow ? '#059669' : '#dc2626',
                                            marginBottom: 8,
                                        }
                                    ]}>
                                        {selectedPlace.currentOpeningHours?.openNow ? 'Open Now' : 'Closed'}
                                    </Text>

                                    {selectedPlace.rating != null && (
                                        <Text style={[styles.detailRating, { marginBottom: 10 }]}>
                                            ⭐ {selectedPlace.rating.toFixed(1)} ({selectedPlace.userRatingCount ?? 0} reviews)
                                        </Text>
                                    )}

                                    <Text style={styles.detailDistance}>
                                        🚶 {selectedPlace.distanceInfo?.walking
                                            ? `${selectedPlace.distanceInfo.walking.duration} (${selectedPlace.distanceInfo.walking.distance})`
                                            : 'Distance unavailable'}
                                    </Text>

                                    <View style={styles.sideButtonsContainer}>
                                        <TouchableOpacity
                                            style={[styles.sideButton, styles.infoSideButton, { flex: 2 }]}
                                            onPress={() => handleInfoButtonPress(selectedPlace, selectedPlace.googleMapsUri || Math.random().toString())}
                                        >
                                            <MaterialCommunityIcons name="information-outline" size={24} color="#333" />
                                            <Text style={{ fontSize: 11, marginTop: 3, color: "#333" }}>Info</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.sideButton, styles.goSideButton, { flex: 2 }]}
                                            onPress={() => openMap(selectedPlace)}
                                        >
                                            <FontAwesome5 name="directions" size={27} color="#1e3a8a" />
                                            <Text style={{ fontSize: 11, marginTop: 5, color: "#1e3a8a" }}>
                                                {selectedPlace.distanceInfo?.walking
                                                    ? `${selectedPlace.distanceInfo.walking.duration}`
                                                    : 'Distance unavailable'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <>
                                    <View style={styles.filterRow}>
                                        <SortDropdown sortType={sortType} setSortType={setSortType} />
                                        <TouchableOpacity
                                            style={[
                                                styles.openNowBtn,
                                                openNowOnly && styles.openNowBtnActive,
                                            ]}
                                            onPress={() => setOpenNowOnly(prev => !prev)}
                                        >
                                            <Text style={openNowOnly ? styles.openNowTextActive : styles.openNowText}>
                                                {openNowOnly ? '✓ Open Now' : 'Open Now'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <Modal
                                        transparent
                                        animationType="fade"
                                        visible={showNoBathroomsAlert}
                                        onRequestClose={() => setShowNoBathroomsAlert(false)} // Android back button support
                                    >
                                        <View style={{
                                            flex: 1,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            backgroundColor: 'rgba(0,0,0,0.15)',
                                        }}>
                                            <View style={{
                                                backgroundColor: '#fff',
                                                borderRadius: 18,
                                                paddingVertical: 18,
                                                paddingHorizontal: 28,
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: 0.18,
                                                shadowRadius: 8,
                                                elevation: 8,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 12,
                                            }}>
                                                <MaterialCommunityIcons name="emoticon-sad-outline" size={32} color="#1e3a8a" />
                                                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1e3a8a' }}>
                                                    No bathrooms found in this area!
                                                </Text>
                                            </View>
                                        </View>
                                    </Modal>

                                    <BottomSheetFlatList
                                        data={sortedPlaces}
                                        keyExtractor={item => item.googleMapsUri || Math.random().toString()}
                                        renderItem={renderPlaceItem}
                                        contentContainerStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.85)' }}
                                        ListEmptyComponent={() => <Text style={styles.emptyText}>No places found.</Text>}
                                    />
                                </>
                            )}
                        </View>
                    </BottomSheet>

                    {/* Add loading indicator */}
                    {isLoading && <LoadingIndicator />}
                </View>
            </GestureHandlerRootView >
        </PortalProvider>
    );

}

const styles = StyleSheet.create({
    map: {
        width: '100%',
        height: '100%',
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 10
    },
    openNowBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f3f4f6',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#1e3a8a', // Blue border
    },
    openNowBtnActive: {
        backgroundColor: '#1e3a8a',
    },
    openNowText: {
        color: '#1e3a8a',
        fontWeight: '600',
        fontSize: 16,
    },
    openNowTextActive: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },

    gpsButtonContainer: {
        position: 'absolute',
        right: 10,
        bottom: '11%',
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 35, // make it a circle
        width: 56,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 6,
    },


    goButtonRow: {
        flexDirection: 'row',
        width: '100%',
        paddingHorizontal: 1, // overall side padding for container
    },


    infoSideButton: {
        backgroundColor: '#f0f0f0',  // light background but keep icon #333 dark
    },
    goSideButton: {
        backgroundColor: '#e0e7ff',  // light blue background, icon stays blue #1e3a8a
    },

    placeItemContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.85)', // frosted glass-ish
        alignItems: 'stretch',
        justifyContent: 'space-between',
        marginTop: 11,
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: '#ddd',
        height: 110,
    },

    placeInfoContainer: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.85)', // frosted glass-ish
        justifyContent: 'center',
        marginRight: 12,
        flexShrink: 1,
        gap: 8,
        marginBottom: 11,
    },

    placeName: {
        paddingTop: 5,
        fontSize: 22,
        fontWeight: '700',
        color: '#1e3a8a', // deep blue for consistency
    },

    placeRating: {
        fontSize: 14,
        color: '#555', // neutral gray
        marginBottom: 2,
    },

    placeOpenStatus: {
        fontSize: 13,
        fontWeight: '500',
        paddingBottom: 5,
    },

    sideButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center', // 👈 this helps keep buttons aligned
        justifyContent: 'space-between',
        gap: 10,
        height: 70, // 👈 optional hard cap
        alignSelf: 'center'
    },

    sideButton: {
        width: 60,
        height: 60,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#eee',
    },

    goSideButtonFull: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1e3a8a',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginTop: 10,
        gap: 10,
        shadowColor: '#1e3a8a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },

    goSideButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },

    distanceInfo: {
        fontSize: 13,
        color: '#4B5563', // tailwind gray-600
        marginTop: 2,
    },


    placeItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderColor: '#ddd',
    },

    bottomSheet: {
        backgroundColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
        zIndex: -999999
    },

    bottomSheetInner: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.85)', // frosted glass-ish
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    detailsContainer: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.85)', // frosted glass-ish
        flexShrink: 1,
    },
    detailTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        flexShrink: 1,
        flexWrap: 'wrap',
    },
    detailRating: {
        fontSize: 16,
        color: '#555',
        marginBottom: 6,
    },
    detailOpenStatus: {
        fontSize: 16,
        marginBottom: 6,
    },
    detailHours: {
        fontSize: 14,
        color: '#333',
        marginBottom: 6,
    },
    detailDistance: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    goButton: {
        backgroundColor: '#1e3a8a',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 10,
    },
    goButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    closeIcon: {
        marginLeft: 10,
        marginTop: -5, // center vertically with title
        marginBottom: 5, // center vertically with title
    },

    closeIconCircle: {
        backgroundColor: '#e0e0e0', // light gray circle
        borderRadius: 20,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: '#999',
    },
    calloutContainer: {
        backgroundColor: 'rgba(255,255,255,0.99)',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,           // added border width
        borderColor: '#1e3a8a',   // PottyPal blue border color
    },
    title: {
        fontWeight: '700',
        fontSize: 16,
        color: '#1e3a8a',
        marginBottom: 4,
        textAlign: 'left',  // left align text
    },
    address: {
        fontSize: 13,
        color: '#555',
        textAlign: 'left',  // left align text
    },
    filterContainer: {
        position: 'absolute',
        top: 125, // below the location button
        right: 5,
        flexDirection: 'column',  // column for vertical stack
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 25,
        paddingHorizontal: 8,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 5,
    },

    filterButton: {
        marginVertical: 8,
        backgroundColor: '#eee',
        borderRadius: 20,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },

    filterButtonInActive: {
        backgroundColor: '#1e3a8a',
        shadowColor: '#1e3a8a',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.6,
        shadowRadius: 6,
        elevation: 8,
    },
    searchThisAreaContainer: {
        position: 'absolute',
        top: 140, // below your branding and filters
        alignSelf: 'center',
        backgroundColor: 'transparent',
    },

    searchThisAreaButton: {
        backgroundColor: '#1e3a8a',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },

    searchThisAreaText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
    }
});
