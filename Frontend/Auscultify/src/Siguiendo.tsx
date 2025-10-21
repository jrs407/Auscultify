import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Siguiendo.css';
import Sidebar from './components/Sidebar';

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

// Definición de la estructura de un usuario público.
interface UsuarioPublico {
  email: string;
}

const Siguiendo: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Estado para almacenar los datos del usuario.
  const [usuario] = useState((location.state as LocationState)?.usuario);

  // Estado para gestionar qué botón del sidebar está seleccionado.
  const [selectedButton, setSelectedButton] = useState('siguiendo');

  // Estado y manejadores para la funcionalidad de búsqueda.
  const [terminoBusqueda, setTerminoBusqueda] = useState('');

  // Estado para almacenar los resultados de la búsqueda.
  const [resultadoBusqueda, setResultadoBusqueda] = useState<UsuarioPublico[]>([]);

  // Estado para gestionar la carga durante la búsqueda.
  const [estaCargando, setEstaCargando] = useState(false);

  // Estado para controlar la visibilidad del desplegable de resultados.
  const [mostrarDesplegable, setMostrarDesplegable] = useState(false);

  // Estado para gestionar el usuario que se desea seguir y dejar de seguir.
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string | null>(null);

  // Estado para almacenar la lista de usuarios que el usuario actual está siguiendo.
  const [usuariosSeguidos, setUsuariosSeguidos] = useState<UsuarioPublico[]>([]);

  // Estado para gestionar la carga de los usuarios seguidos.
  const [cargandoSeguidos, setCargandoSeguidos] = useState(true);


  // Función para obtener los usuarios que el usuario actual está siguiendo.
  const obtenerUsuariosSeguidos = useCallback(async () => {
    if (!usuario) return;
    
    // Poner el estado de carga a true al iniciar la obtención.
    setCargandoSeguidos(true);
    
    // Realizar la petición al backend para obtener los usuarios seguidos.
    try {
      const response = await fetch(`http://localhost:3004/obtener-siguiendo?email=${encodeURIComponent(usuario.email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Si la respuesta es correcta, actualizar el estado con los usuarios seguidos, si no, manejar el error.
      if (response.ok) {
        const data = await response.json();
        setUsuariosSeguidos(data.siguiendo || []);
      } else {
        console.error('Error al obtener usuarios seguidos');
        setUsuariosSeguidos([]);
      }
    } catch (error) {
      console.error('Error de conexión al obtener usuarios seguidos:', error);
      setUsuariosSeguidos([]);
    } finally {
      setCargandoSeguidos(false);
    }
  }, [usuario]);

  // Efecto para redirigir al login si no hay usuario y para obtener los usuarios seguidos al cargar el componente.
  React.useEffect(() => {
    if (!usuario) {
      navigate('/login');
    } else {
      obtenerUsuariosSeguidos();
    }
  }, [usuario, navigate, obtenerUsuariosSeguidos]);

  const handleButtonClick = (buttonName: string) => {
    setSelectedButton(buttonName);
  };

  // Manejador para el cambio en el input de búsqueda.
  const handleCambioBusqueda = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTerminoBusqueda(e.target.value);
  };

  // Función para manejar la búsqueda de usuarios.
  const handleBusqueda = useCallback(async () => {
    if (!terminoBusqueda.trim()) return;
    
    // Poner el estado de carga a true al iniciar la búsqueda.
    setEstaCargando(true);
    
    // Realizar la petición al backend para buscar usuarios.
    try {
      const response = await fetch(`http://localhost:3004/obtener-usuarios-publicos?busqueda=${encodeURIComponent(terminoBusqueda)}&usuarioActual=${encodeURIComponent(usuario.email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Si la respuesta es correcta, actualizar el estado con los resultados, si no, manejar el error.
      if (response.ok) {
        const data = await response.json();
        setResultadoBusqueda(data.usuarios || []);
        setMostrarDesplegable(true);
      } else {
        console.error('Error al buscar usuarios');
        setResultadoBusqueda([]);
        setMostrarDesplegable(false);
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      setResultadoBusqueda([]);
      setMostrarDesplegable(false);
    } finally {
      setEstaCargando(false);
    }
  }, [terminoBusqueda, usuario.email]);

  // Efecto para manejar la búsqueda con un retraso.
  useEffect(() => {

    // Configurar un retraso antes de realizar la búsqueda para evitar búsquedas excesivas.
    const busquedaRetrasada = setTimeout(() => {

      // Solo realizar la búsqueda si el término no está vacío.
      if (terminoBusqueda.trim()) {
        handleBusqueda();
      } else {
        // Si el término está vacío, limpiar resultados y ocultar el desplegable.
        setResultadoBusqueda([]);
        setMostrarDesplegable(false);
      }
    }, 300);

    // Limpiar el temporizador si el término de búsqueda cambia antes de que se complete el retraso.
    return () => clearTimeout(busquedaRetrasada);
  }, [terminoBusqueda, handleBusqueda]);

  // Función para seguir a un usuario.
  const seguirUsuario = async (emailSeguido: string) => {
    setUsuarioSeleccionado(emailSeguido);
    
    // Realizar la petición al backend para seguir al usuario.
    try {
      const response = await fetch('http://localhost:3004/seguir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailSeguidor: usuario.email,
          emailSeguido: emailSeguido
        }),
      });

      // Si la respuesta es correcta, actualizar la lista de usuarios seguidos y manejar el estado, si no, manejar el error.
      if (response.ok) {
        const data = await response.json();
        console.log('Usuario seguido exitosamente:', data.mensaje);
        
        setResultadoBusqueda(prev => prev.filter(user => user.email !== emailSeguido));
        
        await obtenerUsuariosSeguidos();
        
        if (resultadoBusqueda.length <= 1) {
          setMostrarDesplegable(false);
        }
      } else {
        const errorData = await response.json();
        console.error('Error al seguir usuario:', errorData.mensaje);
      }
    } catch (error) {
      console.error('Error de conexión al seguir usuario:', error);
    } finally {
      setUsuarioSeleccionado(null);
    }
  };

  // Función para dejar de seguir a un usuario.
  const dejarDeSeguirUsuario = async (emailSeguido: string) => {
    setUsuarioSeleccionado(emailSeguido);
    
    // Realizar la petición al backend para dejar de seguir al usuario.
    try {
      const response = await fetch('http://localhost:3004/eliminar-siguiendo', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailSeguidor: usuario.email,
          emailSeguido: emailSeguido
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Usuario no seguido exitosamente:', data.mensaje);

        await obtenerUsuariosSeguidos();
      } else {
        const errorData = await response.json();
        console.error('Error al dejar de seguir usuario:', errorData.mensaje);
      }
    } catch (error) {
      console.error('Error de conexión al dejar de seguir usuario:', error);
    } finally {
      setUsuarioSeleccionado(null);
    }
  };

  // Función para ver las estadísticas de un usuario seguido.
  const verEstadisticasUsuario = (usuarioSeguido: UsuarioPublico) => {
    navigate('/estadisticas-grupal', { 
      state: { 
        usuario,
        usuarioSeleccionado: usuarioSeguido
      } 
    });
  };

  // Manejador para seleccionar un usuario de los resultados de búsqueda.
  const handleSeleccionarUsuario = async (selectedUser: UsuarioPublico) => {

    // Verificar si ya se está siguiendo al usuario o si ya se está procesando la acción.
    const estoySiguiendolo = usuariosSeguidos.some(u => u.email === selectedUser.email);
    
    // Si ya se sigue o se está procesando, no hacer nada.
    if (estoySiguiendolo || usuarioSeleccionado === selectedUser.email) {
      return;
    }

    // Llamar a la función para seguir al usuario seleccionado.
    await seguirUsuario(selectedUser.email);
    setTerminoBusqueda('');
  };

  // Manejadores para el foco y desenfoque del input de búsqueda.
  const handleInputFocus = () => {
    if (resultadoBusqueda.length > 0) {
      setMostrarDesplegable(true);
    }
  };

  // Retrasar el cierre del desplegable para permitir hacer clic en los elementos.
  const handleInputBlur = () => {

    setTimeout(() => {
      setMostrarDesplegable(false);
    }, 200);
  };

  if (!usuario) return null;

  return (
    <div className='fondo'>
      <Sidebar 
        usuario={usuario} 
        selectedButton={selectedButton} 
        onButtonClick={handleButtonClick} 
      />
      <div className='contenedor-siguiendo'>
        <div className='cuadro-central-siguiendo'>
            <div className='siguiendo-contenedor-buscador'>
                <div className='buscador-container'>
                  <input
                    type="text"
                    placeholder="¡Descubre a gente nueva!"
                    value={terminoBusqueda}
                    onChange={handleCambioBusqueda}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    className="buscador-input"
                  />
                  <div className="search-icon">🔍</div>
                  
                  {mostrarDesplegable && (
                    <div className="dropdown-container">
                      {estaCargando ? (
                        <div className="dropdown-item loading">
                          <p>Buscando usuarios...</p>
                        </div>
                      ) : resultadoBusqueda.length > 0 ? (
                        resultadoBusqueda.map((usuarioEncontrado, index) => {
                          const isAlreadyFollowed = usuariosSeguidos.some(u => u.email === usuarioEncontrado.email);
                          
                          return (
                            <div 
                              key={index} 
                              className={`dropdown-item ${usuarioSeleccionado === usuarioEncontrado.email ? 'following' : ''} ${isAlreadyFollowed ? 'followed' : ''}`}
                              onClick={() => handleSeleccionarUsuario(usuarioEncontrado)}
                              style={{ 
                                cursor: usuarioSeleccionado === usuarioEncontrado.email ? 'wait' : 'pointer',
                                opacity: usuarioSeleccionado === usuarioEncontrado.email ? 0.7 : 1
                              }}
                            >
                              <p>
                                {usuarioEncontrado.email}
                                {usuarioSeleccionado === usuarioEncontrado.email && ' (Siguiendo...)'}
                                {isAlreadyFollowed && ' ✓'}
                              </p>
                            </div>
                          );
                        })
                      ) : (
                        <div className="dropdown-item no-results">
                          <p>No se encontraron usuarios</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
            </div>

            <div className='contenedor-texto'>
              {cargandoSeguidos ? (
                <p>Cargando usuarios seguidos...</p>
              ) : usuariosSeguidos.length > 0 ? (
                <div className='contenedor-usuarios-seguidos'>
                  <h3>Usuarios que sigues:</h3>
                  <div className='lista-usuarios-seguidos'>
                    {usuariosSeguidos.map((usuarioSeguido, index) => (
                      <div key={index} className='usuario-seguido-card'>
                        <div 
                          className='usuario-seguido-info'
                          onClick={() => verEstadisticasUsuario(usuarioSeguido)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span className='usuario-seguido-email'>{usuarioSeguido.email}</span>
                          <button 
                            className='unfollow-button'
                            onClick={(e) => {
                              e.stopPropagation();
                              dejarDeSeguirUsuario(usuarioSeguido.email);
                            }}
                            disabled={usuarioSeleccionado === usuarioSeguido.email}
                            style={{
                              opacity: usuarioSeleccionado === usuarioSeguido.email ? 0.5 : 1,
                              cursor: usuarioSeleccionado === usuarioSeguido.email ? 'wait' : 'pointer'
                            }}
                          >
                            {usuarioSeleccionado === usuarioSeguido.email ? '...' : '✕'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p>De momento no estas siguiendo a nadie. <br></br> ¿Te apetece seguir a alguien? <br></br>¡Búscalo!</p>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Siguiendo;
