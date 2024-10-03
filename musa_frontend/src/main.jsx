import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import io from 'socket.io-client';
import './styles.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

let ip_variable = `https://musavinos.com`; // Valor inicial de la IP

export const IP = () => ip_variable; // Exporta la función IP que devuelve el valor actual

export let socket;

// Función para verificar la conexión al servidor remoto
const checkConnection = async () => {
  try {
    const response = await fetch(ip_variable, { method: 'HEAD', mode: 'no-cors' });
    if (response.ok || response.type === 'opaque') {
      console.log('Conexión exitosa a', ip_variable);
    } else {
      throw new Error('Fallo en la conexión remota');
    }
  } catch (error) {
    console.log('No se pudo conectar a', ip_variable, ', usando 192.168.1.39.');
    ip_variable = 'http://192.168.1.39:5000'; // Cambia ip_variable a localhost si falla la conexión
  }

  socket = io(ip_variable); // Inicializa el socket con la IP actual
  createRoot(document.getElementById('root')).render(<App />);
};

// Llama a la función para verificar y conectar
checkConnection();