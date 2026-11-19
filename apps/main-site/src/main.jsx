import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ScrollFeel from '../../../shared/ScrollFeel.jsx'
import '../../../shared/interaction-feedback.css'

// Remove App.css reference since we're using Tailwind

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ScrollFeel />
    <App />
  </StrictMode>
)

