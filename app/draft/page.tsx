import type { Metadata } from 'next';
import DraftGame from './draft-game';

export const metadata: Metadata = {
  title: 'FUT Draft Histórico | QUEPARTIDO',
  description:
    'Armá tu 11 histórico de Lanús con presupuesto limitado y cartas de jugadores.',
};

export default function DraftPage() {
  return <DraftGame />;
}
