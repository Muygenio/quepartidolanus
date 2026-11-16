'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import jugadoresDeWordle from '../data/wordle-players.json';
import jugadoresDraft from '../data/draft-players.json';
import formaciones from '../data/lanus.json';

type EstadoLetra = 'correcta' | 'presente' | 'ausente';
type EstadoCasilla = EstadoLetra | 'vacia' | 'actual';

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
  rachaMaxima: number;
  ultimaFechaCompletada: string | null;
};

type EstadoGuardado = {
  partida: EstadoPartida | null;
  estadisticas: Estadisticas;
};

type MensajeDeFecha = {
  fecha: string;
  texto: string;
} | null;

const CLAVE_ALMACENAMIENTO = 'quepartido:wordle:lanus:v1';
const MAX_INTENTOS = 6;
const LONGITUD_MINIMA = 4;
const LONGITUD_MAXIMA = 8;
const FILAS_TECLADO = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] as const;
const PARTICULAS_APELLIDO = new Set([
  'da',
  'de',
  'del',
  'do',
  'dos',
  'la',
  'las',
  'los',
  'van',
  'von',
]);

const nombresDeFuentes = [
  ...jugadoresDeWordle.map((jugador) => jugador.nombre),
  ...jugadoresDraft.map((jugador) => jugador.name),
  ...formaciones.flatMap((formacion) =>
    formacion.titulares.map((jugador) => jugador.nombre),
  ),
];

const nombresAnteriores = new Set(nombresDeFuentes);

function normalizarApellido(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

function extraerApellido(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  let indiceApellido = partes.length - 1;
  while (
    indiceApellido > 0 &&
    PARTICULAS_APELLIDO.has(partes[indiceApellido - 1].toLowerCase())
  ) {
    indiceApellido -= 1;
  }

  return normalizarApellido(partes.slice(indiceApellido).join(' '));
}

const apellidosDisponibles = Array.from(
  new Set(
    nombresDeFuentes
      .map(extraerApellido)
      .filter(
        (apellido) =>
          apellido.length >= LONGITUD_MINIMA &&
          apellido.length <= LONGITUD_MAXIMA,
      ),
  ),
).sort();

function obtenerFechaDiaria(fecha: Date): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(fecha);
  const valores = Object.fromEntries(
    partes.map((parte) => [parte.type, parte.value]),
  );

  return `${valores.year}-${valores.month}-${valores.day}`;
}

function obtenerApellidoDelDia(fecha: string): string {
  if (apellidosDisponibles.length === 0) {
    throw new Error('No hay apellidos válidos para el Wordle de Lanús.');
  }
  if (apellidosDisponibles.length === 1) return apellidosDisponibles[0];

  const [anio, mes, dia] = fecha.split('-').map(Number);
  const numeroDeDia = Math.floor(
    Date.UTC(anio, mes - 1, dia) / (24 * 60 * 60 * 1000),
  );
  let semilla = 0;

  for (const caracter of fecha) {
    semilla = (semilla * 31 + caracter.charCodeAt(0)) >>> 0;
  }

  const cantidad = apellidosDisponibles.length;
  let salto = ((semilla >>> 8) % cantidad) || 1;
  while (salto > 1 && obtenerMaximoComunDivisor(salto, cantidad) !== 1) {
    salto = (salto % (cantidad - 1)) + 1;
  }

  const desplazamiento = semilla % cantidad;
  const indice = (desplazamiento + numeroDeDia * salto) % cantidad;

  return apellidosDisponibles[indice];
}

function obtenerMaximoComunDivisor(a: number, b: number): number {
  let primero = a;
  let segundo = b;

  while (segundo !== 0) {
    [primero, segundo] = [segundo, primero % segundo];
  }

  return primero;
}

function crearEstadisticasIniciales(): Estadisticas {
  return {
    partidas: 0,
    victorias: 0,
    rachaActual: 0,
    rachaMaxima: 0,
    ultimaFechaCompletada: null,
  };
}

function obtenerFechaAnterior(fecha: string): string {
  const dia = new Date(`${fecha}T00:00:00.000Z`);
  dia.setUTCDate(dia.getUTCDate() - 1);
  return dia.toISOString().slice(0, 10);
}

