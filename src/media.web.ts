import { del, get, set } from 'idb-keyval';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { Photo } from './model';
import { id } from './model';

export async function keepPhoto(input: Photo): Promise<Photo> {
  const context = ImageManipulator.manipulate(input.uri);
  if (Math.max(input.width, input.height) > 1600) context.resize(input.width > input.height ? { width: 1600 } : { height: 1600 });
  const rendered = await context.renderAsync();
  const image = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
  const uri = `benchkeep-photo:${id()}`;
  if (!image.base64) throw new Error('This image could not be saved. Please choose another photo.');
  await set(uri, `data:image/jpeg;base64,${image.base64}`);
  return { uri, width: image.width, height: image.height };
}
export async function photoUri(photo: Photo): Promise<string> {
  if (!photo.uri.startsWith('benchkeep-photo:')) return photo.uri;
  const data = await get<string>(photo.uri);
  if (!data) throw new Error('This photo is missing from this device.');
  return data;
}
export const readPhoto = photoUri;
export async function writePhoto(dataUri: string, width: number, height: number): Promise<Photo> {
  const decoded = await ImageManipulator.manipulate(dataUri).renderAsync();
  if (decoded.width !== width || decoded.height !== height) throw new Error('A backup photo does not match its recorded dimensions.');
  const uri = `benchkeep-photo:${id()}`;
  await set(uri, dataUri);
  return { uri, width, height };
}
export async function removePhoto(photo: Photo): Promise<void> {
  if (photo.uri.startsWith('benchkeep-photo:')) await del(photo.uri);
}
