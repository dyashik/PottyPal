import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    Pressable,
    StyleSheet,
    findNodeHandle,
    UIManager,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export type TravelMode = 'walking' | 'driving';

type TravelModeDropdownProps = {
    travelMode: TravelMode;
    setTravelMode: (mode: TravelMode) => void;
};

const TravelModeDropdown = ({ travelMode, setTravelMode }: TravelModeDropdownProps) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const [dropdownWidth, setDropdownWidth] = useState<number>(160);
    const btnRef = useRef<any>(null);

    const openDropdown = () => {
        const handle = findNodeHandle(btnRef.current);
        if (handle) {
            UIManager.measure(handle, (x, y, width, height, pageX, pageY) => {
                setDropdownPos({ top: pageY + height, left: pageX });
                setDropdownWidth(width);
                setModalVisible(true);
            });
        }
    };

    const handleSelect = (mode: TravelMode) => {
        setTravelMode(mode);
        setModalVisible(false);
    };

    return (
        <View>
            <TouchableOpacity
                ref={btnRef}
                style={styles.travelModeBtn}
                onPress={openDropdown}
                onLayout={e => setDropdownWidth(e.nativeEvent.layout.width)}
            >
                {travelMode === 'walking' ? (
                    <>
                        <FontAwesome5 name="walking" size={17} style={{ marginLeft: 6, marginRight: 10 }} color={'#1e3a8a'} />
                        <Text style={styles.travelModeText}>Walk</Text>
                    </>
                ) : (
                    <>
                        <FontAwesome5 name="car" size={17} style={{ marginLeft: 6, marginRight: 8, marginBottom: 1 }} color={'#1e3a8a'} />
                        <Text style={styles.travelModeText}>Drive</Text>
                    </>
                )}
                <MaterialCommunityIcons name="chevron-down" size={20} color="#1e3a8a" style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            <Modal transparent visible={modalVisible} animationType="fade">
                <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)}>
                    <View style={[styles.dropdown, { top: dropdownPos.top, left: dropdownPos.left, width: dropdownWidth }]}>
                        <Pressable
                            onPress={() => handleSelect('walking')}
                            style={[
                                styles.option,
                                travelMode === 'walking' && styles.selectedOption,
                            ]}
                        >
                            <FontAwesome5 name="walking" size={17} style={{ marginLeft: 2, marginRight: 13 }} color={'#1e3a8a'} />
                            <Text style={travelMode === 'walking' ? styles.selectedText : styles.optionText}>
                                Walk
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => handleSelect('driving')}
                            style={[
                                styles.option,
                                travelMode === 'driving' && styles.selectedOption,
                            ]}
                        >
                            <FontAwesome5 name="car" size={17} style={{ marginRight: 10, marginBottom: 1 }} color={'#1e3a8a'} />
                            <Text style={travelMode === 'driving' ? styles.selectedText : styles.optionText}>
                                Drive
                            </Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    travelModeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#1e3a8a',
    },
    travelModeText: {
        fontSize: 16,
        color: '#1e3a8a',
        fontWeight: '600',
    },
    dropdown: {
        position: 'absolute',
        backgroundColor: '#fff',
        borderRadius: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 9999,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    selectedOption: {
        backgroundColor: '#e5e7eb',
    },
    optionText: {
        fontSize: 15,
        color: '#111827',
    },
    selectedText: {
        fontSize: 15,
        color: '#1e3a8a',
        fontWeight: 'bold', // changed to bold
    },
});

export default TravelModeDropdown;
