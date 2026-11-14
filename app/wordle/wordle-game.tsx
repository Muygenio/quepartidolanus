'use client';

import Link from 'next/link';
import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import jugadoresDeFormaciones from '../data/wordle-players.json';
import jugadoresDraft from '../data/draft-players.json';

const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';
const CLAVE_ALMACENAMIENTO = 'quepartido:wordle:v1';
const MAX_INTENTOS = 6;

type Jugador = {
  nombre: string;
  alias: string[];
  posiciones: string[];
  temporadas: number[];
  rating: number;
  matches: number | null;
  goals: number | null;
};
type EstadoPartida = {
  fecha: string;
  intentos: string[];
  completada: boolean;
  victoria: boolean;
};
type Estadisticas = {
  partidas: number;
  victorias: number;
  rachaActual: number;
  mejorRacha: number;
  ultimaFechaCompletada: string | null;
};
type EstadoGuardado = {
  partida: EstadoPartida | null;
  estadisticas: Estadisticas;
};
type Coincidencia = 'exacta' | 'parcial' | 'ninguna' | 'sin-dato';

const normalizarTexto = (texto: string) =>
  texto
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function agruparPosicion(posicion: string) {
  if (['ARQ'].includes(posicion)) return 'ARQ';
  if (['DEF', 'LD', 'DFC', 'LI'].includes(posicion)) return 'DEF';
  if (['MED', 'MD', 'MC', 'MI', 'MCD', 'MCO'].includes(posicion)) {
    return 'MED';
  }
  if (['DEL', 'DC', 'ED', 'EI'].includes(posicion)) return 'DEL';
  return posicion;
}

function aliasesAdicionales(jugador: (typeof jugadoresDraft)[number]) {
  return 'aliases' in jugador ? (jugador.aliases ?? []) : [];
}

const jugadoresWordle: Jugador[] = jugadoresDraft.map((jugadorDraft) => {
  const aliases = aliasesAdicionales(jugadorDraft);
  const datosAnteriores = jugadoresDeFormaciones.find(
    (jugador) =>
      normalizarTexto(jugador.nombre) === normalizarTexto(jugadorDraft.name) ||
      jugador.alias.some(
        (alias) => normalizarTexto(alias) === normalizarTexto(jugadorDraft.name),
      ) ||
      aliases.some(
        (alias) => normalizarTexto(alias) === normalizarTexto(jugador.nombre),
      ),
  );

  return {
    nombre: datosAnteriores?.nombre ?? jugadorDraft.name,
    alias: [...new Set([...(datosAnteriores?.alias ?? []), ...aliases])],
    posiciones: datosAnteriores
      ? [...new Set(datosAnteriores.posiciones.map(agruparPosicion))]
      : [jugadorDraft.position],
    temporadas: datosAnteriores?.temporadas ?? [],
    rating: jugadorDraft.rating,
    matches:
      jugadorDraft.matches !== null && jugadorDraft.matches > 0
        ? jugadorDraft.matches
        : null,
    goals: jugadorDraft.goals,
  };
});

function obtenerFechaDiaria(fecha: Date) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(fecha);
  const anio = partes.find((parte) => parte.type === 'year')?.value;
  const mes = partes.find((parte) => parte.type === 'month')?.value;
  const dia = partes.find((parte) => parte.type === 'day')?.value;

  if (!anio || !mes || !dia) {
    throw new Error('No se pudo determinar la fecha del desafío.');
  }

  return `${anio}-${mes}-${dia}`;
}

function obtenerNumeroDeDia(fecha: string) {
  const anio = Number(fecha.slice(0, 4));
  const mes = Number(fecha.slice(5, 7));
  const dia = Number(fecha.slice(8, 10));
  return Math.floor(Date.UTC(anio, mes - 1, dia) / 86_400_000);
}

function hashTexto(texto: string) {
  let hash = 2_166_136_261;
  for (let indice = 0; indice < texto.length; indice++) {
    hash = Math.imul(hash ^ texto.charCodeAt(indice), 16_777_619);
  }
  return hash >>> 0;
}

function maximoComunDivisor(a: number, b: number): number {
  return b === 0 ? a : maximoComunDivisor(b, a % b);
}

