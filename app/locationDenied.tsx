import React, { useEffect } from 'react';
import { View, Text, Button, Linking, Platform } from 'react-native';
import Location from 'expo-location';
import { useRouter } from 'expo-router';


const LocationDeniedScreen = () => {

    const router = useRouter();

    useEffect(() => {
        const checkPermission = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                router.replace('/');
            }
        };
        checkPermission();
    }, [router]);

    const openSettings = () => {
        if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
        } else {
            Linking.openSettings();
        }
    };

    return (
        <View style={{
            flex: 1,
            backgroundColor: '#fefefe',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
        }}>
            <Text style={{
                fontSize: 24,
                fontWeight: 'bold',
                marginBottom: 16,
                textAlign: 'center',
            }}>
                PottyPal needs your location 😬
            </Text>

            <Text style={{
                fontSize: 16,
                textAlign: 'center',
                marginBottom: 32,
                color: '#555'
            }}>
                We use your location to help you find the nearest bathroom.
                Please enable location services in your settings to continue.
            </Text>

            <Button title="Open Settings" onPress={openSettings} />
        </View>
    );
};

export default LocationDeniedScreen;
