import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { ArrowLeft, Camera, Image as ImageIcon, Trash2, CheckCircle, AlertTriangle, ShieldAlert, Sparkles, Plus, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { RootState } from '../../store';
import { AppTheme } from '../../theme/theme';
import UploadService from '../../services/uploadService';

interface ImageUploadPlaygroundScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

interface UploadedImageItem {
  id: string;
  url: string;
  filename: string;
  originalSize: number;
  compressedSize: number;
  format: string;
}

const MOCK_FOOD_PRESETS = [
  { name: 'Delicious Cooked Meal', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500' },
  { name: 'Fresh Vegetables Basket', url: 'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?w=500' },
  { name: 'Assorted Fresh Fruits', url: 'https://images.unsplash.com/photo-1610832958506-ee56336191d1?w=500' },
  { name: 'Freshly Baked Breads', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500' }
];

export const ImageUploadPlaygroundScreen: React.FC<ImageUploadPlaygroundScreenProps> = ({ theme, navigate }) => {
  const { token } = useSelector((state: RootState) => state.auth);

  // States
  const [uploadedImages, setUploadedImages] = useState<UploadedImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  // Webcam stream state
  const [useWebcam, setUseWebcam] = useState(false);
  const [webcamAvailable, setWebcamAvailable] = useState(false);
  const videoRef = useRef<any>(null);

  // Initialize webcam check
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia) {
      setWebcamAvailable(true);
    }
  }, []);

  // Close webcam stream on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  const startWebcam = async () => {
    setValidationError(null);
    try {
      setUseWebcam(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('Webcam stream access failed:', err);
      setValidationError('Webcam access was denied or is unavailable. Try pre-captured food presets!');
      setUseWebcam(false);
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach((track: any) => track.stop());
      videoRef.current.srcObject = null;
    }
    setUseWebcam(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const base64Str = canvas.toDataURL('image/jpeg');
          stopWebcam();
          processBase64Upload(base64Str, 'webcam_capture.jpg');
        }
      } catch (err) {
        setValidationError('Failed to capture frame from webcam.');
      }
    }
  };

  // Select pre-captured mock presets
  const handleSelectPreset = async (presetUrl: string, name: string) => {
    setLoading(true);
    setValidationError(null);
    try {
      // Fetch the preset image and convert it to base64
      const response = await fetch(presetUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        processBase64Upload(base64data, `${name.toLowerCase().replace(/\s+/g, '_')}.jpg`);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      // Offline fallback: use raw url in state as simulated upload
      const fallbackItem: UploadedImageItem = {
        id: `img_${Date.now()}`,
        url: presetUrl,
        filename: `${name.toLowerCase().replace(/\s+/g, '_')}.jpg`,
        originalSize: 154000,
        compressedSize: 42000,
        format: 'jpg'
      };
      setUploadedImages(prev => [...prev, fallbackItem]);
      setLoading(false);
    }
  };

  // Gallery Picker
  const handleGallerySelect = () => {
    setValidationError(null);
    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = async (e: any) => {
        const files = Array.from(e.target.files || []) as File[];
        for (const file of files) {
          await processFile(file);
        }
      };
      input.click();
    }
  };

  const processFile = (file: File): Promise<void> => {
    return new Promise((resolve) => {
      // Validate File Type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        setValidationError(`Invalid file format: ${file.name}. Only png, jpeg, jpg, webp are supported.`);
        return resolve();
      }

      // Validate File Size (Max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setValidationError(`File ${file.name} exceeds maximum 5MB size boundary.`);
        return resolve();
      }

      const reader = new FileReader();
      reader.onload = async (event: any) => {
        const base64Str = event.target.result;
        await processBase64Upload(base64Str, file.name);
        resolve();
      };
      reader.readAsDataURL(file);
    });
  };

  // Compress & Upload
  const processBase64Upload = async (base64Str: string, name: string) => {
    setLoading(true);
    try {
      // Client-Side Canvas Compression
      const compressionResult = await compressBase64(base64Str);
      
      // Send base64 payload to backend
      const res = await UploadService.uploadImage(compressionResult.compressed, token);
      if (res.success) {
        const item: UploadedImageItem = {
          id: res.filename || `img_${Date.now()}`,
          url: res.url,
          filename: name,
          originalSize: compressionResult.originalSize,
          compressedSize: compressionResult.newSize,
          format: res.format || 'jpg'
        };
        setUploadedImages(prev => [...prev, item]);
      }
    } catch (err: any) {
      console.warn('Backend upload failed. Using compressed base64 local preview.', err);
      // Fallback: save the compressed base64 directly as the image preview URL
      const fallbackItem: UploadedImageItem = {
        id: `img_${Date.now()}_${Math.round(Math.random() * 100)}`,
        url: base64Str,
        filename: name,
        originalSize: Math.round(base64Str.length * 0.75),
        compressedSize: Math.round(base64Str.length * 0.4), // simulated compression preview size
        format: 'jpg'
      };
      setUploadedImages(prev => [...prev, fallbackItem]);
    } finally {
      setLoading(false);
    }
  };

  const compressBase64 = (base64Str: string): Promise<{ compressed: string; originalSize: number; newSize: number }> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800;
        
        // Scale down dimensions if exceeding max bounds
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (maxDim / width) * height;
            width = maxDim;
          } else {
            width = (maxDim / height) * width;
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.7); // 70% quality compression
          resolve({
            compressed,
            originalSize: Math.round(base64Str.length * 0.75),
            newSize: Math.round(compressed.length * 0.75)
          });
        } else {
          resolve({ compressed: base64Str, originalSize: base64Str.length, newSize: base64Str.length });
        }
      };
      img.onerror = () => {
        resolve({ compressed: base64Str, originalSize: base64Str.length, newSize: base64Str.length });
      };
    });
  };

  // Deletions
  const handleDeleteImage = (id: string) => {
    setUploadedImages(prev => prev.filter(item => item.id !== id));
    setActiveGalleryIndex(0);
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 1;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header Banner */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate('Dashboard')} id="btn-upload-back">
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Image Upload Module</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Camera / Webcam Capture Component */}
        <View style={[styles.cameraContainer, { backgroundColor: theme.dark ? '#1E293B' : '#E2E8F0', borderColor: theme.colors.border }]}>
          {useWebcam ? (
            <View style={StyleSheet.absoluteFillObject}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <View style={styles.webcamControls}>
                <TouchableOpacity
                  id="btn-webcam-capture"
                  style={[styles.webcamBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={capturePhoto}
                >
                  <Camera size={18} color="#FFF" />
                  <Text style={styles.webcamBtnText}>Snap Frame</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  id="btn-webcam-cancel"
                  style={[styles.webcamBtn, { backgroundColor: theme.colors.error }]}
                  onPress={stopWebcam}
                >
                  <Text style={styles.webcamBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.cameraPlaceholder}>
              <Camera size={36} color={theme.colors.textSecondary} style={{ marginBottom: 12, opacity: 0.7 }} />
              <Text style={[styles.cameraText, { color: theme.colors.text }]}>Real Camera Capture & Gallery Selector</Text>
              <Text style={[styles.cameraSubText, { color: theme.colors.textSecondary }]}>
                Acquire food images from device camera, local disk library, or quick presets.
              </Text>

              <View style={styles.cameraActionsRow}>
                {webcamAvailable && (
                  <TouchableOpacity
                    id="btn-trigger-camera"
                    style={[styles.uploadTriggerBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={startWebcam}
                  >
                    <Camera size={16} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.uploadTriggerBtnText}>Camera Capture</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  id="btn-trigger-gallery"
                  style={[styles.uploadTriggerBtn, { backgroundColor: theme.colors.accent }]}
                  onPress={handleGallerySelect}
                >
                  <ImageIcon size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.uploadTriggerBtnText}>Gallery Selection</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Validation Errors banner */}
        {validationError && (
          <View style={[styles.alertBox, { backgroundColor: theme.colors.error + '1F', borderColor: theme.colors.error }]}>
            <AlertTriangle size={16} color={theme.colors.error} style={{ marginRight: 6 }} />
            <Text style={[styles.alertText, { color: theme.colors.error }]}>{validationError}</Text>
          </View>
        )}

        {/* Quick Food Presets list (Web fallback helper) */}
        <View style={[styles.settingsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text, marginBottom: 10 }]}>Mock Presets (Instant Upload Simulator)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {MOCK_FOOD_PRESETS.map((preset, idx) => (
              <TouchableOpacity
                key={`preset_${idx}`}
                id={`btn-preset-${idx}`}
                style={[styles.presetCard, { borderColor: theme.colors.border }]}
                onPress={() => handleSelectPreset(preset.url, preset.name)}
              >
                <Image source={{ uri: preset.url }} style={styles.presetImage} />
                <Text style={[styles.presetName, { color: theme.colors.text }]} numberOfLines={1}>
                  {preset.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Previews & Compression Ratios Metrics list */}
        <View style={[styles.settingsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text, marginBottom: 12 }]}>
            Upload Previews ({uploadedImages.length} images)
          </Text>

          {uploadedImages.length === 0 ? (
            <Text style={{ fontSize: 11, color: theme.colors.textSecondary, paddingVertical: 10, textAlign: 'center' }}>
              No images uploaded yet. Snap a picture or select from gallery!
            </Text>
          ) : (
            <View style={styles.previewsContainer}>
              {uploadedImages.map((img) => {
                const ratioPercent = Math.round((1 - img.compressedSize / img.originalSize) * 100);
                return (
                  <View key={img.id} style={[styles.previewItem, { borderColor: theme.colors.border }]} id={`preview-item-${img.id}`}>
                    <Image source={{ uri: img.url }} style={styles.previewImage} />
                    <View style={styles.previewMeta}>
                      <Text style={[styles.previewName, { color: theme.colors.text }]} numberOfLines={1}>{img.filename}</Text>
                      <Text style={{ fontSize: 9, color: theme.colors.textSecondary }}>
                        Original: {formatSize(img.originalSize)}
                      </Text>
                      <Text style={{ fontSize: 9, color: theme.colors.primary, fontWeight: '700' }}>
                        Compressed: {formatSize(img.compressedSize)} (-{ratioPercent}%)
                      </Text>
                      <Text style={{ fontSize: 8, color: theme.colors.textSecondary }}>
                        Format: {img.format.toUpperCase()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      id={`btn-delete-preview-${img.id}`}
                      style={[styles.deleteBtn, { backgroundColor: theme.colors.error + '1F' }]}
                      onPress={() => handleDeleteImage(img.id)}
                    >
                      <Trash2 size={14} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Donation Image Gallery Carousel Component */}
        <View style={[styles.settingsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text, marginBottom: 12 }]}>
            Donation Image Gallery (Carousel)
          </Text>

          {uploadedImages.length === 0 ? (
            <View style={styles.emptyGallery}>
              <ImageIcon size={32} color={theme.colors.textSecondary} style={{ opacity: 0.5, marginBottom: 8 }} />
              <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                Gallery carousel is empty.
              </Text>
            </View>
          ) : (
            <View style={styles.carouselContainer}>
              <Image source={{ uri: uploadedImages[activeGalleryIndex].url }} style={styles.carouselImage} />
              
              {/* Overlay controls */}
              <View style={styles.carouselControls}>
                <TouchableOpacity
                  id="btn-carousel-prev"
                  style={[styles.carouselArrow, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                  onPress={() => setActiveGalleryIndex(prev => (prev === 0 ? uploadedImages.length - 1 : prev - 1))}
                >
                  <ChevronLeft size={20} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  id="btn-carousel-next"
                  style={[styles.carouselArrow, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                  onPress={() => setActiveGalleryIndex(prev => (prev === uploadedImages.length - 1 ? 0 : prev + 1))}
                >
                  <ChevronRight size={20} color="#FFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.carouselIndicator}>
                <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>
                  {activeGalleryIndex + 1} / {uploadedImages.length}
                </Text>
              </View>
            </View>
          )}
        </View>

      </ScrollView>

      {loading && (
        <View style={styles.globalLoader}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
    borderBottomWidth: 1
  },
  backBtn: {
    padding: 8
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  cameraContainer: {
    height: 260,
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cameraPlaceholder: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cameraText: {
    fontSize: 12.5,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4
  },
  cameraSubText: {
    fontSize: 10.5,
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 16,
    paddingHorizontal: 16
  },
  cameraActionsRow: {
    flexDirection: 'row',
    gap: 10
  },
  uploadTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    elevation: 1
  },
  uploadTriggerBtnText: {
    color: '#FFF',
    fontSize: 11.5,
    fontWeight: '700'
  },
  webcamControls: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    zIndex: 10
  },
  webcamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 2
  },
  webcamBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700'
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14
  },
  alertText: {
    fontSize: 11,
    fontWeight: '600'
  },
  settingsCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    elevation: 1
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '800'
  },
  horizontalScroll: {
    flexDirection: 'row'
  },
  presetCard: {
    width: 110,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: 10,
    alignItems: 'center'
  },
  presetImage: {
    width: '100%',
    height: 70
  },
  presetName: {
    fontSize: 8.5,
    fontWeight: '700',
    padding: 4,
    textAlign: 'center'
  },
  previewsContainer: {
    gap: 8
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    gap: 10
  },
  previewImage: {
    width: 46,
    height: 46,
    borderRadius: 6
  },
  previewMeta: {
    flex: 1
  },
  previewName: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyGallery: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center'
  },
  carouselContainer: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative'
  },
  carouselImage: {
    width: '100%',
    height: '100%'
  },
  carouselControls: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12
  },
  carouselArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  carouselIndicator: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    marginLeft: -24,
    width: 48,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center'
  },
  globalLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000
  }
});

export default ImageUploadPlaygroundScreen;
