import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SafeBite — покупки с учётом аллергий',
    short_name: 'SafeBite',
    description: 'Поиск продуктов рядом с фильтрами по пищевым аллергиям.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f8f6',
    theme_color: '#24794b',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
