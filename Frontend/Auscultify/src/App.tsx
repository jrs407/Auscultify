import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IniciarSesion from './IniciarSesion';
import Home from './Home';
import Perfil from './Perfil';
import Registrarse from './Registrarse';
import Siguiendo from './Siguiendo';
import PanelAdmin from './PanelAdmin';
import ResponderPregunta from './ResponderPregunta';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<IniciarSesion />} />
        <Route path="/home" element={<Home />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/registrarse" element={<Registrarse />} />
        <Route path="/siguiendo" element={<Siguiendo />} />
        <Route path="/admin" element={<PanelAdmin />} />
        <Route path="/responder-pregunta" element={<ResponderPregunta />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App
