import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import MapView, { Callout } from 'react-native-maps';

import { Place } from '../utils/api';

type CustomCalloutProps = {
    place: Place;
};

function formatType(primaryType: string | undefined): string {
    if (!primaryType) return '';
    return primaryType
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
}

const MIN_WIDTH = 120;
const MAX_WIDTH = 400; // Optional: Set a maximum width if needed

const CustomCallout: React.FC<CustomCalloutProps> = ({ place }) => {
    const [maxWidth, setMaxWidth] = useState<number>(MIN_WIDTH);

    const handleLayout = (e: LayoutChangeEvent) => {
        const { width } = e.nativeEvent.layout;
        if (width > maxWidth) {
            setMaxWidth(width);
        }
    };

    const displayName = place.displayName?.text ?? 'Place';
    const primaryType = formatType(place.primaryType);

    return (
        <Callout tooltip style={{ flex: 1, position: 'relative' }} onLayout={handleLayout}>
            <View style={styles.calloutContainer}>
                <Text style={styles.title}>{displayName}</Text>
                <Text style={styles.address}>{primaryType}</Text>
            </View>
        </Callout>
    );
};

const styles = StyleSheet.create({
    calloutContainer: {
        backgroundColor: 'rgba(255,255,255,0.99)',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        alignItems: 'center', // 👈 centers children horizontally
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#1e3a8a',
    },
    title: {
        fontWeight: '700',
        fontSize: 16,
        color: '#1e3a8a',
        marginBottom: 4,
        textAlign: 'center',
    },
    address: {
        fontSize: 13,
        color: '#555',
        textAlign: 'center',
    },
});

export default CustomCallout;
