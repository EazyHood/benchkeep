import React, { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { privacyContent } from '../privacyContent';
import { styles } from '../appStyles';
import { colors } from '../theme';
import { Body, Button, Eyebrow } from './Primitives';

const supportEmail = 'jhonatandelrio9@gmail.com';

/** The complete notice stays readable offline, without opening another app. */
export function PrivacyNotice({ onBack }: { onBack: () => void }) {
  const [linkError, setLinkError] = useState('');
  const openLink = async (url: string, fallback: string) => {
    setLinkError('');
    try { await Linking.openURL(url); }
    catch { setLinkError(fallback); }
  };

  return <>
    <Button variant="ghost" icon="back" onPress={onBack} style={styles.back}>About Benchkeep</Button>
    <View style={{ maxWidth: 650, gap: 24 }}>
      <Eyebrow>ABOUT YOUR INFORMATION</Eyebrow>
      <Text accessibilityRole="header" style={styles.pageTitle}>Your work has a place. So does your privacy.</Text>
      <Body>{privacyContent.intro}</Body>
      <Body style={{ fontSize: 12 }}>Last updated: {privacyContent.updated} · Benchkeep 1.0</Body>
      <View style={{ padding: 20, borderLeftWidth: 3, borderLeftColor: colors.moss, backgroundColor: colors.surface, borderRadius: 10 }}>
        <Body style={{ color: colors.ink }}>{privacyContent.summary}</Body>
      </View>
      {privacyContent.sections.map(section => <View key={section.id} style={{ gap: 12 }}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>{section.title}</Text>
        {section.paragraphs.map((paragraph, index) => <Body key={index}>{paragraph}</Body>)}
      </View>)}
      <View style={{ gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Questions or a privacy request?</Text>
        <Text selectable style={styles.meta}>{supportEmail}</Text>
        <View style={[styles.row, { flexWrap: 'wrap' }]}>
          <Button onPress={() => openLink(`mailto:${supportEmail}`, `No email app opened. You can contact ${supportEmail} using your preferred email service.`)}>Email support</Button>
          <Button variant="secondary" onPress={() => openLink('https://www.revenuecat.com/privacy', 'The page could not open. RevenueCat privacy: https://www.revenuecat.com/privacy')}>RevenueCat privacy</Button>
          <Button variant="secondary" onPress={() => openLink('https://www.samsung.com/us/account/privacy-policy/', 'The page could not open. Samsung privacy: https://www.samsung.com/us/account/privacy-policy/')}>Samsung privacy</Button>
        </View>
        {linkError ? <Text accessibilityRole="alert" selectable style={styles.formError}>{linkError}</Text> : null}
        <Body style={{ fontSize: 12 }}>These buttons open your email app or browser. Nothing is sent automatically.</Body>
      </View>
    </View>
  </>;
}
