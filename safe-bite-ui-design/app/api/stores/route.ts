import { NextResponse } from 'next/server'

type StoreId = 'vkusvill' | 'pyaterochka' | 'perekrestok' | 'magnit' | 'auchan'
type OverpassElement = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

const storePatterns: { id: StoreId; pattern: RegExp }[] = [
  { id: 'vkusvill', pattern: /вкус\s*вилл|vkus\s*vill/i },
  { id: 'pyaterochka', pattern: /пят[её]рочка|pyaterochka|5ka/i },
  { id: 'perekrestok', pattern: /перекр[её]сток|perekrestok/i },
  { id: 'magnit', pattern: /магнит|magnit/i },
  { id: 'auchan', pattern: /ашан|auchan/i },
]

function haversineMeters(first: { lat: number; lon: number }, second: { lat: number; lon: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const latitudeDelta = radians(second.lat - first.lat)
  const longitudeDelta = radians(second.lon - first.lon)
  const value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(first.lat)) * Math.cos(radians(second.lat)) * Math.sin(longitudeDelta / 2) ** 2
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = Number(searchParams.get('lat'))
  const lon = Number(searchParams.get('lon'))
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }

  const chainPattern = 'vkus.?vill|вкус.?вилл|pyaterochka|пят[её]рочка|5ka|perekrestok|перекр[её]сток|magnit|магнит|auchan|ашан'
  const brandQueries = ['name', 'brand', 'operator'].map((tag) => `nwr["shop"~"^(supermarket|convenience|grocery)$"]["${tag}"~"(${chainPattern})",i](around:2000,${lat},${lon});`).join('')
  const query = `[out:json][timeout:20];(${brandQueries});out center tags;`
  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Accept: 'application/json',
        'User-Agent': 'SafeBite/1.0 (+https://v0.app; OpenStreetMap nearby-store finder)',
      },
      body: new URLSearchParams({ data: query }),
      cache: 'no-store',
      signal: AbortSignal.timeout(25000),
    })
    if (!response.ok) return NextResponse.json({ error: 'Store directory is unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
    const data = await response.json() as { elements?: OverpassElement[] }
    const origin = { lat, lon }
    const seen = new Set<string>()
    const stores = (data.elements ?? []).flatMap((element) => {
      const tags = element.tags ?? {}
      const fullName = [tags.name, tags.brand, tags.operator].filter(Boolean).join(' ')
      const matchedStore = storePatterns.find(({ pattern }) => pattern.test(fullName))
      const location = element.lat !== undefined && element.lon !== undefined ? { lat: element.lat, lon: element.lon } : element.center
      if (!matchedStore || !location) return []
      const distanceMeters = haversineMeters(origin, location)
      const duplicateKey = `${matchedStore.id}:${location.lat.toFixed(4)}:${location.lon.toFixed(4)}`
      if (distanceMeters > 2000 || seen.has(duplicateKey)) return []
      seen.add(duplicateKey)
      const addressParts = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean)
      return [{
        id: `${element.type}-${element.id}`,
        name: matchedStore.id === 'vkusvill' ? 'ВкусВилл' : matchedStore.id === 'pyaterochka' ? 'Пятёрочка' : matchedStore.id === 'perekrestok' ? 'Перекрёсток' : matchedStore.id === 'magnit' ? 'Магнит' : 'Ашан',
        storeId: matchedStore.id,
        lat: location.lat,
        lon: location.lon,
        address: addressParts.length ? addressParts.join(', ') : tags['addr:full'] ?? tags['addr:place'] ?? 'Адрес не указан в OpenStreetMap',
        distanceMeters,
        walkingMinutes: Math.max(1, Math.round(distanceMeters * 1.25 / 80)),
      }]
    }).sort((first, second) => first.distanceMeters - second.distanceMeters).slice(0, 40)

    return NextResponse.json(stores, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Store directory is unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
