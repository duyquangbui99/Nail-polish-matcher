import * as ImagePicker from 'expo-image-picker';

export async function pickImageFromLibrary() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
        throw new Error("Permission to access camera roll is required!");
    }

    let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
    });

    if (!result.canceled) {
        return result.assets[0].uri;
    }

    return null;
}
