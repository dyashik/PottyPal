import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Entypo, FontAwesome5 } from '@expo/vector-icons';


// Commonized default marker color
const DEFAULT_MARKER_COLOR = '#de1d1dff'; // Brighter muted red

// Map primaryType to icon and color
const getMarkerIcon = (primaryType: string) => {
    switch (primaryType) {
        case 'restaurant':
            return { icon: <MaterialCommunityIcons name="silverware-fork-knife" size={17} color="#fff" />, bg: DEFAULT_MARKER_COLOR };
        case 'cafe':
            return { icon: <MaterialCommunityIcons name="coffee" size={17} color="#fff" />, bg: DEFAULT_MARKER_COLOR };
        case 'grocery_store':
            return { icon: <MaterialCommunityIcons name="cart" size={17} color="#fff" />, bg: DEFAULT_MARKER_COLOR };
        case 'public_bathroom':
            return { icon: <FontAwesome5 name="toilet" size={15} color="#fff" />, bg: DEFAULT_MARKER_COLOR };
        case 'pit_stop':
            return { icon: <MaterialCommunityIcons name="gas-station" size={17} color="#fff" />, bg: DEFAULT_MARKER_COLOR };
        case 'bar':
            return { icon: <Entypo name="drink" size={17} color="#fff" />, bg: DEFAULT_MARKER_COLOR };
        default:
            return { icon: <MaterialCommunityIcons name="map-marker" size={17} color="#fff" />, bg: DEFAULT_MARKER_COLOR };
    }
};

export default function CustomGoogleMarker({ primaryType }: { primaryType: string }) {
    const { icon, bg } = getMarkerIcon(primaryType);
    return (
        <View style={styles.container}>
            {/* Pin body */}
            <View style={styles.pinBody}>
                {/* Circle with icon */}
                <View style={[styles.circle, { backgroundColor: bg }]}>
                    {icon}
                </View>
            </View>
            {/* Pin tip (triangle) */}
            <View style={[styles.triangle, { borderTopColor: bg }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 38,
        height: 48,
    },
    pinBody: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    circle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: DEFAULT_MARKER_COLOR,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 4,
        elevation: 4,
    },
    triangle: {
        width: 0,
        height: 0,
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderTopWidth: 16,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: DEFAULT_MARKER_COLOR,
        marginTop: -4,
    },
});
