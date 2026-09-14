import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View, Image, Text, Pressable, StyleSheet } from 'react-native';
import { imageRect, toNormalized, toViewport, Point, clamp } from '../geometry';
import type { Photo } from '../model';
import { photoUri } from '../media';
import { sampleImage } from '../samples';
import { colors, fonts } from '../theme';
import { Button, Body } from './Primitives';

export function PhotoBoard({ photo, pin, editing = false, onPin, focused = false, aspect = 4 / 3 }: { photo: Photo; pin: Point | null; editing?: boolean; onPin?: (pin: Point) => void; focused?: boolean; aspect?: number }) {
  const [width, setWidth] = useState(0);
  const [source, setSource] = useState<any>(photo.uri.startsWith('sample:') ? sampleImage : null);
  const [error, setError] = useState('');
  const [reduceMotion, setReduceMotion] = useState(true);
  const zoom = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReduceMotion(value); });
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { alive = false; listener.remove(); };
  }, []);
  useEffect(() => {
    const animation = Animated.timing(zoom, { toValue: focused && pin ? 1 : 0, duration: reduceMotion ? 0 : 230, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start(); return () => animation.stop();
  }, [focused, !!pin, reduceMotion]);
  useEffect(() => {
    let alive = true;
    setError('');
    if (photo.uri.startsWith('sample:')) { setSource(sampleImage); return; }
    setSource(null);
    photoUri(photo).then(uri => { if (alive) setSource({ uri }); }).catch(e => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [photo.uri]);
  const frame = { width, height: width / aspect };
  const rect = imageRect(photo, frame, focused && pin ? pin : undefined);
  const point = pin && toViewport(pin, rect);
  const full = imageRect(photo, frame);
  const close = imageRect(photo, frame, pin ?? undefined);
  const mix = (from: number, to: number) => zoom.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
  const animatedRect = { left: mix(full.left, close.left), top: mix(full.top, close.top), width: mix(full.width, close.width), height: mix(full.height, close.height) };
  const fullPin = pin && toViewport(pin, full); const closePin = pin && toViewport(pin, close);
  const nudge = (dx: number, dy: number) => onPin?.({ x: clamp((pin?.x ?? .5) + dx), y: clamp((pin?.y ?? .5) + dy) });
  return <View>
    <Pressable disabled={!editing} accessible={editing} accessibilityRole={editing ? 'button' : undefined} accessibilityLabel={editing ? 'Place your next point on the photo. Direction buttons below also move the point.' : undefined}
      onLayout={e => setWidth(e.nativeEvent.layout.width)} onPress={e => { const p = toNormalized({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }, rect); if (p) onPin?.(p); }}
      style={[styles.frame, { aspectRatio: aspect }]}>
      {source && width > 0 && <Animated.View pointerEvents="none" style={{ position: 'absolute', ...animatedRect }}><Image accessible={!editing} accessibilityLabel={photo.uri.startsWith('sample:') ? 'Generated example: botanical embroidery on a wooden hoop, rust leaf still unfinished.' : 'Your saved project photo'} source={source} resizeMode="stretch" onError={() => setError('This photo could not be opened.')} style={{ width: '100%', height: '100%' }} /></Animated.View>}
      {!source && !error && <View style={styles.center}><Body>Opening your photo…</Body></View>}
      {error && <View style={styles.center}><Body>{error}</Body></View>}
      {fullPin && closePin && source && <Animated.View pointerEvents="none" style={[styles.pinOuter, { left: mix(fullPin.x - 18, closePin.x - 18), top: mix(fullPin.y - 18, closePin.y - 18) }]}><View style={styles.pinInner}><Text style={styles.pinText}>1</Text></View></Animated.View>}
      {!pin && editing && <View pointerEvents="none" style={styles.photoHint}><Text style={styles.hintText}>Tap where you’ll pick up</Text></View>}
    </Pressable>
    {editing && <View style={styles.pointTools}><Body style={{ flex: 1, fontSize: 12 }}>{pin ? 'Point placed. Tap again to move it.' : 'Or use these controls to place a point.'}</Body><View style={{ flexDirection: 'row', gap: 4 }}>{[['←', -.02, 0, 'Move point left'], ['↑', 0, -.02, 'Move point up'], ['↓', 0, .02, 'Move point down'], ['→', .02, 0, 'Move point right']].map(([text, dx, dy, label]) => <Button key={String(label)} variant="secondary" label={String(label)} onPress={() => nudge(Number(dx), Number(dy))} style={{ paddingHorizontal: 8, minWidth: 44 }}>{String(text)}</Button>)}</View></View>}
  </View>;
}
const styles = StyleSheet.create({
  frame: { width: '100%', overflow: 'hidden', backgroundColor: colors.photo, borderRadius: 12 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  pinOuter: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF70', alignItems: 'center', justifyContent: 'center' },
  pinInner: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.white, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  pinText: { fontFamily: fonts.bold, color: colors.white, fontSize: 12 },
  photoHint: { position: 'absolute', bottom: 18, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.overlay },
  hintText: { color: colors.white, fontFamily: fonts.medium, fontSize: 13 }, pointTools: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 12 },
});
