import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/grandstander/600.css';
import '@fontsource/grandstander/800.css';
import '@fontsource/patrick-hand/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/comic-neue/400.css';
import '@fontsource/comic-neue/700.css';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
