import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Perfil.css';
import Sidebar from './components/Sidebar';
import editIcon from './assets/Edit.png';

interface LocationState {
  usuario: {
    id: string;
    email: string;
    totalPreguntasAcertadas: number;
    totalPreguntasFalladas: number;
    totalPreguntasContestadas: number;
    racha: number;
    ultimoDiaPregunta: string;
    esPublico: boolean;
    idCriterioMasUsado: string;
  };
}

const Perfil: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario = (location.state as LocationState)?.usuario;
  const [selectedButton, setSelectedButton] = useState('perfil');
  const [showInput, setShowInput] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [fadeOutPassword, setFadeOutPassword] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPublic, setIsPublic] = useState(usuario?.esPublico || false);
  const [showDeleteOverlay, setShowDeleteOverlay] = useState(false);
  const [overlayAnimating, setOverlayAnimating] = useState(false);
  
  const timeoutRef = useRef<number | null>(null);
  const fadeInTimeoutRef = useRef<number | null>(null);

  React.useEffect(() => {
    if (!usuario) {
      navigate('/login');
    }
  }, [usuario, navigate]);

  const handleButtonClick = (buttonName: string) => {
    setSelectedButton(buttonName);

  };

  const handleEditClick = () => {
    if (isAnimating) return;
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (fadeInTimeoutRef.current) clearTimeout(fadeInTimeoutRef.current);
    
    setIsAnimating(true);
    
    if (showPasswordInput) {
      setFadeOutPassword(true);
      timeoutRef.current = setTimeout(() => {
        setShowPasswordInput(false);
        setFadeOutPassword(false);
        setIsAnimating(false);
      }, 300);
    }
    
    if (showInput) {
      setFadeOut(true);
      timeoutRef.current = setTimeout(() => {
        setShowInput(false);
        setFadeOut(false);
        setIsAnimating(false);
      }, 300);
    } else {
      setShowInput(true);
      setIsAnimating(false);
    }
  };

  const handlePasswordEditClick = () => {
    if (isAnimating) return;
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (fadeInTimeoutRef.current) clearTimeout(fadeInTimeoutRef.current);
    
    setIsAnimating(true);
    
    if (showInput) {
      setFadeOut(true);
      timeoutRef.current = setTimeout(() => {
        setShowInput(false);
        setFadeOut(false);
        setIsAnimating(false);
      }, 300);
    }
    
    if (showPasswordInput) {
      setFadeOutPassword(true);
      timeoutRef.current = setTimeout(() => {
        setShowPasswordInput(false);
        setFadeOutPassword(false);
        setIsAnimating(false);
      }, 300);
    } else {
      setShowPasswordInput(true);
      setIsAnimating(false);
    }
  };

  const handleTogglePublic = () => {
    setIsPublic(!isPublic);
  };

  const handleDeleteAccountClick = () => {
    setShowDeleteOverlay(true);
    setOverlayAnimating(true);
  };

  const handleConfirmDelete = () => {
    setOverlayAnimating(false);
    setTimeout(() => {
      setShowDeleteOverlay(false);
    }, 300);
  };

  const handleCancelDelete = () => {
    setOverlayAnimating(false);
    setTimeout(() => {
      setShowDeleteOverlay(false);
    }, 300);
  };

  if (!usuario) return null;

  return (
    <div className='fondo'>
        <Sidebar 
            usuario={usuario} 
            selectedButton={selectedButton} 
            onButtonClick={handleButtonClick} 
        />
        <div className='contenedor-perfil'>
            <div className='titulo-perfil'>
                <p>¡Bienvenido a tu perfil! ¿Quieres modificar algo?</p>
            </div>
            <div className='cuadro-correo'>
                <div className='cuadro-correo-superior'>
                    <p>Tu correo electrónico actual es: <span>{usuario.email}</span></p>
                    {usuario.email !== 'admin@auscultify.com' && (
                        <img src={editIcon} alt="Placeholder" className="placeholder-image" onClick={handleEditClick} />
                    )}
                </div>
                <div className={`cuadro-correo-inferior ${fadeOut ? 'fade-out' : ''}`}>
                    {showInput && (
                        <>
                            <input placeholder="Introduce el nuevo correo electróncio"></input>
                            <div className="botones-container">
                                <button className='cancelar-correo'>Cancelar</button>
                                <button className='aceptar-correo'>Aceptar</button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="cuadro-contrasena">
              <div className='cuadro-contrasena-superior'>
                    <p>¿Deseas cambiar tu contraseña?</p>
                    <img src={editIcon} alt="Placeholder" className="placeholder-image" onClick={handlePasswordEditClick} />
                </div>
                <div className={`cuadro-contrasena-inferior ${fadeOutPassword ? 'fade-out' : ''}`}>
                    {showPasswordInput && (
                        <>
                            <input placeholder="Introduce la nueva contraseña"></input>
                            <div className="segunda-linea-contrasena">
                                <input placeholder="Repite la contraseña"></input>
                                <div className="botones-container">
                                    <button className='cancelar-correo'>Cancelar</button>
                                    <button className='aceptar-correo'>Aceptar</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className='cuadro-ocultar'>
              <div className='cuadro-ocultar-superior'>
                <p>Si quieres ocultar tu perfil, haz click aquí</p>
                <div className={`toggle-switch ${isPublic ? 'active' : ''}`} onClick={handleTogglePublic}>
                  <div className="toggle-slider"></div>
                </div>
              </div>
            </div>
            
            <div className='cuadro-eliminar-cuenta'>
              {usuario.email !== 'admin@auscultify.com' && (
                  <button className='eliminar-cuenta' onClick={handleDeleteAccountClick}>Eliminar cuenta</button>
              )}
            </div>
        </div>

        {showDeleteOverlay && (
          <div className={`overlay ${overlayAnimating ? 'overlay-fade-in' : 'overlay-fade-out'}`}>
            <div className={`overlay-content ${overlayAnimating ? 'content-fade-in' : 'content-fade-out'}`}>
              <h2>¿Seguro que quieres eliminar la cuenta?</h2>
              <p>Si la eliminas se perderá todo tu progreso</p>
              <div className="overlay-buttons">
                <button className="overlay-cancel" onClick={handleCancelDelete}>Cancelar</button>
                <button className="overlay-confirm" onClick={handleConfirmDelete}>Eliminar</button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Perfil;
