import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BrandingContainer: React.FC = () => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.brandingContainer, { top: insets.top + 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.brandingText}>PottyPal</Text>
                <Image
                    source={require('../assets/images/icon-transparent.png')}
                    style={{
                        width: 30,
                        height: 30,
                        marginLeft: 1,
                        marginBottom: 2,
                        resizeMode: 'contain',
                    }}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    brandingContainer: {
        position: 'absolute',
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
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
        overflow: 'visible', // make sure shadows aren't clipped

    },
    brandingText: {
        fontSize: 21,
        fontWeight: 'bold',
        color: '#1e3a8a',
        fontFamily: 'HelveticaNeue',
        textShadowColor: 'rgba(30, 58, 138, 0.6)',  // softer, semi-transparent blue
        lineHeight: 30,
    },
});

export default BrandingContainer;