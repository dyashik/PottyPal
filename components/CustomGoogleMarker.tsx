import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Entypo, FontAwesome5 } from '@expo/vector-icons';


// Category-specific marker colors
const MARKER_COLORS = {
    cafe: '#8B4513',           // brown
    restaurant: '#006400',     // dark green
    public_bathroom: '#000080', // navy
    bar: '#000000',            // black
    pit_stop: '#CC0000',       // muted red
    grocery_store: '#CC7000',  // muted orange
    default: '#de1d1dff'       // fallback color
};

// Map primaryType to icon and color
const getMarkerIcon = (primaryType: string) => {
    switch (primaryType) {
        case 'restaurant':
            return { icon: <MaterialCommunityIcons name="silverware-fork-knife" size={17} color="#fff" />, bg: MARKER_COLORS.restaurant };
        case 'cafe':
            return { icon: <MaterialCommunityIcons name="coffee" size={17} color="#fff" />, bg: MARKER_COLORS.cafe };
        case 'grocery_store':
            return { icon: <MaterialCommunityIcons name="cart" size={17} color="#fff" />, bg: MARKER_COLORS.grocery_store };
        case 'public_bathroom':
            return { icon: <FontAwesome5 name="toilet" size={15} color="#fff" />, bg: MARKER_COLORS.public_bathroom };
        case 'pit_stop':
            return { icon: <MaterialCommunityIcons name="gas-station" size={17} color="#fff" />, bg: MARKER_COLORS.pit_stop };
        case 'bar':
            return { icon: <Entypo name="drink" size={17} color="#fff" />, bg: MARKER_COLORS.bar };
        default:
            return { icon: <MaterialCommunityIcons name="map-marker" size={17} color="#fff" />, bg: MARKER_COLORS.default };
    }
};

export default function CustomGoogleMarker({ primaryType }: { primaryType: string }) {
    const { icon, bg } = getMarkerIcon(primaryType);
    return (
        <View style={styles.container}>
            {/* Pin body */}
            <View style={styles.pinBody}>
                {/* Circle with icon */}
                <View style={[styles.circle, { backgroundColor: bg, borderColor: bg }]}>
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
        marginTop: -4,
    },
});
