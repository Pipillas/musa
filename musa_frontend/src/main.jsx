import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import io from 'socket.io-client';
import './styles.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

export const IP = `http://181.229.199.23`

export const socket = io(`${IP}`);

createRoot(document.getElementById('root')).render(
  <App />
);