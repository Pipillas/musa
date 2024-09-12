import { useEffect, useState } from 'react';
import NavBar from "./components/NavBar";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Inventario from './routes/Inventario';
import Info from './routes/Info';
import Estadisticas from './routes/Estadisticas';
import Carrito from "./routes/Carrito";
import Ventas from "./routes/Ventas";
import Caja from './routes/Caja';

import { socket } from "./main";

function App() {
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Función que envía el código al servidor
  const requestInicio = (code) => {
    socket.emit('request-inicio', code);

    socket.on('response-inicio', (response) => {
      if (response === true) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    });
  };

  useEffect(() => {
    // Obtener el code desde localStorage
    const code = localStorage.getItem('code');

    if (code) {
      // Si hay un código en localStorage, lo envía al servidor
      requestInicio(code);
    } else {
      // Si no hay código en localStorage, no se autoriza
      setIsAuthorized(false);
    }

    // Limpiar el evento cuando el componente se desmonte
    return () => {
      socket.off('response-inicio');
    };
  }, []);

  const handleRequestCode = () => {
    // Abre un prompt para solicitar el código al usuario
    const newCode = window.prompt("Ingrese el código para acceder:");

    if (newCode) {
      // Guarda el nuevo código en localStorage
      localStorage.setItem('code', newCode);
      // Vuelve a enviar la solicitud con el nuevo código
      requestInicio(newCode);
    }
  };

  if (!isAuthorized) {
    // Si no está autorizado, pide el código
    return (
      <div>
        <h1>No autorizado</h1>
        <button onClick={handleRequestCode}>Ingresar código</button>
      </div>
    );
  }

  // Si está autorizado, renderiza la aplicación
  return (
    <Router>
      <NavBar />
      <Routes>
        <Route path="/" element={<Info />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/ventas" element={<Ventas />} />
        <Route path="/caja" element={<Caja />} />
        <Route path="/estadisticas" element={<Estadisticas />} />
      </Routes>
    </Router>
  );
}

export default App;