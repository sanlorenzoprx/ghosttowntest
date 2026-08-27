import React from 'react'
import ReactDOM from 'react-dom/client'
import RootApp from './app/RootApp.tsx'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
)
