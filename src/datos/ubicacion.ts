// Dónde está un sitio, con lo que trae el teléfono y sin claves de Google:
//
//   miUbicacion()          el GPS (en el navegador, la ubicación que da el
//                          navegador si el usuario la permite)
//   ubicarDireccion(dir)   en Android, el buscador de direcciones del propio
//                          teléfono (entiende "Calle 5 # 38-25, Cali"). En
//                          el navegador devuelve null y el servidor la busca
//                          en OpenStreetMap, que es menos preciso.

import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { NativeGeocoder, type Address } from '@capgo/nativegeocoder';
import type { Coordenadas } from '../../compartido/tipos.ts';

const PAIS = 'Colombia';
const IDIOMA = 'es_CO';

const enAndroid = () => Capacitor.getPlatform() === 'android';

export function textoDeDireccion(a: Address): string {
  const calle = [a.thoroughfare, a.subThoroughfare].filter(Boolean).join(' ');
  return [calle, a.subLocality, a.locality].filter(Boolean).join(', ');
}

export async function ubicarDireccion(direccion: string): Promise<Coordenadas | null> {
  if (!enAndroid()) return null;
  try {
    const conPais = /colombia/i.test(direccion) ? direccion : `${direccion}, ${PAIS}`;
    const { addresses } = await NativeGeocoder.forwardGeocode({ addressString: conPais, useLocale: true, defaultLocale: IDIOMA, maxResults: 1 });
    const [primera] = addresses;
    return primera ? { lat: primera.latitude, lon: primera.longitude } : null;
  } catch {
    return null; // sin internet o sin resultado: que lo intente el servidor
  }
}

/** La ubicación actual y, si el teléfono la sabe leer, su dirección. */
export async function miUbicacion(): Promise<{ coordenadas: Coordenadas; direccion: string }> {
  if (enAndroid()) {
    const permisos = await Geolocation.requestPermissions();
    if (permisos.location === 'denied' && permisos.coarseLocation === 'denied') {
      throw new Error('MerCam no tiene permiso para ver tu ubicación');
    }
  }
  const { coords } = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000 });
  const coordenadas = { lat: coords.latitude, lon: coords.longitude };
  let direccion = `Ubicación ${coordenadas.lat.toFixed(5)}, ${coordenadas.lon.toFixed(5)}`;
  if (enAndroid()) {
    try {
      const { addresses } = await NativeGeocoder.reverseGeocode({ latitude: coordenadas.lat, longitude: coordenadas.lon, useLocale: true, defaultLocale: IDIOMA, maxResults: 1 });
      if (addresses[0]) direccion = textoDeDireccion(addresses[0]) || direccion;
    } catch {
      // Sin dirección legible; quedan las coordenadas.
    }
  }
  return { coordenadas, direccion };
}
