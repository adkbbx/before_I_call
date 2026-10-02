import { createRoot } from 'react-dom/client';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import App from './App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('App root is missing');
createRoot(root).render(<App />);