function actualizarEstadisticas(
  actuales: Estadisticas,
  fecha: string,
  victoria: boolean,
): Estadisticas {
  if (actuales.ultimaFechaCompletada === fecha) return actuales;

  const rachaActual = victoria
    ? actuales.ultimaFechaCompletada === obtenerFechaAnterior(fecha)
      ? actuales.rachaActual + 1
      : 1
    : 0;

  return {
    partidas: actuales.partidas + 1,
    victorias: actuales.victorias + (victoria ? 1 : 0),
    rachaActual,
    rachaMaxima: Math.max(actuales.rachaMaxima, rachaActual),
    ultimaFechaCompletada: fecha,
  };
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function esEstadisticaGuardada(valor: unknown): valor is Estadisticas {
  if (!esRegistro(valor)) return false;

  return (
    Number.isInteger(valor.partidas) &&
    Number.isInteger(valor.victorias) &&
    Number.isInteger(valor.rachaActual) &&
    Number.isInteger(valor.rachaMaxima) &&
    (valor.ultimaFechaCompletada === null ||
      (typeof valor.ultimaFechaCompletada === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(valor.ultimaFechaCompletada)))
  );
}

function esPartidaGuardada(valor: unknown): valor is EstadoPartida {
  if (!esRegistro(valor) || !Array.isArray(valor.intentos)) return false;

  const intentos = valor.intentos;
  const longitudInicial =
    typeof intentos[0] === 'string' ? intentos[0].length : null;

  return (
    typeof valor.fecha === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(valor.fecha) &&
    intentos.length <= MAX_INTENTOS &&
    intentos.every(
      (intento) =>
        typeof intento === 'string' &&
        /^[A-Z]{4,8}$/.test(intento) &&
        (longitudInicial === null || intento.length === longitudInicial),
    ) &&
    typeof valor.completada === 'boolean' &&
    typeof valor.victoria === 'boolean' &&
    (!valor.victoria || valor.completada) &&
    (valor.completada ? valor.victoria || intentos.length === MAX_INTENTOS : true)
  );
}

function esPartidaAnteriorGuardada(valor: unknown): boolean {
  if (!esRegistro(valor) || !Array.isArray(valor.intentos)) return false;

  return (
    typeof valor.fecha === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(valor.fecha) &&
    valor.intentos.length <= MAX_INTENTOS &&
    valor.intentos.length > 0 &&
    valor.intentos.every(
      (intento) =>
        typeof intento === 'string' && nombresAnteriores.has(intento),
    ) &&
    typeof valor.completada === 'boolean' &&
    typeof valor.victoria === 'boolean'
  );
}

function esEstadoGuardado(valor: unknown): valor is EstadoGuardado {
  if (!esRegistro(valor) || !esEstadisticaGuardada(valor.estadisticas)) {
    return false;
  }

  return valor.partida === null || esPartidaGuardada(valor.partida);
}

function leerEstadoGuardado(): {
  estado: EstadoGuardado | null;
  invalido: boolean;
  migrado: boolean;
} {
  const texto = window.localStorage.getItem(CLAVE_ALMACENAMIENTO);
  if (!texto) return { estado: null, invalido: false, migrado: false };

  let valor: unknown;
  try {
    valor = JSON.parse(texto);
  } catch {
    return { estado: null, invalido: true, migrado: false };
  }

  if (esEstadoGuardado(valor)) {
    return { estado: valor, invalido: false, migrado: false };
  }

  if (
    esRegistro(valor) &&
    esPartidaAnteriorGuardada(valor.partida) &&
    esEstadisticaGuardada(valor.estadisticas)
  ) {
    return {
      estado: {
        partida: null,
        estadisticas: valor.estadisticas,
      },
      invalido: false,
      migrado: true,
    };
  }

  return { estado: null, invalido: true, migrado: false };
}

function guardarEstado(estado: EstadoGuardado): boolean {
  try {
    window.localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(estado));
    return true;
  } catch (error) {
    if (error instanceof DOMException) return false;
    throw error;
  }
}

function evaluarIntento(intento: string, objetivo: string): EstadoLetra[] {
  const resultado: EstadoLetra[] = Array.from(
    { length: objetivo.length },
    () => 'ausente',
  );
  const letrasRestantes = objetivo.split('');

  for (let indice = 0; indice < objetivo.length; indice += 1) {
    if (intento[indice] === objetivo[indice]) {
      resultado[indice] = 'correcta';
      letrasRestantes[indice] = '';
    }
  }

  for (let indice = 0; indice < objetivo.length; indice += 1) {
    if (resultado[indice] === 'correcta') continue;

    const indiceDisponible = letrasRestantes.indexOf(intento[indice]);
    if (indiceDisponible !== -1) {
      resultado[indice] = 'presente';
      letrasRestantes[indiceDisponible] = '';
    }
  }

  return resultado;
}

