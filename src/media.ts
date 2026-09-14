import { File, Paths, Directory } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { id, Photo } from './model';

function managedFile(photo: Photo): File {
  const directory = new Directory(Paths.document, 'benchkeep-photos');
  const prefix = directory.uri.endsWith('/') ? directory.uri : `${directory.uri}/`;
  if (!photo.uri.startsWith(prefix) || !/^[a-z0-9-]+\.jpg$/i.test(photo.uri.slice(prefix.length))) throw new Error('This photo is not part of the saved bench.');
  return new File(photo.uri);
}

export async function keepPhoto(input: Photo): Promise<Photo> {
  const context = ImageManipulator.manipulate(input.uri);
  if (Math.max(input.width, input.height) > 1600) context.resize(input.width > input.height ? { width: 1600 } : { height: 1600 });
  const rendered = await context.renderAsync();
  const image = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  const directory = new Directory(Paths.document, 'benchkeep-photos');
  if (!directory.exists) directory.create({ intermediates: true });
  const file = new File(directory, `${id()}.jpg`);
  new File(image.uri).copy(file);
  return { uri: file.uri, width: image.width, height: image.height };
}
export async function photoUri(photo: Photo): Promise<string> {
  if (!managedFile(photo).exists) throw new Error('This photo is missing from this device.');
  return photo.uri;
}
export async function readPhoto(photo: Photo): Promise<string> {
  const file = managedFile(photo);
  if (!file.exists) throw new Error('A saved photo is missing, so this backup could not be completed.');
  return `data:image/jpeg;base64,${await file.base64()}`;
}
export async function writePhoto(dataUri: string, width: number, height: number): Promise<Photo> {
  const decoded = await ImageManipulator.manipulate(dataUri).renderAsync();
  if (decoded.width !== width || decoded.height !== height) throw new Error('A backup photo does not match its recorded dimensions.');
  const directory = new Directory(Paths.document, 'benchkeep-photos');
  if (!directory.exists) directory.create({ intermediates: true });
  const file = new File(directory, `${id()}.jpg`);
  file.create(); file.write(dataUri.split(',')[1], { encoding: 'base64' });
  return { uri: file.uri, width, height };
}
export async function removePhoto(photo: Photo): Promise<void> {
  const file = managedFile(photo); if (file.exists) file.delete();
}
