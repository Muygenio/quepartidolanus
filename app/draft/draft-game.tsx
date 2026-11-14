'use client';

import Link from 'next/link';
import { useState } from 'react';
import draftPlayers from '../data/draft-players.json';

const PRESUPUESTO_INICIAL = 100_000_000;
const FORMACION = '4-4-2';
const POSICIONES = ['ARQ', 'DEF', 'MED', 'DEL'] as const;
const ORDEN_RONDAS: Posicion[] = [
  'ARQ',
  'DEF',
  'DEF',
  'DEF',
  'DEF',
  'MED',
  'MED',
  'MED',
  'MED',
  'DEL',
  'DEL',
];
const CUPOS: Record<Posicion, number> = {
  ARQ: 1,
  DEF: 4,
  MED: 4,
  DEL: 2,
};
const NOMBRES_POSICION: Record<Posicion, string> = {
  ARQ: 'Arquero',
  DEF: 'Defensor',
  MED: 'Mediocampista',
  DEL: 'Delantero',
};
const FORMATO_DINERO = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

type Posicion = (typeof POSICIONES)[number];
type Jugador = (typeof draftPlayers)[number];
type JugadorElegido = {
  jugador: Jugador;
  posicion: Posicion;
};

for (const jugador of draftPlayers) {
  if (jugador.rating < 60 || jugador.rating > 93) {
    throw new Error(`Rating fuera de rango para ${jugador.name}.`);
  }
  if (!Number.isFinite(jugador.price) || jugador.price <= 0) {
    throw new Error(`El precio de ${jugador.name} debe ser positivo.`);
  }
}

for (const posicion of POSICIONES) {
  if (draftPlayers.filter((jugador) => jugador.position === posicion).length < 3) {
    throw new Error(`Se necesitan al menos tres jugadores para ${posicion}.`);
  }
}

function mezclar<T>(elementos: T[]) {
  const resultado = [...elementos];
  for (let indice = resultado.length - 1; indice > 0; indice--) {
    const aleatorio = Math.floor(Math.random() * (indice + 1));
    [resultado[indice], resultado[aleatorio]] = [
      resultado[aleatorio],
      resultado[indice],
    ];
  }
  return resultado;
}

function repartirOpciones(
  posicion: Posicion,
  elegidos: JugadorElegido[],
  presupuesto: number,
) {
  const idsElegidos = new Set(elegidos.map(({ jugador }) => jugador.id));
  const disponibles = draftPlayers.filter(
    (jugador) =>
      jugador.position === posicion && !idsElegidos.has(jugador.id),
  );
  const opciones = mezclar(disponibles).slice(0, 3);
  const opcionesAsequibles = disponibles
    .filter((jugador) => jugador.price <= presupuesto)
    .sort((a, b) => a.price - b.price);

  if (
    opcionesAsequibles.length > 0 &&
    !opciones.some((jugador) => jugador.price <= presupuesto)
  ) {
    opciones[opciones.length - 1] = opcionesAsequibles[0];
  }

  return opciones;
}

function esAsequible(jugador: Jugador, presupuesto: number) {
  return jugador.price <= presupuesto;
}

