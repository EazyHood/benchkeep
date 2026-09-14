import React, { PropsWithChildren, useState } from 'react';
import { Pressable, Text, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors, fonts } from '../theme';

export function Icon({ name, size = 20, color = colors.ink }: { name: string; size?: number; color?: string }) {
  const paths: Record<string, string> = {
    plus: 'M12 5v14M5 12h14', back: 'M19 12H5m7-7-7 7 7 7', arrow: 'M5 12h14m-7-7 7 7-7 7',
    check: 'm5 12 4 4 10-10', close: 'm6 6 12 12M6 18 18 6', focus: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
    camera: 'M4 7h4l2-3h4l2 3h4v13H4Z', image: 'M3 3h18v18H3Zm0 13 5-5 5 5 3-3 5 5',
    clock: 'M12 7v5l3 2', download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    leaf: 'M20 4C7 2 2 9 6 17c7 6 15-1 14-13ZM5 20l10-10',
    pin: 'M12 21s7-8 7-13a7 7 0 0 0-14 0c0 5 7 13 7 13Z',
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <Path d={paths[name] ?? paths.plus} />
    {name === 'camera' && <Circle cx="12" cy="13" r="3" />}
    {name === 'clock' && <Circle cx="12" cy="12" r="9" />}
    {name === 'pin' && <Circle cx="12" cy="8" r="2" />}
  </Svg>;
}
export function Button({ children, onPress, variant = 'primary', icon, disabled, style, label }: PropsWithChildren<{ onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost'; icon?: string; disabled?: boolean; style?: StyleProp<ViewStyle>; label?: string }>) {
  const [focused, setFocused] = useState(false);
  const primary = variant === 'primary';
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.button, primary ? s.primary : variant === 'secondary' ? s.secondary : s.ghost, pressed && { opacity: .75, transform: [{ scale: .99 }] }, disabled && { opacity: .45 }, focused && { borderColor: colors.accent, borderWidth: 2 }, style]}>
    {icon && <Icon name={icon} color={primary ? colors.white : colors.ink} />}
    {children && <Text style={[s.buttonText, { color: primary ? colors.white : colors.ink }]}>{children}</Text>}
  </Pressable>;
}
export const Eyebrow = ({ children }: PropsWithChildren) => <Text style={s.eyebrow}>{children}</Text>;
export const Body = ({ children, style, numberOfLines }: PropsWithChildren<{ style?: any; numberOfLines?: number }>) => <Text numberOfLines={numberOfLines} style={[s.body, style]}>{children}</Text>;
export const Pill = ({ children, green = false }: PropsWithChildren<{ green?: boolean }>) => <View style={[s.pill, green && { backgroundColor: colors.mossSoft }]}><Text style={[s.pillText, green && { color: colors.moss }]}>{children}</Text></View>;
export const s = StyleSheet.create({
  button: { minHeight: 48, minWidth: 48, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: 'transparent' },
  primary: { backgroundColor: colors.accent }, secondary: { backgroundColor: colors.surface, borderColor: colors.line }, ghost: { backgroundColor: 'transparent', paddingHorizontal: 12 },
  buttonText: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  eyebrow: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11, letterSpacing: 1.8, lineHeight: 18, textTransform: 'uppercase' },
  body: { fontFamily: fonts.body, color: colors.muted, fontSize: 15, lineHeight: 24 },
  pill: { alignSelf: 'flex-start', backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 },
  pillText: { fontFamily: fonts.medium, fontSize: 12, color: colors.accent, lineHeight: 18 },
});
