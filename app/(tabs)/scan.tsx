import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import type { ScanResponse } from '@/lib/types';
import { Alert } from '@/lib/alert';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          Camera access is needed to scan products.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleCapture() {
    if (!cameraRef.current || scanning) return;
    setScanning(true);

    try {
      // Take photo
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo) throw new Error('No photo captured');

      // Resize to keep base64 payload reasonable (~800px wide)
      const resized = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 800 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );

      if (!resized.base64) throw new Error('Base64 encoding failed');

      // Call /scan
      const { data } = await api.post<ScanResponse>('/scan', {
        imageBase64: resized.base64,
        mimeType: 'image/jpeg',
      });

      // Navigate to confirm screen, passing result as params
      router.push({
        pathname: '/confirm',
        params: {
          identification: JSON.stringify(data.identification),
          matchedProduct: data.matchedProduct
            ? JSON.stringify(data.matchedProduct)
            : null,
        },
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to scan product. Please try again.';
      Alert.alert('Scan failed', msg);
    } finally {
      setScanning(false);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back" ref={cameraRef}>
        {/* Viewfinder overlay */}
        <View style={styles.overlay}>
          <View style={styles.finder}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.hint}>Point at a product label</Text>
        </View>
      </CameraView>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.captureBtn, scanning && styles.captureBtnDisabled]}
          onPress={handleCapture}
          disabled={scanning}
          activeOpacity={0.8}
        >
          {scanning ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <View style={styles.captureInner} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICK = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  finder: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#3B82F6',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICK, borderRightWidth: CORNER_THICK },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICK, borderRightWidth: CORNER_THICK },
  hint: {
    color: '#CBD5E1',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  controls: {
    height: 120,
    width: '100%',
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#1E40AF',
  },
  captureBtnDisabled: { opacity: 0.5 },
  captureInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
  },
  permissionText: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