export default function DraftGame() {
  const [presupuesto, setPresupuesto] = useState(PRESUPUESTO_INICIAL);
  const [equipo, setEquipo] = useState<JugadorElegido[]>([]);
  const [opciones, setOpciones] = useState<Jugador[]>([]);
  const [iniciado, setIniciado] = useState(false);
  const [mensajeCompartir, setMensajeCompartir] = useState('');

  const terminado = equipo.length === ORDEN_RONDAS.length;
  const posicionActual = ORDEN_RONDAS[equipo.length];
  const sinPresupuesto =
    iniciado &&
    !terminado &&
    opciones.length > 0 &&
    opciones.every((jugador) => !esAsequible(jugador, presupuesto));

  const iniciarDraft = () => {
    setEquipo([]);
    setPresupuesto(PRESUPUESTO_INICIAL);
    setOpciones(repartirOpciones('ARQ', [], PRESUPUESTO_INICIAL));
    setMensajeCompartir('');
    setIniciado(true);
  };

  const elegirJugador = (jugador: Jugador) => {
    if (!posicionActual || !esAsequible(jugador, presupuesto)) return;

    const siguienteEquipo = [
      ...equipo,
      { jugador, posicion: posicionActual },
    ];
    const siguientePresupuesto = presupuesto - jugador.price;
    setEquipo(siguienteEquipo);
    setPresupuesto(siguientePresupuesto);
    setMensajeCompartir('');

    if (siguienteEquipo.length < ORDEN_RONDAS.length) {
      const siguientePosicion = ORDEN_RONDAS[siguienteEquipo.length];
      setOpciones(
        repartirOpciones(
          siguientePosicion,
          siguienteEquipo,
          siguientePresupuesto,
        ),
      );
    } else {
      setOpciones([]);
    }
  };

  const promedio =
    equipo.length > 0
      ? equipo.reduce((suma, { jugador }) => suma + jugador.rating, 0) /
        equipo.length
      : 0;

  const textoParaCompartir = () => {
    const lineas = POSICIONES.map((posicion) => {
      const nombres = equipo
        .filter((elegido) => elegido.posicion === posicion)
        .map(({ jugador }) => jugador.name)
        .join(', ');
      return `${posicion}: ${nombres || '—'}`;
    });

    return [
      `Mi FUT Draft histórico de Lanús (${FORMACION})`,
      ...lineas,
      `Media: ${promedio.toFixed(1)}`,
      `Dinero sobrante: ${FORMATO_DINERO.format(presupuesto)}`,
      'Armalo en quepartido.live/draft',
    ].join('\n');
  };

  const copiarEquipo = async () => {
    if (!terminado) return;
    if (!navigator.clipboard?.writeText) {
      setMensajeCompartir('Este navegador no permite copiar al portapapeles.');
      return;
    }

    try {
      await navigator.clipboard.writeText(textoParaCompartir());
      setMensajeCompartir('¡Equipo copiado para compartir!');
    } catch (error) {
      if (error instanceof DOMException) {
        setMensajeCompartir('No se pudo copiar. Revisá el permiso del navegador.');
      } else {
        throw error;
      }
    }
  };

  const jugadoresDelCampo = (posicion: Posicion) =>
    equipo
      .filter((elegido) => elegido.posicion === posicion)
      .map(({ jugador }) => jugador);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-700/80 bg-slate-950/95 px-3 py-2.5 shadow-xl backdrop-blur-xl">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Presupuesto restante
              </p>
              <p className="text-lg font-black tabular-nums text-emerald-300 sm:text-xl">
                {FORMATO_DINERO.format(presupuesto)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Formación
              </p>
              <p className="text-lg font-black text-white sm:text-xl">
                {FORMACION}
                <span className="ml-2 text-sm text-slate-400">
                  {equipo.length}/11
                </span>
              </p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5 sm:gap-2">
            {POSICIONES.map((posicion) => {
              const cantidad = equipo.filter(
                (elegido) => elegido.posicion === posicion,
              ).length;
              return (
                <div
                  key={posicion}
                  className="rounded-md border border-slate-800 bg-slate-900 px-1.5 py-1 text-center text-[10px] font-bold text-slate-300 sm:text-xs"
                >
                  {posicion} {cantidad}/{CUPOS[posicion]}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="min-h-dvh bg-slate-950 px-3 pb-10 pt-28 font-sans text-white sm:px-6 sm:pt-32">
        <div className="mx-auto w-full max-w-4xl">
          <Link
            href="/"
            className="mb-4 inline-flex text-sm font-bold text-slate-300 transition-colors hover:text-white"
          >
            ← Volver a la trivia
          </Link>

          <header className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
              QUEPARTIDO · Draft histórico
            </p>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-wide sm:text-4xl">
              Armá tu 11 de Lanús
            </h1>
          </header>

          <section
            aria-label={`Formación ${FORMACION}`}
            className="relative mb-5 overflow-hidden rounded-2xl border-[3px] border-emerald-900 bg-[#173b28] p-3 shadow-[0_15px_35px_rgba(0,0,0,0.65)] sm:p-5"
            style={{
              backgroundImage:
                'repeating-linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.12) 34px, transparent 34px, transparent 68px)',
            }}
          >
            <div className="pointer-events-none absolute inset-3 rounded-xl border border-white/15" />
            <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px bg-white/15" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
            <div
              className={`relative z-10 flex flex-col justify-around ${
                iniciado
                  ? 'min-h-[400px] sm:min-h-[500px]'
                  : 'min-h-[280px] sm:min-h-[350px]'
              }`}
            >
              {(['DEL', 'MED', 'DEF', 'ARQ'] as const).map((posicion) => (
                <div
                  key={posicion}
                  className="flex items-center justify-center gap-1.5 sm:gap-3"
                  aria-label={`${NOMBRES_POSICION[posicion]}: ${
                    jugadoresDelCampo(posicion).length
                  } de ${CUPOS[posicion]}`}
                >
                  {Array.from({ length: CUPOS[posicion] }, (_, indice) => {
                    const jugador = jugadoresDelCampo(posicion)[indice];
                    return (
                      <div
                        key={`${posicion}-${indice}`}
                        className="flex w-[23%] max-w-[92px] flex-col items-center"
                      >
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-black shadow-md sm:h-12 sm:w-12 ${
                            jugador
                              ? 'border-amber-200 bg-gradient-to-br from-amber-100 to-amber-400 text-slate-950'
                              : 'border-dashed border-white/40 bg-slate-950/40 text-white/70'
                          }`}
                        >
                          {jugador ? jugador.rating : '+'}
                        </div>
                        <span className="mt-1 max-w-full truncate rounded bg-slate-950/70 px-1.5 py-0.5 text-center text-[9px] font-bold text-white sm:text-[11px]">
                          {jugador ? jugador.name : posicion}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>

          {!iniciado ? (
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-center sm:p-7">
              <h2 className="text-lg font-black uppercase tracking-wide">
                Draft 4-4-2
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
                Elegí 1 arquero, 4 defensores, 4 mediocampistas y 2 delanteros.
                En cada ronda vas a recibir tres cartas al azar. Las que superen
                tu presupuesto quedan bloqueadas.
              </p>
              <p className="mt-3 text-sm font-bold text-emerald-200">
                Pozo inicial: {FORMATO_DINERO.format(PRESUPUESTO_INICIAL)}
              </p>
              <button
                type="button"
                onClick={iniciarDraft}
                className="mt-5 rounded-xl bg-amber-400 px-6 py-3 text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg transition-colors hover:bg-amber-300"
              >
                Empezar draft
              </button>
            </section>
          ) : terminado ? (
            <section className="rounded-2xl border border-amber-300/40 bg-gradient-to-br from-slate-900 to-amber-950/40 p-5 text-center shadow-xl sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                Plantel completo · {FORMACION}
              </p>
              <h2 className="mt-2 text-2xl font-black uppercase sm:text-3xl">
                ¡Plantel armado con éxito!
              </h2>
              <div className="mx-auto mt-5 grid max-w-lg grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                  <p className="text-3xl font-black text-amber-300">
                    {promedio.toFixed(1)}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Media del equipo
                  </p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                  <p className="text-xl font-black text-emerald-300 sm:text-2xl">
                    {FORMATO_DINERO.format(presupuesto)}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Dinero sobrante
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={copiarEquipo}
                  className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black uppercase tracking-wider text-slate-950 transition-colors hover:bg-amber-300"
                >
                  Copiar equipo
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    textoParaCompartir(),
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-5 py-3 text-sm font-black uppercase tracking-wider text-emerald-100 transition-colors hover:bg-emerald-500/25"
                >
                  Compartir por WhatsApp
                </a>
                <button
                  type="button"
                  onClick={iniciarDraft}
                  className="rounded-xl border border-slate-600 px-5 py-3 text-sm font-black uppercase tracking-wider text-slate-200 transition-colors hover:bg-slate-800"
                >
                  Nuevo draft
                </button>
              </div>
              {mensajeCompartir && (
                <p role="status" className="mt-3 text-sm text-emerald-200">
                  {mensajeCompartir}
                </p>
              )}
            </section>
          ) : (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Ronda {equipo.length + 1} de {ORDEN_RONDAS.length}
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    Elegí un {NOMBRES_POSICION[posicionActual].toLowerCase()}
                  </h2>
                </div>
                <p className="text-xs font-semibold text-slate-400">
                  {CUPOS[posicionActual] -
                    equipo.filter((elegido) => elegido.posicion === posicionActual)
                      .length}{' '}
                  cupos restantes
                </p>
              </div>

              {sinPresupuesto && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-sm text-rose-100"
                >
                  <p className="font-bold">
                    Ninguna de estas cartas entra en el presupuesto restante.
                  </p>
                  <p className="mt-1 text-rose-200/80">
                    Vas a tener que administrar mejor el pozo en un nuevo draft.
                  </p>
                  <button
                    type="button"
                    onClick={iniciarDraft}
                    className="mt-3 rounded-lg bg-rose-700 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-rose-600"
                  >
                    Reiniciar draft
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                {opciones.map((jugador) => {
                  const asequible = esAsequible(jugador, presupuesto);
                  return (
                    <button
                      key={jugador.id}
                      type="button"
                      disabled={!asequible}
                      onClick={() => elegirJugador(jugador)}
                      aria-label={`${jugador.name}, ${jugador.position}, rating ${jugador.rating}, ${FORMATO_DINERO.format(jugador.price)}${
                        asequible ? '' : ', fuera de presupuesto'
                      }`}
                      className="group text-left disabled:cursor-not-allowed"
                    >
                      <CartaJugador
                        jugador={jugador}
                        asequible={asequible}
                      />
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

function CartaJugador({
  jugador,
  asequible,
}: {
  jugador: Jugador;
  asequible: boolean;
}) {
  return (
    <div
      className={`relative mx-auto flex min-h-64 w-full max-w-[260px] flex-col justify-between overflow-hidden rounded-2xl border p-4 text-slate-950 shadow-lg transition-transform group-hover:scale-[1.02] ${
        asequible
          ? 'border-amber-200/80 bg-gradient-to-br from-amber-100 via-yellow-200 to-amber-400'
          : 'border-slate-600 bg-gradient-to-br from-slate-400 via-slate-500 to-slate-700 text-slate-950 opacity-60'
      }`}
    >
      <div className="absolute inset-2 rounded-xl border border-slate-950/15" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-4xl font-black leading-none">{jugador.rating}</p>
          <p className="mt-1 text-xs font-black uppercase tracking-widest">
            {jugador.position}
          </p>
        </div>
        <span className="text-3xl" aria-hidden="true">
          ⚽
        </span>
      </div>
      <div className="relative py-4 text-center">
        <p className="text-lg font-black leading-tight">{jugador.name}</p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
          Club Atlético Lanús
        </p>
      </div>
      <div className="relative grid grid-cols-3 gap-1 border-t border-slate-950/20 pt-2 text-center">
        <EstadisticaCarta
          etiqueta="Precio"
          valor={FORMATO_DINERO.format(jugador.price)}
        />
        <EstadisticaCarta
          etiqueta="Partidos"
          valor={
            jugador.matches !== null && jugador.matches > 0
              ? jugador.matches.toLocaleString('es-AR')
              : 'S/D'
          }
        />
        <EstadisticaCarta
          etiqueta="Goles"
          valor={
            jugador.goals !== null
              ? jugador.goals.toLocaleString('es-AR')
              : 'S/D'
          }
        />
      </div>
      {!asequible && (
        <p className="relative mt-2 text-center text-[10px] font-black uppercase tracking-wider">
          Presupuesto insuficiente
        </p>
      )}
    </div>
  );
}

function EstadisticaCarta({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[8px] font-black uppercase tracking-wider opacity-70">
        {etiqueta}
      </p>
      <p className="truncate text-xs font-black">{valor}</p>
    </div>
  );
}
