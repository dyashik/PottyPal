# 🚽 PottyPal

# Map. Tap. Crap.

**Your trusted companion for finding clean, accessible bathrooms near you!**

PottyPal is a React Native mobile app built with Expo that helps users locate nearby bathrooms in restaurants, cafes, gas stations, grocery stores, and public facilities. With real-time location tracking, detailed directions, and helpful entry tips, PottyPal makes finding a restroom stress-free.

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/dyashik/PottyPal)
[![React Native](https://img.shields.io/badge/React%20Native-0.79.6-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-53.0.19-000020.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)

## 📱 Features

### 🗺️ Smart Map Interface
- **Interactive Map**: Custom-styled Google Maps with clean, bathroom-focused design
- **Real-time Location**: GPS tracking to show your current position with live distance updates
- **Smart Markers**: Color-coded custom markers for different venue types (restaurants, cafes, gas stations, public bathrooms, bars, grocery stores)
- **Custom Callouts**: Detailed popup information for each location with auto-show on selection
- **Auto-Fit View**: Automatically adjusts map to show all nearby bathrooms on launch

### 🔍 Intelligent Search & Filtering
- **Automatic Discovery**: Finds bathrooms within your current area on app launch
- **Dynamic Search**: "Search This Area" button appears when you move the map
- **Horizontal Filter Pills**: Swipeable category filters with visual feedback and icon indicators
- **Smart Single-Select Filters**: Tap a filter to view only that category; tap again to show all
- **Open Now Filter**: Toggle to show only currently open venues
- **Smart Sorting**: Sort by distance (default) or popularity (ratings)
- **Radius-based Results**: Efficient search within optimal distance ranges
- **No Results Alert**: Friendly modal notification when no new bathrooms are found in an area

### 🚶‍♂️ Navigation & Directions
- **Walking & Driving Modes**: Quick toggle between transportation methods in the bottom sheet
- **Real-time Directions**: Turn-by-turn navigation with Google Maps and Mapbox integration
- **Live Distance Updates**: Automatically refreshes distances as you move (every 160+ meters)
- **Distance & Time**: Accurate estimates for both walking and driving displayed on each card
- **Route Visualization**: Beautiful polyline routes on detail screens
- **Emoji Transport Indicators**: 🚶‍♂️ for walking, 🚗 for driving throughout the UI

### 📍 Venue Information & Details
- **Detailed Place Cards**: Comprehensive ratings, reviews, hours, and contact information
- **Accessibility Info**: Wheelchair accessibility details where available
- **Entry Tips**: Helpful hints for accessing bathrooms in different venue types
- **Opening Hours**: Real-time open/closed status with validation
- **Share Functionality**: Share location links with friends
- **Auto-Opening Callouts**: Selected markers automatically show callouts on detail screens

### 🎯 Enhanced User Experience
- **Bottom Sheet Interface**: Smooth, gesture-friendly browsing with intelligent snap points
- **Responsive Snap Heights**: Dynamically adjusts for list view (40%), selected place (33%), and expanded view (70%)
- **Auto-Expand on Search**: Bottom sheet opens to 40% when new results are found
- **Compact Control Row**: Integrated sort, walk/drive toggle, and open now filter in one streamlined bar
- **Refresh & GPS Buttons**: Quick circular buttons with animations (GPS centers map, Refresh resets all)
- **Loading Indicator**: Elegant spinning PottyPal logo animation during searches
- **Visual Feedback**: Rotating refresh icon, smooth transitions, and intuitive gestures
- **Category Icons**: Visual icons for each venue type (🍴 restaurants, ☕ cafes, 🛒 grocery, 🚽 public bathrooms, ⛽ gas stations, 🍺 bars)

### 🚀 Performance & Optimization
- **Intelligent Caching**: 12-hour cache system with AsyncStorage persistence
- **Cache Validation**: Automatically detects and refreshes stale open/closed status data
- **Smart Cache Matching**: Uses nearby cached locations within 100m threshold
- **Memory Management**: Prevents redundant API calls with checked areas tracking
- **Debounced Search**: 700ms debounce prevents excessive API requests
- **Smooth Animations**: 60fps animations with React Native Reanimated
- **Optimized Rendering**: Efficient FlatList with proper key extraction
- **Background Location Watching**: Continuous location updates for live distance calculations

### 💰 Monetization
- **Google AdMob Integration**: Banner ads on navigation and detail screens
- **Adaptive Banner Ads**: Responsive ad sizing for different screen sizes
- **Non-intrusive Placement**: Ads positioned at bottom of screens to not disrupt user experience

## 🛠️ Technical Stack

### Frontend
- **React Native**: 0.79.6 with New Architecture enabled
- **Expo**: 53.0.19 for streamlined development and deployment
- **TypeScript**: 5.8.3 with full type safety and enhanced developer experience
- **React Native Reanimated**: 3.17.4 for smooth 60fps animations and transitions
- **Expo Router**: 5.1.3 file-based navigation system with fade animations

### Maps & Location
- **React Native Maps**: 1.20.1 - Google Maps integration with custom styling
- **Expo Location**: 18.1.6 - Precise GPS tracking and continuous location services
- **Google Places API**: Rich venue data and search capabilities
- **Google Directions API**: Turn-by-turn navigation and route planning
- **Google Distance Matrix API**: Accurate time and distance calculations for both walking and driving
- **Mapbox Navigation**: 0.5.2 - Alternative navigation provider
- **Polyline Decoding**: Route visualization with @mapbox/polyline

### UI/UX Libraries
- **@gorhom/bottom-sheet**: 5.1.6 - Modern bottom sheet component with gesture handling
- **@gorhom/portal**: 1.0.14 - Portal provider for modals and overlays
- **React Native Reanimated**: 3.17.4 - Fluid animations and gestures
- **React Native Safe Area Context**: 5.4.0 - Safe area handling across devices
- **Expo Blur**: 14.1.5 - Beautiful blur effects for glassmorphism design
- **Lucide React Native**: 0.525.0 - Modern icon library (ChevronDown and more)
- **Expo Image**: 2.3.2 - Optimized image component with caching

### State Management & Data
- **Zustand**: 5.0.6 - Lightweight state management for place data
- **AsyncStorage**: 2.1.2 - Persistent local storage for cache management
- **React Hooks**: Advanced state management with useState, useEffect, useRef, useMemo, useCallback

### Monetization
- **React Native Google Mobile Ads**: 15.4.0 - AdMob banner and interstitial ads integration

### Performance & Optimization
- **@shopify/flash-list**: 1.7.6 - High-performance list rendering (60fps)
- **React Native Background Timer**: 2.4.1 - Background task management
- **React Native Clusterer**: 3.0.0 - Marker clustering for map performance

### Development Tools
- **Jest**: 29.2.1 - Unit testing framework
- **Patch Package**: 8.0.1 - Apply custom patches to dependencies
- **TypeScript**: 5.8.3 - Static type checking
- **Metro**: React Native bundler
- **React Native CLI**: 18.0.0

## 📁 Project Structure

```
PottyPal/
├── app/                          # Main app screens (Expo Router)
│   ├── index.tsx                # Main map screen with advanced caching & filters
│   ├── loadingScreen.tsx        # Initial loading screen with animations
│   ├── locationDenied.tsx       # Location permission denied screen
│   ├── _layout.tsx              # Root layout configuration
│   └── places/                  # Place-related screens
│       ├── [id].tsx            # Individual place details with ads
│       ├── fullScreenMap.tsx    # Full-screen navigation with route polylines
│       ├── navigation.tsx       # Turn-by-turn navigation screen with ads
│       └── _layout.tsx         # Navigation layout with fade animations
├── components/                   # Reusable UI components
│   ├── BrandingContainer.tsx    # App logo and branding with positioning
│   ├── CustomCallout.tsx       # Enhanced map marker callouts
│   ├── CustomGoogleMarker.tsx   # Color-coded category markers
│   ├── LoadingIndicator.tsx    # Animated spinning PottyPal logo
│   ├── SortDropDown.tsx        # Sorting dropdown with Lucide icons
│   ├── TravelModeDropdown.tsx   # Walk/Drive mode selector
│   ├── ErrorBoundary.tsx       # Error handling component
│   └── Themed.tsx              # Theme-aware components
├── utils/                       # Utility functions and types
│   ├── api.ts                  # API interfaces, types, and Place interface
│   └── usePlaceStore.ts        # Zustand store for global place state
├── config/                      # Configuration files
│   └── getGoogleMapsKey.tsx    # Google Maps API key management (iOS/Android)
├── constants/                   # App constants
│   └── Colors.ts               # Comprehensive color scheme definitions
├── assets/                      # Static assets
│   ├── images/                 # App icons, splash screens, transparent logo
│   └── fonts/                  # Custom fonts (SpaceMono)
├── ios/                         # iOS-specific configuration
│   ├── Podfile                 # CocoaPods dependencies
│   └── PottyPal/               # iOS native code
├── patches/                     # Custom dependency patches
│   └── @pawan-pk+react-native-mapbox-navigation+0.5.2.patch
├── build/                       # Build artifacts
└── app.json                    # Expo configuration with plugins
```


## 🎨 Design Philosophy

### User-Centric Design
- **Minimal Cognitive Load**: Clean interface that focuses on the essential task
- **Gesture-Friendly**: Bottom sheets and swipe interactions for mobile-first experience
- **Accessibility**: Support for screen readers and accessibility features
- **Performance**: 60fps animations and optimized for smooth scrolling and instant interactions
- **Responsive Layouts**: Adaptive sizing based on device dimensions with safe area support

### Visual Design
- **Custom Color Scheme**: 
  - Primary Blue: #1e3a8a (PottyPal brand blue)
  - Light Blue: rgba(224, 242, 253, 1) (backgrounds)
  - Category Colors: Custom colors for each venue type
- **Glassmorphism**: Modern frosted glass effects (rgba(255,255,255,0.85)) for depth and elegance
- **Custom Map Styling**: Clean, distraction-free PottyPal theme with muted colors
- **Consistent Typography**: Clear hierarchy with bold titles (20-29px) and readable body text (13-16px)
- **Icon System**: Emoji-based transport indicators and MaterialCommunityIcons for actions
- **Pill-Shaped Buttons**: Rounded, accessible buttons with consistent 999px border radius

### Interaction Design
- **Smart Feedback**: Loading indicators appear after 100-500ms delay
- **Animated Transitions**: Smooth bottom sheet snapping and icon rotations
- **Touch Targets**: Minimum 40x40px touch areas for all interactive elements
- **Visual States**: Clear selected/unselected states for filters with color and border changes
- **Haptic Feedback**: Native gesture handling with React Native Gesture Handler

## 📊 Key Features Breakdown

### Advanced Caching System
```typescript
// 12-hour cache with AsyncStorage persistence
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours
const CACHE_DISTANCE_THRESHOLD = 100; // meters

// Smart cache key generation (rounded to ~5 meter precision)
const generateCacheKey = (latitude: number, longitude: number, radius: number): string => {
    const lat = Math.round(latitude * 100000) / 100000;
    const lng = Math.round(longitude * 100000) / 100000;
    return `${lat},${lng},${rad}`;
};

// Intelligent cache validation for stale open/closed status
const validateCachedPlaces = (cachedPlaces: Place[]): boolean => {
    for (const place of cachedPlaces) {
        const shouldBeOpen = shouldPlaceBeOpen(place);
        const isMarkedOpen = place.currentOpeningHours?.openNow;
        if (shouldBeOpen !== null && shouldBeOpen !== isMarkedOpen) {
            return false; // Cache is stale, trigger refresh
        }
    }
    return true; // Cache is valid
};

// Check memory cache first, then AsyncStorage, then nearby locations
const getCachedPlaces = async (lat, lng, radius) => {
    // Exact match or nearby match within 100m threshold
    // Returns cached data if valid, null if needs refresh
};
```

### Map Intelligence & Search Optimization
```typescript
// Efficient radius-based searching
const radius = widthInMeters / 1.75;
const shouldFetch = shouldFetchNewData(region);

// Smart area coverage tracking to prevent duplicate searches
const isRegionCovered = (lat, lng, radius) => {
    return checkedAreasRef.current.some(area => {
        const distance = calculateDistance(lat, lng, area);
        return area.radius >= distance + radius * 0.9; // 90% coverage check
    });
};

// Debounced search with 700ms delay
debounceRef.current = setTimeout(() => {
    InteractionManager.runAfterInteractions(() => {
        fetchNearbyPlaces(currentRegion.latitude, currentRegion.longitude, radius);
    });
}, 700);
```

### Real-time Location & Distance Updates
```typescript
// Live location tracking with 20m distance threshold
const watchPositionAsync = await Location.watchPositionAsync({
    accuracy: Location.Accuracy.Highest,
    distanceInterval: 20,
    timeInterval: 5000,
}, updateDistances);

// Automatic distance refresh when user moves 160+ meters
const maybeUpdateDistances = async (newCoords) => {
    const distanceMoved = calculateHaversineDistance(prevCoords, newCoords);
    if (distanceMoved > 160) {
        // Refresh all walking and driving distances
        const updated = await Promise.all(
            places.map(place => fetchWalkingTimeAndDistance(place))
        );
        setPlaces(updated);
    }
};
```

### Smart Venue Classification
```typescript
// Comprehensive venue categorization
function mapToFilterCategory(type: string): FilterCategory {
    const groceryTypes = ['grocery_store', 'supermarket', 'market', 'convenience_store'];
    const cafeTypes = ['cafe', 'coffee_shop', 'bakery', 'ice_cream_shop'];
    const restaurantTypes = ['restaurant', 'fast_food_restaurant', 'buffet_restaurant'];
    const publicBathroomTypes = ['public_bathroom', 'restroom', 'toilet', 'washroom'];
    const pitStopTypes = ['gas_station', 'rest_stop'];
    // ... intelligent pattern matching for 50+ venue types
}
```

### Advanced Sorting Algorithm
```typescript
// Sort by distance (parsing miles/feet) or popularity (ratings)
const parseDurationToMinutes = (durationStr: string): number => {
    // Handles "12 mins", "1 hour 5 mins", etc.
};

const sortedPlaces = filteredPlaces.slice().sort((a, b) => {
    if (sortType === 'popularity') {
        return (b.rating ?? 0) - (a.rating ?? 0);
    } else {
        // Sort by distance first, then duration as tiebreaker
        const milesA = parseDistanceToMiles(a.distanceInfo?.walking?.distance);
        const milesB = parseDistanceToMiles(b.distanceInfo?.walking?.distance);
        return milesA !== milesB ? milesA - milesB : minA - minB;
    }
});
```

### Responsive Bottom Sheet Snap Points
```typescript
// Dynamic snap points based on device height and safe areas
const snapPoints = useMemo(() => {
    const availableHeight = height - insets.top - insets.bottom;
    const collapsedHeight = Math.max(100, availableHeight * 0.05);  // 5%
    const midHeight = Math.max(300, availableHeight * 0.40);         // 40% for list
    const selectedHeight = Math.max(280, availableHeight * 0.3333); // 33% for details
    const expandedHeight = Math.max(400, availableHeight * 0.70);   // 70% expanded
    
    return selectedPlace 
        ? [`${selectedPercent}%`] 
        : [`${collapsedPercent}%`, `${midPercent}%`, `${expandedPercent}%`];
}, [selectedPlace, insets]);
```

## 🆕 What's New in v2.0

### Major Features Added
- **Intelligent Caching System**: 12-hour persistent cache with AsyncStorage dramatically reduces API calls and improves load times
- **Cache Validation**: Automatically detects and refreshes stale open/closed status to ensure accuracy
- **Horizontal Filter Pills**: Beautiful swipeable category filters replacing vertical buttons
- **Live Distance Updates**: Distances automatically refresh as you move (every 160+ meters)
- **Enhanced Loading States**: Elegant animated PottyPal logo spinner with smart delays
- **No Results Modal**: Friendly notification when no new bathrooms are found in an area
- **Auto-Expanding Bottom Sheet**: Opens to 40% when new results are found to show changes
- **Compact Control Row**: Streamlined sort, walk/drive toggle, and open now filter in one bar
- **Sort by Popularity**: New sorting option to find highest-rated bathrooms
- **Responsive Snap Points**: Dynamic bottom sheet heights that adapt to screen size
- **Custom Map Styling**: Beautiful PottyPal-themed map with muted colors
- **Auto-Show Callouts**: Marker callouts automatically appear on detail screens
- **AdMob Integration**: Banner ads on navigation and detail screens

### Performance Improvements
- **90%+ Reduction in API Calls**: Intelligent caching system
- **60fps Animations**: Smooth transitions with React Native Reanimated 3.17.4
- **FlashList Integration**: High-performance list rendering
- **Optimized Marker Rendering**: tracksViewChanges={false} prevents unnecessary re-renders
- **Smart Debouncing**: 700ms delay prevents excessive search requests
- **Memory Optimization**: Proper cleanup of all watchers and timers

### UI/UX Enhancements
- **Visual Category Icons**: 🍴☕🛒🚽⛽🍺 icons for each venue type
- **Animated Refresh Button**: Spinning animation when refreshing
- **Circular GPS Button**: New modern design matching refresh button
- **Enhanced Filter Feedback**: Clear visual states for selected/unselected filters
- **Smart Single-Select**: Tap a filter to show only that category; tap again to show all
- **Distance Parsing**: Properly sorts by miles/feet with fallback to minutes
- **Emoji Transport Indicators**: 🚶‍♂️ for walking, 🚗 for driving
- **Improved Touch Targets**: All buttons meet 40x40px minimum for accessibility

### Developer Experience
- **TypeScript 5.8.3**: Latest TypeScript with improved type inference
- **Patch Package**: Custom patches for dependency fixes
- **React Native 0.79.6**: Latest stable version with bug fixes
- **Better Error Handling**: Comprehensive try-catch blocks and fallbacks
- **Code Organization**: Cleaner separation of concerns and reusable utilities

## 📱 Platform Support

### iOS
- **Minimum Version**: iOS 12.0
- **Architecture**: Universal (iPhone/iPad)
- **Features**: Native Google Maps, Core Location integration, AdMob support
- **CocoaPods**: Fully integrated with Podfile.lock


## 🔄 API Integration

### Google Places API (Nearby Search)
```typescript
const fetchNearbyPlaces = async (latitude, longitude, radius) => {
    // Check cache first
    const cachedPlaces = await getCachedPlaces(latitude, longitude, radius);
    if (cachedPlaces) return cachedPlaces;

    const response = await fetch(
        "https://places.googleapis.com/v1/places:searchNearby",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": apiKey,
                "X-Goog-FieldMask": 
                    "places.displayName," +
                    "places.formattedAddress," +
                    "places.location," +
                    "places.rating," +
                    "places.userRatingCount," +
                    "places.restroom," +
                    "places.accessibilityOptions," +
                    "places.primaryType," +
                    "places.googleMapsUri," +
                    "places.googleMapsLinks.directionsUri," +
                    "places.googleMapsLinks.placeUri," +
                    "places.currentOpeningHours.openNow," +
                    "places.currentOpeningHours.weekdayDescriptions"
            },
            body: JSON.stringify({
                includedTypes: [
                    "restaurant", "cafe", "bar", "coffee_shop",
                    "fast_food_restaurant", "grocery_store", "supermarket",
                    "public_bathroom", "convenience_store", "gas_station",
                    "rest_stop", "market", "liquor_store"
                ],
                maxResultCount: 20,
                rankPreference: "DISTANCE",
                locationRestriction: {
                    circle: { center: { latitude, longitude }, radius }
                }
            })
        }
    );

    // Filter for places with restrooms and cache results
    const filteredPlaces = data.places.filter(
        place => place.restroom === true || place.primaryType === 'public_bathroom'
    );
    
    await cachePlaces(latitude, longitude, radius, filteredPlaces);
    return filteredPlaces;
};
```

### Google Distance Matrix API
```typescript
const fetchWalkingTimeAndDistance = async (place: Place) => {
    const userLocation = await Location.getCurrentPositionAsync({});
    const modes = ["walking", "driving"];
    const results: Record<string, { duration: string; distance: string }> = {};

    for (const mode of modes) {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?` +
            `origins=${userLat},${userLng}&` +
            `destinations=${destinationLat},${destinationLng}&` +
            `mode=${mode}&units=imperial&key=${apiKey}`;
        
        const data = await fetch(url).then(r => r.json());
        results[mode] = {
            duration: data.rows[0].elements[0].duration.text,
            distance: data.rows[0].elements[0].distance.text
        };
    }

    return results; // { walking: {...}, driving: {...} }
};
```

### Google Directions API
```typescript
async function fetchRoute(origin, destination, mode: 'walking' | 'driving') {
    const url = `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${origin.latitude},${origin.longitude}&` +
        `destination=${destination.latitude},${destination.longitude}&` +
        `mode=${mode}&key=${API_KEY}`;
    
    const data = await fetch(url).then(r => r.json());
    
    if (data.routes.length) {
        // Decode polyline for route visualization
        const points = polyline.decode(data.routes[0].overview_polyline.points);
        const route = points.map(point => ({
            latitude: point[0],
            longitude: point[1]
        }));
        setRouteCoords(route);
    }
}
```

## 🚀 Performance Optimizations

### Advanced Caching Strategy
- **Dual-Layer Cache**: In-memory Map cache + AsyncStorage persistence
- **12-Hour Cache Duration**: Reduces API calls by 90%+
- **Smart Proximity Matching**: Reuses cache for locations within 100m
- **Cache Validation**: Automatically detects and refreshes stale data
- **Empty Cache Prevention**: Never caches empty results to avoid false negatives

### Map Performance
- **React Native Clusterer**: Efficient marker clustering for 100+ markers
- **Lazy Loading**: Load place details only when needed
- **Debounced Search**: 700ms debounce prevents excessive API calls
- **Region Coverage Tracking**: Avoids redundant searches in covered areas
- **tracksViewChanges={false}**: Prevents unnecessary marker re-renders
- **Optimized Polyline**: Decoded route visualization with minimal re-renders

### Real-time Location Optimization
- **Smart Distance Threshold**: Only updates when moved 20+ meters
- **Batch Distance Updates**: Updates all places simultaneously when threshold reached
- **Haversine Distance Calculation**: Efficient great-circle distance computation
- **Background Location Watching**: Continuous tracking without blocking UI

### Memory Management
- **Proper Cleanup**: All timers, watchers, and subscriptions cleaned up on unmount
- **useRef for Mutable Values**: Prevents unnecessary re-renders
- **useMemo for Expensive Calculations**: Snap points, sorted places cached
- **useCallback for Event Handlers**: Stable function references
- **InteractionManager**: Defers non-critical work until animations complete

### App Performance
- **React Native New Architecture**: Enabled for Fabric renderer and TurboModules
- **FlashList**: 60fps list rendering with optimized recycling
- **Bundle Optimization**: Code splitting and tree shaking
- **Image Optimization**: Expo Image with built-in caching and WebP support
- **Smooth Animations**: 60fps animations with React Native Reanimated 3.17.4
- **Loading Delays**: Smart 100-500ms delays prevent loading flicker on fast operations

## 🔒 Privacy & Security

### Location Privacy
- **Minimal Data Collection**: Only collect location when actively using the app
- **Secure API Calls**: All requests use HTTPS encryption
- **No Location Tracking**: Location is not stored or shared with third parties
- **Transparent Permissions**: Clear explanations for why location access is needed

### Data Handling
- **Local Storage**: Most data cached locally for offline access
- **API Rate Limiting**: Respectful API usage to prevent abuse
- **Error Handling**: Graceful fallbacks when services are unavailable

## 📈 Future Roadmap

### Planned Features
- [ ] **Offline Mode**: Enhanced offline support with pre-cached areas
- [ ] **User Reviews**: Community-driven bathroom ratings and photo uploads
- [ ] **Accessibility Filters**: Advanced filtering for specific accessibility needs (changing tables, family bathrooms)
- [ ] **Apple Watch App**: Quick bathroom finding on your wrist with haptic feedback
- [ ] **Voice Navigation**: Audio directions for hands-free navigation
- [ ] **Bathroom Crowding**: Real-time crowding indicators based on Google Popular Times
- [ ] **Save Favorites**: Bookmark frequently visited locations
- [ ] **History Tracking**: View recently visited bathrooms

### Technical Improvements
- [ ] **Social Features**: Share favorite spots with friends via deep links
- [ ] **Real-time Availability**: Live updates on bathroom availability through user check-ins
- [ ] **Improved Clustering**: Dynamic cluster radius based on zoom level

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Style
- Follow TypeScript best practices
- Use ESLint configuration provided
- Write meaningful commit messages
- Include tests for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Maps Platform** for reliable mapping and location services
- **Expo Team** for making React Native development accessible
- **React Native Community** for excellent libraries and tools
- **Open Source Contributors** who make projects like this possible

## 📞 Support

For support, questions, or feedback:

- **Issues**: [GitHub Issues](https://github.com/dyashik/PottyPal/issues)
- **Discussions**: [GitHub Discussions](https://github.com/dyashik/PottyPal/discussions)
- **Email**: yashikdhanaraj@gmail.com
- **Website**: https://idyllic-vacherin-ef69d4.netlify.app/

---

**Made with 💙 by Yashik Dhanaraj**

*Helping people find clean, accessible bathrooms wherever they are.*
