import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import ScrollFeel from '../../../shared/ScrollFeel.jsx'
import RequestFeedback from '../../../shared/RequestFeedback.jsx'
import api from './api/axios'
import './index.css'

// 1. Create a client
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: false } },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. Wrap the app with the provider */}
    <QueryClientProvider client={queryClient}>
      <ScrollFeel />
      <RequestFeedback client={api} />
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
