import React, { useState } from 'react';
import { View, Button, Image, StyleSheet } from 'react-native';
import { pickImageFromLibrary } from '../services/imageService';

export default function ImagePickerComponent({ onImagePicked }) {
    const [image, setImage] = useState(null);

    const handlePickImage = async () => {
        try {
            const uri = await pickImageFromLibrary();
            if (uri) {
                setImage(uri);
                onImagePicked && onImagePicked(uri);
            }
        } catch (error) {
            Alert.alert("Error", error.message);
        }
    };


    return (
        <View style={styles.container}>
            <Button title="Upload a Photo" onPress={handlePickImage} />
            {image && <Image source={{ uri: image }} style={styles.image} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 10, alignItems: 'center' },
    image: { width: 200, height: 200, marginTop: 10, borderRadius: 8 }
});
