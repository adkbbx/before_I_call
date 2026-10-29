import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/shippori-mincho-b1/500.css';
import '@fontsource/shippori-mincho-b1/600.css';
import '@fontsource/yuji-syuku/400.css';
import '@fontsource/zen-kaku-gothic-new/500.css';
import './styles/tokens.css';
import './styles/base.css';
import './components/Room.css';
import './components/Shelf.css';
import './components/Reader.css';
import './components/Sheets.css';
import './styles/app.css';
import './styles/effects.css';
import { App } from './App.tsx';
import { deckleMask } from './lib/paper.ts';
import wordmarkBlue from '@fontsource/yuji-syuku/files/yuji-syuku-109-400-normal.woff2?url';
import wordmarkWalk from '@fontsource/yuji-syuku/files/yuji-syuku-117-400-normal.woff2?url';
import wordmarkLight from '@fontsource/yuji-syuku/files/yuji-syuku-89-400-normal.woff2?url';

document.documentElement.style.setProperty('--deckle', deckleMask());
for (const href of [wordmarkBlue, wordmarkWalk, wordmarkLight]) {
  const link = document.createElement('link');
  link.rel = 'preload'; link.as = 'font'; link.type = 'font/woff2'; link.crossOrigin = 'anonymous'; link.href = href;
  document.head.append(link);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

