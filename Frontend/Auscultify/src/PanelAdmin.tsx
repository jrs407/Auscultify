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

interface Pregunta {
  idPregunta: number;
  rutaAudio: string;
  respuestaCorrecta: string;
  nombreCategoria: string;
  idCategorias: number;
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
  const [eliminandoCategoria, setEliminandoCategoria] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');
  const [showDeleteOverlay, setShowDeleteOverlay] = useState(false);
  const [overlayAnimating, setOverlayAnimating] = useState(false);
  const [categoriaParaEliminar, setCategoriaParaEliminar] = useState<Categoria | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [creandoPregunta, setCreandoPregunta] = useState(false);
  const [errorPregunta, setErrorPregunta] = useState('');
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [cargandoPreguntas, setCargandoPreguntas] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const eliminarDropdownRef = useRef<HTMLDivElement>(null);
  const eliminarPreguntaDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeletePreguntaOverlay, setShowDeletePreguntaOverlay] = useState(false);
  const [preguntaOverlayAnimating, setPreguntaOverlayAnimating] = useState(false);
  const [preguntaParaEliminar, setPreguntaParaEliminar] = useState<Pregunta | null>(null);
  const [eliminandoPregunta, setEliminandoPregunta] = useState(false);
  const [errorEliminarPregunta, setErrorEliminarPregunta] = useState('');

  const formatearRespuesta = (texto: string): string => {
    return texto
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(' ')
      .map((palabra) => {
        return palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase();
      })
      .join('');
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

  const obtenerPreguntas = async (categoria?: string) => {
    try {
      setCargandoPreguntas(true);
      const url = categoria 
        ? `http://localhost:3012/obtener-preguntas?categoria=${encodeURIComponent(categoria)}`
        : 'http://localhost:3012/obtener-preguntas';
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setPreguntas(data.preguntas || []);
      } else {
        console.error('Error al obtener preguntas:', response.statusText);
        setPreguntas([]);
      }
    } catch (error) {
      console.error('Error de conexión al obtener preguntas:', error);
      setPreguntas([]);
    } finally {
      setCargandoPreguntas(false);
    }
  };

  React.useEffect(() => {
    if (!usuario) {
      navigate('/login');
    } else {
      obtenerCategorias();
      obtenerPreguntas();
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
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setUploadError('');
    
    if (file) {
      const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/m4a', 'audio/aac', 'audio/mp4', 'video/mp4'];
      if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().match(/\.(mp3|wav|ogg|m4a|aac|mp4)$/)) {
        setUploadError('Por favor selecciona un archivo de audio válido (MP3, WAV, OGG, M4A, AAC, MP4)');
        setSelectedFile(null);
        return;
      }

      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setUploadError('El archivo es demasiado grande. El tamaño máximo permitido es 50MB');
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      console.log('Archivo seleccionado:', file.name, 'Tamaño:', file.size, 'Tipo:', file.type);
    }
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

  const eliminarCategoria = async () => {
    setErrorEliminar('');
  
    const categoriaSeleccionada = categorias.find(cat => cat.nombreCategoria === selectedEliminarCriterio);
    if (!categoriaSeleccionada) {
      setErrorEliminar('Categoría no encontrada');
      return;
    }

    setCategoriaParaEliminar(categoriaSeleccionada);
    setShowDeleteOverlay(true);
    setOverlayAnimating(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoriaParaEliminar) return;

    setEliminandoCategoria(true);

    try {
      const response = await fetch('http://localhost:3011/eliminar-categoria', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idCategoria: categoriaParaEliminar.idCategorias,
          nombreCategoria: categoriaParaEliminar.nombreCategoria
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSelectedEliminarCriterio('Elija una categoría');
        setErrorEliminar('');

        handleCancelDelete();

        await obtenerCategorias();
      } else {
        setErrorEliminar(data.mensaje || 'Error al eliminar la categoría');
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      setErrorEliminar('Error de conexión con el servidor');
    } finally {
      setEliminandoCategoria(false);
    }
  };

  const handleCancelDelete = () => {
    setErrorEliminar('');
    setOverlayAnimating(false);
    setTimeout(() => {
      setShowDeleteOverlay(false);
      setCategoriaParaEliminar(null);
    }, 300);
  };

  const crearPregunta = async () => {
    setErrorPregunta('');
    
    if (!selectedFile) {
      setErrorPregunta('Debe seleccionar un archivo de audio');
      return;
    }

    if (selectedCriterio === 'Elija una categoría') {
      setErrorPregunta('Debe seleccionar una categoría');
      return;
    }

    if (!respuesta.trim()) {
      setErrorPregunta('La respuesta es obligatoria');
      return;
    }

    if (respuesta.trim().length < 2) {
      setErrorPregunta('La respuesta debe tener al menos 2 caracteres');
      return;
    }

    if (respuesta.trim().length > 200) {
      setErrorPregunta('La respuesta no puede exceder 200 caracteres');
      return;
    }

    setCreandoPregunta(true);

    try {
      const respuestaFormateada = formatearRespuesta(respuesta);
      
      const formData = new FormData();
      formData.append('audio', selectedFile);
      formData.append('categoria', selectedCriterio);
      formData.append('respuesta', respuestaFormateada);

      const response = await fetch('http://localhost:3012/crear-pregunta', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSelectedFile(null);
        setRespuesta('');
        setSelectedCriterio('Elija una categoría');
        setErrorPregunta('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        await obtenerPreguntas();
      } else {
        setErrorPregunta(data.mensaje || 'Error al crear la pregunta');
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      setErrorPregunta('Error de conexión con el servidor');
    } finally {
      setCreandoPregunta(false);
    }
  };

  const eliminarPregunta = async () => {
    setErrorEliminarPregunta('');
  
    const preguntaSeleccionada = preguntas.find(pregunta => pregunta.respuestaCorrecta === selectedEliminarPregunta);
    if (!preguntaSeleccionada) {
      setErrorEliminarPregunta('Pregunta no encontrada');
      return;
    }

    setPreguntaParaEliminar(preguntaSeleccionada);
    setShowDeletePreguntaOverlay(true);
    setPreguntaOverlayAnimating(true);
  };

  const handleConfirmDeletePregunta = async () => {
    if (!preguntaParaEliminar) return;

    setEliminandoPregunta(true);

    try {
      const response = await fetch('http://localhost:3012/eliminar-pregunta', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idPregunta: preguntaParaEliminar.idPregunta
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSelectedEliminarPregunta('Elija una pregunta');
        setErrorEliminarPregunta('');

        handleCancelDeletePregunta();

        await obtenerPreguntas();
      } else {
        setErrorEliminarPregunta(data.mensaje || 'Error al eliminar la pregunta');
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      setErrorEliminarPregunta('Error de conexión con el servidor');
    } finally {
      setEliminandoPregunta(false);
    }
  };

  const handleCancelDeletePregunta = () => {
    setErrorEliminarPregunta('');
    setPreguntaOverlayAnimating(false);
    setTimeout(() => {
      setShowDeletePreguntaOverlay(false);
      setPreguntaParaEliminar(null);
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
      <div className='segunda-mitad'>
        <div className= "contenido-admin">
          <div className='parte-superior-admin'>

            <div className='parte-superior-admin-titulo'>
              <p>¡Sube una pregunta!</p>
            </div>

            <div className='parte-superior-contenedor-upload'>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".mp3,.wav,.ogg,.m4a,.aac,.mp4,audio/*"
                style={{ display: 'none' }}
              />
              <button 
                className={`upload-button ${selectedFile && !uploadError ? 'uploaded' : ''}`}
                onClick={handleUpload}
              >
                <img src={uploadIcon} alt="Upload" className="upload-button-icon" />
                {selectedFile && !uploadError ? 'Audio subido' : 'Subir audio'}
                {selectedFile && !uploadError && (
                  <span style={{ color: '#ffffff', fontSize: '2vh', marginLeft: '1vh' }}>✓</span>
                )}
              </button>
              {uploadError && (
                <div className="error-message" style={{ color: '#ff4444', fontSize: '1.6vh', marginTop: '1vh' }}>
                  {uploadError}
                </div>
              )}
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
                  value={respuesta}
                  onChange={(e) => setRespuesta(e.target.value)}
                  disabled={creandoPregunta}
                  className={errorPregunta ? 'input-error' : ''}
                />
              </div>
            </div>

            <div className='parte-superior-contenedor-boton'>
              {errorPregunta && (
                <div className="error-message" style={{ color: '#ff4444', fontSize: '1.6vh', marginBottom: '1vh' }}>
                  {errorPregunta}
                </div>
              )}
              <button 
                className='boton-crear-pregunta'
                onClick={crearPregunta}
                disabled={creandoPregunta}
              >
                {creandoPregunta ? 'Creando...' : 'Crear pregunta'}
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
                {errorEliminar && (
                  <label className="error-label" style={{ fontSize: '12px', marginTop: '5px' }}>{errorEliminar}</label>
                )}
              </div>
              <button 
                className="boton-eliminar-categoria"
                onClick={eliminarCategoria}
                disabled={eliminandoCategoria}
              >
                {eliminandoCategoria ? 'Eliminando...' : 'Eliminar'}
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
                      {cargandoPreguntas ? (
                        <div className="desplegable-item" style={{ color: '#888', cursor: 'default' }}>
                          Cargando preguntas...
                        </div>
                      ) : preguntas.length === 0 ? (
                        <div className="desplegable-item" style={{ color: '#888', cursor: 'default' }}>
                          No hay preguntas disponibles
                        </div>
                      ) : (
                        preguntas.map((pregunta) => (
                          <div
                            key={pregunta.idPregunta}
                            className="desplegable-item"
                            onClick={() => handleEliminarPreguntaSelect(pregunta.respuestaCorrecta)}
                          >
                            {pregunta.respuestaCorrecta}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {errorEliminarPregunta && (
                  <label className="error-label" style={{ fontSize: '12px', marginTop: '5px' }}>{errorEliminarPregunta}</label>
                )}
              </div>
              <button 
                className="boton-eliminar-pregunta"
                onClick={eliminarPregunta}
                disabled={eliminandoPregunta}
              >
                {eliminandoPregunta ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>

          <div className='relleno'></div>

        </div>
      </div>

      {showDeleteOverlay && (
        <div className={`overlay ${overlayAnimating ? 'overlay-fade-in' : 'overlay-fade-out'}`}>
          <div className={`overlay-content ${overlayAnimating ? 'content-fade-in' : 'content-fade-out'}`}>
            <h2>¿Seguro que quieres eliminar la categoría?</h2>
            <p>
              Se eliminará la categoría "<strong>{categoriaParaEliminar?.nombreCategoria}</strong>" y todas sus preguntas asociadas.
              <br />
              <br />
              Esta acción no se puede deshacer.
            </p>
            {errorEliminar && (
              <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
                {errorEliminar}
              </div>
            )}
            <div className="overlay-buttons">
              <button 
                className="overlay-cancel" 
                onClick={handleCancelDelete}
                disabled={eliminandoCategoria}
              >
                Cancelar
              </button>
              <button 
                className="overlay-confirm" 
                onClick={handleConfirmDelete}
                disabled={eliminandoCategoria}
              >
                {eliminandoCategoria ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeletePreguntaOverlay && (
        <div className={`overlay ${preguntaOverlayAnimating ? 'overlay-fade-in' : 'overlay-fade-out'}`}>
          <div className={`overlay-content ${preguntaOverlayAnimating ? 'content-fade-in' : 'content-fade-out'}`}>
            <h2>¿Seguro que quieres eliminar la pregunta?</h2>
            <p>
              Se eliminará la pregunta con respuesta "<strong>{preguntaParaEliminar?.respuestaCorrecta}</strong>" y su archivo de audio asociado.
              <br />
              <br />
              Esta acción no se puede deshacer.
            </p>
            {errorEliminarPregunta && (
              <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
                {errorEliminarPregunta}
              </div>
            )}
            <div className="overlay-buttons">
              <button 
                className="overlay-cancel" 
                onClick={handleCancelDeletePregunta}
                disabled={eliminandoPregunta}
              >
                Cancelar
              </button>
              <button 
                className="overlay-confirm" 
                onClick={handleConfirmDeletePregunta}
                disabled={eliminandoPregunta}
              >
                {eliminandoPregunta ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelAdmin;
