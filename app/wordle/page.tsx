import type { Metadata } from 'next';
import WordleGame from './wordle-game';

export const metadata: Metadata = {
  title: 'Wordle Diario de Jugadores | QUEPARTIDO',
  description:
    'Adiviná el jugador del día de Lanús con pistas de posición y temporadas.',
};

export default function WordlePage() {
  return <WordleGame />;
}
