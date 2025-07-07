import { Platform } from 'react-native';
import Constants from 'expo-constants';

//get Web Key for Google Maps API

const getGoogleMapsApiKey = (isCurlCommand: boolean): string | undefined => {
    return Constants.expoConfig?.extra?.googleMapsApiKeyWeb;
};

export default getGoogleMapsApiKey;