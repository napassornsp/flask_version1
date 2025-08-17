import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/sw.js').catch((err) => {
//       console.warn('SW registration failed', err);
//     });
//   });
// }

