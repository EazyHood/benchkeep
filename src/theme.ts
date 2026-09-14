import { Platform } from 'react-native';
export const colors = {
  paper: '#F7F3EB', surface: '#FFFDFA', ink: '#292C27', muted: '#65685F', line: '#DCD8CE',
  accent: '#A74326', accentSoft: '#F0DFD1', moss: '#485B40', mossSoft: '#E8EDDF',
  photo: '#E5DFD2', white: '#FFFFFF', error: '#A72F29', overlay: '#252923D9',
};
export const fonts = { body: 'DMSans_400Regular', medium: 'DMSans_500Medium', bold: 'DMSans_700Bold', display: 'DMSerifDisplay_400Regular' };
export const ui = { radius: 16, gutter: 24, focus: Platform.OS === 'web' ? { outlineColor: colors.accent, outlineWidth: 2, outlineOffset: 4 } : {} };
