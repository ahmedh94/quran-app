import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, spacing, radius } from './theme';
import { PrimaryButton } from './components';
import { verifyPin, isBiometricAvailable, authenticateWithBiometrics } from './security';

export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      if (available) {
        const ok = await authenticateWithBiometrics();
        if (ok) onUnlock();
      }
    })();
  }, []);

  const tryBiometric = async () => {
    const ok = await authenticateWithBiometrics();
    if (ok) onUnlock();
  };

  const submitPin = async () => {
    const ok = await verifyPin(pin);
    if (ok) {
      onUnlock();
    } else {
      setError(true);
      setPin('');
      Alert.alert('خطأ', 'الكود غلط، جرب تاني');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <FontAwesome5 name="lock" size={28} color="#fff" />
      </View>
      <Text style={styles.title}>حلقتي مقفولة</Text>
      <Text style={styles.subtitle}>ادخل الكود عشان تفتح التطبيق</Text>

      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={pin}
        onChangeText={(t) => { setPin(t); setError(false); }}
        keyboardType="numeric"
        secureTextEntry
        maxLength={6}
        textAlign="center"
        placeholder="••••"
        autoFocus
      />

      <View style={{ width: '100%', marginTop: spacing.md }}>
        <PrimaryButton title="فتح" onPress={submitPin} disabled={pin.length < 4} />
      </View>

      {biometricAvailable && (
        <View style={{ marginTop: spacing.md }}>
          <PrimaryButton title="🔓 استخدام البصمة" outline onPress={tryBiometric} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pinkLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  iconCircle: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: colors.pink,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.pinkDark, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xl },
  input: {
    width: '70%',
    borderWidth: 1.5,
    borderColor: colors.pinkSoft,
    borderRadius: radius.md,
    paddingVertical: 14,
    fontSize: 22,
    letterSpacing: 8,
    backgroundColor: '#fff',
  },
  inputError: { borderColor: colors.danger },
});
