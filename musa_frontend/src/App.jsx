import NavBar from "./components/NavBar";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Inventario from './routes/Inventario';
import Info from './routes/Info';
import Estadisticas from './routes/Estadisticas';
import Carrito from "./routes/Carrito";
import Ventas from "./routes/Ventas";
import Caja from './routes/Caja';

function App() {
  return (
    <Router>
      <NavBar />
      <Routes>
        <Route path="/" element={<Inventario />} />
        <Route path="/info" element={<Info />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/ventas" element={<Ventas />} />
        <Route path="/caja" element={<Caja />} />
        <Route path="/estadisticas" element={<Estadisticas />} />
      </Routes>
    </Router>
  )
}

export default App;