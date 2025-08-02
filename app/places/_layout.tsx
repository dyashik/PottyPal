import { Stack } from 'expo-router';

export default function PlacesLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'fade',
                animationDuration: 300,
                presentation: 'transparentModal',
            }}
        >
            <Stack.Screen
                name="[id]"
                options={{
                    animation: 'fade',
                    animationDuration: 300,
                    presentation: 'transparentModal',
                }}
            />
            <Stack.Screen
                name="fullScreenMap"
                options={{
                    animation: 'fade',
                    animationDuration: 300,
                }}
            />
        </Stack>
    );
}
