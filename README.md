# 🚽 PottyPal

**Your trusted companion for finding clean, accessible bathrooms near you!**

PottyPal is a React Native mobile app built with Expo that helps users locate nearby bathrooms in restaurants, cafes, gas stations, grocery stores, and public facilities. With real-time location tracking, detailed directions, and helpful entry tips, PottyPal makes finding a restroom stress-free.

[![Version](https://img.shields.io/badge/version-1.9.2-blue.svg)](https://github.com/dyashik/PottyPal)
[![React Native](https://img.shields.io/badge/React%20Native-0.79.5-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-53.0.19-000020.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)

## 📱 Features

### 🗺️ Smart Map Interface
- **Interactive Map**: Custom-styled Google Maps with clean, bathroom-focused design
- **Real-time Location**: GPS tracking to show your current position
- **Smart Markers**: Color-coded markers for different venue types
- **Custom Callouts**: Detailed popup information for each location

### 🔍 Intelligent Search
- **Automatic Discovery**: Finds bathrooms within your current area
- **Dynamic Search**: "Search This Area" button when you move the map
- **Smart Filtering**: Filter by venue type (restaurants, cafes, gas stations, etc.)
- **Radius-based Results**: Efficient search within optimal distance ranges

### 🚶‍♂️ Navigation & Directions
- **Walking & Driving Modes**: Toggle between transportation methods
- **Real-time Directions**: Step-by-step navigation with Google Maps integration
- **Distance & Time**: Accurate estimates for both walking and driving
- **Route Visualization**: Beautiful polyline routes with dashed styling

### 📍 Venue Information
- **Detailed Place Cards**: Ratings, hours, and contact information
- **Accessibility Info**: Wheelchair accessibility details where available
- **Entry Tips**: Helpful hints for accessing bathrooms in different venue types
- **Opening Hours**: Real-time open/closed status

### 🎯 User Experience
- **Bottom Sheet Interface**: Smooth, gesture-friendly browsing
- **Filter Pills**: Easy-to-use category filters with visual feedback
- **Refresh & GPS**: Quick buttons to refresh results or return to current location
- **Loading States**: Smart loading indicators that don't overwhelm the UI

## 🛠️ Technical Stack

### Frontend
- **React Native**: 0.79.5 with New Architecture enabled
- **Expo**: 53.0.19 for streamlined development and deployment
- **TypeScript**: Full type safety and enhanced developer experience
- **React Native Reanimated**: Smooth animations and transitions
- **Expo Router**: File-based navigation system

### Maps & Location
- **React Native Maps**: Google Maps integration with custom styling
- **Expo Location**: Precise GPS tracking and location services
- **Google Places API**: Rich venue data and search capabilities
- **Google Directions API**: Turn-by-turn navigation and route planning
- **Google Distance Matrix API**: Accurate time and distance calculations

### UI/UX Libraries
- **@gorhom/bottom-sheet**: Modern bottom sheet component
- **React Native Reanimated**: Fluid animations and gestures
- **React Native Safe Area Context**: Safe area handling across devices
- **Expo Blur**: Beautiful blur effects for glassmorphism design

### State Management
- **Zustand**: Lightweight state management for place data
- **React Hooks**: Local state management with useState and useEffect

### Development Tools
- **Jest**: Unit testing framework
- **ESLint**: Code linting and style enforcement
- **TypeScript**: Static type checking
- **Metro**: React Native bundler

## 📁 Project Structure

```
PottyPal/
├── app/                          # Main app screens (Expo Router)
│   ├── index.tsx                # Main map screen with bathroom finder
│   ├── loadingScreen.tsx        # Initial loading screen
│   ├── locationDenied.tsx       # Location permission denied screen
│   └── places/                  # Place-related screens
│       ├── [id].tsx            # Individual place details
│       ├── fullScreenMap.tsx    # Full-screen navigation view
│       └── _layout.tsx         # Navigation layout with fade animations
├── components/                   # Reusable UI components
│   ├── BrandingContainer.tsx    # App logo and branding
│   ├── CustomCallout.tsx       # Map marker callouts
│   ├── LoadingIndicator.tsx    # Loading spinner component
│   └── SortDropDown.tsx        # Sorting options dropdown
├── utils/                       # Utility functions and types
│   ├── api.ts                  # API interfaces and types
│   └── usePlaceStore.ts        # Zustand store for place data
├── config/                      # Configuration files
│   └── getGoogleMapsKey.tsx    # Google Maps API key management
├── constants/                   # App constants
│   └── Colors.ts               # Color scheme definitions
├── assets/                      # Static assets
│   ├── images/                 # App icons and splash screens
│   └── fonts/                  # Custom fonts
├── ios/                         # iOS-specific configuration
├── android/                     # Android-specific configuration
└── app.json                    # Expo configuration
```


## 🎨 Design Philosophy

### User-Centric Design
- **Minimal Cognitive Load**: Clean interface that focuses on the essential task
- **Gesture-Friendly**: Bottom sheets and swipe interactions for mobile-first experience
- **Accessibility**: Support for screen readers and accessibility features
- **Performance**: Optimized for smooth scrolling and quick interactions

### Visual Design
- **Custom Color Scheme**: Bathroom-focused blue theme (#1e3a8a)
- **Glassmorphism**: Modern frosted glass effects for depth
- **Custom Map Styling**: Clean, distraction-free map appearance
- **Consistent Typography**: Clear hierarchy and readable text sizes

## 📊 Key Features Breakdown

### Map Intelligence
```typescript
// Efficient radius-based searching
const radius = widthInMeters / 1.75;
const shouldFetch = shouldFetchNewData(region);

// Smart caching to avoid redundant API calls
const isRegionCovered = (lat, lng, radius) => {
    return checkedAreasRef.current.some(area => {
        const distance = calculateDistance(lat, lng, area);
        return area.radius >= distance + radius * 0.9;
    });
};
```

### Real-time Updates
```typescript
// Live location tracking for distance updates
const watchPositionAsync = await Location.watchPositionAsync({
    accuracy: Location.Accuracy.Highest,
    distanceInterval: 20,
    timeInterval: 5000,
}, updateDistances);
```

### Venue Classification
```typescript
// Smart categorization of venues
function mapToFilterCategory(type: string): FilterCategory {
    const groceryTypes = ['grocery_store', 'supermarket', 'market'];
    const cafeTypes = ['cafe', 'coffee_shop', 'bakery'];
    // ... intelligent mapping logic
}
```

## 📱 Platform Support

### iOS
- **Minimum Version**: iOS 12.0
- **Architecture**: Universal (iPhone/iPad)
- **Features**: Native Google Maps, Core Location integration


## 🔄 API Integration

### Google Places API
```typescript
const fetchNearbyPlaces = async (latitude, longitude, radius) => {
    const response = await fetch(
        "https://places.googleapis.com/v1/places:searchNearby",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": apiKey,
                "X-Goog-FieldMask": "places.displayName,places.location..."
            },
            body: JSON.stringify({
                includedTypes: ["restaurant", "cafe", "public_bathroom", ...],
                maxResultCount: 20,
                locationRestriction: { circle: { center, radius } }
            })
        }
    );
};
```

## 🚀 Performance Optimizations

### Map Performance
- **Marker Clustering**: Efficient handling of multiple markers
- **Lazy Loading**: Load place details only when needed
- **Debounced Search**: Prevent excessive API calls during map movement
- **Memory Management**: Proper cleanup of location watchers and timers

### App Performance
- **React Native New Architecture**: Enabled for better performance
- **Bundle Optimization**: Code splitting and tree shaking
- **Image Optimization**: Compressed assets and adaptive icons
- **Smooth Animations**: 60fps animations with Reanimated

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
- [ ] **Offline Mode**: Cache frequently visited areas for offline access
- [ ] **User Reviews**: Community-driven bathroom ratings and reviews
- [ ] **Accessibility Filters**: Enhanced filtering for accessibility needs
- [ ] **Apple Watch App**: Quick bathroom finding on your wrist
- [ ] **Voice Navigation**: Audio directions for hands-free navigation

### Technical Improvements
- [ ] **Background Location**: Smart notifications for nearby bathrooms
- [ ] **ML Recommendations**: Machine learning for personalized suggestions
- [ ] **Social Features**: Share favorite spots with friends
- [ ] **Real-time Availability**: Live updates on bathroom availability

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
