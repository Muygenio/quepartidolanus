'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import formaciones from '../data/lanus.json';
import PlayerSearch from '../player-search';
import PlayerPhoto from '../player-photo';

type Partido = (typeof formaciones)[number];
type Jugador = Partido['titulares'][number];
type JugadorBuscable = {
  nombre: string;
  alias: string[];
};

const jugadoresDeLaBase = formaciones
  .flatMap((partido) => partido.titulares)
  .reduce<JugadorBuscable[]>((jugadores, jugador) => {
    const existente = jugadores.find(
      (candidato) => candidato.nombre === jugador.nombre,
    );
    const alias = jugador.alias ?? [];

    if (existente) {
      existente.alias = [...new Set([...existente.alias, ...alias])];
    } else {
      jugadores.push({ nombre: jugador.nombre, alias: [...alias] });
    }

    return jugadores;
  }, []);

export default function Home() {
  const [nivelActual, setNivelActual] = useState(0);
  const partidoActual = formaciones[nivelActual];
  const [inputTexto, setInputTexto] = useState('');
  const [acertados, setAcertados] = useState<string[]>([]);
  const [rendido, setRendido] = useState(false);
  const [tiempo, setTiempo] = useState(0);
  const [mensajeError, setMensajeError] = useState('');

  const total = partidoActual.titulares.length;
  const ganaste = acertados.length === total;

  useEffect(() => {
    if (ganaste || rendido) return;

    const intervalo = window.setInterval(() => {
      setTiempo((segundos) => segundos + 1);
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, [ganaste, rendido]);

  const manejarSeleccion = (nombre: string) => {
    const perteneceAlPartido = partidoActual.titulares.some(
      (jugador) => jugador.nombre === nombre,
    );

    if (!perteneceAlPartido) {
      setMensajeError('Ese jugador no pertenece a esta formación.');
      setInputTexto('');
      return;
    }

    setMensajeError('');
    setAcertados((actuales) =>
      actuales.includes(nombre) ? actuales : [...actuales, nombre],
    );
    setInputTexto('');
  };

  const manejarCambioBusqueda = (valor: string) => {
    setInputTexto(valor);
    setMensajeError('');
  };

  const formatearTiempo = (segundos: number) => {
    const minutos = Math.floor(segundos / 60);
    const resto = segundos % 60;
    return `${minutos}:${resto < 10 ? '0' : ''}${resto}`;
  };

  const pasarAlSiguiente = () => {
    if (nivelActual < formaciones.length - 1) {
      setNivelActual((nivel) => nivel + 1);
      setAcertados([]);
      setInputTexto('');
      setMensajeError('');
      setRendido(false);
      setTiempo(0);
    }
  };

  return (
    <main className="lanus-watermark relative flex min-h-dvh flex-col items-center justify-start bg-[#080609] p-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] font-sans text-white sm:p-6 sm:pb-32">
      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <div className="mb-3 w-full">
          <Link
            href="/"
            className="inline-flex rounded-lg border border-[#7d1638]/70 bg-[#340b1c]/70 px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-[#54112a]"
          >
            ← Elegir modo
          </Link>
        </div>
        <header className="relative mb-3 flex w-full flex-col items-center overflow-hidden rounded-2xl border border-[#65132f]/80 bg-gradient-to-r from-[#17070e] via-[#3b0b20] to-[#17070e] p-3.5 shadow-xl">
          <div className="absolute top-0 h-1 w-full bg-[#a20d3c]" />
          <h1 className="text-center text-xl font-black uppercase tracking-wide text-white drop-shadow sm:text-2xl">
            {partidoActual.titulo}
          </h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <span className="rounded-md border border-[#4c1428] bg-black/40 px-2.5 py-1">
              DT: {partidoActual.dt}
            </span>
            <span className="rounded-md border border-[#4c1428] bg-black/40 px-2.5 py-1">
              Esquema: {partidoActual.esquema}
            </span>
          </div>
        </header>

        <section
          aria-label="Progreso del partido"
          className="mb-3 flex w-full items-center justify-between gap-2 px-1"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-300">Aciertos:</span>
            <span
              className={`rounded-md border px-2.5 py-0.5 text-sm font-black ${
                ganaste
                  ? 'border-[#a9214d]/60 bg-[#76132f]/70 text-white'
                  : 'border-[#4c1428] bg-[#1a0a11] text-white'
              }`}
            >
              {acertados.length} / {total}
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-md border border-[#4c1428]/80 bg-[#160910] px-3 py-1 font-mono text-sm font-bold text-slate-200"
            aria-label={`Tiempo ${formatearTiempo(tiempo)}`}
          >
            <span aria-hidden="true">⏱️</span>
            {formatearTiempo(tiempo)}
          </div>
          {!ganaste && !rendido && (
            <button
              onClick={() => setRendido(true)}
              className="text-right text-xs font-bold uppercase tracking-wider text-rose-300/90 underline underline-offset-2 transition-colors hover:text-white"
            >
              Rendirse
            </button>
          )}
          {(ganaste || rendido) && nivelActual < formaciones.length - 1 && (
            <button
              onClick={pasarAlSiguiente}
              className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider shadow-lg transition-transform hover:scale-105 active:scale-95 ${
                ganaste
                  ? 'bg-gradient-to-r from-[#8d1238] to-[#580d25] text-white shadow-[#8d1238]/30'
                  : 'bg-[#32101d] text-white hover:bg-[#52132b]'
              }`}
            >
              Siguiente ➡
            </button>
          )}
          {(ganaste || rendido) && nivelActual === formaciones.length - 1 && (
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Fin del juego
            </span>
          )}
        </section>

        <div
          className="relative flex aspect-[4/5] max-h-[40dvh] w-full flex-col overflow-hidden rounded-2xl border-[3px] border-[#57132b] bg-[#16291d] p-3 shadow-[0_15px_35px_rgba(0,0,0,0.8)] sm:max-h-[55vh]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.12) 25px, transparent 25px, transparent 50px)',
          }}
        >
          <div className="pointer-events-none absolute inset-0 m-3 rounded-xl border-2 border-white/20" />
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-white/20" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2px] border-white/20" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30" />

          <div className="pointer-events-none absolute left-1/2 top-0 h-4 w-20 -translate-x-1/2 rounded-b-md border-x-2 border-b-2 border-white/20" />
          <div className="pointer-events-none absolute bottom-0 left-1/2 h-4 w-20 -translate-x-1/2 rounded-t-md border-x-2 border-t-2 border-white/20" />

          <div className="relative z-10 flex h-full flex-col justify-between py-2">
            {renderizarCancha(partidoActual, acertados, rendido)}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#57132b]/80 bg-[#0c070a]/95 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="relative mx-auto w-full max-w-md">
          <PlayerSearch
            value={inputTexto}
            onChange={manejarCambioBusqueda}
            onSelect={manejarSeleccion}
            jugadores={jugadoresDeLaBase.filter(
              (jugador) => !acertados.includes(jugador.nombre),
            )}
            feedback={mensajeError}
            disabled={ganaste || rendido}
            placeholder={
              ganaste
                ? '¡Plantel completado!'
                : rendido
                  ? 'Partido finalizado'
                  : 'Escribí apellido o apodo...'
            }
          />
        </div>
      </div>
    </main>
  );
}

function renderizarCancha(
  partido: Partido,
  acertados: string[],
  rendido: boolean,
): ReactNode[] {
  const lineasNumericas = partido.esquema.split('-').map(Number).reverse();
  const filas: ReactNode[] = [];
  let jugadorIndex = partido.titulares.length - 1;

  lineasNumericas.forEach((cantidad, indiceFila) => {
    const jugadoresEnEstaLinea: Jugador[] = [];
    for (let i = 0; i < cantidad; i++) {
      if (jugadorIndex >= 1) {
        jugadoresEnEstaLinea.push(partido.titulares[jugadorIndex]);
        jugadorIndex--;
      }
    }

    filas.push(
      <div
        key={`fila-${indiceFila}`}
        className="my-auto flex w-full items-center justify-around"
      >
        {jugadoresEnEstaLinea.map((jugador) => (
          <Ficha
            key={jugador.pos + jugador.nombre}
            jugador={jugador}
            acertado={acertados.includes(jugador.nombre)}
            rendido={rendido}
          />
        ))}
      </div>,
    );
  });

  filas.push(
    <div key="arquero" className="my-auto flex w-full items-center justify-center">
      <Ficha
        jugador={partido.titulares[0]}
        acertado={acertados.includes(partido.titulares[0].nombre)}
        rendido={rendido}
      />
    </div>,
  );

  return filas;
}

function Ficha({
  jugador,
  acertado,
  rendido,
}: {
  jugador: Jugador;
  acertado: boolean;
  rendido: boolean;
}) {
  const apellido = jugador.nombre.split(' ').pop() ?? jugador.nombre;

  let estilosIman =
    'bg-[#10090e]/95 text-slate-200 border-2 border-[#5b1a31] shadow-md';
  let colorTexto = 'text-slate-200 font-semibold';
  let textoMostrar = '???';

  if (acertado) {
    estilosIman =
      'bg-gradient-to-br from-[#9c0a2d] to-[#54121c] text-white scale-110 shadow-[0_0_20px_rgba(156,10,45,0.8)] border-2 border-white/60 z-10';
    colorTexto = 'text-white font-black drop-shadow';
    textoMostrar = apellido;
  } else if (rendido) {
    estilosIman =
      'bg-gradient-to-br from-[#68112c] to-[#1a080f] text-rose-100 border-2 border-[#b72a50]/80 opacity-95';
    colorTexto = 'text-red-300 font-bold';
    textoMostrar = apellido;
  }

  return (
    <div className="group relative flex w-[22%] flex-col items-center sm:w-20">
      <div
        className={`relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-xs font-black transition-all duration-300 ease-out sm:h-12 sm:w-12 ${estilosIman}`}
      >
        {acertado || rendido ? (
          <>
            <PlayerPhoto
              name={jugador.nombre}
              className="h-full w-full text-sm"
            />
            <span className="absolute bottom-0 right-0 rounded-tl bg-black/80 px-1 text-[7px] leading-tight text-white">
              {jugador.pos}
            </span>
          </>
        ) : (
          jugador.pos
        )}
      </div>
      <span
        className={`mt-1.5 flex min-h-[2rem] items-start justify-center rounded bg-black/50 px-1 text-center text-[11px] leading-tight tracking-wide sm:text-xs ${colorTexto}`}
      >
        {textoMostrar}
      </span>
    </div>
  );
}
