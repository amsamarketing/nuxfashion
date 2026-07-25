'use client';
import Image from 'next/image';
import { Instagram } from 'lucide-react';

const POSTS = [
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop',
];

interface Props {
  locale: string;
  instagramUrl?: string;  // from storefront config
}

export default function InstagramFeed({ locale, instagramUrl }: Props) {
  const isRtl = locale === 'ar';
  const igHref = instagramUrl || 'https://instagram.com';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Instagram size={20} className="text-pink-500"/>
          <h2 className="section-title">@nuxstore</h2>
        </div>
        <p className="text-gray-500 text-sm">
          {isRtl ? 'تابعنا على انستاغرام للإلهام اليومي' : 'Follow us on Instagram for daily style inspiration'}
        </p>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {POSTS.map((src, i) => (
          <a key={i} href={igHref} target="_blank" rel="noopener noreferrer"
            className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer">
            <Image src={src} alt={`Instagram post ${i + 1}`} fill className="object-cover group-hover:scale-110 transition-transform duration-500" unoptimized/>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <Instagram size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity"/>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
