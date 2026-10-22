'use client'

import { useEffect, useState } from 'react'
import L from 'leaflet'
import { Circle, ImageOverlay, MapContainer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import { Footprints } from 'lucide-react'

type StoreId = 'vkusvill' | 'pyaterochka' | 'perekrestok' | 'magnit' | 'auchan'
type Coordinates = { lat: number; lon: number }
type NearbyStore = {
  id: string
  name: string
  storeId: StoreId
  lat: number
  lon: number
  address: string
  distanceMeters: number
  walkingMinutes: number
}

const brandColors: Record<StoreId, { color: string; initials: string }> = {
  vkusvill: { color: '#348252', initials: 'ВВ' },
  pyaterochka: { color: '#cf3c48', initials: '5' },
  perekrestok: { color: '#337b4c', initials: 'П' },
  magnit: { color: '#d14548', initials: 'М' },
  auchan: { color: '#df493d', initials: 'А' },
}

const brandUrls: Record<StoreId, string> = {
  vkusvill: 'https://vkusvill.ru/',
  pyaterochka: 'https://5ka.ru/',
  perekrestok: 'https://www.perekrestok.ru/',
  magnit: 'https://magnit.ru/',
  auchan: 'https://www.auchan.ru/',
}

const demoMapBounds: L.LatLngBoundsExpression = [
  [55.739, 37.582],
  [55.769, 37.66],
]

function makeStoreIcon(storeId: StoreId) {
  const brand = brandColors[storeId]
  return L.divIcon({
    className: 'safebite-map-icon',
    html: `<span class="safebite-map-pin" style="--pin-color:${brand.color}"><span>${brand.initials}</span></span>`,
    iconSize: [34, 40],
    iconAnchor: [17, 37],
    popupAnchor: [0, -34],
  })
}

const userIcon = L.divIcon({
  className: 'safebite-map-icon',
  html: '<span class="safebite-user-pin"><span></span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

function Recenter({ center }: { center: Coordinates }) {
  const map = useMap()
  useEffect(() => {
    map.setView([center.lat, center.lon], map.getZoom(), { animate: false })
  }, [center.lat, center.lon, map])
  return null
}

export function StoreMap({ center, stores }: { center: Coordinates; stores: NearbyStore[] }) {
  const [routeStoreId, setRouteStoreId] = useState<string | null>(null)
  const routeStore = stores.find((store) => store.id === routeStoreId)

  return (
    <div className="relative h-[260px] w-full">
      <MapContainer attributionControl={false} center={[center.lat, center.lon]} zoom={13} scrollWheelZoom className="safebite-leaflet-map" zoomControl>
        <Recenter center={center} />
        <ImageOverlay alt="Демонстрационная карта района" bounds={demoMapBounds} url="/safebite-demo-map.png" />
        <Circle center={[center.lat, center.lon]} radius={2000} pathOptions={{ color: '#647a68', fillColor: '#e4ebe4', fillOpacity: 0.12, weight: 1, dashArray: '5 6' }} />
        {routeStore && <Polyline positions={[[center.lat, center.lon], [routeStore.lat, routeStore.lon]]} pathOptions={{ color: brandColors[routeStore.storeId].color, weight: 4, opacity: 0.82, dashArray: '8 7' }} />}
        <Marker position={[center.lat, center.lon]} icon={userIcon}><Popup>Вы здесь · демо</Popup></Marker>
        {stores.map((store) => {
          const brand = brandColors[store.storeId]
          const routeSelected = routeStoreId === store.id
          return <Marker icon={makeStoreIcon(store.storeId)} key={store.id} position={[store.lat, store.lon]}>
            <Popup className="safebite-store-popup">
              <div className="min-w-[205px] px-0.5 py-0.5">
                <p className="text-xs font-semibold text-[#303832]">{store.name}</p>
                <p className="mt-1 text-[10px] leading-4 text-[#6f786f]">{store.address}</p>
                <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-[#59655b]"><Footprints aria-hidden="true" size={12} />{store.distanceMeters < 1000 ? `${store.distanceMeters} м` : `${(store.distanceMeters / 1000).toFixed(1)} км`} · {store.walkingMinutes} мин пешком</p>
                <button className="mt-2 flex min-h-9 w-full items-center justify-center rounded-md px-2.5 py-2 text-[10px] font-semibold text-white" onClick={() => setRouteStoreId(routeSelected ? null : store.id)} style={{ backgroundColor: brand.color }} type="button">{routeSelected ? 'Скрыть маршрут' : 'Показать маршрут · демо'}</button>
                <a className="mt-2 block text-center text-[9px] text-[#747d75] underline underline-offset-2" href={brandUrls[store.storeId]} rel="noreferrer" target="_blank">Сайт магазина</a>
              </div>
            </Popup>
          </Marker>
        })}
      </MapContainer>
      <span className="pointer-events-none absolute bottom-2 left-2 z-[400] rounded bg-white/90 px-2 py-1 text-[8px] font-medium text-[#657067] shadow-sm">Все точки — демо</span>
      <span aria-hidden="true" className="pointer-events-none absolute bottom-2 right-2 z-[400] rounded bg-white/90 px-2 py-1 text-[8px] font-medium text-[#657067] shadow-sm">● Вы</span>
    </div>
  )
}
