import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Callout } from 'react-native-maps';

import { Place } from '../utils/api'; // Adjust the import path as necessary    

type CustomCalloutProps = {
    place: Place;
};

function formatType(primaryType: string | undefined): React.ReactNode {
    if (!primaryType) return null;
    // Convert snake_case or underscore to Title Case
    const formatted = primaryType
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
    return formatted;
}

const CustomCallout: React.FC<CustomCalloutProps> = ({ place }) => (
    <Callout tooltip alphaHitTest={false}>
        <View style={styles.calloutContainer}>
            <Text style={styles.title} numberOfLines={1}>
                {place.displayName?.text ?? 'Place'}
            </Text>

            <Text style={styles.address} numberOfLines={1}>
                {formatType(place.primaryType)}
            </Text>
            {/* 
            {place.rating && (
                <Text style={[styles.placeRating, { marginTop: 6 }]}>
                    ⭐ {place.rating.toFixed(1)}
                </Text>
            )} 
            */}
        </View>
    </Callout>
);

// Paste your provided styles object here
const styles = StyleSheet.create({
    placeRating: {
        fontSize: 14,
        color: '#555',
        marginBottom: 2,
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
        borderWidth: 1,
        borderColor: '#1e3a8a',
    },
    title: {
        fontWeight: '700',
        fontSize: 16,
        color: '#1e3a8a',
        marginBottom: 4,
        textAlign: 'left',
    },
    address: {
        fontSize: 13,
        color: '#555',
        textAlign: 'left',
    }
});

export default CustomCallout;