import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Siguiendo.css';
import Sidebar from './components/Sidebar';

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

interface UsuarioSeguido {
  email: string;
}

const Siguiendo: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [usuario] = useState((location.state as LocationState)?.usuario);
  const [selectedButton, setSelectedButton] = useState('siguiendo');
  const [searchTerm, setSearchTerm] = useState('');
  interface UsuarioPublico {
    email: string;
  }
  const [searchResults, setSearchResults] = useState<UsuarioPublico[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [followingUser, setFollowingUser] = useState<string | null>(null);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [usuariosSeguidos, setUsuariosSeguidos] = useState<UsuarioSeguido[]>([]);
  const [loadingSeguidos, setLoadingSeguidos] = useState(true);

  React.useEffect(() => {
    if (!usuario) {
      navigate('/login');
    } else {
      obtenerUsuariosSeguidos();
    }
  }, [usuario, navigate]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const handleButtonClick = (buttonName: string) => {
    setSelectedButton(buttonName);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`http://localhost:3005/obtener-usuarios-publicos?busqueda=${encodeURIComponent(searchTerm)}&usuarioActual=${encodeURIComponent(usuario.email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.usuarios || []);
        setShowDropdown(true);
      } else {
        console.error('Error al buscar usuarios');
        setSearchResults([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setIsLoading(false);
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
        
        setSearchResults(prev => prev.filter(user => user.email !== emailSeguido));
        
        await obtenerUsuariosSeguidos();
        
        if (searchResults.length <= 1) {
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

  const handleUserSelect = async (selectedUser: UsuarioPublico) => {
    if (followedUsers.has(selectedUser.email) || followingUser === selectedUser.email) {
      return;
    }

    await seguirUsuario(selectedUser.email);
    setSearchTerm('');
  };

  const handleInputFocus = () => {
    if (searchResults.length > 0) {
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
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    className="buscador-input"
                  />
                  <div className="search-icon">🔍</div>
                  
                  {showDropdown && (
                    <div className="dropdown-container">
                      {isLoading ? (
                        <div className="dropdown-item loading">
                          <p>Buscando usuarios...</p>
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((usuarioEncontrado, index) => (
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
                          <button className='unfollow-button'>✕</button>
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