const clasesCasilla: Record<EstadoCasilla, string> = {
  vacia: 'border-slate-600 bg-black/20 text-white',
  actual: 'border-slate-300 bg-black/20 text-white',
  correcta: 'border-emerald-500 bg-emerald-700 text-white',
  presente: 'border-amber-400 bg-amber-400 text-slate-950',
  ausente: 'border-slate-700 bg-slate-800 text-slate-300',
};

const clasesTecla: Record<EstadoLetra | 'nueva', string> = {
  nueva: 'bg-slate-600 text-white hover:bg-slate-500',
  correcta: 'bg-emerald-700 text-white',
  presente: 'bg-amber-400 text-slate-950',
  ausente: 'bg-slate-800 text-slate-400',
};

const prioridadEstado: Record<EstadoLetra, number> = {
  ausente: 1,
  presente: 2,
  correcta: 3,
};

function obtenerEstadosTeclado(
  intentos: string[],
  objetivo: string,
): Partial<Record<string, EstadoLetra>> {
  const estados: Partial<Record<string, EstadoLetra>> = {};

  for (const intento of intentos) {
    const resultado = evaluarIntento(intento, objetivo);
    for (let indice = 0; indice < intento.length; indice += 1) {
      const letra = intento[indice];
      const estadoActual = estados[letra];
      const nuevoEstado = resultado[indice];

      if (
        !estadoActual ||
        prioridadEstado[nuevoEstado] > prioridadEstado[estadoActual]
      ) {
        estados[letra] = nuevoEstado;
      }
    }
  }

  return estados;
}

