import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
export async function chooseBackup(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json'], copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0]; const file = new File(asset.uri);
  if ((asset.size ?? file.size ?? 0) > 25 * 1024 * 1024) throw new Error('Choose a backup smaller than 25 MiB.');
  return await file.text();
}
export async function shareBackup(contents: string): Promise<void> {
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is not available on this device.');
  const file = new File(Paths.cache, `benchkeep-backup-${Date.now()}.json`); file.create(); file.write(contents);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Keep your Benchkeep backup somewhere safe' });
}