function obtenerJugadorDelDia(fecha: string): Jugador {
  const cantidad = jugadoresWordle.length;
  if (cantidad === 0) {
    throw new Error('La base del Jugador Misterioso está vacía.');
  }
  if (cantidad === 1) return jugadoresWordle[0];

  const semilla = hashTexto('quepartido-wordle-diario-v1');
  let salto = (semilla % (cantidad - 1)) + 1;
  while (maximoComunDivisor(salto, cantidad) !== 1) {
    salto = (salto % (cantidad - 1)) + 1;
  }
  const desplazamiento = hashTexto('quepartido-wordle-offset-v1') % cantidad;
  const indice =
    (obtenerNumeroDeDia(fecha) * salto + desplazamiento) % cantidad;

  return jugadoresWordle[indice];
}

function crearEstadisticasIniciales(): Estadisticas {
  return {
    partidas: 0,
    victorias: 0,
    rachaActual: 0,
    mejorRacha: 0,
    ultimaFechaCompletada: null,
  };
}

function actualizarEstadisticas(
  actuales: Estadisticas,
  fecha: string,
  victoria: boolean,
): Estadisticas {
  if (actuales.ultimaFechaCompletada === fecha) return actuales;

  const ayer = actuales.ultimaFechaCompletada
    ? obtenerNumeroDeDia(actuales.ultimaFechaCompletada)
    : null;
  const esDiaConsecutivo =
    ayer !== null && obtenerNumeroDeDia(fecha) - ayer === 1;
  const rachaActual = victoria
    ? esDiaConsecutivo
      ? actuales.rachaActual + 1
      : 1
    : 0;

  return {
    partidas: actuales.partidas + 1,
    victorias: actuales.victorias + (victoria ? 1 : 0),
    rachaActual,
    mejorRacha: Math.max(actuales.mejorRacha, rachaActual),
    ultimaFechaCompletada: fecha,
  };
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function esPartidaGuardada(valor: unknown): valor is EstadoPartida {
  return (
    esRegistro(valor) &&
    typeof valor.fecha === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(valor.fecha) &&
    Array.isArray(valor.intentos) &&
    valor.intentos.length <= MAX_INTENTOS &&
    valor.intentos.every(
      (intento) =>
        typeof intento === 'string' &&
        jugadoresWordle.some((jugador) => jugador.nombre === intento),
    ) &&
    typeof valor.completada === 'boolean' &&
    typeof valor.victoria === 'boolean'
  );
}

function esEstadisticaGuardada(valor: unknown): valor is Estadisticas {
  return (
    esRegistro(valor) &&
    Number.isInteger(valor.partidas) &&
    Number(valor.partidas) >= 0 &&
    Number.isInteger(valor.victorias) &&
    Number(valor.victorias) >= 0 &&
    Number.isInteger(valor.rachaActual) &&
    Number(valor.rachaActual) >= 0 &&
    Number.isInteger(valor.mejorRacha) &&
    Number(valor.mejorRacha) >= 0 &&
    (valor.ultimaFechaCompletada === null ||
      (typeof valor.ultimaFechaCompletada === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(valor.ultimaFechaCompletada)))
  );
}

function esEstadoGuardado(valor: unknown): valor is EstadoGuardado {
  return (
    esRegistro(valor) &&
    (valor.partida === null || esPartidaGuardada(valor.partida)) &&
    esEstadisticaGuardada(valor.estadisticas)
  );
}

function leerEstadoGuardado(): {
  estado: EstadoGuardado | null;
  invalido: boolean;
} {
  const texto = window.localStorage.getItem(CLAVE_ALMACENAMIENTO);
  if (!texto) return { estado: null, invalido: false };

  let valor: unknown;
  try {
    valor = JSON.parse(texto);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { estado: null, invalido: true };
    }
    throw error;
  }

  return esEstadoGuardado(valor)
    ? { estado: valor, invalido: false }
    : { estado: null, invalido: true };
}

function guardarEstado(estado: EstadoGuardado) {
  try {
    window.localStorage.setItem(
      CLAVE_ALMACENAMIENTO,
      JSON.stringify(estado),
    );
    return true;
  } catch (error) {
    if (error instanceof DOMException) return false;
    throw error;
  }
}

function compararAtributos<T extends string | number>(
  valores: T[],
  objetivo: T[],
): Coincidencia {
  if (!valores.length || !objetivo.length) return 'sin-dato';
  const coincideExacto =
    valores.length === objetivo.length &&
    valores.every((valor) => objetivo.includes(valor));
  if (coincideExacto) return 'exacta';
  return valores.some((valor) => objetivo.includes(valor))
    ? 'parcial'
    : 'ninguna';
}

