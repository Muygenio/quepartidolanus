import type { Metadata } from 'next';
import WordleGame from './wordle-game';

export const metadata: Metadata = {
  title: 'Jugador Misterioso | QUEPARTIDO',
  description:
    'Adiviná el jugador del día de Lanús con pistas de posición y temporadas.',
  alternates: {
    canonical: '/jugador-misterioso',
  },
};

export default function WordlePage() {
  return <WordleGame />;
}
