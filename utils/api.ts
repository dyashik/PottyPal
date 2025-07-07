import { Double } from "react-native/Libraries/Types/CodegenTypes";

export interface Place {
    formattedAddress?: string;

    location: {
        latitude: number;
        longitude: number;
    };

    rating?: number;
    userRatingCount?: number;


    googleMapsUri?: string;

    displayName?: {
        text: string;
        languageCode?: string;
    };

    currentOpeningHours?: {
        openNow?: boolean;
        weekdayDescriptions?: string[];
    };

    primaryType?: string;

    restroom?: boolean;

    accessibilityOptions?: {
        wheelchairAccessibleParking?: boolean;
        wheelchairAccessibleEntrance?: boolean;
        wheelchairAccessibleRestroom?: boolean;
    };

    googleMapsLinks?: {
        directionsUri?: string;
        placeUri?: string;
        writeAReviewUri?: string;
        reviewsUri?: string;
        photosUri?: string;
    };

    distanceInfo?: {
        walking: { duration: string; distance: string };
        driving: { duration: string; distance: string };
    };
}

export interface FetchNearbyPlacesResponse {
    places?: Place[];
}

export const DUMMY_PLACE: Place = {
  displayName: { text: '' },
  formattedAddress: '',
  location: { latitude: 0, longitude: 0 },
  primaryType: '',
  googleMapsUri: 'dummy',
  restroom: false,
  // Add any other required Place fields with dummy values
};