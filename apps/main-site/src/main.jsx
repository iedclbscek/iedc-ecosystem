import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ScrollFeel from '../../../shared/ScrollFeel.jsx'
import RequestFeedback from '../../../shared/RequestFeedback.jsx'
import axios from 'axios'
import { registrationApi } from './services/registrationService'

// Remove App.css reference since we're using Tailwind

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ScrollFeel />
    <RequestFeedback client={axios} />
    <RequestFeedback client={registrationApi} />
    <App />
  </StrictMode>
)

