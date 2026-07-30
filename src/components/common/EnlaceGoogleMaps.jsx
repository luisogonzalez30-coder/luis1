import { MapPin } from 'lucide-react'

// Link a la ubicación exacta reportada (coordenadas reales del GPS/mapa del ciudadano),
// para abrirla en Google Maps con vista satelital/calle y navegar hasta ahí.
export default function EnlaceGoogleMaps({ coordenadas }) {
  if (!coordenadas?.lat || !coordenadas?.lng) return null

  const url = `https://www.google.com/maps?q=${coordenadas.lat},${coordenadas.lng}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
    >
      <MapPin size={14} />
      Ver ubicación exacta en Google Maps ({coordenadas.lat.toFixed(5)}, {coordenadas.lng.toFixed(5)})
    </a>
  )
}
