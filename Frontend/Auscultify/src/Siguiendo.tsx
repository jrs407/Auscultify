import React, { useState, useEffect } from 'react';
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
interface UsuarioSeguido {
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

  // Interfaz para definir la estructura de un usuario público.
  interface UsuarioPublico {
    email: string;
  }

  // Estado para almacenar los resultados de la búsqueda.
  const [resultadoBusqueda, setResultadoBusqueda] = useState<UsuarioPublico[]>([]);

  // Estado para gestionar la carga durante la búsqueda.
  const [estaCargando, setEstaCargando] = useState(false);


  const [showDropdown, setShowDropdown] = useState(false);
  const [followingUser, setFollowingUser] = useState<string | null>(null);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [usuariosSeguidos, setUsuariosSeguidos] = useState<UsuarioSeguido[]>([]);
  const [loadingSeguidos, setLoadingSeguidos] = useState(true);
  const [unfollowingUser, setUnfollowingUser] = useState<string | null>(null);

  React.useEffect(() => {
    if (!usuario) {
      navigate('/login');
    } else {
      obtenerUsuariosSeguidos();
    }
  }, [usuario, navigate]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (terminoBusqueda.trim()) {
        handleSearch();
      } else {
        setResultadoBusqueda([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [terminoBusqueda]);

  const handleButtonClick = (buttonName: string) => {
    setSelectedButton(buttonName);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTerminoBusqueda(e.target.value);
  };

  const handleSearch = async () => {
    if (!terminoBusqueda.trim()) return;
    
    setEstaCargando(true);
    
    try {
      const response = await fetch(`http://localhost:3005/obtener-usuarios-publicos?busqueda=${encodeURIComponent(terminoBusqueda)}&usuarioActual=${encodeURIComponent(usuario.email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResultadoBusqueda(data.usuarios || []);
        setShowDropdown(true);
      } else {
        console.error('Error al buscar usuarios');
        setResultadoBusqueda([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      setResultadoBusqueda([]);
      setShowDropdown(false);
    } finally {
      setEstaCargando(false);
    }
  };

  const obtenerUsuariosSeguidos = async () => {
    if (!usuario) return;
    
    setLoadingSeguidos(true);
    
    try {
      const response = await fetch(`http://localhost:3007/obtener-siguiendo?email=${encodeURIComponent(usuario.email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

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
      setLoadingSeguidos(false);
    }
  };

  const seguirUsuario = async (emailSeguido: string) => {
    setFollowingUser(emailSeguido);
    
    try {
      const response = await fetch('http://localhost:3006/seguir', {
        method: 'POST',
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
        console.log('Usuario seguido exitosamente:', data.mensaje);
        setFollowedUsers(prev => new Set([...prev, emailSeguido]));
        
        setResultadoBusqueda(prev => prev.filter(user => user.email !== emailSeguido));
        
        await obtenerUsuariosSeguidos();
        
        if (resultadoBusqueda.length <= 1) {
          setShowDropdown(false);
        }
      } else {
        const errorData = await response.json();
        console.error('Error al seguir usuario:', errorData.mensaje);
      }
    } catch (error) {
      console.error('Error de conexión al seguir usuario:', error);
    } finally {
      setFollowingUser(null);
    }
  };

  const dejarDeSeguirUsuario = async (emailSeguido: string) => {
    setUnfollowingUser(emailSeguido);
    
    try {
      const response = await fetch('http://localhost:3008/eliminar-siguiendo', {
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
        
        setFollowedUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(emailSeguido);
          return newSet;
        });
      } else {
        const errorData = await response.json();
        console.error('Error al dejar de seguir usuario:', errorData.mensaje);
      }
    } catch (error) {
      console.error('Error de conexión al dejar de seguir usuario:', error);
    } finally {
      setUnfollowingUser(null);
    }
  };

  const handleUserSelect = async (selectedUser: UsuarioPublico) => {
    if (followedUsers.has(selectedUser.email) || followingUser === selectedUser.email) {
      return;
    }

    await seguirUsuario(selectedUser.email);
    setTerminoBusqueda('');
  };

  const handleInputFocus = () => {
    if (resultadoBusqueda.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleInputBlur = () => {

    setTimeout(() => {
      setShowDropdown(false);
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
                    onChange={handleSearchChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    className="buscador-input"
                  />
                  <div className="search-icon">🔍</div>
                  
                  {showDropdown && (
                    <div className="dropdown-container">
                      {estaCargando ? (
                        <div className="dropdown-item loading">
                          <p>Buscando usuarios...</p>
                        </div>
                      ) : resultadoBusqueda.length > 0 ? (
                        resultadoBusqueda.map((usuarioEncontrado, index) => (
                          <div 
                            key={index} 
                            className={`dropdown-item ${followingUser === usuarioEncontrado.email ? 'following' : ''} ${followedUsers.has(usuarioEncontrado.email) ? 'followed' : ''}`}
                            onClick={() => handleUserSelect(usuarioEncontrado)}
                            style={{ 
                              cursor: followingUser === usuarioEncontrado.email ? 'wait' : 'pointer',
                              opacity: followingUser === usuarioEncontrado.email ? 0.7 : 1
                            }}
                          >
                            <p>
                              {usuarioEncontrado.email}
                              {followingUser === usuarioEncontrado.email && ' (Siguiendo...)'}
                              {followedUsers.has(usuarioEncontrado.email) && ' ✓'}
                            </p>
                          </div>
                        ))
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
              {loadingSeguidos ? (
                <p>Cargando usuarios seguidos...</p>
              ) : usuariosSeguidos.length > 0 ? (
                <div className='contenedor-usuarios-seguidos'>
                  <h3>Usuarios que sigues:</h3>
                  <div className='lista-usuarios-seguidos'>
                    {usuariosSeguidos.map((usuarioSeguido, index) => (
                      <div key={index} className='usuario-seguido-card'>
                        <div className='usuario-seguido-info'>
                          <span className='usuario-seguido-email'>{usuarioSeguido.email}</span>
                          <button 
                            className='unfollow-button'
                            onClick={() => dejarDeSeguirUsuario(usuarioSeguido.email)}
                            disabled={unfollowingUser === usuarioSeguido.email}
                            style={{
                              opacity: unfollowingUser === usuarioSeguido.email ? 0.5 : 1,
                              cursor: unfollowingUser === usuarioSeguido.email ? 'wait' : 'pointer'
                            }}
                          >
                            {unfollowingUser === usuarioSeguido.email ? '...' : '✕'}
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
