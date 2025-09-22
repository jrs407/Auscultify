import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Perfil.css';
import Sidebar from './components/Sidebar';
import editIcon from './assets/Edit.png';

interface LocationState {

  // Definición de la estructura del estado pasado por el enrutador, en este caso son los datos del usuario.
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

  // Estado para almacenar los datos del usuario.
  const [usuario, setUsuario] = useState((location.state as LocationState)?.usuario);

 // Estado para gestionar qué botón del sidebar está seleccionado.
  const [selectedButton, setSelectedButton] = useState('perfil');

  // Estado para mostrar/ocultar el input de cambio de correo y contraseña.
  const [mostrarCorreo, setMostrarCorreo] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  // Estados para manejar la animación de fadeOut y si la animacion esta en reproduccion.
  const [fadeOutCorreo, setFadeOutCorreo] = useState(false);
  const [fadeOutContrasena, setFadeOutContrasena] = useState(false);
  const [animacionEnReproduccion, setAnimacionEnReproduccion] = useState(false);

  // Estado para gestionar si el perfil es público o privado.
  const [esPublico, setEsPublico] = useState(usuario?.esPublico || false);

  // Datos para actualizar el correo y la contraseña.
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [nuevaContrasena1, setNuevaContrasena1] = useState('');
  const [nuevaContrasena2, setNuevaContrasena2] = useState('');

  // Estados para manejar el overlay de confirmación de eliminación de cuenta.
  const [mostrarOverlay, setMostrarOverlay] = useState(false);
  const [overlayAnimacionEnReproduccion, setOverlayAnimacionEnReproduccion] = useState(false);

  // Estado para manejar mensajes de error.
  const [mensajeError, setMensajeError] = useState('');
  
  // Refs para manejar timeouts de las animaciones.
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

