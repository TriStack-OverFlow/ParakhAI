import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './i18n'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "1096135752260-t9805k4oj76q2sre5qn7f62nkerokitg.apps.googleusercontent.com"}>
      <App />
    </GoogleOAuthProvider>
)
