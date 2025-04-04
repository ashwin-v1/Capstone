import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'  // Importing Tailwind CSS styles
import Uploading from './Uploading'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Uploading />
  </StrictMode>,
)