function compararNumero(
  valor: number | null,
  objetivo: number | null,
  tolerancia: number,
): Coincidencia {
  if (valor === null || objetivo === null) return 'sin-dato';
  if (valor === objetivo) return 'exacta';
  return Math.abs(valor - objetivo) <= tolerancia ? 'parcial' : 'ninguna';
}

const colorPorCoincidencia: Record<Coincidencia, string> = {
  exacta: 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200',
  parcial: 'border-amber-500/50 bg-amber-500/20 text-amber-100',
  ninguna: 'border-rose-500/40 bg-rose-950/60 text-rose-200',
  'sin-dato': 'border-slate-700 bg-slate-800/60 text-slate-400',
};

const emojiPorCoincidencia: Record<Coincidencia, string> = {
  exacta: '🟩',
  parcial: '🟨',
  ninguna: '🟥',
  'sin-dato': '⬜',
};

export default function WordleGame() {
  const [fecha, setFecha] = useState<string | null>(null);
  const [partida, setPartida] = useState<EstadoPartida | null>(null);
  const [estadisticas, setEstadisticas] = useState(
    crearEstadisticasIniciales,
  );
  const [busqueda, setBusqueda] = useState('');
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState<string | null>(
    null,
  );
  const [mensajeAlmacenamiento, setMensajeAlmacenamiento] = useState('');
  const [mensajeCompartir, setMensajeCompartir] = useState('');
  const [mensajeJuego, setMensajeJuego] = useState('');

  useEffect(() => {
    const actualizarFecha = () => setFecha(obtenerFechaDiaria(new Date()));
    actualizarFecha();
    const intervalo = window.setInterval(actualizarFecha, 30_000);
    return () => window.clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (!fecha) return;

    const temporizador = window.setTimeout(() => {
      setMensajeAlmacenamiento('');
      setMensajeJuego('');
      setBusqueda('');
      setJugadorSeleccionado(null);

      try {
        const resultado = leerEstadoGuardado();
        if (resultado.invalido) {
          window.localStorage.removeItem(CLAVE_ALMACENAMIENTO);
          setMensajeAlmacenamiento(
            'El guardado local estaba dañado y se reinició.',
          );
        }

        const guardado = resultado.estado;
        setEstadisticas(
          guardado?.estadisticas ?? crearEstadisticasIniciales(),
        );
        setPartida(
          guardado?.partida?.fecha === fecha
            ? guardado.partida
            : {
                fecha,
                intentos: [],
                completada: false,
                victoria: false,
              },
        );
      } catch (error) {
        if (error instanceof DOMException) {
          setMensajeAlmacenamiento(
            'El navegador bloqueó el almacenamiento local; el progreso no se conservará.',
          );
          setEstadisticas(crearEstadisticasIniciales());
          setPartida({
            fecha,
            intentos: [],
            completada: false,
            victoria: false,
          });
        } else {
          throw error;
        }
      }
    }, 0);

    return () => window.clearTimeout(temporizador);
  }, [fecha]);

  const jugadorDelDia = fecha ? obtenerJugadorDelDia(fecha) : null;
  const listo = Boolean(fecha && partida?.fecha === fecha && jugadorDelDia);

  const enviarIntento = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!fecha || !partida || !jugadorDelDia || partida.completada) return;
    if (!jugadorSeleccionado) {
      setMensajeJuego('Elegí un jugador de la lista antes de probar.');
      return;
    }
    if (partida.intentos.includes(jugadorSeleccionado)) {
      setMensajeJuego('Ya probaste con ese jugador.');
      return;
    }

    const intentos = [...partida.intentos, jugadorSeleccionado];
    const victoria = jugadorSeleccionado === jugadorDelDia.nombre;
    const completada = victoria || intentos.length >= MAX_INTENTOS;
    const siguientePartida: EstadoPartida = {
      fecha,
      intentos,
      completada,
      victoria,
    };
    const siguientesEstadisticas = completada
      ? actualizarEstadisticas(estadisticas, fecha, victoria)
      : estadisticas;

    setPartida(siguientePartida);
    setEstadisticas(siguientesEstadisticas);
    setBusqueda('');
    setJugadorSeleccionado(null);
    setMensajeJuego('');
    setMensajeCompartir('');

    const guardado = guardarEstado({
      partida: siguientePartida,
      estadisticas: siguientesEstadisticas,
    });
    if (!guardado) {
      setMensajeAlmacenamiento(
        'No se pudo guardar el progreso. El desafío seguirá disponible mientras esta pestaña permanezca abierta.',
      );
    }
  };

  const compartirResultado = async () => {
    if (!fecha || !partida || !partida.intentos.length || !jugadorDelDia) {
      return;
    }

    const grilla = partida.intentos
      .map((nombre) => {
        const jugador = jugadoresWordle.find(
          (candidato) => candidato.nombre === nombre,
        );
        if (!jugador) {
          throw new Error(`No se encontró el jugador guardado: ${nombre}`);
        }
        const pistas: Coincidencia[] = [
          compararAtributos(
            jugador.posiciones,
            jugadorDelDia.posiciones,
          ),
          compararAtributos(
            jugador.temporadas,
            jugadorDelDia.temporadas,
          ),
          compararNumero(jugador.rating, jugadorDelDia.rating, 2),
          compararNumero(jugador.matches, jugadorDelDia.matches, 40),
          compararNumero(jugador.goals, jugadorDelDia.goals, 15),
        ];
        return pistas.map((pista) => emojiPorCoincidencia[pista]).join('');
      })
      .join('\n');
    const texto =
      `QUEPARTIDO · Jugador Misterioso ${fecha}\n${grilla}\n` +
      'https://quepartido.live/jugador-misterioso';

    if (!navigator.clipboard?.writeText) {
      setMensajeCompartir('Este navegador no permite copiar al portapapeles.');
      return;
    }

    try {
      await navigator.clipboard.writeText(texto);
      setMensajeCompartir('Resultado copiado. ¡Compartilo sin spoilers!');
    } catch (error) {
      if (error instanceof DOMException) {
        setMensajeCompartir('No se pudo copiar. Revisá el permiso del navegador.');
      } else {
        throw error;
      }
    }
  };

  const cambiarBusqueda = (valor: string) => {
    setBusqueda(valor);
    setJugadorSeleccionado(null);
    setMensajeJuego('');
  };

  const seleccionarJugador = (nombre: string) => {
    setBusqueda(nombre);
    setJugadorSeleccionado(nombre);
    setMensajeJuego('');
  };

  return (
    <main className="min-h-dvh bg-slate-950 px-3 py-5 font-sans text-white sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-300 transition-colors hover:text-white"
        >
          <span aria-hidden="true">←</span> Trivia de formaciones
        </Link>

        <header className="mb-5 overflow-hidden rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-900 via-slate-900 to-[#271019] p-5 shadow-xl sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-300">
            QUEPARTIDO · Desafío diario
          </p>
          <h1 className="mt-2 text-2xl font-black uppercase tracking-wide sm:text-4xl">
            Jugador Misterioso
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Adiviná el jugador con pistas de posición, temporadas, rating,
            partidos y goles. Tenés {MAX_INTENTOS} intentos.
          </p>
          {fecha && (
            <p className="mt-4 inline-flex rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-1.5 font-mono text-sm text-slate-200">
              {fecha}
            </p>
          )}
        </header>

        {mensajeAlmacenamiento && (
          <p
            role="status"
            className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            {mensajeAlmacenamiento}
          </p>
        )}

        {!listo || !partida || !jugadorDelDia ? (
          <div
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-300"
            role="status"
          >
            Cargando el desafío...
          </div>
        ) : (
          <>
            <section
              aria-label="Intentos del desafío"
              className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
                  Tus intentos
                </h2>
                <span className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 font-mono text-sm font-bold text-slate-200">
                  {partida.intentos.length} / {MAX_INTENTOS}
                </span>
              </div>

              <div className="space-y-3">
                {partida.intentos.map((nombre, indice) => {
                  const jugador = jugadoresWordle.find(
                    (candidato) => candidato.nombre === nombre,
                  );
                  if (!jugador) return null;

                  const coincidenciaPosicion = compararAtributos(
                    jugador.posiciones,
                    jugadorDelDia.posiciones,
                  );
                  const coincidenciaTemporada = compararAtributos(
                    jugador.temporadas,
                    jugadorDelDia.temporadas,
                  );
                  const coincidenciaRating = compararNumero(
                    jugador.rating,
                    jugadorDelDia.rating,
                    2,
                  );
                  const coincidenciaPartidos = compararNumero(
                    jugador.matches,
                    jugadorDelDia.matches,
                    40,
                  );
                  const coincidenciaGoles = compararNumero(
                    jugador.goals,
                    jugadorDelDia.goals,
                    15,
                  );

                  return (
                    <div
                      key={`${nombre}-${indice}`}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                    >
                      <p className="mb-2 truncate text-sm font-bold text-white">
                        {indice + 1}. {jugador.nombre}
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <Pista
                          etiqueta="Posición"
                          valor={jugador.posiciones.join(' · ')}
                          coincidencia={coincidenciaPosicion}
                        />
                        <Pista
                          etiqueta="Temporadas"
                          valor={
                            jugador.temporadas.length
                              ? jugador.temporadas.join(' · ')
                              : 'Sin dato'
                          }
                          coincidencia={coincidenciaTemporada}
                        />
                        <Pista
                          etiqueta="Rating"
                          valor={jugador.rating.toString()}
                          coincidencia={coincidenciaRating}
                        />
                        <Pista
                          etiqueta="Partidos"
                          valor={
                            jugador.matches === null
                              ? 'Sin dato'
                              : jugador.matches.toLocaleString('es-AR')
                          }
                          coincidencia={coincidenciaPartidos}
                        />
                        <Pista
                          etiqueta="Goles"
                          valor={
                            jugador.goals === null
                              ? 'Sin dato'
                              : jugador.goals.toLocaleString('es-AR')
                          }
                          coincidencia={coincidenciaGoles}
                        />
                      </div>
                    </div>
                  );
                })}
                {partida.intentos.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-400">
                    Tus intentos y pistas van a aparecer acá.
                  </p>
                )}
              </div>

              {partida.completada && (
                <p
                  className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${
                    partida.victoria
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                  }`}
                  role="status"
                >
                  {partida.victoria
                    ? `¡Acertaste! El jugador era ${jugadorDelDia.nombre}.`
                    : `Se terminaron los intentos. El jugador era ${jugadorDelDia.nombre}.`}
                </p>
              )}
            </section>

            <form
              onSubmit={enviarIntento}
              className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5"
            >
              <label
                htmlFor="wordle-buscador"
                className="mb-2 block text-sm font-bold text-slate-200"
              >
                Elegí un jugador
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <PlayerAutocomplete
                  value={busqueda}
                  seleccionado={jugadorSeleccionado}
                  jugadores={jugadoresWordle}
                  intentos={partida.intentos}
                  deshabilitado={partida.completada}
                  onChange={cambiarBusqueda}
                  onSelect={seleccionarJugador}
                />
                <button
                  type="submit"
                  disabled={!jugadorSeleccionado || partida.completada}
                  className="shrink-0 rounded-xl bg-[#800020] px-5 py-3 text-sm font-black uppercase tracking-wider text-white shadow-lg transition-colors hover:bg-[#a0002e] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Probar
                </button>
              </div>
              {mensajeJuego && (
                <p role="status" className="mt-2 text-sm text-amber-200">
                  {mensajeJuego}
                </p>
              )}
            </form>

            <section
              aria-label="Estadísticas"
              className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              <Estadistica etiqueta="Partidas" valor={estadisticas.partidas} />
              <Estadistica etiqueta="Victorias" valor={estadisticas.victorias} />
              <Estadistica
                etiqueta="Racha actual"
                valor={estadisticas.rachaActual}
              />
              <Estadistica
                etiqueta="Mejor racha"
                valor={estadisticas.mejorRacha}
              />
            </section>

            {partida.intentos.length > 0 && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-center sm:p-5">
                <button
                  type="button"
                  onClick={compartirResultado}
                  className="rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-5 py-3 text-sm font-black uppercase tracking-wider text-emerald-100 transition-colors hover:bg-emerald-500/25"
                >
                  Compartir resultado
                </button>
                {mensajeCompartir && (
                  <p
                    role="status"
                    className="mt-3 text-sm text-emerald-200"
                  >
                    {mensajeCompartir}
                  </p>
                )}
                <p className="mt-3 text-xs text-slate-400">
                  La grilla muestra tus pistas, nunca el nombre secreto.
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function PlayerAutocomplete({
  value,
  seleccionado,
  jugadores,
  intentos,
  deshabilitado,
  onChange,
  onSelect,
}: {
  value: string;
  seleccionado: string | null;
  jugadores: Jugador[];
  intentos: string[];
  deshabilitado: boolean;
  onChange: (value: string) => void;
  onSelect: (nombre: string) => void;
}) {
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const busquedaNormalizada = normalizarTexto(value);
  const sugerencias =
    busquedaNormalizada && !seleccionado && !deshabilitado
      ? jugadores.filter(
          (jugador) =>
            !intentos.includes(jugador.nombre) &&
            [jugador.nombre, ...jugador.alias].some((texto) =>
              normalizarTexto(texto).includes(busquedaNormalizada),
            ),
        )
      : [];
  const sugerenciaActiva = sugerencias[indiceActivo];

  const manejarCambio = (evento: ChangeEvent<HTMLInputElement>) => {
    onChange(evento.target.value);
    setIndiceActivo(-1);
  };

  const manejarTecla = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (!sugerencias.length) {
      if (evento.key === 'Escape') onChange('');
      return;
    }

    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setIndiceActivo((indice) => (indice + 1) % sugerencias.length);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setIndiceActivo((indice) =>
        indice <= 0 ? sugerencias.length - 1 : indice - 1,
      );
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      onSelect((sugerenciaActiva ?? sugerencias[0]).nombre);
      setIndiceActivo(-1);
    } else if (evento.key === 'Escape') {
      onChange('');
      setIndiceActivo(-1);
    }
  };

  return (
    <div className="relative min-w-0 flex-1">
      {busquedaNormalizada && !seleccionado && !deshabilitado && (
        <div
          id="wordle-sugerencias"
          role="listbox"
          aria-label="Jugadores"
          className="absolute inset-x-0 bottom-full z-20 mb-2 max-h-[45dvh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl"
        >
          {sugerencias.length ? (
            sugerencias.map((jugador, indice) => (
              <button
                key={jugador.nombre}
                id={`wordle-sugerencia-${indice}`}
                type="button"
                role="option"
                aria-selected={indice === indiceActivo}
                tabIndex={-1}
                onClick={() => {
                  onSelect(jugador.nombre);
                  setIndiceActivo(-1);
                }}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                  indice === indiceActivo
                    ? 'bg-[#800020] text-white'
                    : 'text-slate-100 hover:bg-slate-800'
                }`}
              >
                {jugador.nombre}
              </button>
            ))
          ) : (
            <p className="px-3 py-2.5 text-sm text-slate-400">
              No hay jugadores disponibles con esa búsqueda.
            </p>
          )}
        </div>
      )}

      <input
        id="wordle-buscador"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={Boolean(
          busquedaNormalizada && !seleccionado && !deshabilitado,
        )}
        aria-controls={
          busquedaNormalizada && !seleccionado && !deshabilitado
            ? 'wordle-sugerencias'
            : undefined
        }
        aria-activedescendant={
          sugerenciaActiva ? `wordle-sugerencia-${indiceActivo}` : undefined
        }
        autoComplete="off"
        value={value}
        onChange={manejarCambio}
        onKeyDown={manejarTecla}
        disabled={deshabilitado}
        placeholder="Escribí nombre o apellido..."
        className="w-full rounded-xl border-2 border-slate-700 bg-slate-950 px-4 py-3 text-base font-semibold text-white outline-none transition-colors placeholder:font-normal placeholder:text-slate-500 focus:border-[#800020] disabled:opacity-50"
      />
    </div>
  );
}

function Pista({
  etiqueta,
  valor,
  coincidencia,
}: {
  etiqueta: string;
  valor: string;
  coincidencia: Coincidencia;
}) {
  const descripcion =
    coincidencia === 'exacta'
      ? 'Coincidencia exacta'
      : coincidencia === 'parcial'
        ? 'Coincidencia parcial'
        : coincidencia === 'sin-dato'
          ? 'Dato no disponible'
          : 'Sin coincidencia';

  return (
    <div
      className={`min-w-0 rounded-lg border px-2.5 py-2 ${colorPorCoincidencia[coincidencia]}`}
      aria-label={`${etiqueta}: ${valor}. ${descripcion}`}
    >
      <p className="text-[10px] font-black uppercase tracking-wider opacity-80">
        {etiqueta}
      </p>
      <p className="truncate text-sm font-bold">{valor}</p>
      <p className="sr-only">{descripcion}</p>
    </div>
  );
}

function Estadistica({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-4 text-center">
      <p className="text-2xl font-black tabular-nums text-white">{valor}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {etiqueta}
      </p>
    </div>
  );
}
