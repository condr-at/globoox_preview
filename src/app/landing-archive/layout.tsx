import { ReactNode } from 'react';
import './landing.css';

export const metadata = {
  title: 'Globoox - The world\'s library, in your native language',
  description: 'Instantly translate any e-book and experience stories with the nuance and depth they were meant to be read.',
};

export default function LandingLayout({ children }: { children: ReactNode }) {
  return children;
}
