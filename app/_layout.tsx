import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'react-native';

const _layout = () => {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <Stack screenOptions={{ headerShown: false }} />
        </GestureHandlerRootView>
    )
}

export default _layout