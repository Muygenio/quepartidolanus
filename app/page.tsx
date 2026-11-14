import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QUEPARTIDO | Modos de juego',
  description:
    'Elegí un modo y poné a prueba tu memoria futbolera granate.',
};

const modos = [
  {
    numero: '01',
    icono: '⚽',
    etiqueta: 'El clásico',
    titulo: 'Trivia de formaciones',
    descripcion:
      'Reconocé los equipos históricos de Lanús y completá cada puesto en la cancha.',
    accion: 'Jugar trivia',
    href: '/formaciones',
  },
  {
    numero: '02',
    icono: '🔎',
    etiqueta: 'Desafío diario',
    titulo: 'Jugador Misterioso',
    descripcion:
      'Descubrí al jugador del día usando pistas de su carrera y sus estadísticas.',
    accion: 'Adivinar jugador',
    href: '/jugador-misterioso',
  },
  {
    numero: '03',
    icono: '🏆',
    etiqueta: 'Armá tu equipo',
    titulo: 'FUT Draft',
    descripcion:
      'Elegí tu once histórico carta por carta y cuidá el presupuesto.',
    accion: 'Armar mi 11',
    href: '/draft',
  },
];

export default function Home() {
  return (
    <main className="lanus-watermark relative min-h-dvh overflow-hidden bg-[#080609] px-4 py-8 font-sans text-white sm:px-6 sm:py-12">
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col">
        <header className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <Image
              src="/escudo-lanus-2025.png"
              alt="Escudo del Club Atlético Lanús"
              width={64}
              height={65}
              className="h-14 w-14 object-contain drop-shadow-[0_0_18px_rgba(151,21,59,0.35)] sm:h-16 sm:w-16"
            />
            <div className="text-left">
              <p className="text-2xl font-black uppercase tracking-[0.16em] sm:text-3xl">
                Quepartido
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-rose-200/80 sm:text-xs">
                La pasión se juega
              </p>
            </div>
          </div>
          <div className="mt-10 max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-rose-300">
              Una historia, muchas formas de jugar
            </p>
            <h1 className="mt-3 text-3xl font-black uppercase leading-tight tracking-wide sm:text-5xl">
              Elegí tu modo
              <span className="block text-rose-300">y jugá por los colores</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Formaciones históricas, desafíos diarios y un draft para armar tu
              propio once granate.
            </p>
          </div>
        </header>

        <section
          aria-label="Modos de juego"
          className="mt-9 grid flex-1 content-center gap-4 sm:mt-12 md:grid-cols-3 md:gap-5"
        >
          {modos.map((modo) => (
            <Link
              key={modo.href}
              href={modo.href}
              className="group relative flex min-h-60 flex-col overflow-hidden rounded-2xl border border-[#6e1c37]/80 bg-gradient-to-br from-[#4a0d21] via-[#260a14] to-[#10080c] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.4)] transition duration-300 hover:-translate-y-1 hover:border-rose-300/80 hover:shadow-[0_20px_55px_rgba(126,16,49,0.28)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-200 sm:p-6"
            >
              <div className="absolute -right-7 -top-8 h-32 w-32 rounded-full border border-white/5 transition-transform duration-500 group-hover:scale-125" />
              <div className="relative flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-black/20 text-2xl">
                  {modo.icono}
                </span>
                <span className="font-mono text-sm font-bold tracking-widest text-rose-100/60">
                  {modo.numero}
                </span>
              </div>
              <div className="relative mt-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-200">
                  {modo.etiqueta}
                </p>
                <h2 className="mt-2 text-xl font-black uppercase tracking-wide sm:text-2xl">
                  {modo.titulo}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {modo.descripcion}
                </p>
              </div>
              <div className="relative mt-auto flex items-center justify-between pt-6">
                <span className="text-sm font-black text-white">
                  {modo.accion}
                </span>
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-black text-[#4a0d21] transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </div>
            </Link>
          ))}
        </section>

        <footer className="mt-8 border-t border-white/10 pt-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Club Atlético Lanús · Hecho para la memoria granate
        </footer>
      </div>
    </main>
  );
}
