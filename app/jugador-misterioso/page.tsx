import type { Metadata } from 'next';
import WordleGame from '../wordle/wordle-game';

export const metadata: Metadata = {
  title: 'Jugador Misterioso | QUEPARTIDO',
  description:
    'Adiviná el jugador del día de Lanús con pistas de posición y temporadas.',
};

export default function JugadorMisteriosoPage() {
  return <WordleGame />;
}
