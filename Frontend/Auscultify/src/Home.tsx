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

const Home: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario = (location.state as LocationState)?.usuario;
  const [selectedButton, setSelectedButton] = useState('aprender');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState('Selecciona que quieres estudiar.');
  const [algoritmos, setAlgoritmos] = useState<Algoritmo[]>([]);
  const [cargandoAlgoritmos, setCargandoAlgoritmos] = useState(true);
  const [descripcionVisible, setDescripcionVisible] = useState<number | null>(null);
  const [descripcionPosition, setDescripcionPosition] = useState({ x: 0, y: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  React.useEffect(() => {
    if (!usuario) {
      navigate('/login');
    } else {
      obtenerAlgoritmos();
    }
  }, [usuario, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleButtonClick = (buttonName: string) => {
    setSelectedButton(buttonName);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleOptionSelect = (algoritmo: Algoritmo) => {
    setSelectedOption(algoritmo.tituloCriterio);
    setIsDropdownOpen(false);
    navigate('/responder-pregunta', { state: { usuario, algoritmoSeleccionado: algoritmo } });
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
