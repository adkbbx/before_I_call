import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/shippori-mincho-b1/400.css';
import '@fontsource/shippori-mincho-b1/500.css';
import '@fontsource/shippori-mincho-b1/600.css';
import '@fontsource/yuji-syuku/400.css';
import '@fontsource/zen-kaku-gothic-new/500.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import { App } from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
