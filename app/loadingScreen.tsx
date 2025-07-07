import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function LoadingScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Finding clean bathrooms near you... 🚽</Text>
            <ActivityIndicator size="large" color="#00AEEF" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff', // Match splash screen background
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontFamily: 'Urbanist-Bold',
        fontSize: 24,
        color: '#00AEEF', // Your app’s blue
        marginBottom: 20,
        textAlign: 'center',
        paddingHorizontal: 24,
    },
});
