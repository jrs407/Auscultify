import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import './PanelAdmin.css';
import uploadIcon from './assets/uploadIcon.png';

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

interface Categoria {
  idCategorias: number;
  nombreCategoria: string;
}

const PanelAdmin: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario = (location.state as LocationState)?.usuario;
  const [selectedButton, setSelectedButton] = useState('admin');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEliminarDropdownOpen, setIsEliminarDropdownOpen] = useState(false);
  const [isEliminarPreguntaDropdownOpen, setIsEliminarPreguntaDropdownOpen] = useState(false);
  const [selectedCriterio, setSelectedCriterio] = useState('Elija una categoría');
  const [selectedEliminarCriterio, setSelectedEliminarCriterio] = useState('Elija una categoría');
  const [selectedEliminarPregunta, setSelectedEliminarPregunta] = useState('Elija una pregunta');
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  const [errorCategoria, setErrorCategoria] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const eliminarDropdownRef = useRef<HTMLDivElement>(null);
  const eliminarPreguntaDropdownRef = useRef<HTMLDivElement>(null);

  const preguntas = [
    'Pregunta 1',
    'Pregunta 2',
    'Pregunta 3',
    'Pregunta 4',
    'Pregunta 5',
    'Pregunta 6',
    'Pregunta 7',
    'Pregunta 8',
    'Pregunta 9'
  ];

  const obtenerCategorias = async () => {
    try {
      setCargandoCategorias(true);
      const response = await fetch('http://localhost:3010/obtener-categorias');
      
      if (response.ok) {
        const data = await response.json();
        setCategorias(data.categorias || []);
      } else {
        console.error('Error al obtener categorías:', response.statusText);
        setCategorias([]);
      }
    } catch (error) {
      console.error('Error de conexión al obtener categorías:', error);
      setCategorias([]);
    } finally {
      setCargandoCategorias(false);
    }
  };

  React.useEffect(() => {
    if (!usuario) {
      navigate('/login');
    } else {
      obtenerCategorias();
    }
  }, [usuario, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (eliminarDropdownRef.current && !eliminarDropdownRef.current.contains(event.target as Node)) {
        setIsEliminarDropdownOpen(false);
      }
      if (eliminarPreguntaDropdownRef.current && !eliminarPreguntaDropdownRef.current.contains(event.target as Node)) {
        setIsEliminarPreguntaDropdownOpen(false);
      }
    };

    if (isDropdownOpen || isEliminarDropdownOpen || isEliminarPreguntaDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isEliminarDropdownOpen, isEliminarPreguntaDropdownOpen]);

  const handleButtonClick = (buttonName: string) => {
    setSelectedButton(buttonName);
  };

  const handleUpload = () => {
    
  };

  const handleCriterioSelect = (categoria: Categoria) => {
    setSelectedCriterio(categoria.nombreCategoria);
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const toggleEliminarDropdown = () => {
    setIsEliminarDropdownOpen(!isEliminarDropdownOpen);
  };

  const toggleEliminarPreguntaDropdown = () => {
    setIsEliminarPreguntaDropdownOpen(!isEliminarPreguntaDropdownOpen);
  };

  const handleEliminarCriterioSelect = (categoria: Categoria) => {
    setSelectedEliminarCriterio(categoria.nombreCategoria);
    setIsEliminarDropdownOpen(false);
  };

  const handleEliminarPreguntaSelect = (pregunta: string) => {
    setSelectedEliminarPregunta(pregunta);
    setIsEliminarPreguntaDropdownOpen(false);
  };

  const crearCategoria = async () => {
    setErrorCategoria('');
    
    if (!nuevaCategoria.trim()) {
      setErrorCategoria('El nombre de la categoría es obligatorio');
      return;
    }

    if (nuevaCategoria.trim().length < 2) {
      setErrorCategoria('El nombre debe tener al menos 2 caracteres');
      return;
    }

    if (nuevaCategoria.trim().length > 50) {
      setErrorCategoria('El nombre no puede exceder 50 caracteres');
      return;
    }

    setCreandoCategoria(true);

    try {
      const response = await fetch('http://localhost:3009/crear-categoria', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombreCategoria: nuevaCategoria.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setNuevaCategoria('');
        setErrorCategoria('');
        await obtenerCategorias();
      } else {
        setErrorCategoria(data.mensaje || 'Error al crear la categoría');
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      setErrorCategoria('Error de conexión con el servidor');
    } finally {
      setCreandoCategoria(false);
    }
  };

  if (!usuario) return null;

  return (
    <div className='fondo'>
      <Sidebar 
        usuario={usuario} 
        selectedButton={selectedButton} 
        onButtonClick={handleButtonClick} 
      />
      <div className='segunda-mitad'>
        <div className= "contenido-admin">
          <div className='parte-superior-admin'>

            <div className='parte-superior-admin-titulo'>
              <p>¡Sube una pregunta!</p>
            </div>

            <div className='parte-superior-contenedor-upload'>
              <button 
                className="upload-button"
                onClick={handleUpload}
              >
                <img src={uploadIcon} alt="Upload" className="upload-button-icon" />
                Subir audio
              </button>
            </div>

            <div className='parte-superior-contenedor-desplegable-cuadro'>
              <div className='parte-superior-contenedor-desplegable'>
                <div className="desplegable-superior" ref={dropdownRef}>
                  <div 
                    className="cabecera-desplegable-superior"
                    onClick={toggleDropdown}
                  >
                    <span>{cargandoCategorias ? 'Cargando...' : selectedCriterio}</span>
                    <span className={`flecha-desplegable ${isDropdownOpen ? 'open' : ''}`}>▼</span>
                  </div>
                  {isDropdownOpen && !cargandoCategorias && (
                    <div className="desplegable-list">
                      {categorias.length === 0 ? (
                        <div className="desplegable-item" style={{ color: '#888', cursor: 'default' }}>
                          No hay categorías disponibles
                        </div>
                      ) : (
                        categorias.map((categoria) => (
                          <div
                            key={categoria.idCategorias}
                            className="desplegable-item"
                            onClick={() => handleCriterioSelect(categoria)}
                          >
                            {categoria.nombreCategoria}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className='parte-superior-contenedor-cuadro'>
                <p>Respuesta:</p>

                <input 
                  placeholder="Introduce la respuesta a la pregunta"
                />
              </div>
            </div>

            <div className='parte-superior-contenedor-boton'>
              <button className='boton-crear-pregunta'>
                Crear pregunta
              </button>
            </div>


          </div>

          <div className='linea-horizontal'></div>

          <div className='parte-central-admin'>
            <div className='parte-central-admin-titulo'>
              <p>¿Quieres añadir una nueva categoría?</p>
            </div>

            <div className='parte-central-admin-texto-boton'>
              <div className='contenedor-input-categoria'>
                <input 
                  placeholder="Introduce una nueva categoría"
                  className={`input-nueva-categoria ${errorCategoria ? 'input-error' : ''}`}
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  disabled={creandoCategoria}
                />
                {errorCategoria && (
                  <label className="error-label">{errorCategoria}</label>
                )}
              </div>
              <button 
                className="boton-aceptar-categoria"
                onClick={crearCategoria}
                disabled={creandoCategoria}
              >
                {creandoCategoria ? 'Creando...' : 'Crear categoría'}
              </button>
            </div>
          </div>

          <div className='linea-horizontal'></div>
          
          <div className="parte-inferior-admin">
            <div className='parte-inferior-admin-izquierda'>
              <p>Eliminar categoria:</p>
              <div className='eliminar-categoria-desplegable'>
                <div className="desplegable-superior" style={{ width: '20vw' }} ref={eliminarDropdownRef}>
                  <div 
                    className="cabecera-desplegable-superior"
                    onClick={toggleEliminarDropdown}
                  >
                    <span>{cargandoCategorias ? 'Cargando...' : selectedEliminarCriterio}</span>
                    <span className={`flecha-desplegable ${isEliminarDropdownOpen ? 'open' : ''}`}>▼</span>
                  </div>
                  {isEliminarDropdownOpen && !cargandoCategorias && (
                    <div className="desplegable-list-eliminar">
                      {categorias.length === 0 ? (
                        <div className="desplegable-item" style={{ color: '#888', cursor: 'default' }}>
                          No hay categorías disponibles
                        </div>
                      ) : (
                        categorias.map((categoria) => (
                          <div
                            key={categoria.idCategorias}
                            className="desplegable-item"
                            onClick={() => handleEliminarCriterioSelect(categoria)}
                          >
                            {categoria.nombreCategoria}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button className="boton-eliminar-categoria">
                Eliminar
              </button>
            </div>

            <div className='parte-inferior-admin-derecha'>
              <p>Eliminar pregunta:</p>
              <div className='eliminar-pregunta-desplegable'>
                <div className="desplegable-superior" style={{ width: '20vw' }} ref={eliminarPreguntaDropdownRef}>
                  <div 
                    className="cabecera-desplegable-superior"
                    onClick={toggleEliminarPreguntaDropdown}
                  >
                    <span>{selectedEliminarPregunta}</span>
                    <span className={`flecha-desplegable ${isEliminarPreguntaDropdownOpen ? 'open' : ''}`}>▼</span>
                  </div>
                  {isEliminarPreguntaDropdownOpen && (
                    <div className="desplegable-list-eliminar">
                      {preguntas.map((pregunta, index) => (
                        <div
                          key={index}
                          className="desplegable-item"
                          onClick={() => handleEliminarPreguntaSelect(pregunta)}
                        >
                          {pregunta}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button className="boton-eliminar-pregunta">
                Eliminar
              </button>
            </div>
          </div>

          <div className='relleno'></div>

        </div>
      </div>
    </div>
  );
};

export default PanelAdmin;
