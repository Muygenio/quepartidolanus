import type { Metadata } from 'next';
import WordleGame from '../wordle/wordle-game';

export const metadata: Metadata = {
  title: 'Wordle Granate | QUEPARTIDO',
  description:
    'Adiviná el apellido del jugador granate del día en seis intentos.',
};

export default function JugadorMisteriosoPage() {
  return <WordleGame />;
}
