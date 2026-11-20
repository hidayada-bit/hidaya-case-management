import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { initTheme } from './lib/theme'
import { useLang } from './lib/i18n'

initTheme()

// Re-renders the whole app when the language changes (state such as the open page is kept).
function Root() { useLang(); return <App /> }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
