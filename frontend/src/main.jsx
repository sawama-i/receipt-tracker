import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// htmlのrootと紐付ける。
createRoot(document.getElementById('root')).render(
  // バグ検知
  <StrictMode>
    <App />
  </StrictMode>,
)
