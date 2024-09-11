import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import io from 'socket.io-client';
import './styles.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

export const socket = io('http://192.168.0.64:4000');

createRoot(document.getElementById('root')).render(
  <App />
);