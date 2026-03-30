'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'

// FORCE ANY TYPE (fix TS issue)
const MapContainer: any = dynamic(
  () => import('react-leaflet').then(m => m.MapContainer),
  { ssr: false }
)

const TileLayer: any = dynamic(
  () => import('react-leaflet').then(m => m.TileLayer),
  { ssr: false }
)

const Marker: any = dynamic(
  () => import('react-leaflet').then(m => m.Marker),
  { ssr: false }
)

const Popup: any = dynamic(
  () => import('react-leaflet').then(m => m.Popup),
  { ssr: false }
)

export default function SessionsMap({ sessions }: { sessions: any[] }) {
  return (
    <div className="h-[300px] w-full mb-6 rounded-lg overflow-hidden">

      <MapContainer
        center={[25.2048, 55.2708]}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {sessions.map((s) =>
          s.lat && s.lng ? (
            <Marker
              key={s.id}
              position={[Number(s.lat), Number(s.lng)]}
            >
              <Popup>
                <div className="space-y-1">
                  <div className="font-semibold">{s.title}</div>
                  <div className="text-sm">{s.activity_type}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(s.date_time).toLocaleString()}
                  </div>
                </div>
              </Popup>
            </Marker>
          ) : null
        )}

      </MapContainer>

    </div>
  )
}