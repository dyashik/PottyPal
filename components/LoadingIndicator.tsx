import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';

interface LoadingIndicatorProps {
    size?: number;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ size = 80 }) => {
    // Animation value for rotation
    const spinValue = new Animated.Value(0);

    // Start the animation when component mounts
    useEffect(() => {
        // Create a looping animation
        Animated.loop(
            Animated.timing(spinValue, {
                toValue: 1,
                duration: 2000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    // Interpolate the value to create rotation
    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.container}>
            <View style={styles.loadingBox}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <Image
                        source={require('../assets/icon.png')}
                        style={{ width: size, height: size }}
                        contentFit="contain"
                    />
                </Animated.View>
                <View style={styles.shadow} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        zIndex: 1000,
    },
    loadingBox: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        borderRadius: 16,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 10,
    },
    shadow: {
        position: 'absolute',
        bottom: -5,
        width: 60,
        height: 10,
        borderRadius: 50,
        backgroundColor: 'rgba(0,0,0,0.1)',
        transform: [{ scaleX: 1.2 }],
    }
});

export default LoadingIndicator;