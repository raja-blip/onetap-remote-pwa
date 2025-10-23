import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface LogoProps {
  width?: number;
  height?: number;
}

export default function Logo({ width = 120, height = 50 }: LogoProps) {
  return (
    <Image
      source={require('../assets/onetap-logo.png')}
      style={[styles.logo, { width, height }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    // Dynamic width and height passed via props
  },
});
