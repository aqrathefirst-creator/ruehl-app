import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 🔥 PROCESS MEDIA (BALANCED SIZES: 15MB images, 500MB videos)
export const processMedia = async (file: File): Promise<File> => {

  // ✅ IMAGE
  if (file.type.startsWith('image')) {
    const maxImageMB = 15;
    if (file.size / 1024 / 1024 > maxImageMB) {
      alert(`Image too large. Max ${maxImageMB}MB.`);
      throw new Error('Image too large');
    }
    return compressImage(file);
  }

  // ✅ VIDEO
  if (file.type.startsWith('video')) {

    const maxVideoMB = 500;

    if (file.size / 1024 / 1024 > maxVideoMB) {
      alert(`Video too large. Max ${maxVideoMB}MB.`);
      throw new Error('Video too large');
    }

    // 🔥 FORCE MP4 (THIS FIXES YOUR GRID ISSUE)
    const newName = file.name.replace(/\.[^/.]+$/, '.mp4');

    return new File([file], newName, {
      type: 'video/mp4',
    });
  }

  return file;
};

// 🔥 IMAGE COMPRESSION
const compressImage = async (file: File): Promise<File> => {
  const img = document.createElement('img');
  const url = URL.createObjectURL(file);

  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    URL.revokeObjectURL(url);
    return file;
  }

  const maxWidth = 1080;
  const scale = Math.min(1, maxWidth / img.width);

  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.9)
  );

  URL.revokeObjectURL(url);

  if (!blob) return file;

  return new File([blob], file.name, { type: 'image/jpeg' });
};

// 🔥 UPLOAD FUNCTION
export const uploadPostMedia = async (file: File, userId: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `posts/${fileName}`;

  const { error } = await supabase.storage
    .from('media')
    .upload(filePath, file);

  if (error) {
    console.error('Upload error:', error);
    throw error;
  }

  const { data } = supabase.storage
    .from('media')
    .getPublicUrl(filePath);

  return data.publicUrl;
};