// components/ImagePickerComponent.js
import React, { useState } from 'react';
import { View, Button, Image, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function ImagePickerComponent({ onImagePicked }) {
    const [image, setImage] = useState(null);

    const pickImage = async () => {
        // Ask for permission
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            alert("Permission to access camera roll is required!");
            return;
        }

        // Launch picker
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: [ImagePicker.MediaType.Image],
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            onImagePicked && onImagePicked(result.assets[0].uri);
        }
    };

    return (
        <View style={styles.container}>
            <Button title="Upload a Photo" onPress={pickImage} />
            {image && <Image source={{ uri: image }} style={styles.image} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 10, alignItems: 'center' },
    image: { width: 200, height: 200, marginTop: 10, borderRadius: 8 }
});
