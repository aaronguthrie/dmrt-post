import { put } from '@vercel/blob'

export async function uploadPhoto(file: File): Promise<string> {
  const blob = await put(file.name, file, {
    access: 'public',
  })
  return blob.url
}

export async function uploadPhotos(files: File[]): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadPhoto(file))
  return Promise.all(uploadPromises)
}
