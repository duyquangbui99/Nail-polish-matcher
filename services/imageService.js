// services/imageService.js
import * as ImagePicker from 'expo-image-picker';

export async function pickImageFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error('Permission to access camera roll is required!');

    // Try the new enum first; gracefully fall back if running older SDKs.
    const mediaType =
        ImagePicker?.MediaType?.image ??
        ImagePicker?.MediaType?.Images ??
        ImagePicker?.MediaType?.Image ??
        ImagePicker?.MediaTypeOptions?.Images; // legacy fallback

    const result = await ImagePicker.launchImageLibraryAsync({
        // You can also just delete `mediaTypes:` entirely to use the default (images).
        ...(mediaType ? { mediaTypes: mediaType } : {}),
        allowsEditing: true,
        quality: 1,
        selectionLimit: 1, // ignored on some platforms but harmless
    });

    if (!result.canceled) return result.assets?.[0]?.uri || null;
    return null;
}
