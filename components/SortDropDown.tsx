import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    Pressable,
    StyleSheet,
    LayoutRectangle,
    findNodeHandle,
    UIManager,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';


type SortType = 'distance' | 'popularity';

type SortDropdownProps = {
    sortType: SortType;
    setSortType: React.Dispatch<React.SetStateAction<SortType>>;
};

const SortDropdown = ({ sortType, setSortType }: SortDropdownProps) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const btnRef = useRef<any>(null);

    const openDropdown = () => {
        const handle = findNodeHandle(btnRef.current);
        if (handle) {
            UIManager.measure(handle, (x, y, width, height, pageX, pageY) => {
                setDropdownPos({ top: pageY + height, left: pageX });
                setModalVisible(true);
            });
        }
    };

    const handleSelect = (type: SortType) => {
        setSortType(type);
        setModalVisible(false);
    };

    return (
        <View>
            <TouchableOpacity
                ref={btnRef}
                style={styles.sortByBtn}
                onPress={openDropdown}
            >
                <Text style={styles.sortByText}>
                    Sort by: {sortType === 'distance' ? 'Distance' : 'Popularity'}
                </Text>
                <ChevronDown size={16} color="#1e3a8a" />
            </TouchableOpacity>

            <Modal transparent visible={modalVisible} animationType="fade">
                <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)}>
                    <View style={[styles.dropdown, { top: dropdownPos.top, left: dropdownPos.left }]}>
                        <Pressable
                            onPress={() => handleSelect('distance')}
                            style={[
                                styles.option,
                                sortType === 'distance' && styles.selectedOption,
                            ]}
                        >
                            <Text style={sortType === 'distance' ? styles.selectedText : styles.optionText}>
                                Distance (Default)
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => handleSelect('popularity')}
                            style={[
                                styles.option,
                                sortType === 'popularity' && styles.selectedOption,
                            ]}
                        >
                            <Text style={sortType === 'popularity' ? styles.selectedText : styles.optionText}>
                                Popularity (Star Reviews)
                            </Text>
                        </Pressable>
                    </View>
                </Pressable >
            </Modal >
        </View >
    );
};

const styles = StyleSheet.create({
    sortByBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f3f4f6',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#1e3a8a', // Blue border
    },
    sortByText: {
        fontSize: 16,
        color: '#1e3a8a',
        fontWeight: '600',
        marginRight: 6,
    },
    dropdown: {
        position: 'absolute',
        width: 220,
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
        paddingVertical: 12,
        paddingHorizontal: 16,
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
        fontWeight: '600',
    },
});

export default SortDropdown;
