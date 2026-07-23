import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { ArrowLeft, PlusCircle, BrainCircuit, Users, Thermometer, CalendarClock, PhoneCall, MapPin } from 'lucide-react-native';
import { RootState } from '../../store';
import { addDonation } from '../../store/donationSlice';
import { DonationService } from '../../services/donationService';
import { AppTheme } from '../../theme/theme';
import { predictFreshness } from '../../services/aiService';
import OSMMap from '../../components/OSMMap';
import * as Location from 'expo-location';

interface CreateDonationScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

export const CreateDonationScreen: React.FC<CreateDonationScreenProps> = ({ theme, navigate }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  // Form Fields
  const [foodType, setFoodType] = useState<'Cooked Food' | 'Vegetables' | 'Fruits' | 'Bakery Items' | 'Beverages' | 'Grocery Items'>('Cooked Food');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'Kg' | 'Liters' | 'Plates' | 'Packets'>('Plates');
  const [bestBeforeHours, setBestBeforeHours] = useState('6'); // default 6 hrs shelf life
  const [prepHoursAgo, setPrepHoursAgo] = useState('1'); // prepped 1 hr ago
  const [temperature, setTemperature] = useState('25'); // in Celsius
  const [pickupAddress, setPickupAddress] = useState(user?.address || '');
  const [contactNumber, setContactNumber] = useState(user?.contactNumber || '');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Map / Location
  const [selectedLat, setSelectedLat] = useState<number | null>(user?.gpsLocation?.latitude ?? null);
  const [selectedLng, setSelectedLng] = useState<number | null>(user?.gpsLocation?.longitude ?? null);
  const [locationLoading, setLocationLoading] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freshnessPreview, setFreshnessPreview] = useState(90);
  const [matchedNgos, setMatchedNgos] = useState<any[]>([]);

  // Update image suggestion when foodType changes
  useEffect(() => {
    const defaultImages = {
      'Cooked Food': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
      'Vegetables': 'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?w=500',
      'Fruits': 'https://images.unsplash.com/photo-1610832958506-ee56336191d1?w=500',
      'Bakery Items': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500',
      'Beverages': 'https://images.unsplash.com/photo-1527960656366-ee2a69d5f575?w=500',
      'Grocery Items': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500'
    };
    setImageUrl(defaultImages[foodType] || '');
  }, [foodType]);

  // Auto-detect user's current location on mount
  useEffect(() => {
    if (selectedLat && selectedLng) return; // already have coords
    (async () => {
      try {
        setLocationLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setSelectedLat(loc.coords.latitude);
          setSelectedLng(loc.coords.longitude);
        }
      } catch (_) {
        // Permission denied or unavailable — map will centre on Bengaluru default
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  const handleMapLocationSelect = (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
  };

  const handlePickImage = () => {
    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event: any) => {
            setImageUrl(event.target.result);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    }
  };

  // Local AI Predictions for instant visual feedback on input change
  useEffect(() => {
    const prep = new Date(Date.now() - Number(prepHoursAgo) * 60 * 60 * 1000);
    const exp = new Date(Date.now() + Number(bestBeforeHours) * 60 * 60 * 1000);
    
    const score = predictFreshness({
      foodType,
      preparationTime: prep,
      bestBeforeDate: exp,
      temperature: Number(temperature) || 25
    });

    setFreshnessPreview(score);
  }, [foodType, bestBeforeHours, prepHoursAgo, temperature]);

  // Removed NGO recommendation (requires Render AI endpoint). Can be re-added later.
  useEffect(() => {
    setMatchedNgos([]);
  }, [foodType, quantity]);

  const handleSubmit = async () => {
    if (!quantity || !pickupAddress || !contactNumber) {
      setError('Please fill out all mandatory fields.');
      return;
    }

    if (isNaN(Number(quantity)) || Number(quantity) <= 0) {
      setError('Quantity must be a positive number.');
      return;
    }

    const phoneRegex = /^[+]?[0-9]{10,15}$/;
    if (!phoneRegex.test(contactNumber.replace(/[\s-()]/g, ''))) {
      setError('Please enter a valid contact number (10-15 digits).');
      return;
    }

    if (isNaN(Number(bestBeforeHours)) || Number(bestBeforeHours) <= 0) {
      setError('Best before hours must be a positive number.');
      return;
    }

    if (isNaN(Number(prepHoursAgo)) || Number(prepHoursAgo) < 0) {
      setError('Preparation time must be a non-negative number.');
      return;
    }

    setLoading(true);
    setError(null);

    const preparationTime = new Date(Date.now() - Number(prepHoursAgo) * 60 * 60 * 1000);
    const bestBeforeDate = new Date(Date.now() + Number(bestBeforeHours) * 60 * 60 * 1000);

    const latitude = selectedLat ?? (user?.gpsLocation?.latitude ?? 12.9716);
    const longitude = selectedLng ?? (user?.gpsLocation?.longitude ?? 77.5946);

    try {
      const donation = await DonationService.createDonation({
        foodType,
        quantity: Number(quantity),
        unit,
        bestBeforeDate: bestBeforeDate.toISOString(),
        preparationTime: preparationTime.toISOString(),
        temperature: Number(temperature),
        donorId: user?.id || '',
        donorName: user?.name || '',
        pickupAddress,
        latitude,
        longitude,
        contactNumber,
        additionalNotes: notes,
        imageUrls: imageUrl ? [imageUrl] : [],
        freshnessScore: freshnessPreview,
      });
      dispatch(addDonation(donation as any));
      navigate('Dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to list food donation.');
    } finally {
      setLoading(false);
    }
  };

  const foodTypes = ['Cooked Food', 'Vegetables', 'Fruits', 'Bakery Items', 'Beverages', 'Grocery Items'];
  const units = ['Kg', 'Liters', 'Plates', 'Packets'];

  // AI Quality indicator description
  let qualityText = 'Excellent Quality';
  let qualityColor = theme.colors.primary;
  if (freshnessPreview < 30) {
    qualityText = 'Warning: Rapid decay. Unsafe.';
    qualityColor = theme.colors.error;
  } else if (freshnessPreview < 65) {
    qualityText = 'Acceptable. Needs Quick Pickup.';
    qualityColor = theme.colors.warning;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate('Dashboard')} id="btn-create-back">
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>List Surplus Food</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Real-time AI Analyzer Preview Card (The WOW factor) */}
        <View style={[styles.aiPreviewBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.primary + '33' }]}>
          <View style={styles.aiHeaderRow}>
            <BrainCircuit size={18} color={theme.colors.primary} />
            <Text style={[styles.aiHeaderTitle, { color: theme.colors.primary }]}>AI-POWERED FRESHNESS ANALYZER</Text>
          </View>
          
          <View style={styles.aiMeterRow}>
            <View style={styles.meterShell}>
              <View style={[styles.meterFill, { width: `${freshnessPreview}%`, backgroundColor: qualityColor }]} />
            </View>
            <Text style={[styles.meterValue, { color: qualityColor }]}>{freshnessPreview}%</Text>
          </View>
          
          <Text style={[styles.aiStatusDesc, { color: theme.colors.text }]}>
            Status: <Text style={{ fontWeight: '700', color: qualityColor }}>{qualityText}</Text>
          </Text>
          <Text style={[styles.aiSubText, { color: theme.colors.textSecondary }]}>
            Calculated instantly based on storage temperature ({temperature}°C) and elapsed preparation time.
          </Text>
        </View>

        {/* Food Type Selector */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Food Category</Text>
        <View style={styles.gridSelector}>
          {foodTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.selectorBadge,
                { borderColor: theme.colors.border },
                foodType === type && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
              ]}
              onPress={() => setFoodType(type as any)}
              id={`badge-foodtype-${type.replace(' ', '')}`}
            >
              <Text style={[styles.selectorText, { color: foodType === type ? '#FFFFFF' : theme.colors.text }]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quantity and Unit Row */}
        <View style={styles.formRow}>
          <View style={{ flex: 2, marginRight: 8 }}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quantity</Text>
            <TextInput
              id="input-create-quantity"
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="e.g. 50"
              placeholderTextColor={theme.colors.textSecondary}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />
          </View>
          
          <View style={{ flex: 1.5 }}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Unit</Text>
            <View style={styles.unitSelectorRow}>
              {units.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.unitBadge,
                    { borderColor: theme.colors.border },
                    unit === u && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }
                  ]}
                  onPress={() => setUnit(u as any)}
                  id={`badge-unit-${u}`}
                >
                  <Text style={[styles.unitText, { color: unit === u ? '#FFFFFF' : theme.colors.text }]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Storage Details slider simulator inputs */}
        <View style={[styles.extraFormBox, { backgroundColor: theme.colors.card }]}>
          <View style={styles.extraFormHeader}>
            <CalendarClock size={16} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.extraFormTitle, { color: theme.colors.text }]}>Shelf Life & Storage Parameters</Text>
          </View>

          <View style={styles.formRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Prep Hours Ago</Text>
              <TextInput
                id="input-prep-hours"
                style={[styles.smallInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={prepHoursAgo}
                onChangeText={setPrepHoursAgo}
                keyboardType="numeric"
              />
            </View>

            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Best Before (Hrs)</Text>
              <TextInput
                id="input-expiry-hours"
                style={[styles.smallInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={bestBeforeHours}
                onChangeText={setBestBeforeHours}
                keyboardType="numeric"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Temperature (°C)</Text>
              <View style={styles.tempInputWrapper}>
                <Thermometer size={12} color={theme.colors.accent} style={{ marginRight: 4 }} />
                <TextInput
                  id="input-temperature"
                  style={[styles.smallInput, { color: theme.colors.text, borderColor: theme.colors.border, flex: 1 }]}
                  value={temperature}
                  onChangeText={setTemperature}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Location & Contact Inputs */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pickup Details</Text>
        
        <View style={styles.inputIconContainer}>
          <PhoneCall size={16} color={theme.colors.textSecondary} style={styles.fieldIcon} />
          <TextInput
            id="input-create-phone"
            style={[styles.iconInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Contact Number"
            placeholderTextColor={theme.colors.textSecondary}
            value={contactNumber}
            onChangeText={setContactNumber}
            keyboardType="phone-pad"
          />
        </View>

        <TextInput
          id="input-create-address"
          style={[styles.textArea, { color: theme.colors.text, borderColor: theme.colors.border }]}
          placeholder="Pickup Address (be specific, gate no, landmark...)"
          placeholderTextColor={theme.colors.textSecondary}
          value={pickupAddress}
          onChangeText={setPickupAddress}
          multiline
          numberOfLines={2}
        />

        {/* OpenStreetMap Location Picker */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pickup Location on Map</Text>
        {locationLoading ? (
          <View style={[styles.mapLoadingBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.mapLoadingText, { color: theme.colors.textSecondary }]}>Detecting your location…</Text>
          </View>
        ) : (
          <OSMMap
            theme={theme}
            latitude={selectedLat ?? 12.9716}
            longitude={selectedLng ?? 77.5946}
            interactive
            onLocationSelect={handleMapLocationSelect}
            height={220}
            zoom={15}
          />
        )}
        {selectedLat && selectedLng && (
          <View style={[styles.coordsRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <MapPin size={12} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.coordsText, { color: theme.colors.textSecondary }]}>
              {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}
            </Text>
          </View>
        )}

        <TextInput
          id="input-create-notes"
          style={[styles.textArea, { color: theme.colors.text, borderColor: theme.colors.border }]}
          placeholder="Additional Notes (e.g. Bring boxes, contains dairy, etc.)"
          placeholderTextColor={theme.colors.textSecondary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
        />

        {/* Food Image Upload Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Food Image</Text>
        <View style={[styles.imageUploadCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {imageUrl ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
              <TouchableOpacity
                id="btn-remove-image"
                style={[styles.removeImageBtn, { backgroundColor: theme.colors.error }]}
                onPress={() => setImageUrl('')}
              >
                <Text style={styles.removeImageText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              id="btn-upload-image"
              style={[styles.uploadPlaceholder, { borderColor: theme.colors.primary, borderStyle: 'dashed' }]}
              onPress={handlePickImage}
            >
              <PlusCircle size={24} color={theme.colors.primary} />
              <Text style={[styles.uploadText, { color: theme.colors.text }]}>Upload Food Photo</Text>
              <Text style={[styles.uploadSubtext, { color: theme.colors.textSecondary }]}>PNG, JPG or JPEG up to 5MB</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Smart Recommendations Panel (WOW factor 2) */}
        {matchedNgos.length > 0 && (
          <View style={[styles.ngoMatchBox, { backgroundColor: theme.colors.card }]}>
            <View style={styles.aiHeaderRow}>
              <Users size={16} color={theme.colors.accent} />
              <Text style={[styles.aiHeaderTitle, { color: theme.colors.accent }]}>SMART MATCHED NGOs NEARBY</Text>
            </View>
            
            {matchedNgos.map((ngo) => (
              <View key={ngo.ngoId} style={styles.ngoRow}>
                <View>
                  <Text style={[styles.ngoName, { color: theme.colors.text }]}>🏢 {ngo.name}</Text>
                  <Text style={[styles.ngoSub, { color: theme.colors.textSecondary }]}>
                    Distance: {ngo.distanceKm} km • Prefers {foodType}
                  </Text>
                </View>
                <View style={[styles.scoreBadge, { backgroundColor: theme.colors.accent + '1F' }]}>
                  <Text style={[styles.scoreText, { color: theme.colors.accent }]}>{ngo.matchScore}% Match</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          id="btn-create-submit"
          style={[styles.submitBtn, { backgroundColor: theme.colors.primary }]}
          onPress={handleSubmit}
          disabled={loading || freshnessPreview < 20}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.btnRow}>
              <PlusCircle size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Publish surplus listing</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.08)'
  },
  backBtn: {
    padding: 8
  },
  headerTitle: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40
  },
  errorText: {
    fontFamily: 'System',
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EF4444' + '40',
    backgroundColor: '#EF4444' + '15',
    padding: 10,
    borderRadius: 12
  },
  aiPreviewBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  aiHeaderTitle: {
    fontFamily: 'System',
    fontSize: 11.5,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.5
  },
  aiMeterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  meterShell: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(128,128,128,0.15)',
    marginRight: 12,
    overflow: 'hidden'
  },
  meterFill: {
    height: '100%'
  },
  meterValue: {
    fontFamily: 'System',
    fontSize: 20,
    fontWeight: '800'
  },
  aiStatusDesc: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4
  },
  aiSubText: {
    fontFamily: 'System',
    fontSize: 11,
    lineHeight: 15
  },
  sectionTitle: {
    fontFamily: 'System',
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: 12
  },
  gridSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24
  },
  selectorBadge: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20
  },
  selectorText: {
    fontFamily: 'System',
    fontSize: 11.5,
    fontWeight: '700'
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 18
  },
  unitSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4
  },
  unitBadge: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6
  },
  unitText: {
    fontFamily: 'System',
    fontSize: 10.5,
    fontWeight: '700'
  },
  input: {
    fontFamily: 'System',
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14.5,
    backgroundColor: 'rgba(255,255,255,0.03)'
  },
  extraFormBox: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8
  },
  extraFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14
  },
  extraFormTitle: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '700'
  },
  fieldLabel: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8
  },
  smallInput: {
    fontFamily: 'System',
    height: 38,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    fontSize: 13,
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  tempInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  inputIconContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  fieldIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 5
  },
  iconInput: {
    fontFamily: 'System',
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 38,
    fontSize: 13.5,
    backgroundColor: 'rgba(255,255,255,0.03)'
  },
  textArea: {
    fontFamily: 'System',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13.5,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.03)'
  },
  ngoMatchBox: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 28,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1
  },
  ngoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
    paddingTop: 10,
    marginTop: 10
  },
  ngoName: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '700'
  },
  ngoSub: {
    fontFamily: 'System',
    fontSize: 11,
    marginTop: 2
  },
  scoreBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12
  },
  scoreText: {
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: '800'
  },
  submitBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  submitBtnText: {
    fontFamily: 'System',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15.5
  },
  imageUploadCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1
  },
  imagePreviewContainer: {
    width: '100%',
    height: 170,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative'
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  removeImageBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  removeImageText: {
    fontFamily: 'System',
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700'
  },
  uploadPlaceholder: {
    width: '100%',
    minHeight: 120,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  uploadText: {
    fontFamily: 'System',
    fontSize: 13.5,
    fontWeight: '700',
    marginTop: 8
  },
  uploadSubtext: {
    fontFamily: 'System',
    fontSize: 10.5,
    marginTop: 4
  },
  mapLoadingBox: {
    height: 100,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 12,
  },
  mapLoadingText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  coordsText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'System',
  },
});
export default CreateDonationScreen;
