window.onerror = (msg, src, line, col, err) => {
  document.body.style.background = 'white';
  document.body.innerHTML = `<pre style="color:red;padding:20px;font-size:14px;direction:ltr;white-space:pre-wrap">${msg}\n\n${src}\nLine: ${line}\n\n${err?.stack || ''}</pre>`;
  return true;
};

window.addEventListener('unhandledrejection', (e) => {
  document.body.style.background = 'white';
  document.body.innerHTML = `<pre style="color:orange;padding:20px;font-size:14px;direction:ltr;white-space:pre-wrap">Unhandled Promise:\n${e.reason?.stack || e.reason}</pre>`;
});

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)