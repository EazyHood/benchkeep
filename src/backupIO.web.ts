import * as DocumentPicker from 'expo-document-picker';
const MAX_BYTES = 25 * 1024 * 1024;
export async function chooseBackup(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json'], multiple: false });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  if ((asset.size ?? asset.file?.size ?? 0) > MAX_BYTES) throw new Error('Choose a backup smaller than 25 MiB.');
  return asset.file ? await asset.file.text() : await (await fetch(asset.uri)).text();
}
export async function shareBackup(contents: string): Promise<void> {
  const href = URL.createObjectURL(new Blob([contents], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = href; anchor.download = `benchkeep-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}