function normalizarLetra(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export default function WordleGame() {
  const [fecha, setFecha] = useState<string | null>(null);
  const [partida, setPartida] = useState<EstadoPartida | null>(null);
  const [estadisticas, setEstadisticas] = useState<Estadisticas>(
    crearEstadisticasIniciales,
  );
  const [entrada, setEntrada] = useState('');
  const [mensajeJuego, setMensajeJuego] = useState<MensajeDeFecha>(null);
  const [mensajeAlmacenamiento, setMensajeAlmacenamiento] =
    useState<MensajeDeFecha>(null);
  const mostrarMensajeJuego = useCallback(
    (texto: string) => {
      setMensajeJuego(fecha && texto ? { fecha, texto } : null);
    },
    [fecha],
  );
  const mostrarMensajeAlmacenamiento = useCallback(
    (texto: string) => {
      setMensajeAlmacenamiento(fecha && texto ? { fecha, texto } : null);
    },
    [fecha],
  );

  useEffect(() => {
    const actualizarFecha = () => {
      const nuevaFecha = obtenerFechaDiaria(new Date());
      setFecha((fechaActual) =>
        fechaActual === nuevaFecha ? fechaActual : nuevaFecha,
      );
    };

    actualizarFecha();
    const intervalo = window.setInterval(actualizarFecha, 30_000);
    return () => window.clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (!fecha) return;

    const temporizador = window.setTimeout(() => {
      const objetivo = obtenerApellidoDelDia(fecha);
      const partidaVacia: EstadoPartida = {
        fecha,
        intentos: [],
        completada: false,
        victoria: false,
      };

      try {
        const resultadoGuardado = leerEstadoGuardado();
        const nuevasEstadisticas =
          resultadoGuardado.estado?.estadisticas ??
          crearEstadisticasIniciales();
        const partidaGuardada = resultadoGuardado.estado?.partida;
        const mismaLongitud =
          partidaGuardada?.intentos.every(
            (intento) => intento.length === objetivo.length,
          ) ?? true;
        const partidaDeHoy =
          partidaGuardada?.fecha === fecha && mismaLongitud
            ? partidaGuardada
            : partidaVacia;

        setEstadisticas(nuevasEstadisticas);
        setPartida(partidaDeHoy);
        setEntrada('');

        if (resultadoGuardado.invalido) {
          window.localStorage.removeItem(CLAVE_ALMACENAMIENTO);
          mostrarMensajeAlmacenamiento(
            'No se pudo leer el guardado anterior; hoy empezás una partida nueva.',
          );
        }

        if (resultadoGuardado.migrado) {
          mostrarMensajeAlmacenamiento(
            'Actualizamos el Wordle clásico y conservamos tus estadísticas.',
          );
        }

        if (
          resultadoGuardado.migrado ||
          (partidaGuardada?.fecha === fecha && !mismaLongitud)
        ) {
          const guardado = guardarEstado({
            partida: partidaVacia,
            estadisticas: nuevasEstadisticas,
          });
          if (!guardado) {
            mostrarMensajeAlmacenamiento(
              'No se pudo guardar en este dispositivo. La partida sigue disponible mientras esta página permanezca abierta.',
            );
          }
        }
      } catch (error) {
        if (!(error instanceof DOMException)) throw error;

        setPartida(partidaVacia);
        setEntrada('');
        setEstadisticas(crearEstadisticasIniciales());
        mostrarMensajeAlmacenamiento(
          'El almacenamiento no está disponible. La partida no se guardará al cerrar esta página.',
        );
      }
    }, 0);

    return () => window.clearTimeout(temporizador);
  }, [fecha, mostrarMensajeAlmacenamiento]);

  const objetivo = fecha ? obtenerApellidoDelDia(fecha) : '';
  const cantidadLetras = objetivo.length;
  const listo = Boolean(fecha && partida?.fecha === fecha);
  const textoMensajeJuego =
    mensajeJuego?.fecha === fecha ? mensajeJuego.texto : '';
  const textoMensajeAlmacenamiento =
    mensajeAlmacenamiento?.fecha === fecha ? mensajeAlmacenamiento.texto : '';
  const estadosTeclado =
    partida && objetivo
      ? obtenerEstadosTeclado(partida.intentos, objetivo)
      : {};

  const enviarIntento = useCallback(() => {
    if (!fecha || !partida || !objetivo || partida.completada) return;

    if (entrada.length !== objetivo.length) {
      mostrarMensajeJuego(
        `Completá las ${objetivo.length} letras antes de probar.`,
      );
      return;
    }

    const nuevosIntentos = [...partida.intentos, entrada];
    const victoria = entrada === objetivo;
    const completada = victoria || nuevosIntentos.length === MAX_INTENTOS;
    const nuevaPartida: EstadoPartida = {
      fecha,
      intentos: nuevosIntentos,
      completada,
      victoria,
    };
    const nuevasEstadisticas = completada
      ? actualizarEstadisticas(estadisticas, fecha, victoria)
      : estadisticas;

    setPartida(nuevaPartida);
    setEstadisticas(nuevasEstadisticas);
    setEntrada('');
    mostrarMensajeJuego('');

    if (!guardarEstado({ partida: nuevaPartida, estadisticas: nuevasEstadisticas })) {
      mostrarMensajeAlmacenamiento(
        'No se pudo guardar en este dispositivo. La partida sigue disponible mientras esta página permanezca abierta.',
      );
    }
  }, [
    entrada,
    estadisticas,
    fecha,
    objetivo,
    partida,
    mostrarMensajeAlmacenamiento,
    mostrarMensajeJuego,
  ]);

  const manejarTecla = useCallback(
    (tecla: string) => {
      if (!listo || !partida || partida.completada) return;

      if (tecla === 'ENTER') {
        enviarIntento();
        return;
      }

      if (tecla === 'BORRAR') {
        setEntrada((actual) => actual.slice(0, -1));
        mostrarMensajeJuego('');
        return;
      }

      const letra = normalizarLetra(tecla);
      if (!/^[A-Z]$/.test(letra)) return;

      setEntrada((actual) =>
        actual.length < cantidadLetras ? actual + letra : actual,
      );
      mostrarMensajeJuego('');
    },
    [cantidadLetras, enviarIntento, listo, mostrarMensajeJuego, partida],
  );

  useEffect(() => {
    const manejarTecladoFisico = (evento: KeyboardEvent) => {
      if (evento.ctrlKey || evento.metaKey || evento.altKey) return;

      if (evento.key === 'Enter') {
        evento.preventDefault();
        manejarTecla('ENTER');
        return;
      }

      if (evento.key === 'Backspace' || evento.key === 'Delete') {
        evento.preventDefault();
        manejarTecla('BORRAR');
        return;
      }

      if (evento.key.length === 1) {
        const letra = normalizarLetra(evento.key);
        if (/^[A-Z]$/.test(letra)) manejarTecla(letra);
      }
    };

    window.addEventListener('keydown', manejarTecladoFisico);
    return () => window.removeEventListener('keydown', manejarTecladoFisico);
  }, [manejarTecla]);

  const compartirResultado = useCallback(async () => {
    if (!fecha || !partida || !objetivo || partida.intentos.length === 0) return;

    const grilla = partida.intentos
      .map((intento) =>
        evaluarIntento(intento, objetivo)
          .map((estado) =>
            estado === 'correcta'
              ? '🟩'
              : estado === 'presente'
                ? '🟨'
                : '⬛',
          )
          .join(''),
      )
      .join('\n');
    const resultado = partida.victoria
      ? `${partida.intentos.length}/${MAX_INTENTOS}`
      : partida.completada
        ? `X/${MAX_INTENTOS}`
        : `${partida.intentos.length}/${MAX_INTENTOS}`;
    const texto = `QUEPARTIDO WORDLE ${fecha}\n${resultado}\n\n${grilla}`;

    try {
      if (!navigator.clipboard?.writeText) {
        mostrarMensajeJuego('No se pudo copiar el resultado desde este navegador.');
        return;
      }
      await navigator.clipboard.writeText(texto);
      mostrarMensajeJuego('Resultado copiado para compartir.');
    } catch (error) {
      if (error instanceof DOMException) {
        mostrarMensajeJuego('No se pudo copiar el resultado desde este navegador.');
        return;
      }
      throw error;
    }
  }, [fecha, objetivo, partida, mostrarMensajeJuego]);

  const cantidadIntentos = partida?.intentos.length ?? 0;

  return (
    <main className="lanus-watermark relative flex h-dvh min-h-dvh flex-col overflow-y-auto bg-[#120c0f] px-2 pt-2 pb-[env(safe-area-inset-bottom)] text-white sm:px-5 sm:py-5">
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col gap-2">
        <header className="shrink-0">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xl text-white/80 transition hover:bg-white/10"
              aria-label="Volver al inicio"
            >
              ‹
            </Link>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-rose-300">
                Quepartido
              </p>
              <h1 className="text-xl font-black leading-tight sm:text-2xl">
                Wordle Granate
              </h1>
            </div>
          </div>
          <p className="mt-1 text-center text-xs text-white/65">
            Adiviná el apellido del día en seis intentos. No hace falta que sea
            una palabra del diccionario.
          </p>
        </header>

        {textoMensajeAlmacenamiento && (
          <p
            role="status"
            className="shrink-0 rounded-lg border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-center text-[10px] leading-tight text-amber-100"
          >
            {textoMensajeAlmacenamiento}
          </p>
        )}

        <section
          aria-label="Estadísticas"
          className="grid shrink-0 grid-cols-4 gap-1"
        >
          <Estadistica titulo="Partidas" valor={estadisticas.partidas} />
          <Estadistica titulo="Victorias" valor={estadisticas.victorias} />
          <Estadistica titulo="Racha" valor={estadisticas.rachaActual} />
          <Estadistica titulo="Mejor" valor={estadisticas.rachaMaxima} />
        </section>

        {!listo || !partida ? (
          <div className="flex flex-1 items-center justify-center text-sm text-white/60">
            Preparando el desafío…
          </div>
        ) : (
          <>
            <section className="flex min-h-[270px] flex-1 flex-col items-center justify-center gap-2">
              <div
                role="grid"
                aria-label={`Tablero de seis intentos y ${cantidadLetras} letras`}
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${cantidadLetras}, minmax(0, 1fr))`,
                  width: `min(100%, ${cantidadLetras * 44}px)`,
                }}
              >
                {Array.from({ length: MAX_INTENTOS }, (_, indiceFila) => {
                  const intentoGuardado = partida.intentos[indiceFila];
                  const esFilaActual =
                    !partida.completada &&
                    indiceFila === partida.intentos.length;
                  const letras = (
                    intentoGuardado ??
                    (esFilaActual ? entrada : '')
                  ).split('');
                  const estadosFila = intentoGuardado
                    ? evaluarIntento(intentoGuardado, objetivo)
                    : [];

                  return (
                    <div
                      key={indiceFila}
                      role="row"
                      className="contents"
                      aria-label={`Intento ${indiceFila + 1}`}
                    >
                      {Array.from({ length: cantidadLetras }, (_, indiceColumna) => {
                        const letra = letras[indiceColumna] ?? '';
                        const estado: EstadoCasilla = intentoGuardado
                          ? estadosFila[indiceColumna]
                          : letra
                            ? 'actual'
                            : 'vacia';
                        const descripcion =
                          estado === 'correcta'
                            ? 'letra correcta en la posición'
                            : estado === 'presente'
                              ? 'letra correcta en otra posición'
                              : estado === 'ausente'
                                ? 'letra que no está en el apellido'
                                : 'sin evaluar';

                        return (
                          <div
                            key={indiceColumna}
                            role="gridcell"
                            aria-label={
                              letra
                                ? `${letra}, ${descripcion}`
                                : 'Casilla vacía'
                            }
                            className={`flex aspect-square items-center justify-center rounded-md border-2 text-lg font-black sm:text-xl ${clasesCasilla[estado]}`}
                          >
                            {letra}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <p
                role="status"
                aria-live="polite"
                className="min-h-5 text-center text-xs font-semibold text-rose-100"
              >
                {textoMensajeJuego}
              </p>

              {partida.completada && (
                <p className="text-center text-sm font-bold">
                  {partida.victoria ? '¡Lo encontraste!' : 'Se acabaron los intentos.'}{' '}
                  El apellido era{' '}
                  <span className="text-rose-300">{objetivo}</span>.
                </p>
              )}

              {cantidadIntentos > 0 && (
                <button
                  type="button"
                  onClick={compartirResultado}
                  className="rounded-full border border-rose-300/40 bg-rose-900/40 px-4 py-2 text-xs font-bold text-rose-100 transition hover:bg-rose-800/60"
                >
                  Compartir resultado
                </button>
              )}
            </section>

            <section
              aria-label="Teclado virtual"
              className="mx-auto w-full max-w-md shrink-0 select-none"
            >
              {FILAS_TECLADO.slice(0, 2).map((fila, indiceFila) => (
                <div
                  key={fila}
                  className={`mt-1 grid gap-1 ${
                    indiceFila === 0
                      ? 'grid-cols-10'
                      : 'grid-cols-9 px-2'
                  }`}
                >
                  {fila.split('').map((letra) => {
                    const estado = estadosTeclado[letra] ?? 'nueva';
                    return (
                      <button
                        key={letra}
                        type="button"
                        disabled={!listo || partida.completada}
                        onClick={() => manejarTecla(letra)}
                        aria-label={`Letra ${letra}`}
                        className={`h-11 min-w-0 rounded-md text-xs font-black transition disabled:cursor-default disabled:opacity-65 ${clasesTecla[estado]}`}
                      >
                        {letra}
                      </button>
                    );
                  })}
                </div>
              ))}

              <div className="mt-1 flex gap-1">
                <button
                  type="button"
                  disabled={!listo || partida.completada}
                  onClick={() => manejarTecla('ENTER')}
                  className="h-11 min-w-0 flex-[1.5] rounded-md bg-rose-900 px-1 text-[9px] font-black text-white transition hover:bg-rose-800 disabled:cursor-default disabled:opacity-65"
                >
                  ENTER
                </button>
                {FILAS_TECLADO[2].split('').map((letra) => {
                  const estado = estadosTeclado[letra] ?? 'nueva';
                  return (
                    <button
                      key={letra}
                      type="button"
                      disabled={!listo || partida.completada}
                      onClick={() => manejarTecla(letra)}
                      aria-label={`Letra ${letra}`}
                      className={`h-11 min-w-0 flex-1 rounded-md text-xs font-black transition disabled:cursor-default disabled:opacity-65 ${clasesTecla[estado]}`}
                    >
                      {letra}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={!listo || partida.completada}
                  onClick={() => manejarTecla('BORRAR')}
                  aria-label="Borrar letra"
                  className="h-11 min-w-0 flex-[1.5] rounded-md bg-slate-700 px-1 text-[9px] font-black text-white transition hover:bg-slate-600 disabled:cursor-default disabled:opacity-65"
                >
                  BORRAR
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Estadistica({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-1 py-1 text-center">
      <p className="text-base font-black leading-tight sm:text-lg">{valor}</p>
      <p className="text-[8px] uppercase tracking-wider text-white/55 sm:text-[9px]">
        {titulo}
      </p>
    </div>
  );
}
