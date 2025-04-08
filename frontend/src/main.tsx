// main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Uploading from './Uploading'
import Results from './Results'

const router = createBrowserRouter([
  {
    path: "/",
    element: <Uploading />,
  },
  {
    path: "/results",
    element: <Results />,
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)