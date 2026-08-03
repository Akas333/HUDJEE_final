import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Get original image metadata to properly size and position the watermark
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    // 2. Create an SVG for the watermark
    // We make it semi-transparent and position it dynamically based on size
    const fontSize = Math.max(14, Math.floor(width * 0.05));
    const svgWatermark = `
      <svg width="${width}" height="${height}">
        <style>
          .title { fill: rgba(255, 255, 255, 0.4); font-size: ${fontSize}px; font-weight: bold; font-family: sans-serif; }
        </style>
        <text x="${width - (fontSize * 4.5)}" y="${height - (fontSize * 1.5)}" class="title">HUDJEE</text>
      </svg>
    `;

    // 3. Composite the watermark over the original image
    const watermarkedBuffer = await sharp(buffer)
      .composite([{
        input: Buffer.from(svgWatermark),
        top: 0,
        left: 0,
      }])
      .jpeg({ quality: 90 }) // standardize to jpeg
      .toBuffer();

    // 4. Upload to Supabase Storage
    const fileName = `${Date.now()}-${file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '')}-watermarked.jpg`;
    
    // Ensure bucket exists or fail gracefully
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('questions_media')
      .upload(`public/${fileName}`, watermarkedBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload to storage. Does the questions_media bucket exist and is it public?' }, { status: 500 });
    }

    // 5. Get Public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('questions_media')
      .getPublicUrl(`public/${fileName}`);

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error('Image upload error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
