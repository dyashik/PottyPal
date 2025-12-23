import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import {
    StyleSheet,
    TouchableOpacity,
    View,
    Text,
    Linking,
    Dimensions,
    InteractionManager,
    Modal,
    ScrollView,
    Share,
} from 'react-native';
import { interpolate } from 'react-native-reanimated';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { FetchNearbyPlacesResponse, Place } from '@/utils/api';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Entypo, FontAwesome5, FontAwesome6, MaterialIcons, Octicons } from '@expo/vector-icons';
import CustomGoogleMarker from '../components/CustomGoogleMarker';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { usePlaceStore } from '@/utils/usePlaceStore';
import SortDropdown from '@/components/SortDropDown';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import getGoogleMapsKey from '@/config/getGoogleMapsKey';
import { PortalProvider } from '@gorhom/portal';
import BrandingContainer from '@/components/BrandingContainer';
import CustomCallout from '@/components/CustomCallout';
import TravelModeDropdown from '../components/TravelModeDropdown';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingIndicator from '@/components/LoadingIndicator';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

const { width } = Dimensions.get('window');

export default function App() {
    const mapRef = useRef<MapView>(null);
    const animatedIndex = useSharedValue(0);
    const checkedAreasRef = useRef<{ latitude: number, longitude: number, radius: number }[]>([]);
    const bottomSheetRef = useRef<BottomSheet>(null);

    // Cache for storing fetched places by location
    const placesCache = useRef<Map<string, { places: Place[], timestamp: number }>>(new Map());
    const CACHE_DURATION = 21 * 24 * 60 * 60 * 1000; // 3 weeks in milliseconds    
    const CACHE_DISTANCE_THRESHOLD = 100; // meters - if within this distance, use cache

    const refreshAnim = useSharedValue(0);
    const [region, setRegion] = useState<Region | null>(null);
    const [isRegionChanged, setIsRegionChanged] = useState(false);
    const [places, setPlaces] = useState<Place[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastFetchedRef = useRef<{ center: { latitude: number; longitude: number }; radius: number } | null>(null);
    const initialRegionTimeoutRef = useRef<number | NodeJS.Timeout | null>(null);
    const ignoreRegionChangeRef = useRef(true);
    const isInitialMountRef = useRef(true);
    const [filters, setFilters] = useState({
        restaurant: true,
        cafe: true,
        grocery_store: true,
        public_bathroom: true,
        bar: true,
        pit_stop: true,
    });
    const [openNowOnly, setOpenNowOnly] = useState(false);
    const [travelMode, setTravelMode] = useState<'walking' | 'driving'>('walking');
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [showNoBathroomsAlert, setShowNoBathroomsAlert] = useState(false);
    const [sortType, setSortType] = useState<'distance' | 'popularity'>('distance');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingTimeout, setLoadingTimeout] = useState<number | null>(null);
    const [maxLoadingTimeout, setMaxLoadingTimeout] = useState<number | null>(null);
    const [showTravelDropdown, setShowTravelDropdown] = useState(false);
    const [isTravelModeExpanded, setIsTravelModeExpanded] = useState(false);
    const themeLightBlue = 'rgba(224, 242, 253, 1)'; // light background
    const themeDarkBlue = '#1e3a8a'; // strong blue border and text


    const pottyPalMapStyle = [
        {
            elementType: 'geometry',
            stylers: [{ color: '#ffffff' }],
        },
        {
            elementType: 'labels.text.fill',
            stylers: [{ color: '#1e3a8a' }],
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
            stylers: [{ visibility: 'on' }],
        },
        {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [{ color: '#ecfdf5' }],
        },
        {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#e5e7eb' }],
        },
        {
            featureType: 'road',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#6b7280' }],
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
            stylers: [{ color: '#cceeff' }],
        },
        {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#60a5fa' }],
        },
    ];

    useEffect(() => {
        let sub: Location.LocationSubscription;

        const startWatchingLocation = async () => {
            sub = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Highest,
                    distanceInterval: 20,
                    timeInterval: 5000,
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

        const R = 6371000;
        const dLat = (latitude - prevLat) * Math.PI / 180;
        const dLng = (longitude - prevLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(prevLat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceMoved = R * c;

        if (distanceMoved > 160) {
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





    function mapToFilterCategory(type: string | undefined): 'restaurant' | 'cafe' | 'grocery_store' | 'public_bathroom' | 'bar' | 'pit_stop' | null {
        if (!type) return null;

        const filter = type.toLowerCase();

        // Grocery stores
        const groceryTypes = ['grocery_store', 'supermarket', 'market', 'convenience_store', 'liquor_store'];
        if (groceryTypes.includes(filter)) return 'grocery_store';

        // Cafes and coffee shops
        const cafeTypes = ['cafe', 'coffee_shop', 'cat_cafe', 'dog_cafe', 'tea_house', 'bagel_shop',
            'juice_shop', 'candy_store', 'chocolate_shop', 'dessert_shop', 'bakery', 'ice_cream_shop'];
        if (cafeTypes.includes(filter)) return 'cafe';

        // Gas stations and rest stops
        if (['gas_station', 'rest_stop'].includes(filter)) return 'pit_stop';

        // Bars (standalone)
        if (filter === 'bar') return 'bar';

        // Public bathrooms
        const publicBathroomTypes = ['public_bathroom', 'restroom', 'toilet', 'washroom', 'bathroom'];
        if (publicBathroomTypes.includes(filter)) return 'public_bathroom';

        // Restaurants - catch anything with "restaurant" in the name, plus related food places
        if (filter.includes('restaurant') ||
            filter.startsWith('meal') ||
            ['bar_and_grill', 'pub', 'wine_bar', 'food_court', 'diner', 'cafeteria',
                'steak_house', 'pizzeria', 'sandwich_shop'].includes(filter)) {
            return 'restaurant';
        }

        return null;
    }

    const filteredPlaces = places.filter(place => {
        const category = mapToFilterCategory(place.primaryType);
        if (!category) return false;
        // When openNowOnly is true, show places that are open OR have no hours info
        return filters[category] && (!openNowOnly || !place.currentOpeningHours || place.currentOpeningHours.openNow);
    });

    useEffect(() => {
        if (filteredPlaces != null && filteredPlaces.length > 0) {
            setShowNoBathroomsAlert(false);
            setIsLoading(false);
        }
    }, [filteredPlaces.length]);

    const snapPoints = useMemo(() => {
        const { height } = Dimensions.get('window');
        const availableHeight = height;

        // Calculate responsive percentages based on screen size
        // iPhone 13 Pro has ~844px height, so 31% ≈ 262px and 12.5% ≈ 106px, 50% ≈ 422px, 55% ≈ 464px
        const collapsedHeight = Math.max(100, availableHeight * 0.05); // minimum 100px
        const midHeight = Math.max(300, availableHeight * 0.43);         // minimum 300px - 55% for list view (increased from 50%)
        const selectedHeight = Math.max(285, availableHeight * 0.34);   // minimum 320px - 38% for selected place (increased to show 50% of ad)
        const expandedHeight = Math.max(400, availableHeight * 0.70);   // minimum 400px

        // Convert back to percentages of total screen height
        const collapsedPercent = Math.round((collapsedHeight / height) * 100);
        const midPercent = Math.round((midHeight / height) * 100);
        const selectedPercent = Math.round((selectedHeight / height) * 100);
        const expandedPercent = Math.round((expandedHeight / height) * 100);

        return selectedPlace ? [`${selectedPercent}%`] : [`${collapsedPercent}%`, `${midPercent}%`, `${expandedPercent}%`];
    }, [selectedPlace, insets]);

    useEffect(() => {
        if (selectedPlace) {
            console.log('Snapping to index 0 for selected place: ' + (selectedPlace.displayName?.text ?? 'Unnamed Place') + ' | Snap Point: ' + snapPoints[0]);
            console.log('Snap Points Array:', snapPoints);
            // update bottomsheetref with new snapPoint

            bottomSheetRef.current?.snapToPosition(snapPoints[0]);
        }
    }, [selectedPlace, snapPoints]);

    // Save travel mode preference when it changes
    useEffect(() => {
        // Skip saving on initial mount to avoid overwriting saved preference
        if (isInitialMountRef.current) {
            console.log('Skipping save on initial mount, travelMode:', travelMode);
            return;
        }

        (async () => {
            try {
                console.log('Travel mode changed to:', travelMode);
                await AsyncStorage.setItem('travelMode', travelMode);
                console.log('Travel mode saved to AsyncStorage:', travelMode);
            } catch (error) {
                console.error('Failed to save travel mode preference:', error);
            }
        })();
    }, [travelMode]);

    useEffect(() => {
        (async () => {
            // Load saved travel mode preference
            try {
                const savedTravelMode = await AsyncStorage.getItem('travelMode');
                console.log('Loaded saved travel mode from AsyncStorage:', savedTravelMode);
                if (savedTravelMode === 'walking' || savedTravelMode === 'driving') {
                    setTravelMode(savedTravelMode);
                    console.log('Travel mode set to:', savedTravelMode);
                }
                // Mark initial mount as complete after loading preference
                isInitialMountRef.current = false;
            } catch (error) {
                console.error('Failed to load travel mode preference:', error);
                isInitialMountRef.current = false;
            }

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

            initialRegionRef.current = userRegion;
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
                coordinates.push({ latitude, longitude });
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

                // Open bottom sheet to 50% (index 1) to show the list
                setTimeout(() => {
                    const currentFilteredCount = results.filter(place => {
                        const category = mapToFilterCategory(place.primaryType);
                        if (!category) return false;
                        return filters[category] && (!openNowOnly || !place.currentOpeningHours || place.currentOpeningHours.openNow);
                    }).length;
                    console.log('Number of filtered places:', currentFilteredCount);
                    if (currentFilteredCount > 2) {
                        console.log('Snapping to index 1 for initial load with multiple places | Snap Point: ' + snapPoints[1]);
                        bottomSheetRef.current?.snapToIndex(1);
                    } else {
                        bottomSheetRef.current?.snapToIndex(2);
                        console.log('Snapping to index 2 for initial load with single place | Snap Point: ' + snapPoints[2]);
                    }
                }, 400);
            }
        })();

        return () => {
            if (initialRegionTimeoutRef.current) clearTimeout(initialRegionTimeoutRef.current);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (loadingTimeout) clearTimeout(loadingTimeout);
            if (maxLoadingTimeout) clearTimeout(maxLoadingTimeout);
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


    // Helper function to check if a place should be open based on its weekday descriptions
    const shouldPlaceBeOpen = (place: Place): boolean | null => {
        if (!place.currentOpeningHours?.weekdayDescriptions) return null;

        const now = new Date();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = dayNames[now.getDay()];
        const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes since midnight

        // Find today's hours
        const todayHours = place.currentOpeningHours.weekdayDescriptions.find(desc =>
            desc.startsWith(currentDay)
        );

        if (!todayHours) return null;

        // Check if closed all day
        if (todayHours.includes('Closed')) return false;

        // Check if open 24 hours
        if (todayHours.includes('Open 24 hours')) return true;

        // Parse hours like "Monday: 9:00 AM – 5:00 PM" or "Monday: 9:00 AM – 12:00 AM"
        const timeMatch = todayHours.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*–\s*(\d{1,2}):(\d{2})\s*(AM|PM)/);
        if (!timeMatch) return null;

        const [_, startHour, startMin, startPeriod, endHour, endMin, endPeriod] = timeMatch;

        // Convert to 24-hour format
        let openTime = parseInt(startHour) * 60 + parseInt(startMin);
        if (startPeriod === 'PM' && parseInt(startHour) !== 12) openTime += 12 * 60;
        if (startPeriod === 'AM' && parseInt(startHour) === 12) openTime = parseInt(startMin);

        let closeTime = parseInt(endHour) * 60 + parseInt(endMin);
        if (endPeriod === 'PM' && parseInt(endHour) !== 12) closeTime += 12 * 60;
        if (endPeriod === 'AM' && parseInt(endHour) === 12) closeTime = parseInt(endMin);

        // Handle cases where closing time is past midnight
        if (closeTime < openTime) {
            return currentTime >= openTime || currentTime <= closeTime;
        }

        return currentTime >= openTime && currentTime <= closeTime;
    };

    // Validate cached places - if ANY place has stale open/closed status, return null to trigger full refresh
    const validateCachedPlaces = (cachedPlaces: Place[]): boolean => {
        // Check each place for stale open/closed status
        for (const place of cachedPlaces) {
            const shouldBeOpen = shouldPlaceBeOpen(place);
            const isMarkedOpen = place.currentOpeningHours?.openNow;

            // Skip if we can't determine what the status should be
            if (shouldBeOpen === null) continue;

            // Check if marked closed but should be open
            if (shouldBeOpen === true && isMarkedOpen === false) {
                console.log('🔄 Cache is stale - place marked CLOSED but should be OPEN:', place.displayName?.text);
                console.log('⚠️ Breaking cache and triggering full refresh...');
                return false; // Cache is invalid
            }

            // Check if marked open but should be closed
            if (shouldBeOpen === false && isMarkedOpen === true) {
                console.log('🔄 Cache is stale - place marked OPEN but should be CLOSED:', place.displayName?.text);
                console.log('⚠️ Breaking cache and triggering full refresh...');
                return false; // Cache is invalid
            }
        }

        return true; // Cache is valid
    };

    // Generate cache key from location coordinates (rounded to reduce precision)
    const generateCacheKey = (latitude: number, longitude: number, radius: number): string => {
        // Round to 5 decimal places (~5 meters precision)
        const lat = Math.round(latitude * 100000) / 100000;
        const lng = Math.round(longitude * 100000) / 100000;
        const rad = Math.round(radius);
        return `${lat},${lng},${rad}`;
    };

    // Check if cached data exists and is still valid
    const getCachedPlaces = async (latitude: number, longitude: number, radius: number): Promise<Place[] | null> => {
        const currentTime = Date.now();

        // Check exact match first
        const exactKey = generateCacheKey(latitude, longitude, radius);
        let exactMatch = placesCache.current.get(exactKey);

        // If not in memory, try loading from AsyncStorage
        if (!exactMatch) {
            try {
                const stored = await AsyncStorage.getItem(`cache_${exactKey}`);
                if (stored) {
                    exactMatch = JSON.parse(stored);
                    // Restore to memory cache
                    if (exactMatch) {
                        placesCache.current.set(exactKey, exactMatch);
                    }
                }
            } catch (error) {
                console.error('Failed to load from AsyncStorage:', error);
            }
        }

        if (exactMatch && (currentTime - exactMatch.timestamp) < CACHE_DURATION) {
            // If cached data is empty, ignore it and fetch fresh data
            if (exactMatch.places.length === 0) {
                console.log('⚠️ Cache HIT but empty - will fetch fresh data:', exactKey);
                placesCache.current.delete(exactKey);
                await AsyncStorage.removeItem(`cache_${exactKey}`);
                return null;
            }
            console.log('✅ Cache HIT (exact match):', exactKey);

            // Validate cache - if any place has stale status, return null to trigger full refresh
            const isCacheValid = validateCachedPlaces(exactMatch.places);
            if (!isCacheValid) {
                // Remove stale cache and trigger fresh fetch
                placesCache.current.delete(exactKey);
                await AsyncStorage.removeItem(`cache_${exactKey}`);
                return null;
            }

            return exactMatch.places;
        }

        // Check for nearby cached locations (within threshold)
        // First, get all cache keys from AsyncStorage
        try {
            const allKeys = await AsyncStorage.getAllKeys();
            const cacheKeys = allKeys.filter(key => key.startsWith('cache_'));

            for (const storageKey of cacheKeys) {
                const key = storageKey.replace('cache_', '');
                let cached = placesCache.current.get(key);

                // Load from AsyncStorage if not in memory
                if (!cached) {
                    try {
                        const stored = await AsyncStorage.getItem(storageKey);
                        if (stored) {
                            cached = JSON.parse(stored);
                            if (cached) {
                                placesCache.current.set(key, cached);
                            }
                        }
                    } catch (error) {
                        console.error('Failed to load cached entry:', error);
                        continue;
                    }
                }

                if (!cached) continue;

                if ((currentTime - cached.timestamp) >= CACHE_DURATION) {
                    // Remove expired cache entries
                    placesCache.current.delete(key);
                    await AsyncStorage.removeItem(storageKey);
                    continue;
                }

                const [cachedLat, cachedLng, cachedRad] = key.split(',').map(Number);

                // Calculate distance between requested location and cached location
                const R = 6371000; // Earth's radius in meters
                const dLat = (latitude - cachedLat) * Math.PI / 180;
                const dLng = (longitude - cachedLng) * Math.PI / 180;
                const a = Math.sin(dLat / 2) ** 2 +
                    Math.cos(cachedLat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
                    Math.sin(dLng / 2) ** 2;
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = R * c;

                // If within threshold and similar radius, use cached data
                const radiusDiff = Math.abs(radius - cachedRad);
                const radiusRatio = Math.min(radius, cachedRad) / Math.max(radius, cachedRad);

                // Cache hit requires:
                // 1. Location within CACHE_DISTANCE_THRESHOLD
                // 2. Radius difference within 15% OR radius ratio > 0.85 (meaning radii are similar)
                // 3. The cached radius should be at least 85% of requested radius to ensure coverage
                const isRadiusSimilar = radiusDiff <= (radius * 0.15) || radiusRatio >= 0.85;
                const hasSufficientCoverage = cachedRad >= (radius * 0.85);

                if (distance <= CACHE_DISTANCE_THRESHOLD && isRadiusSimilar && hasSufficientCoverage) {
                    // If cached data is empty, ignore it and fetch fresh data
                    if (cached.places.length === 0) {
                        console.log('⚠️ Cache HIT (nearby) but empty - will fetch fresh data:', key);
                        placesCache.current.delete(key);
                        await AsyncStorage.removeItem(storageKey);
                        return null;
                    }
                    console.log('✅ Cache HIT (nearby):', key, `distance: ${distance.toFixed(0)}m, radiusDiff: ${radiusDiff.toFixed(0)}m (${(radiusDiff / radius * 100).toFixed(1)}%)`);

                    // Validate cache - if any place has stale status, skip this cache and continue searching
                    const isCacheValid = validateCachedPlaces(cached.places);
                    if (!isCacheValid) {
                        // Remove stale cache and continue searching
                        placesCache.current.delete(key);
                        await AsyncStorage.removeItem(storageKey);
                        continue;
                    }

                    return cached.places;
                } else if (distance <= CACHE_DISTANCE_THRESHOLD) {
                    console.log('❌ Cache MISS (radius mismatch):', key, `distance: ${distance.toFixed(0)}m OK, but radiusDiff: ${radiusDiff.toFixed(0)}m (${(radiusDiff / radius * 100).toFixed(1)}%), coverage: ${(cachedRad / radius * 100).toFixed(1)}%`);
                }
            }
        } catch (error) {
            console.error('Failed to check nearby cache:', error);
        }

        console.log('❌ Cache MISS for:', generateCacheKey(latitude, longitude, radius));
        return null;
    };

    // Store places in cache
    const cachePlaces = async (latitude: number, longitude: number, radius: number, places: Place[]): Promise<void> => {
        const key = generateCacheKey(latitude, longitude, radius);
        const cacheData = {
            places,
            timestamp: Date.now()
        };

        // Save to memory cache
        placesCache.current.set(key, cacheData);

        // Save to persistent storage
        try {
            await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
            console.log('💾 Cached places for:', key, `(${places.length} places)`);
        } catch (error) {
            console.error('Failed to save to AsyncStorage:', error);
        }
    };

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
        // Show loading indicator immediately
        const loadingTimer = setTimeout(() => {
            setIsLoading(true);
        }, 100); // Short delay to avoid flicker for very fast operations
        setLoadingTimeout(loadingTimer);

        // Check cache first
        const cachedPlaces = await getCachedPlaces(latitude, longitude, radius);
        if (cachedPlaces) {
            // Brief delay to show loading indicator even for cached data
            await new Promise(resolve => setTimeout(resolve, 300));
            // Clear loading indicator
            if (loadingTimer) clearTimeout(loadingTimer);
            setLoadingTimeout(null);
            setIsLoading(false);
            return cachedPlaces;
        }

        // Maximum loading timeout of 2 seconds - stop all loading after this
        const maxTimer = setTimeout(() => {
            setIsLoading(false);
            if (loadingTimeout) clearTimeout(loadingTimeout);
            setLoadingTimeout(null);
        }, 2000);
        setMaxLoadingTimeout(maxTimer);

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
                    "gas_station",
                    "rest_stop",
                    "supermarket",
                    "market",
                    "liquor_store",
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
            const filteredPlaces = updatedPlaces.filter(
                (place): place is Place =>
                (
                    ((place as Place)?.restroom === true ||
                        (place as Place)?.primaryType === 'public_bathroom')
                )
            );

            // Cache the results before returning
            await cachePlaces(latitude, longitude, radius, filteredPlaces);

            return filteredPlaces;
        } catch (error) {
            console.error("Error fetching places:", error);
            return [];
        } finally {
            // Clear both timeouts and hide loading indicator
            if (loadingTimeout) clearTimeout(loadingTimeout);
            if (maxLoadingTimeout) clearTimeout(maxLoadingTimeout);
            setLoadingTimeout(null);
            setMaxLoadingTimeout(null);
            setIsLoading(false);
        }
    };


    const fetchWalkingTimeAndDistance = async (place: Place) => {
        // Use Mapbox Directions API instead of Google Distance Matrix
        const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
        if (!MAPBOX_TOKEN) throw new Error("Mapbox token is missing");

        const userLocation = await Location.getCurrentPositionAsync({});
        const { latitude: userLat, longitude: userLng } = userLocation.coords;

        const destinationLat = place.location.latitude;
        const destinationLng = place.location.longitude;

        // Mapbox uses lng,lat order (opposite of Google)
        const origin = `${userLng},${userLat}`;
        const destination = `${destinationLng},${destinationLat}`;

        const modes = ["walking", "driving"];

        const results: Record<string, { duration: string; distance: string }> = {};

        for (const mode of modes) {
            try {
                const url = `https://api.mapbox.com/directions/v5/mapbox/${mode}/${origin};${destination}?access_token=${MAPBOX_TOKEN}&geometries=geojson`;

                const response = await fetch(url);
                const data = await response.json();

                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    const durationSeconds = route.duration;
                    const distanceMeters = route.distance;

                    // Convert to minutes and miles
                    const minutes = Math.round(durationSeconds / 60);
                    const miles = distanceMeters * 0.000621371; // meters to miles

                    // Format duration
                    let durationText: string;
                    if (minutes < 1) {
                        durationText = '< 1 min';
                    } else if (minutes < 60) {
                        durationText = `${minutes} min${minutes > 1 ? 's' : ''}`;
                    } else {
                        const hours = Math.floor(minutes / 60);
                        const remainingMins = minutes % 60;
                        durationText = remainingMins > 0
                            ? `${hours} hour${hours > 1 ? 's' : ''} ${remainingMins} min${remainingMins > 1 ? 's' : ''}`
                            : `${hours} hour${hours > 1 ? 's' : ''}`;
                    }

                    // Format distance
                    let distanceText: string;
                    if (miles < 0.1) {
                        const feet = Math.round(miles * 5280);
                        distanceText = `${feet} ft`;
                    } else {
                        distanceText = `${miles.toFixed(1)} mi`;
                    }

                    results[mode] = {
                        duration: durationText,
                        distance: distanceText,
                    };
                } else {
                    console.warn(`Mapbox Directions error for mode: ${mode}`, data);
                    results[mode] = { duration: "Unavailable", distance: "Unavailable" };
                }
            } catch (error) {
                console.error(`Error fetching Mapbox directions for ${mode}:`, error);
                results[mode] = { duration: "Unavailable", distance: "Unavailable" };
            }
        }

        return results;
    };



    const initialRegionRef = useRef<Region | null>(null);

    const focusMap = async () => {
        // Immediately hide "Search This Area" button FIRST

        // Always get current location (where blue dot is) instead of using cached initial region
        let location = await Location.getCurrentPositionAsync({});
        const focusRegion = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };

        // Update the initial region reference to the new current location
        initialRegionRef.current = focusRegion;
        setRegion(focusRegion);
        mapRef.current?.animateToRegion(focusRegion, 1000);
        setIsLoading(false);
    };

    // Refresh button handler: zoom to current location, update all walking distances, clear checkedAreasRef
    const handleRefresh = async () => {
        // Immediately hide "Search This Area" button FIRST
        setIsRegionChanged(false);

        // Animate refresh icon
        refreshAnim.value = 0;
        // Animate refreshAnim from 0 to 1
        refreshAnim.value = withTiming(1, { duration: 700 }, () => {
            refreshAnim.value = 0; // Reset after animation
        });

        await focusMap();
        // Select all filters
        setFilters({
            restaurant: true,
            cafe: true,
            grocery_store: true,
            public_bathroom: true,
            bar: true,
            pit_stop: true,
        });
        // Clear "Open Now" filter
        setOpenNowOnly(false);
        // Reset sort to distance
        setSortType('distance');
        // Clear checked areas so user can search again
        checkedAreasRef.current = [];
        // Remove all places from the list
        setPlaces([]);

        // Fetch places for the focused region
        let regionToFetch = initialRegionRef.current;
        if (!regionToFetch) return;
        const latRad = regionToFetch.latitude * (Math.PI / 180);
        const metersPerDegreeLongitude = Math.cos(latRad) * (Math.PI / 180) * 6371000;
        const widthInMeters = regionToFetch.longitudeDelta * metersPerDegreeLongitude;
        const radius = widthInMeters / 1.75;
        setIsLoading(true);
        let fetchedResults: Place[] = [];
        try {
            const results = await fetchNearbyPlaces(regionToFetch.latitude, regionToFetch.longitude, radius);
            fetchedResults = results;
            setPlaces(results);
        } finally {
            setIsLoading(false);
            setIsRegionChanged(false);
            ignoreRegionChangeRef.current = true;
            setRegion(regionToFetch);

            // Re-enable region change detection after a delay
            if (initialRegionTimeoutRef.current) clearTimeout(initialRegionTimeoutRef.current);
            initialRegionTimeoutRef.current = setTimeout(() => {
                ignoreRegionChangeRef.current = false;
            }, 2000);


            setTimeout(() => {
                const currentFilteredCount = fetchedResults.filter(place => {
                    const category = mapToFilterCategory(place.primaryType);
                    if (!category) return false;
                    return filters[category] && (!openNowOnly || !place.currentOpeningHours || place.currentOpeningHours.openNow);
                }).length;
                console.log('Refresh - Number of filtered places:', currentFilteredCount);
                if (currentFilteredCount > 2) {
                    console.log('Snapping to index 1 for refresh with multiple places');
                    bottomSheetRef.current?.snapToIndex(1);
                } else {
                    console.log('Snapping to index 2 for refresh with single place');
                    bottomSheetRef.current?.snapToIndex(2);
                }
            }, 400);
        }
    };

    const onRegionChange = (region: Region) => {
        setRegion(region);
        if (!ignoreRegionChangeRef.current) {
            setIsRegionChanged(true);
        }
    };

    const lastRequestIdRef = useRef<number>(0);

    const searchNewBathroom = () => {
        if (!region) {
            setIsLoading(false);
            return;
        }
        if (selectedPlace) {
            setSelectedPlace(null);
            bottomSheetRef.current?.snapToIndex(1);
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

                // Maximum loading timeout of 2 seconds - stop all loading after this
                const maxTimer = setTimeout(() => {
                    setIsLoading(false);
                    if (loadingTimeout) clearTimeout(loadingTimeout);
                    setLoadingTimeout(null);
                }, 2000);
                setMaxLoadingTimeout(maxTimer);

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
                                }, 2000); // Hide after 2s
                            } else {
                                setShowNoBathroomsAlert(false);
                                // Open bottom sheet to 50% (index 1) to show changes in list
                                setTimeout(() => {
                                    bottomSheetRef.current?.snapToIndex(1);
                                }, 300);
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
                        // Clear all timeouts and hide loading indicator
                        if (loadingTimeout) clearTimeout(loadingTimeout);
                        if (maxLoadingTimeout) clearTimeout(maxLoadingTimeout);
                        setLoadingTimeout(null);
                        setMaxLoadingTimeout(null);
                        setIsLoading(false);
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

        console.log('Selected Place: ' + (place.displayName?.text ?? 'Unnamed Place'));
        console.log('Marker pressed for place:', mapToFilterCategory(place.primaryType));
        console.log('Place location: ' + JSON.stringify(place.location));
        setTimeout(() => {
            setSelectedPlace(place);
            console.log('snapPoints array:', snapPoints);
            const snapIndex = 0;
            console.log(`Snapping to index ${snapIndex}: ${snapPoints[snapIndex] ?? 'N/A'}`);
            bottomSheetRef.current?.snapToPosition(snapPoints[snapIndex]);
        }, 30);

        // Zoom and center map on marker location
        if (place.location) {
            mapRef.current?.animateToRegion({
                latitude: place.location.latitude,
                longitude: place.location.longitude,
                latitudeDelta: 0.0025,
                longitudeDelta: 0.0025,
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

        Linking.openURL(url);
    };

    const openMap = (item: Place & { travelMode?: string; travelTime?: string; travelDistance?: string }) => {
        router.push({
            pathname: '/places/fullScreenMap',
            params: {
                id: item.googleMapsUri || Math.random().toString(),
                lat: item.location.latitude,
                lng: item.location.longitude,
                name: item.displayName?.text || 'Unnamed Place',
                type: item.primaryType || 'Unknown',
                walkingURL: item.googleMapsLinks?.directionsUri || '',
                travelMode: item.travelMode,
                distanceInfo: JSON.stringify(item.distanceInfo || {}),
            }
        });
        usePlaceStore.getState().setSelectedPlace(item);
    };

    const handleInfoButtonPress = (place: Place, id: string) => {
        usePlaceStore.getState().setSelectedPlace(place);

        // Short delay to ensure store is updated before navigating
        setTimeout(() => {
            // console.log('Navigating to place details:', id, travelMode);
            router.push({ pathname: '/places/[id]', params: { id, travelMode: travelMode } });
        }, 50);
    };



    // Render each place in bottom sheet list
    const renderPlaceItem = ({ item }: { item: Place }) => {
        const mode = travelMode;
        const icon = mode === 'walking' ? 'walk' : 'car';
        // Use purple for driving, orange for walking
        const color = mode === 'walking' ? '#ff9800' : '#a259e6';
        const modeLabel = mode === 'walking' ? 'Walk' : 'Drive';
        const info = item.distanceInfo?.[mode];
        // set item mode
        // item.travelMode = mode; // Removed to avoid type error

        // Get category icon for this place
        const category = mapToFilterCategory(item.primaryType);
        let categoryIcon: React.ReactElement | null = null;

        switch (category) {
            case 'restaurant':
                categoryIcon = <MaterialCommunityIcons name="silverware-fork-knife" size={20} color="#006400" style={{ marginLeft: 6 }} />;
                break;
            case 'cafe':
                categoryIcon = <MaterialCommunityIcons name="coffee" size={20} color="#8B4513" style={{ marginLeft: 6 }} />;
                break;
            case 'grocery_store':
                categoryIcon = <MaterialCommunityIcons name="cart" size={20} color="#CC7000" style={{ marginLeft: 6 }} />;
                break;
            case 'public_bathroom':
                categoryIcon = <FontAwesome5 name="toilet" size={18} color="#000080" style={{ marginLeft: 6 }} />;
                break;
            case 'pit_stop':
                categoryIcon = <MaterialCommunityIcons name="gas-station" size={20} color="#CC0000" style={{ marginLeft: 6 }} />;
                break;
            case 'bar':
                categoryIcon = <Entypo name="drink" size={20} color="#000000" style={{ marginLeft: 6 }} />;
                break;
        }

        return (
            <View style={styles.placeItemContainer}>
                {/* Left: Info */}
                <TouchableOpacity onPress={() => onMarkerPress(item)} style={styles.placeInfoContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.placeName} numberOfLines={1}>
                            {categoryIcon}  {item.displayName?.text ?? 'Unnamed Place'}
                        </Text>
                    </View>

                    {item.rating != null ? (
                        <Text style={styles.placeRating}>
                            ⭐ {item.rating.toFixed(1)} ({item.userRatingCount ?? 0} reviews)
                        </Text>
                    ) : (
                        <Text style={[styles.placeRating]}>
                            ⭐ 0.0 (No reviews)
                        </Text>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 0 }}>
                        <Text
                            style={{
                                fontSize: 18,
                                marginRight: mode === 'walking' ? 1 : 5,
                                color: '#1e3a8a',
                            }}
                        >
                            {mode === 'walking' ? '🚶‍♂️' : '🚗'}
                        </Text>
                        <Text style={{ fontSize: 15, color: '#1e3a8a' }}>
                            {info ? info.duration : 'Time unavailable'}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#374151', marginLeft: 2 }}>
                            {info ? `(${info.distance})` : ''}
                        </Text>
                    </View>

                    {item.currentOpeningHours ? (
                        <Text
                            style={[
                                styles.placeOpenStatus,
                                { color: item.currentOpeningHours.openNow ? '#059669' : '#dc2626' },
                            ]}
                        >
                            {item.currentOpeningHours.openNow ? 'Open Now' : 'Closed'}
                        </Text>
                    ) : (
                        <Text
                            style={[
                                styles.placeOpenStatus,
                                { color: '#6b7280' },
                            ]}
                        >
                            No hours found
                        </Text>
                    )}
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
                        onPress={() => openMap({ ...item, travelMode: mode })}
                    >
                        <FontAwesome5 name="directions" size={27} color="#1e3a8a" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };











    const toggleFilter = (filterName: 'restaurant' | 'cafe' | 'grocery_store' | 'public_bathroom' | 'bar' | 'pit_stop') => {
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
                    bar: true,
                    pit_stop: true,
                };
            } else {
                newFilters = {
                    restaurant: false,
                    cafe: false,
                    grocery_store: false,
                    public_bathroom: false,
                    bar: false,
                    pit_stop: false,
                    [filterName]: true,
                };
            }

            // Do NOT show alert when filters result in zero bathrooms
            return newFilters;
        });
    };

    const animatedStyle = useAnimatedStyle(() => {
        // animatedIndex: 0 = collapsed, 1 = expanded (adjust based on your snapPoints)
        const opacity = interpolate(animatedIndex.value, [0, 1], [0, 1]);
        const translateY = interpolate(animatedIndex.value, [0, 1], [40, 0]);
        return {
            opacity,
            transform: [{ translateY }],
        };
    });

    // change zindex of filter button/search this area button
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
                            key={`map-${filteredPlaces.length}`}
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

                                    {/* Custom Google-style marker with icon */}
                                    <CustomGoogleMarker
                                        primaryType={mapToFilterCategory(place.primaryType) || 'restaurant'}
                                    />
                                    <CustomCallout place={place} />
                                </Marker>
                            ))}
                        </MapView>
                    )}
                    {/* 🧻 Branding - moved OUT of MapView */}
                    <BrandingContainer />


                    {/* 🔘 Frosted Glass Pill Filter Chips */}
                    <View
                        style={{
                            position: 'absolute',
                            top: 53 + insets.top, // just under BrandingContainer
                            left: 0,
                            right: 0,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 0,
                            paddingHorizontal: 3,
                        }}
                    >
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 10, paddingHorizontal: 8 }}
                        >
                            {/* Cafe */}
                            {(() => {
                                const filterCount = Object.values(filters).filter(Boolean).length;
                                const allTrue = filterCount === 6 && Object.values(filters).every(Boolean);
                                const onlyOneTrue = filterCount === 1;
                                const getPillStyle = (active: boolean) => {
                                    if (allTrue) return styles.filterPillUnselected;
                                    if (onlyOneTrue && active) return styles.filterPillSelected;
                                    return styles.filterPillUnselected;
                                };
                                const getIconColor = (active: boolean) => {
                                    if (allTrue) return '#8B4513';
                                    if (onlyOneTrue && active) return '#fff';
                                    return '#8B4513';
                                };
                                const getTextColor = (active: boolean) => {
                                    if (allTrue) return '#1e3a8a';
                                    if (onlyOneTrue && active) return '#fff';
                                    return '#1e3a8a';
                                };
                                return (
                                    <TouchableOpacity
                                        onPress={() => toggleFilter('cafe')}
                                        style={[
                                            styles.filterPill,
                                            getPillStyle(filters.cafe),
                                            null
                                        ]}
                                    >
                                        <MaterialCommunityIcons name="coffee" size={20} color={getIconColor(filters.cafe)} style={{ marginRight: 7 }} />
                                        <Text style={{ color: getTextColor(filters.cafe), fontWeight: '600', fontSize: 14 }}>Café</Text>
                                    </TouchableOpacity>
                                );
                            })()}
                            {/* Grocery Store */}
                            {(() => {
                                const filterCount = Object.values(filters).filter(Boolean).length;
                                const allTrue = filterCount === 6 && Object.values(filters).every(Boolean);
                                const onlyOneTrue = filterCount === 1;
                                const getPillStyle = (active: boolean) => {
                                    if (allTrue) return styles.filterPillUnselected;
                                    if (onlyOneTrue && active) return styles.filterPillSelected;
                                    return styles.filterPillUnselected;
                                };
                                const getIconColor = (active: boolean) => {
                                    if (allTrue) return '#CC7000';
                                    if (onlyOneTrue && active) return '#fff';
                                    return '#CC7000';
                                };
                                const getTextColor = (active: boolean) => {
                                    if (allTrue) return '#1e3a8a';
                                    if (onlyOneTrue && active) return '#fff';
                                    return '#1e3a8a';
                                };
                                return (
                                    <TouchableOpacity
                                        onPress={() => toggleFilter('grocery_store')}
                                        style={[
                                            styles.filterPill,
                                            getPillStyle(filters.grocery_store),
                                            null
                                        ]}
                                    >
                                        <MaterialCommunityIcons name="cart" size={20} color={getIconColor(filters.grocery_store)} style={{ marginRight: 7 }} />
                                        <Text style={{ color: getTextColor(filters.grocery_store), fontWeight: '600', fontSize: 14 }}>Grocery</Text>
                                    </TouchableOpacity>
                                );
                            })()}
                            {/* Restaurant */}
                            {(() => {
                                const filterCount = Object.values(filters).filter(Boolean).length;
                                const allTrue = filterCount === 6 && Object.values(filters).every(Boolean);
                                const onlyOneTrue = filterCount === 1;
                                const getPillStyle = (active: boolean) => {
                                    if (allTrue) return styles.filterPillUnselected;
                                    if (onlyOneTrue && active) return styles.filterPillSelected;
                                    return styles.filterPillUnselected;
                                };
                                const getIconColor = (active: boolean) => {
                                    if (allTrue) return '#006400';
                                    if (onlyOneTrue && active) return '#fff';
                                    return '#006400';
                                };
                                const getTextColor = (active: boolean) => {
                                    if (allTrue) return '#1e3a8a';
                                    if (onlyOneTrue && active) return '#fff';
                                    return '#1e3a8a';
                                };
                                return (
                                    <TouchableOpacity
                                        onPress={() => toggleFilter('restaurant')}
                                        style={[
                                            styles.filterPill,
                                            getPillStyle(filters.restaurant),
                                            null
                                        ]}
                                    >
                                        <MaterialCommunityIcons name="silverware-fork-knife" size={20} color={getIconColor(filters.restaurant)} style={{ marginRight: 7 }} />
                                        <Text style={{ color: getTextColor(filters.restaurant), fontWeight: '600', fontSize: 14 }}>Restaurant</Text>
                                    </TouchableOpacity>
                                );
                            })()}
                            {/* Public Bathroom */}
                            {(() => {
                                const filterCount = Object.values(filters).filter(Boolean).length;
                                const allTrue = filterCount === 6 && Object.values(filters).every(Boolean);
                                const onlyOneTrue = filterCount === 1;
                                const getPillStyle = (active: boolean) => {
                                    if (allTrue) return styles.filterPillUnselected;
                                    if (onlyOneTrue && active) return styles.filterPillSelected;
                                    return styles.filterPillUnselected;
                                };
                                const getIconColor = (active: boolean) => {
                                    if (allTrue) return '#000080';
                                    if (onlyOneTrue && active) return '#fff';
                                    return '#000080';
                                };
                                const getTextColor = (active: boolean) => {
                                    if (allTrue) return '#1e3a8a';
                                    if (onlyOneTrue && active) return '#fff';
                                    return '#1e3a8a';
                                };
                                return (
                                    <TouchableOpacity
                                        onPress={() => toggleFilter('public_bathroom')}
                                        style={[
                                            styles.filterPill,
                                            getPillStyle(filters.public_bathroom),
                                            null
                                        ]}
                                    >
                                        <FontAwesome5 name="toilet" size={20} color={getIconColor(filters.public_bathroom)} style={{ marginRight: 7 }} />
                                        <Text style={{ color: getTextColor(filters.public_bathroom), fontWeight: '600', fontSize: 14 }}>Public Bathroom</Text>
                                    </TouchableOpacity>
                                );
                            })()}
                            {/* Pit Stop */}
                            {(() => {
                                const filterCount = Object.values(filters).filter(Boolean).length;
                                const allTrue = filterCount === 6 && Object.values(filters).every(Boolean);
                                const onlyOneTrue = filterCount === 1;
                                const getPillStyle = (active: boolean) => {
                                    if (allTrue) return styles.filterPillUnselected;
                                    if (onlyOneTrue && active) return styles.filterPillSelected;
                                    return styles.filterPillUnselected;
                                };
                                const getIconColor = (active: boolean) => {
                                    if (allTrue) return '#CC0000';
                                    if (onlyOneTrue && active) return '#fff';
                                    return '#CC0000';
                                };
                                const getTextColor = (active: boolean) => {
                                    if (allTrue) return '#1e3a8a';
                                    if (onlyOneTrue && active) return '#fff';
                                    return '#1e3a8a';
                                };
                                return (
                                    <TouchableOpacity
                                        onPress={() => toggleFilter('pit_stop')}
                                        style={[
                                            styles.filterPill,
                                            getPillStyle(filters.pit_stop),
                                            null
                                        ]}
                                    >
                                        <MaterialCommunityIcons name="gas-station" size={20} color={getIconColor(filters.pit_stop)} style={{ marginRight: 7 }} />
                                        <Text style={{ color: getTextColor(filters.pit_stop), fontWeight: '600', fontSize: 14 }}>Gas Station</Text>
                                    </TouchableOpacity>
                                );
                            })()}
                            {/* Bar */}
                            {(() => {
                                const filterCount = Object.values(filters).filter(Boolean).length;
                                const allTrue = filterCount === 6 && Object.values(filters).every(Boolean);
                                const onlyOneTrue = filterCount === 1;
                                const getPillStyle = (active: boolean) => {
                                    if (allTrue) return styles.filterPillUnselected;
                                    if (onlyOneTrue && active) return styles.filterPillSelected;
                                    return styles.filterPillUnselected;
                                };
                                const getIconColor = (active: boolean) => {
                                    if (allTrue) return '#000000';
                                    if (onlyOneTrue && active) return '#fff';
                                    return '#000000';
                                };
                                const getTextColor = (active: boolean) => {
                                    if (allTrue) return '#1e3a8a';
                                    if (onlyOneTrue && active) return '#fff';
                                    return '#1e3a8a';
                                };
                                return (
                                    <TouchableOpacity
                                        onPress={() => toggleFilter('bar')}
                                        style={[
                                            styles.filterPill,
                                            getPillStyle(filters.bar),
                                            null
                                        ]}
                                    >
                                        <Entypo name="drink" size={20} color={getIconColor(filters.bar)} style={{ marginRight: 7 }} />
                                        <Text style={{ color: getTextColor(filters.bar), fontWeight: '600', fontSize: 14 }}>Bar</Text>
                                    </TouchableOpacity>
                                );
                            })()}
                        </ScrollView>
                    </View>

                    {/* 🔍 Search This Area - moved OUT of MapView */}
                    {isRegionChanged && (
                        <Animated.View
                            key="search-area"
                            style={[
                                styles.searchThisAreaContainer,
                                { top: insets.top + 113, position: 'absolute', alignSelf: 'center', zIndex: 0 }
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

                    {/* 🔄 Refresh & GPS Button Group (styled exactly like filterContainer, pinned bottom right) */}
                    <View
                        style={[
                            styles.filterContainer,
                            {
                                position: 'absolute',
                                right: 5,
                                bottom: 95, // adjust so it sits above BottomSheet
                                top: 'auto',
                                flexDirection: 'column',
                                alignItems: 'center',
                                zIndex: 0,
                            }
                        ]}
                    >
                        <TouchableOpacity
                            onPress={handleRefresh}
                            style={[
                                styles.filterPill,
                                styles.filterPillUnselected,
                                {
                                    marginBottom: 2,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 40,
                                    height: 40,
                                    borderRadius: 24,
                                    paddingHorizontal: 0,
                                    paddingVertical: 0,
                                    borderWidth: 2, // Thicker border
                                    borderColor: '#1e3a8a',
                                },
                            ]}
                        >
                            <Animated.View
                                style={useAnimatedStyle(() => ({
                                    transform: [{
                                        rotate: `${refreshAnim.value * 360}deg`
                                    }]
                                }))}
                            >
                                <MaterialCommunityIcons name="refresh" size={24} color="#1e3a8a" />
                            </Animated.View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={focusMap}
                            style={[
                                styles.filterButton,
                                styles.filterButtonInActive,
                                {
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 40,
                                    height: 40,
                                    borderRadius: 24,
                                    paddingHorizontal: 0,
                                    paddingVertical: 0,
                                    borderWidth: 2, // Thicker border
                                    borderColor: '#1e3a8a',
                                },
                            ]}
                        >
                            <MaterialCommunityIcons name="crosshairs-gps" size={24} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* 🔘 Filter Buttons */}
                    {/* <ScrollView
                        style={[styles.filterContainer, { position: 'absolute', height: 193, overflow: 'hidden' }]}
                    >
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
                        <TouchableOpacity
                            onPress={() => toggleFilter('pit_stop')}
                            style={[styles.filterButton, filters.pit_stop && styles.filterButtonInActive]}
                        >
                            <MaterialCommunityIcons name="gas-station" size={24} color={filters.pit_stop ? 'white' : '#333'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => toggleFilter('bar')}
                            style={[styles.filterButton, filters.bar && styles.filterButtonInActive]}
                        >
                            <Entypo name="drink" size={24} color={filters.bar ? 'white' : '#333'} />
                        </TouchableOpacity>
                    </ScrollView> */}


                    <BottomSheet
                        ref={bottomSheetRef}
                        index={0}
                        snapPoints={snapPoints}
                        enablePanDownToClose={false}
                        enableContentPanningGesture={!selectedPlace}
                        enableHandlePanningGesture={!selectedPlace}
                        onClose={closeDetails}
                        animatedIndex={animatedIndex}
                        style={[styles.bottomSheet]}
                        backgroundComponent={() => <View style={{ backgroundColor: 'transparent' }} />}
                    >
                        <View style={styles.bottomSheetInner}>
                            {!selectedPlace && (
                                <View style={{ paddingHorizontal: 20, paddingVertical: 5, paddingTop: 11 }}>
                                    {(() => {
                                        // Avoid setState in render: compute label only
                                        const activeFilters = Object.entries(filters).filter(([_, v]) => v).map(([k]) => k);
                                        let label = "Bathroom" + (filteredPlaces.length === 1 ? "" : "s");
                                        if (activeFilters.length === 4) label = "Bathroom" + (filteredPlaces.length === 1 ? "" : "s");
                                        else if (activeFilters.length === 1) {
                                            switch (activeFilters[0]) {
                                                case "restaurant": label = "Restaurant" + (filteredPlaces.length === 1 ? "" : "s"); break;
                                                case "cafe": label = "Café" + (filteredPlaces.length === 1 ? "" : "s"); break;
                                                case "grocery_store": label = "Grocery Store" + (filteredPlaces.length === 1 ? "" : "s"); break;
                                                case "public_bathroom": label = "Public Bathroom" + (filteredPlaces.length === 1 ? "" : "s"); break;
                                                case "pit_stop": label = "Gas Station" + (filteredPlaces.length === 1 ? "" : "s"); break;
                                                case "bar": label = "Bar" + (filteredPlaces.length === 1 ? "" : "s"); break;
                                                default: label = "Bathroom" + (filteredPlaces.length === 1 ? "" : "s");
                                            }
                                        }
                                        return (
                                            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                                <Text style={{ fontSize: 25, padding: 12, fontWeight: '600', color: '#1e3a8a', textAlign: 'center' }}>
                                                    {filteredPlaces.length} {label} Found
                                                </Text>
                                            </View>
                                        );
                                    })()}
                                </View>
                            )}

                            {selectedPlace ? (
                                <View style={[styles.detailsContainer]}>
                                    <View style={{ position: 'relative' }}>
                                        <View style={styles.titleRow}>
                                            <Text
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                                adjustsFontSizeToFit
                                                minimumFontScale={0.7}
                                                style={[styles.placeName, { flex: 1, fontSize: 27, marginBottom: 4, paddingRight: 90 }]}>
                                                {selectedPlace.displayName?.text ?? 'Unnamed Place'}
                                            </Text>
                                        </View>

                                        <View style={{ position: 'absolute', top: 12, right: 0, flexDirection: 'row', gap: 10 }}>
                                            <TouchableOpacity
                                                onPress={async () => {
                                                    try {
                                                        await Share.share({
                                                            message: selectedPlace.googleMapsLinks?.placeUri ?? 'https://maps.google.com',
                                                        });
                                                    } catch (error) {
                                                        console.error('Share failed:', error);
                                                    }
                                                }}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            >
                                                <View style={styles.closeIconCircle}>
                                                    <Octicons name="share" size={17} color="#333" />
                                                </View>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={closeDetails} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                                <View style={styles.closeIconCircle}>
                                                    <MaterialCommunityIcons name="close" size={20} color="#333" />
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {selectedPlace.currentOpeningHours ? (
                                        <Text style={[
                                            styles.detailOpenStatus,
                                            {
                                                color: selectedPlace.currentOpeningHours.openNow ? '#059669' : '#dc2626',
                                                marginBottom: 8,
                                            }
                                        ]}>
                                            {selectedPlace.currentOpeningHours.openNow ? 'Open Now' : 'Closed'}
                                        </Text>
                                    ) : (
                                        <Text style={[
                                            styles.detailOpenStatus,
                                            {
                                                color: '#2d3037ff',
                                                marginVertical: 4,
                                                marginBottom: 9,
                                            }
                                        ]}>
                                            No hours found
                                        </Text>
                                    )}

                                    {selectedPlace.rating != null ? (
                                        <Text style={[styles.detailRating, { marginBottom: 10 }]}>
                                            ⭐ {selectedPlace.rating.toFixed(1)} ({selectedPlace.userRatingCount ?? 0} reviews)
                                        </Text>
                                    ) : (
                                        <Text style={[styles.detailRating, { marginBottom: 10, color: '#6b7280' }]}>
                                            ⭐ 0.0 (No reviews)
                                        </Text>
                                    )}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 1, marginBottom: 10 }}>
                                        <Text
                                            style={{
                                                fontSize: 18,
                                                marginRight: travelMode === 'walking' ? 1 : 5,
                                                color: '#1e3a8a',
                                            }}
                                        >
                                            {travelMode === 'walking' ? '🚶‍♂️' : '🚗'}
                                        </Text>
                                        <Text style={{ fontSize: 17, color: '#1e3a8a' }}>
                                            {selectedPlace.distanceInfo?.[travelMode]?.duration || 'Time unavailable'}
                                        </Text>
                                        <Text style={{ fontSize: 15, color: '#374151', marginLeft: 4 }}>
                                            {selectedPlace.distanceInfo?.[travelMode]?.distance ? `(${selectedPlace.distanceInfo[travelMode].distance})` : ''}
                                        </Text>
                                    </View>

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
                                            onPress={() => openMap({
                                                ...selectedPlace,
                                                travelMode,
                                                travelTime: selectedPlace.distanceInfo?.[travelMode]?.duration || '',
                                                travelDistance: selectedPlace.distanceInfo?.[travelMode]?.distance || ''
                                            })}>
                                            <FontAwesome5 name="directions" size={27} color="#1e3a8a" />
                                            <Text style={{ fontSize: 11, marginTop: 5, color: "#1e3a8a" }}>
                                                {selectedPlace.distanceInfo?.[travelMode]?.duration
                                                    ? selectedPlace.distanceInfo[travelMode].duration
                                                    : 'Distance unavailable'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Banner Ad */}
                                    <View style={{ marginTop: 13, width: '100%', alignItems: 'center' }}>
                                        <BannerAd
                                            unitId="ca-app-pub-3844546379677181/4302897388"
                                            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                                            requestOptions={{
                                                requestNonPersonalizedAdsOnly: false,
                                            }}
                                        />
                                    </View>
                                </View>
                            ) : (
                                <>
                                    {/* Compact Button Row */}
                                    <View style={{ paddingHorizontal: 8, paddingTop: 8, paddingBottom: 10, justifyContent: 'center', alignItems: 'center' }}>
                                        <View style={styles.compactButtonRow}>
                                            {/* Sort Dropdown */}
                                            <View style={{ marginRight: 4 }}>
                                                <SortDropdown sortType={sortType} setSortType={setSortType} />
                                            </View>

                                            {/* Divider */}
                                            <View style={styles.buttonRowDivider} />

                                            {/* Walk/Drive Toggle */}
                                            <View style={styles.travelModeToggle}>
                                                <TouchableOpacity
                                                    style={[styles.travelModeOption, travelMode === 'walking' && { backgroundColor: themeLightBlue }]}
                                                    onPress={() => setTravelMode('walking')}
                                                >
                                                    <FontAwesome5 name="walking" size={17} color={travelMode === 'walking' ? themeDarkBlue : '#666'} />
                                                </TouchableOpacity>
                                                <View style={styles.travelModeDivider} />
                                                <TouchableOpacity
                                                    style={[styles.travelModeOption, travelMode === 'driving' && { backgroundColor: themeLightBlue }]}
                                                    onPress={() => setTravelMode('driving')}
                                                >
                                                    <FontAwesome5 name="car" size={17} color={travelMode === 'driving' ? themeDarkBlue : '#666'} />
                                                </TouchableOpacity>
                                            </View>

                                            {/* Divider */}
                                            <View style={styles.buttonRowDivider} />

                                            {/* Open Now Button */}
                                            <TouchableOpacity
                                                style={[styles.openNowBtn, openNowOnly && styles.openNowBtnActive]}
                                                onPress={() => setOpenNowOnly(prev => !prev)}
                                            >
                                                <Text style={openNowOnly ? styles.openNowTextActive : styles.openNowText}>
                                                    {openNowOnly ? '✓ Open Now' : '  Open Now  '}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
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
                                        ListEmptyComponent={() => (
                                            <Text style={[styles.emptyText, { fontSize: 26, color: '#dc2626', fontWeight: 'bold', textAlign: 'center', marginTop: 24, paddingBottom: 240 }]}>No places found.</Text>
                                        )}
                                    />
                                </>
                            )}
                        </View>
                    </BottomSheet>

                    {/* Add loading indicator */}
                    {isLoading && <LoadingIndicator />}
                </View>
            </GestureHandlerRootView >
        </PortalProvider >
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
    compactButtonRow: {
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
        paddingVertical: 12,
        paddingHorizontal: 12,
        gap: 3,
    },
    buttonRowDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#d1d5db',
    },
    travelModeToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    travelModeOption: {
        width: 32,
        height: 32,
        marginHorizontal: 3,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    travelModeDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#d1d5db',
    },
    openNowBtn: {
        paddingVertical: 6,
        paddingHorizontal: 8,
        marginLeft: 4,
        backgroundColor: 'transparent',
        borderRadius: 999, // pill shape
        borderWidth: 1,
        borderColor: '#1e3a8a', // Blue border
        alignItems: 'center',
        justifyContent: 'center',
    },
    openNowBtnActive: {
        backgroundColor: '#1e3a8a', // Dark blue PottyPal theme
        borderColor: '#1e3a8a',
        borderWidth: 2, // Thicker border when active
        shadowColor: '#1e3a8a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    openNowText: {
        color: '#1e3a8a',
        fontWeight: '600',
        fontSize: 13,
    },
    openNowTextActive: {
        color: '#fff', // White text when selected
        fontWeight: '700',
        fontSize: 13,
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
        height: 120,
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
        fontSize: 20,
        fontWeight: '700',
        color: '#1e3a8a', // deep blue for consistency
    },

    placeRating: {
        fontSize: 15,
        color: '#555', // neutral gray
        marginBottom: 2,
    },

    placeOpenStatus: {
        fontSize: 13.5,
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
        width: 35,
        height: 35,
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
        top: 125, // below the location button
        right: 5,
        flexDirection: 'column',  // column for vertical stack
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 25,
        paddingHorizontal: 8,
        paddingVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 5,
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 7.5,
        borderRadius: 999,
        marginRight: 2,
        marginVertical: 8,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#1e3a8a',
        opacity: 1,
    },
    filterPillSelected: {
        backgroundColor: '#1e3a8a',
        borderWidth: 2,
        borderColor: '#1e3a8a',
        opacity: 1,
    },
    filterPillUnselected: {
        backgroundColor: 'rgba(255,255,255,0.8)', // match gps/refresh/filterContainer
        borderWidth: 1.5,
        borderColor: 'rgba(30,58,138,0.78)', // subtle blue border
        opacity: 1,
    },



    filterButton: {
        marginVertical: 10,
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
        top: 160, // below your branding and filters
        alignSelf: 'center',
        backgroundColor: 'transparent',
    },

    searchThisAreaButton: {
        backgroundColor: '#1e3a8a',
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderRadius: 25,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },

    searchThisAreaText: {
        color: 'white',
        fontSize: 13.5,
        fontWeight: '600',
        textAlign: 'center',
    }
});

