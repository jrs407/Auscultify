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

  React.useEffect(() => {
    if (!usuario) {
      navigate('/login');
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

  const handleUserSelect = (selectedUser: UsuarioPublico) => {
    setSearchTerm(selectedUser.email);
    setShowDropdown(false);

    console.log('Usuario seleccionado:', selectedUser);
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
                    placeholder="¿A quién quieres buscar?"
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
                            className="dropdown-item"
                            onClick={() => handleUserSelect(usuarioEncontrado)}
                          >
                            <p>{usuarioEncontrado.email}</p>
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
              <p>De momento no estas siguiendo a nadie. <br></br> ¿Te apetece seguir a alguien? <br></br>¡Búscalo!</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Siguiendo;