  // Llamada al endpoint del backend para actualizar el perfil.
  const handleActualizarPerfil = async (updates: { nuevoCorreo?: string; nuevaContrasena?: string; esPublico?: boolean }) => {
    try {
      const response = await fetch('http://localhost:3003/modificar-perfil', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: parseInt(usuario.id),
          ...updates
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.usuario) {
          setUsuario(data.usuario);
        }
        setMensajeError('');
        return true;
      } else {
        setMensajeError(data.mensaje || 'Error al actualizar el perfil');
        return false;
      }
    } catch (error) {
      console.error('Error:', error);
      setMensajeError('Error de conexión');
      return false;
    }
  };

  // Maneja la lógica al hacer clic en "Aceptar" para modificar correo y/o contraseña.
  const handleModificar = async () => {

    let modificacionCorrecta = false;

    // Si se ha introducido un nuevo correo, validarlo y actualizarlo.
    if(nuevoCorreo !== ""){

      // Validación básica del formato del correo.
      if (!nuevoCorreo.trim()) {
        setMensajeError('Por favor ingresa un nuevo correo');
        return;
      }

      // Llamada al backend para actualizar el correo.
      modificacionCorrecta = await handleActualizarPerfil({ nuevoCorreo: nuevoCorreo });
      if (modificacionCorrecta) {
        // Actualizar el estado local del usuario con el nuevo correo
        setUsuario(prevUsuario => ({
          ...prevUsuario!,
          email: nuevoCorreo
        }));
        setNuevoCorreo('');
        setMostrarCorreo(false);
        setFadeOutCorreo(false);
     }
    }

    // Si se ha introducido una nueva contraseña, validarla y actualizarla.
    if (nuevaContrasena1 !== "" || nuevaContrasena2 !== ""){

      // Validación básica de las contraseñas.
      if (!nuevaContrasena1.trim()) {
        setMensajeError('Por favor ingresa una nueva contraseña');
        return;
      }

      // Comprobación de que las contraseñas coincidan.
      if (nuevaContrasena1 !== nuevaContrasena2) {
        setMensajeError('Las contraseñas no coinciden');
        return;
      }

      // Llamada al backend para actualizar la contraseña.
      modificacionCorrecta = await handleActualizarPerfil({ nuevaContrasena: nuevaContrasena1 });
      if (modificacionCorrecta) {
        setNuevaContrasena1('');
        setNuevaContrasena2('');
        setMostrarContrasena(false);
        setFadeOutContrasena(false);
      }
    } 

    return;
  };

  // Maneja la lógica al hacer clic en "Cancelar" para modificar correo y/o contraseña.
  const handleCancelar = () => {

    // Limpia las variables.
    setNuevoCorreo('');
    setMensajeError('');
    setNuevaContrasena1('');
    setNuevaContrasena2('');

    // Revisa que se esta modificando el correo, para ocultarlo y reproducir la animacion.
    if(mostrarCorreo){
      setFadeOutCorreo(true);

      timeoutRef.current = setTimeout(() => {
        setMostrarCorreo(false);
        setFadeOutCorreo(false);
        setAnimacionEnReproduccion(false);
      }, 300);
    }
    
    // Revisa que se esta modificando la contraseña, para ocultarlo y reproducir la animacion.
    if(mostrarContrasena){
      setFadeOutContrasena(true);

      timeoutRef.current = setTimeout(() => {
        setMostrarContrasena(false);
        setFadeOutContrasena(false);
        setAnimacionEnReproduccion(false);
      }, 300);
    }
  };


  // Maneja la animación y el estado al hacer clic en el icono de editar correo.
  const handleEditarCorreo = () => {
    // Controla que no se pueda hacer clic mientras se está animando.
    if (animacionEnReproduccion) return;
    
    // Limpia cualquier timeout pendiente.
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (fadeInTimeoutRef.current) clearTimeout(fadeInTimeoutRef.current);
    
    // Indica que una animación está en reproducción.
    setAnimacionEnReproduccion(true);
    
    // Si el campo de contraseña está abierto, cerrarlo con animación.
    if (mostrarContrasena) {
      setFadeOutContrasena(true);
      timeoutRef.current = setTimeout(() => {
        setMostrarContrasena(false);
        setFadeOutContrasena(false);
        setAnimacionEnReproduccion(false);
      }, 300);
    }
    
    // Si el campo de correo está abierto, cerrarlo con animación.
    if (mostrarCorreo) {
      setFadeOutCorreo(true);
      timeoutRef.current = setTimeout(() => {
        setMostrarCorreo(false);
        setFadeOutCorreo(false);
        setAnimacionEnReproduccion(false);
      }, 300);
    } else {
      setMostrarCorreo(true);
      setAnimacionEnReproduccion(false);
    }
  };

  // Maneja la animación y el estado al hacer clic en el icono de editar contraseña.
  const handleEditarContrasena = () => {
    // Controla que no se pueda hacer clic mientras se está animando.
    if (animacionEnReproduccion) return;
    
    // Limpia cualquier timeout pendiente.
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (fadeInTimeoutRef.current) clearTimeout(fadeInTimeoutRef.current);
    
    // Indica que una animación está en reproducción.
    setAnimacionEnReproduccion(true);
    
    // Si el campo de correo está abierto, cerrarlo con animación.
    if (mostrarCorreo) {
      setFadeOutCorreo(true);
      timeoutRef.current = setTimeout(() => {
        setMostrarCorreo(false);
        setFadeOutCorreo(false);
        setAnimacionEnReproduccion(false);
      }, 300);
    }
    
    // Si el campo de contraseña está abierto, cerrarlo con animación.
    if (mostrarContrasena) {
      setFadeOutContrasena(true);
      timeoutRef.current = setTimeout(() => {
        setMostrarContrasena(false);
        setFadeOutContrasena(false);
        setAnimacionEnReproduccion(false);
      }, 300);
    } else {
      setMostrarContrasena(true);
      setAnimacionEnReproduccion(false);
    }
  };

  // Maneja el clic en el toggle para cambiar el estado público/privado del perfil.
  const handleCambiarPublico = async () => {

    // Se crea la variable con el estado contrario al actual.
    const estadoContrarioPublico = !esPublico;

    // Se actualiza el perfil con el nuevo estado.
    const success = await handleActualizarPerfil({ esPublico: estadoContrarioPublico });
    if (success) {
      setEsPublico(estadoContrarioPublico);
    }
  };

  // Maneja el clic en "Eliminar cuenta" para mostrar el overlay de confirmación.
  const handleClickEliminarCuenta = () => {
    setMostrarOverlay(true);
    setOverlayAnimacionEnReproduccion(true);
  };

  // Llama al endpoint del backend para eliminar la cuenta.
  const handleEliminarCuenta = async () => {
    try {
      const response = await fetch('http://localhost:3003/eliminar-cuenta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario: usuario.email
        }),
      });

      const data = await response.json();

      if (response.ok) {
        navigate('/login');
      } else {
        setMensajeError(data.mensaje || 'Error al eliminar la cuenta');
      }
    } catch (error) {
      console.error('Error:', error);
      setMensajeError('Error de conexión');
    }
  };

  // Maneja la confirmación de eliminación de cuenta.
  const handleConfirmarEliminarCuenta = () => {
    handleEliminarCuenta();
  };

  // Maneja el cierre del overlay de confirmación sin eliminar la cuenta.
  const handleCancelarEliminarCuenta = () => {

    // Limpia el mensaje de error y quita la animacion.
    setMensajeError('');
    setOverlayAnimacionEnReproduccion(false);
    setTimeout(() => {
      setMostrarOverlay(false);
    }, 300);
  };

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
            {mensajeError && (
                <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
                    {mensajeError}
                </div>
            )}
            <div className='cuadro-correo'>
                <div className='cuadro-correo-superior'>
                    <p>Tu correo electrónico actual es: <span>{usuario.email}</span></p>
                    {usuario.email !== 'admin@auscultify.com' && (
                        <img src={editIcon} alt="Placeholder" className="placeholder-image" onClick={handleEditarCorreo} />
                    )}
                </div>
                <div className={`cuadro-correo-inferior ${fadeOutCorreo ? 'fade-out' : ''}`}>
                    {mostrarCorreo && (
                        <>
                            <input 
                                placeholder="Introduce el nuevo correo electrónico"
                                value={nuevoCorreo}
                                onChange={(e) => setNuevoCorreo(e.target.value)}
                            />
                            <div className="botones-container">
                                <button className='cancelar-correo' onClick={handleCancelar}>Cancelar</button>
                                <button className='aceptar-correo' onClick={handleModificar}>Aceptar</button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="cuadro-contrasena">
              <div className='cuadro-contrasena-superior'>
                    <p>¿Deseas cambiar tu contraseña?</p>
                    <img src={editIcon} alt="Placeholder" className="placeholder-image" onClick={handleEditarContrasena} />
                </div>
                <div className={`cuadro-contrasena-inferior ${fadeOutContrasena ? 'fade-out' : ''}`}>
                    {mostrarContrasena && (
                        <>
                            <input 
                                placeholder="Introduce la nueva contraseña"
                                type="password"
                                value={nuevaContrasena1}
                                onChange={(e) => setNuevaContrasena1(e.target.value)}
                            />
                            <div className="segunda-linea-contrasena">
                                <input 
                                    placeholder="Repite la contraseña"
                                    type="password"
                                    value={nuevaContrasena2}
                                    onChange={(e) => setNuevaContrasena2(e.target.value)}
                                />
                                <div className="botones-container">
                                    <button className='cancelar-correo' onClick={handleCancelar}>Cancelar</button>
                                    <button className='aceptar-correo' onClick={handleModificar}>Aceptar</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className='cuadro-ocultar'>
              <div className='cuadro-ocultar-superior'>
                <p>Si quieres ocultar tu perfil, haz click aquí</p>
                <div className={`toggle-switch ${esPublico ? 'active' : ''}`} onClick={handleCambiarPublico}>
                  <div className="toggle-slider"></div>
                </div>
              </div>
            </div>
            
            <div className='cuadro-eliminar-cuenta'>
              {usuario.email !== 'admin@auscultify.com' && (
                  <button className='eliminar-cuenta' onClick={handleClickEliminarCuenta}>Eliminar cuenta</button>
              )}
            </div>
        </div>

        {mostrarOverlay && (
          <div className={`overlay ${overlayAnimacionEnReproduccion ? 'overlay-fade-in' : 'overlay-fade-out'}`}>
            <div className={`overlay-content ${overlayAnimacionEnReproduccion ? 'content-fade-in' : 'content-fade-out'}`}>
              <h2>¿Seguro que quieres eliminar la cuenta?</h2>
              <p>Si la eliminas se perderá todo tu progreso</p>
              {mensajeError && (
                <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
                  {mensajeError}
                </div>
              )}
              <div className="overlay-buttons">
                <button className="overlay-cancel" onClick={handleCancelarEliminarCuenta}>Cancelar</button>
                <button className="overlay-confirm" onClick={handleConfirmarEliminarCuenta}>Eliminar</button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Perfil;


