import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario = (location.state as any)?.usuario;

  React.useEffect(() => {
    if (!usuario) {
      // Si no hay datos de usuario, redirige a login
      navigate('/login');
    }
  }, [usuario, navigate]);

  if (!usuario) return null;

  return (
    <div>
      <h1>Bienvenido a Auscultify</h1>
      <p>Has iniciado sesión correctamente.</p>
      <p>ID: {usuario.id}</p>
      <p>Email: {usuario.email}</p>
    </div>
  );
};

export default Home;
