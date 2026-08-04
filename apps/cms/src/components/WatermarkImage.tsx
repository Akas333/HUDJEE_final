'use client';

import React from 'react';
import { useAuth } from './AuthProvider';

interface WatermarkImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  containerClassName?: string;
}

export default function WatermarkImage({ src, alt, containerClassName = '', className, ...props }: WatermarkImageProps) {
  const { profile, user } = useAuth();
  
  // Use profile username if available, fallback to email, then fallback to 'HUDJEE'
  const watermarkText = profile?.username || user?.email || 'HUDJEE';

  return (
    <div className={`relative inline-block overflow-hidden rounded-md border border-zinc-800 ${containerClassName}`}>
      <img src={src} alt={alt || 'Image'} className={`block max-w-full h-auto ${className || ''}`} {...props} />
      
      {/* Watermark Overlay Grid */}
      <div 
        className="absolute inset-0 pointer-events-none select-none flex flex-wrap justify-center content-center overflow-hidden"
        style={{ zIndex: 10 }}
      >
        <div 
          className="w-[150%] h-[150%] flex flex-wrap justify-center content-center -rotate-12 opacity-[0.07] text-white font-bold text-xl tracking-widest uppercase break-all"
        >
          {Array.from({ length: 40 }).map((_, i) => (
            <span key={i} className="m-4">
              {watermarkText}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
