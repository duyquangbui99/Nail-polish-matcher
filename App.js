import React from 'react';
import { SafeAreaView } from 'react-native';
import ImagePickerComponent from './components/ImagePickerComponent';

export default function App() {
  const handleImagePicked = (uri) => {
    console.log("Picked image URI:", uri);
    // Later: pass URI to color picker
  };

  return (
    <SafeAreaView>
      <ImagePickerComponent onImagePicked={handleImagePicked} />
    </SafeAreaView>
  );
}
