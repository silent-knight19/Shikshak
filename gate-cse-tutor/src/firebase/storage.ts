import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

export function uploadFile(
  uid: string,
  convId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const path = `users/${uid}/attachments/${convId}/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      'state_changed',
      (snapshot) => {
        const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(pct);
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      },
    );
  });
}
