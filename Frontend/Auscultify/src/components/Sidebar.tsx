import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';
import auscultifyLogo from '../assets/auscultifyLogo.png';
import libroIcon from '../assets/libro.png';
import graficaIcon from '../assets/grafica.png';
import friendshipIcon from '../assets/friendship.png';
import profileIcon from '../assets/profile.png';
import adminIcon from '../assets/settings.png';


interface Usuario {
  id: string;
  email: string;
  totalPreguntasAcertadas: number;
  totalPreguntasFalladas: number;
  totalPreguntasContestadas: number;
  racha: number;
  ultimoDiaPregunta: string;
  esPublico: boolean;
  idCriterioMasUsado: string;
}

interface SidebarProps {
  usuario: Usuario;
  selectedButton: string;
  onButtonClick: (buttonName: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ usuario, selectedButton, onButtonClick }) => {
  const navigate = useNavigate();
  const isAdmin = usuario?.email === 'admin@auscultify.com';

  const handleLogout = () => {
    navigate('/login');
  };

  const handleNavigation = (buttonName: string) => {
    onButtonClick(buttonName);
    
    if (buttonName === 'aprender') {
      navigate('/home', { state: { usuario } });
    } else if (buttonName === 'perfil') {
      navigate('/perfil', { state: { usuario } });
    }
  };

  return (
    <div className='primera-mitad'>
      <div className='primera-mitad-cuadro-logo'>
        <img src={auscultifyLogo} alt="Auscultify Logo" style={{width: '87%', height: '87%', objectFit: 'contain'}} />
      </div>
      <button 
        className={selectedButton === 'aprender' ? (isAdmin ? 'boton-seleccionado-admin' : 'boton-seleccionado') : (isAdmin ? 'boton-normal-admin' : 'boton-normal')} 
        onClick={() => handleNavigation('aprender')}
      >
        <img src={libroIcon} alt="Libro" className='boton-imagen' />
        Aprender
      </button>
      <button 
        className={selectedButton === 'estadisticas' ? (isAdmin ? 'boton-seleccionado-admin' : 'boton-seleccionado') : (isAdmin ? 'boton-normal-admin' : 'boton-normal')} 
        onClick={() => handleNavigation('estadisticas')}
      >
        <img src={graficaIcon} alt="Grafica" className='boton-imagen' />
        Estadísticas
      </button>
      <button 
        className={selectedButton === 'siguiendo' ? (isAdmin ? 'boton-seleccionado-admin' : 'boton-seleccionado') : (isAdmin ? 'boton-normal-admin' : 'boton-normal')} 
        onClick={() => handleNavigation('siguiendo')}
      >
        <img src={friendshipIcon} alt="Siguiendo" className='boton-imagen' />
        Siguiendo
      </button>
      <button 
        className={selectedButton === 'perfil' ? (isAdmin ? 'boton-seleccionado-admin' : 'boton-seleccionado') : (isAdmin ? 'boton-normal-admin' : 'boton-normal')} 
        onClick={() => handleNavigation('perfil')}
      >
        <img src={profileIcon} alt="Perfil" className='boton-imagen' />
        Perfil
      </button>

      {isAdmin && (
        <button 
          className={selectedButton === 'admin' ? 'boton-seleccionado-admin' : 'boton-normal-admin'} 
          onClick={() => handleNavigation('admin')}
        >
          <img src={adminIcon} alt="Admin" className='boton-imagen' />
          Configuración de admin
        </button>
      )}

      <button 
        className={isAdmin ? 'boton-cerrar-sesion-admin' : 'boton-cerrar-sesion'}
        onClick={handleLogout}
      >
        Cerrar sesión
      </button>
    </div>
  );
};

export default Sidebar;
