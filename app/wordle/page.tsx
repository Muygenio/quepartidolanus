import type { Metadata } from 'next';
import WordleGame from './wordle-game';

export const metadata: Metadata = {
  title: 'WORDLE Granate | QUEPARTIDO',
  description:
    'Adiviná el apellido del jugador del día de Lanús en seis intentos.',
  alternates: {
    canonical: '/wordle',
  },
};

export default function WordlePage() {
  return <WordleGame />;
}
