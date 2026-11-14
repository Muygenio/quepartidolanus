import type { Metadata } from 'next';
import FormacionesGame from './formaciones-game';

export const metadata: Metadata = {
  title: 'Trivia de Formaciones | QUEPARTIDO',
  description:
    'Adiviná las formaciones históricas de Lanús y completá cada puesto.',
};

export default function FormacionesPage() {
  return <FormacionesGame />;
}
