import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IniciarSesion from './IniciarSesion';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<IniciarSesion />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App
