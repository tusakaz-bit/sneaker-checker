import { supabase } from './supabase';

export async function uploadImageToSupabase(imageUrl: string, styleCode: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) {
      console.error(`Failed to fetch image from ${imageUrl}`);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `${styleCode}.jpg`;
    
    const { data, error } = await supabase.storage
      .from('sneaker-images')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error(`Supabase upload error for ${styleCode}:`, error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('sneaker-images')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error(`Unexpected error uploading ${styleCode}:`, error);
    return null;
  }
}