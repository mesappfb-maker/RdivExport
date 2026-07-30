// ─── RdivExport – Application Root Component ──────────────────────────────────
// Point d'entrée de l'application React. Importe les styles globaux et
// rend le routeur principal (AppRouter).

import './index.css'
import AppRouter from '@/routes/AppRouter'

function App() {
  return <AppRouter />
}

export default App
