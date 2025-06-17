import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface LocationState {
  usuario: {
    id: string;
    email: string;
  };
}

const Home: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario = (location.state as LocationState)?.usuario;

  React.useEffect(() => {
    if (!usuario) {
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
