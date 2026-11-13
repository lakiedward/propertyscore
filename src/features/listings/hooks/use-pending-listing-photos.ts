import { useEffect, useRef, useState } from 'react';

export type PendingListingPhoto = { id: string; file: File; src: string };

export function usePendingListingPhotos() {
  const [photos, setPhotos] = useState<readonly PendingListingPhoto[]>([]);
  const urlsRef = useRef(new Set<string>());

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
      urls.clear();
    };
  }, []);

  const add = (files: readonly File[]) => {
    const added = files.map((file) => {
      const src = URL.createObjectURL(file);
      urlsRef.current.add(src);
      return { id: crypto.randomUUID(), file, src };
    });
    setPhotos((current) => [...current, ...added]);
  };

  const remove = (id: string) => {
    const photo = photos.find((candidate) => candidate.id === id);
    if (photo) {
      URL.revokeObjectURL(photo.src);
      urlsRef.current.delete(photo.src);
    }
    setPhotos((current) => current.filter((candidate) => candidate.id !== id));
  };

  const reorder = (ids: readonly string[]) => {
    setPhotos((current) => ids.flatMap((id) => current.filter((photo) => photo.id === id)));
  };

  return { photos, add, remove, reorder };
}
