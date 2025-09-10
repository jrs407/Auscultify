import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Home.css';
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

interface Algoritmo {
  idCriterioAlgoritmo: number;
  textoCriterio: string;
  tituloCriterio: string;
}

interface Categoria {
  idCategorias: number;
  nombreCategoria: string;
}

const Home: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario = (location.state as LocationState)?.usuario;
  const [selectedButton, setSelectedButton] = useState('aprender');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCategoriaDropdownOpen, setIsCategoriaDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState('Selecciona que quieres estudiar.');
  const [selectedCategoria, setSelectedCategoria] = useState('Selecciona una categoría.');
  const [algoritmos, setAlgoritmos] = useState<Algoritmo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargandoAlgoritmos, setCargandoAlgoritmos] = useState(true);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);
  const [descripcionVisible, setDescripcionVisible] = useState<number | null>(null);
  const [descripcionPosition, setDescripcionPosition] = useState({ x: 0, y: 0 });
  const [algoritmoSeleccionado, setAlgoritmoSeleccionado] = useState<Algoritmo | null>(null);
  const [mostrarCategoriaParaAlgoritmo3, setMostrarCategoriaParaAlgoritmo3] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const categoriaDropdownRef = useRef<HTMLDivElement>(null);

  const obtenerAlgoritmos = async () => {
    try {
      setCargandoAlgoritmos(true);
      const response = await fetch('http://localhost:3013/obtener-algoritmos');
      
      if (response.ok) {
        const data = await response.json();
        setAlgoritmos(data.algoritmos || []);
      } else {
        console.error('Error al obtener algoritmos:', response.statusText);
        setAlgoritmos([]);
      }
    } catch (error) {
      console.error('Error de conexión al obtener algoritmos:', error);
      setAlgoritmos([]);
    } finally {
      setCargandoAlgoritmos(false);
    }
  };

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
      obtenerAlgoritmos();
      obtenerCategorias();
    }
  }, [usuario, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);

        setDescripcionVisible(null);
      }
      if (categoriaDropdownRef.current && !categoriaDropdownRef.current.contains(event.target as Node)) {
        setIsCategoriaDropdownOpen(false);
      }
    };

    if (isDropdownOpen || isCategoriaDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isCategoriaDropdownOpen]);

  const handleButtonClick = (buttonName: string) => {
    setSelectedButton(buttonName);
  };

  const toggleDropdown = () => {
    const newState = !isDropdownOpen;
    setIsDropdownOpen(newState);

    if (!newState) {
      setDescripcionVisible(null);
    }
  };

  const handleOptionSelect = async (algoritmo: Algoritmo) => {
    setSelectedOption(algoritmo.tituloCriterio);
    setIsDropdownOpen(false);
    setAlgoritmoSeleccionado(algoritmo);
    
    setDescripcionVisible(null);
    
    if (algoritmo.idCriterioAlgoritmo === 1) {

      try {
        const response = await fetch('http://localhost:3014/algoritmos/aleatorio-simple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.resultado.preguntas) {
            navigate('/responder-pregunta', { 
              state: { 
                usuario, 
                algoritmoSeleccionado: algoritmo,
                preguntas: data.resultado.preguntas
              } 
            });
          } else {
            console.error('Error en la respuesta del algoritmo:', data);
            alert('Error al generar las preguntas. Inténtalo de nuevo.');
          }
        } else {
          console.error('Error al llamar al algoritmo aleatorio simple:', response.statusText);
          alert('Error de conexión con el servicio de algoritmos.');
        }
      } catch (error) {
        console.error('Error de conexión:', error);
        alert('Error de conexión. Verifica que el servicio esté disponible.');
      }
    } else if (algoritmo.idCriterioAlgoritmo === 2) {
      try {
        const response = await fetch('http://localhost:3014/algoritmos/preguntas-no-hechas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            usuario_id: usuario.id
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.resultado.preguntas) {
            navigate('/responder-pregunta', { 
              state: { 
                usuario, 
                algoritmoSeleccionado: algoritmo,
                preguntas: data.resultado.preguntas
              } 
            });
          } else {
            console.error('Error en la respuesta del algoritmo:', data);
            alert('Error al generar las preguntas. Inténtalo de nuevo.');
          }
        } else {
          console.error('Error al llamar al algoritmo preguntas no hechas:', response.statusText);
          alert('Error de conexión con el servicio de algoritmos.');
        }
      } catch (error) {
        console.error('Error de conexión:', error);
        alert('Error de conexión. Verifica que el servicio esté disponible.');
      }
    } else if (algoritmo.idCriterioAlgoritmo === 3) {
      setMostrarCategoriaParaAlgoritmo3(true);
      setIsCategoriaDropdownOpen(true);
    } else if (algoritmo.idCriterioAlgoritmo === 4) {
      try {
        const response = await fetch('http://localhost:3014/algoritmos/categoria-peor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            usuario_id: usuario.id
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.resultado && data.resultado.preguntas && data.resultado.preguntas.length > 0) {
            navigate('/responder-pregunta', { 
              state: { 
                usuario, 
                algoritmoSeleccionado: algoritmo,
                preguntas: data.resultado.preguntas
              } 
            });
          } else {
            console.warn('CategoriaPeor no devolvió preguntas, usando AleatorioSimple como fallback:', data);
            try {
              const fallbackResponse = await fetch('http://localhost:3014/algoritmos/aleatorio-simple', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
              });
              
              if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                if (fallbackData.success && fallbackData.resultado.preguntas) {
                  navigate('/responder-pregunta', { 
                    state: { 
                      usuario, 
                      algoritmoSeleccionado: algoritmo,
                      preguntas: fallbackData.resultado.preguntas,
                      esFallback: true
                    } 
                  });
                } else {
                  console.error('Error en la respuesta del algoritmo de fallback:', fallbackData);
                  alert('No se pudieron generar preguntas. Inténtalo de nuevo.');
                }
              } else {
                console.error('Error al llamar al algoritmo de fallback:', fallbackResponse.statusText);
                alert('Error de conexión con el servicio de algoritmos.');
              }
            } catch (fallbackError) {
              console.error('Error de conexión con algoritmo de fallback:', fallbackError);
              alert('Error de conexión. Verifica que el servicio esté disponible.');
            }
          }
        } else {
          console.error('Error al llamar al algoritmo categoria peor:', response.statusText);
          alert('Error de conexión con el servicio de algoritmos.');
        }
      } catch (error) {
        console.error('Error de conexión:', error);
        alert('Error de conexión. Verifica que el servicio esté disponible.');
      }
    } else if (algoritmo.idCriterioAlgoritmo === 5) {
      try {
        const response = await fetch('http://localhost:3014/algoritmos/categoria-mejor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            usuario_id: usuario.id
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.resultado && data.resultado.preguntas && data.resultado.preguntas.length > 0) {
            navigate('/responder-pregunta', { 
              state: { 
                usuario, 
                algoritmoSeleccionado: algoritmo,
                preguntas: data.resultado.preguntas
              } 
            });
          } else {
            console.warn('CategoriaMejor no devolvió preguntas, usando AleatorioSimple como fallback:', data);
            try {
              const fallbackResponse = await fetch('http://localhost:3014/algoritmos/aleatorio-simple', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
              });
              
              if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                if (fallbackData.success && fallbackData.resultado.preguntas) {
                  navigate('/responder-pregunta', { 
                    state: { 
                      usuario, 
                      algoritmoSeleccionado: algoritmo,
                      preguntas: fallbackData.resultado.preguntas,
                      esFallback: true
                    } 
                  });
                } else {
                  console.error('Error en la respuesta del algoritmo de fallback:', fallbackData);
                  alert('No se pudieron generar preguntas. Inténtalo de nuevo.');
                }
              } else {
                console.error('Error al llamar al algoritmo de fallback:', fallbackResponse.statusText);
                alert('Error de conexión con el servicio de algoritmos.');
              }
            } catch (fallbackError) {
              console.error('Error de conexión con algoritmo de fallback:', fallbackError);
              alert('Error de conexión. Verifica que el servicio esté disponible.');
            }
          }
        } else {
          console.error('Error al llamar al algoritmo categoria mejor:', response.statusText);
          alert('Error de conexión con el servicio de algoritmos.');
        }
      } catch (error) {
        console.error('Error de conexión:', error);
        alert('Error de conexión. Verifica que el servicio esté disponible.');
      }
    } else {
      navigate('/responder-pregunta', { state: { usuario, algoritmoSeleccionado: algoritmo } });
    }
  };

  const toggleCategoriaDropdown = () => {
    setIsCategoriaDropdownOpen(!isCategoriaDropdownOpen);
  };

  const handleCategoriaSelect = async (categoria: Categoria) => {
    setSelectedCategoria(categoria.nombreCategoria);
    setIsCategoriaDropdownOpen(false);
    
    if (mostrarCategoriaParaAlgoritmo3 && algoritmoSeleccionado) {
      try {
        const response = await fetch('http://localhost:3014/algoritmos/categoria-concreta', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            categoria_id: categoria.idCategorias
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.resultado.preguntas) {
            navigate('/responder-pregunta', { 
              state: { 
                usuario, 
                algoritmoSeleccionado: algoritmoSeleccionado,
                categoriaSeleccionada: categoria,
                preguntas: data.resultado.preguntas
              } 
            });
          } else {
            console.error('Error en la respuesta del algoritmo:', data);
            alert('Error al generar las preguntas. Inténtalo de nuevo.');
          }
        } else {
          console.error('Error al llamar al algoritmo categoria concreta:', response.statusText);
          alert('Error de conexión con el servicio de algoritmos.');
        }
      } catch (error) {
        console.error('Error de conexión:', error);
        alert('Error de conexión. Verifica que el servicio esté disponible.');
      }
    }
  };

  const handleRatonEnter = (algoritmoId: number, event: React.MouseEvent) => {
    setDescripcionVisible(algoritmoId);
    setDescripcionPosition({
      x: event.clientX + 15,
      y: event.clientY - 10
    });
  };

  const handleMovimientoRaton = (event: React.MouseEvent) => {
    if (descripcionVisible) {
      setDescripcionPosition({
        x: event.clientX + 15,
        y: event.clientY - 10
      });
    }
  };

  const handleRatonFuera = () => {
    setDescripcionVisible(null);
  };

  if (!usuario) return null;

  return (
    <div className='fondo'>
      <Sidebar 
        usuario={usuario} 
        selectedButton={selectedButton} 
        onButtonClick={handleButtonClick} 
      />
      <div className='contenido-home'>
        
        <div className="contenedor-central-home">
          <div className="contenedor-titulo-home">
            <p>¿Qué vamos a estudiar hoy?</p>
          </div>

          <div className="contenedor-desplegable-home">
            <div className="desplegable-home" ref={dropdownRef}>
              <div 
                className="cabecera-desplegable-home"
                onClick={toggleDropdown}
              >
                <span>{cargandoAlgoritmos ? 'Cargando...' : selectedOption}</span>
                <span className={`flecha-desplegable-home ${isDropdownOpen ? 'open' : ''}`}>▼</span>
              </div>
              {isDropdownOpen && !cargandoAlgoritmos && (
                <div className="desplegable-list-home">
                  {algoritmos.length === 0 ? (
                    <div className="desplegable-item-home" style={{ color: '#888', cursor: 'default' }}>
                      No hay algoritmos disponibles
                    </div>
                  ) : (
                    algoritmos.map((algoritmo) => (
                      <div
                        key={algoritmo.idCriterioAlgoritmo}
                        className="desplegable-item-home"
                        onMouseEnter={(e) => handleRatonEnter(algoritmo.idCriterioAlgoritmo, e)}
                        onMouseMove={handleMovimientoRaton}
                        onMouseLeave={handleRatonFuera}
                        onClick={() => handleOptionSelect(algoritmo)}
                      >
                        {algoritmo.tituloCriterio}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={`contenedor-desplegable-categoria-home ${mostrarCategoriaParaAlgoritmo3 ? 'visible' : 'hidden'}`}>
            <div className="desplegable-categoria-home" ref={categoriaDropdownRef}>
              <div 
                className="cabecera-desplegable-categoria-home"
                onClick={toggleCategoriaDropdown}
              >
                <span>{cargandoCategorias ? 'Cargando...' : selectedCategoria}</span>
                <span className={`flecha-desplegable-categoria-home ${isCategoriaDropdownOpen ? 'open' : ''}`}>▼</span>
              </div>
              {isCategoriaDropdownOpen && !cargandoCategorias && (
                <div className="desplegable-list-categoria-home">
                  {categorias.length === 0 ? (
                    <div className="desplegable-item-categoria-home" style={{ color: '#888', cursor: 'default' }}>
                      No hay categorías disponibles
                    </div>
                  ) : (
                    categorias.map((categoria) => (
                      <div
                        key={categoria.idCategorias}
                        className="desplegable-item-categoria-home"
                        onClick={() => handleCategoriaSelect(categoria)}
                      >
                        {categoria.nombreCategoria}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {descripcionVisible && (
          <div 
            className="descripcion"
            style={{
              left: `${descripcionPosition.x}px`,
              top: `${descripcionPosition.y}px`
            }}
          >
            {algoritmos.find(a => a.idCriterioAlgoritmo === descripcionVisible)?.textoCriterio}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
