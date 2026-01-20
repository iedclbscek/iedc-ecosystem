import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Remove App.css reference since we're using Tailwind

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

