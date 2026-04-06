import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Sync .dark class with OS preference
const mq = window.matchMedia('(prefers-color-scheme: dark)')
document.documentElement.classList.toggle('dark', mq.matches)
mq.addEventListener('change', e => document.documentElement.classList.toggle('dark', e.matches))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
