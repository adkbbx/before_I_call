import { createRoot } from 'react-dom/client';
import '@fontsource/schibsted-grotesk/400.css';
import '@fontsource/schibsted-grotesk/500.css';
import '@fontsource/schibsted-grotesk/600.css';
import '@fontsource/zen-kaku-gothic-new/400.css';
import '@fontsource/zen-kaku-gothic-new/500.css';
import App from './App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('App root is missing');
createRoot(root).render(<App />);
