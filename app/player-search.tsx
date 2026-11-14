'use client';

import { useState, type ChangeEvent, type KeyboardEvent } from 'react';

type JugadorBuscable = {
  nombre: string;
  alias?: string[];
};

type PlayerSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (nombre: string) => void;
  jugadores: JugadorBuscable[];
  feedback: string;
  disabled: boolean;
  placeholder: string;
};

const normalizarTexto = (texto: string) =>
  texto
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export default function PlayerSearch({
  value,
  onChange,
  onSelect,
  jugadores,
  feedback,
  disabled,
  placeholder,
}: PlayerSearchProps) {
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const busqueda = normalizarTexto(value);
  const sugerencias = busqueda && !disabled
    ? jugadores.filter((jugador) =>
        [jugador.nombre, ...(jugador.alias ?? [])].some((texto) =>
          normalizarTexto(texto).includes(busqueda),
        ),
      )
    : [];
  const sugerenciaActiva = sugerencias[indiceActivo];

  const seleccionar = (nombre: string) => {
    onSelect(nombre);
    setIndiceActivo(-1);
  };

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
      seleccionar((sugerenciaActiva ?? sugerencias[0]).nombre);
    } else if (evento.key === 'Escape') {
      onChange('');
      setIndiceActivo(-1);
    }
  };

  return (
    <div className="relative">
      {busqueda && !disabled && (
        <div
          id="sugerencias-jugadores"
          role="listbox"
          aria-label="Jugadores coincidentes"
          className="absolute inset-x-0 bottom-full mb-2 max-h-[40dvh] overflow-y-auto rounded-xl border border-[#57132b] bg-[#13090e] p-1.5 shadow-2xl"
        >
          {sugerencias.length > 0 ? (
            sugerencias.map((jugador, indice) => (
              <button
                key={jugador.nombre}
                id={`sugerencia-jugador-${indice}`}
                type="button"
                role="option"
                aria-selected={indice === indiceActivo}
                tabIndex={-1}
                onClick={() => seleccionar(jugador.nombre)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                  indice === indiceActivo
                    ? 'bg-[#800020] text-white'
                    : 'text-slate-100 hover:bg-[#2b0c18]'
                }`}
              >
                <span>{jugador.nombre}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2.5 text-sm text-slate-400">
              No hay jugadores que coincidan.
            </p>
          )}
        </div>
      )}

      {feedback && (
        <p
          role="status"
          className="mb-2 text-center text-xs font-semibold text-red-300"
        >
          {feedback}
        </p>
      )}

      <label htmlFor="buscador-jugadores" className="sr-only">
        Buscar jugador por nombre o apodo
      </label>
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"
          aria-hidden="true"
        >
          <span className="text-lg text-slate-400">⚽</span>
        </div>
        <input
          id="buscador-jugadores"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={Boolean(busqueda && !disabled)}
          aria-controls="sugerencias-jugadores"
          aria-activedescendant={
            sugerenciaActiva ? `sugerencia-jugador-${indiceActivo}` : undefined
          }
          autoComplete="off"
          value={value}
          onChange={manejarCambio}
          onKeyDown={manejarTecla}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full rounded-2xl border-2 border-[#4c1428] bg-[#13090e] py-3.5 pl-12 pr-4 text-left text-base font-bold text-white shadow-inner transition-all placeholder:font-medium placeholder:text-slate-500 focus:border-[#a91f4b] focus:outline-none disabled:opacity-60 sm:text-lg"
        />
      </div>
    </div>
  );
}
