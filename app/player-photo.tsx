'use client';

import Image from 'next/image';
import { useState } from 'react';

const IDS_DE_FOTO_ALTERNATIVOS: Record<string, string> = {
  'maxi-velazquez': 'maximiliano-velazquez',
};
const FORMATOS_FOTO = ['png', 'jpg', 'jpeg', 'webp'] as const;

function obtenerIdDeFoto(nombre: string, id?: string) {
  if (id) return id;

  const slug = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return IDS_DE_FOTO_ALTERNATIVOS[slug] ?? slug;
}

function obtenerIniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  return partes.length > 1
    ? `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
    : nombre.slice(0, 2).toUpperCase();
}

export default function PlayerPhoto({
  name,
  photoId,
  className = '',
}: {
  name: string;
  photoId?: string;
  className?: string;
}) {
  const id = obtenerIdDeFoto(name, photoId);
  const [rutasFallidas, setRutasFallidas] = useState<string[]>([]);
  const src = FORMATOS_FOTO.map((formato) => `/jugadores/${id}.${formato}`).find(
    (ruta) => !rutasFallidas.includes(ruta),
  );

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#8d1238] to-[#260a14] font-black text-white ${className}`}
    >
      {!src ? (
        <span
          role="img"
          aria-label={`Sin foto: ${name}`}
          className="text-[0.7em] tracking-wide"
        >
          {obtenerIniciales(name)}
        </span>
      ) : (
        <Image
          src={src}
          alt={`Foto de ${name}`}
          fill
          sizes="(max-width: 640px) 48px, 80px"
          className="object-cover"
          onError={() =>
            setRutasFallidas((actuales) => [...actuales, src])
          }
        />
      )}
    </span>
  );
}
