import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import './PanelAdmin.css';
import uploadIcon from './assets/uploadIcon.png';

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

// Definición de la estructura de una categoría.
interface Categoria {
  idCategorias: number;
  nombreCategoria: string;
}

// Definición de la estructura de una pregunta.
interface Pregunta {
  idPregunta: number;
  rutaAudio: string;
  audioUrl: string;
  respuestaCorrecta: string;
  nombreCategoria: string;
  idCategorias: number;
}

const PanelAdmin: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Estado para almacenar los datos del usuario.
  const usuario = (location.state as LocationState)?.usuario;

  // Estado para gestionar qué botón del sidebar está seleccionado.
  const [selectedButton, setSelectedButton] = useState('admin');

  // Estados para gestionar los distintos desplegables.
  const [desplegableAbiertoCrear, setDesplegableAbiertoCrear] = useState(false);
  const [desplegableAbiertoEliminarCategoria, setDesplegableAbiertoEliminarCategoria] = useState(false);
  const [desplegableAbiertoEliminarPregunta, setDesplegableAbiertoEliminarPregunta] = useState(false);

  // Estados para gestionar las categorias y preguntas seleccionadas en los desplegables.
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Elija una categoría');
  const [categoriaEliminarSeleccionada, setCategoriaEliminarSeleccionada] = useState('Elija una categoría');
  const [preguntaSeleccionada, setPreguntaSeleccionada] = useState('Elija una pregunta');

  // Estado para almacenar el texto de la nueva categoría que se desea crear.
  const [nuevaCategoria, setNuevaCategoria] = useState('');

  // Estado para mostrar el overlay de confirmación de eliminación.
  const [mostrarOverlayEliminar, setMostrarOverlayEliminar] = useState(false);

  // Estado para manejar la animación del overlay.
  const [overlayAnimacion, setOverlayAnimacion] = useState(false);

  // Estado para determinar el tipo de eliminación ('categoria' | 'pregunta')
  const [tipoEliminacion, setTipoEliminacion] = useState<'categoria' | 'pregunta'>('categoria');

  // Estado para almacenar la categoría que se desea eliminar.
  const [categoriaParaEliminar, setCategoriaParaEliminar] = useState<Categoria | null>(null);

  // Estado para manejar la subida de archivos de audio.
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);

  // Estado para almacenar la respuesta asociada a la pregunta que se desea crear.
  const [respuesta, setRespuesta] = useState('');

  // Estados para procesar la creación de una nueva categoría y pregunta.
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  const [creandoPregunta, setCreandoPregunta] = useState(false);

  // Estados para almacenar las categorias y las preguntas obtenidas desde el backend.
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);

  // Estados para manejar la carga de categorías y preguntas desde el backend.
  const [cargandoCategorias, setCargandoCategorias] = useState(true);
  const [cargandoPreguntas, setCargandoPreguntas] = useState(false);

  // Referencia para manejar los clics fuera de los desplegables.
  const desplegableRef = useRef<HTMLDivElement>(null);

  // Referencia del input de subida de archivos de audio
  const archivoInputRef = useRef<HTMLInputElement>(null);

  // Referencia para manejar la reproducción de audio de las preguntas.
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Estado para almacenar la pregunta que se desea eliminar.
  const [preguntaParaEliminar, setPreguntaParaEliminar] = useState<Pregunta | null>(null)

  // Estados para procesar la eliminación de una categoría y las preguntas.
  const [eliminandoCategoria, setEliminandoCategoria] = useState(false);
  const [eliminandoPregunta, setEliminandoPregunta] = useState(false);

  // Estados para manejar distintos errores.
  const [errorCategoria, setErrorCategoria] = useState('');
  const [errorEliminarCategoria, setErrorEliminarCategoria] = useState('');
  const [errorSubida, setErrorSubida] = useState('');
  const [errorPregunta, setErrorPregunta] = useState('');
  const [errorEliminarPregunta, setErrorEliminarPregunta] = useState('');


  // Variables derivadas para simplificar el código del overlay de eliminación.
  const estaEliminando = tipoEliminacion === 'categoria' ? eliminandoCategoria : eliminandoPregunta;
  const errorEliminar = tipoEliminacion === 'categoria' ? errorEliminarCategoria : errorEliminarPregunta;
  const nombreItem = tipoEliminacion === 'categoria' 
    ? categoriaParaEliminar?.nombreCategoria 
    : preguntaParaEliminar?.respuestaCorrecta;


  // Función para formatear la respuesta eliminando acentos y capitalizando palabras.
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

  // Función para obtener las categorías desde el backend.
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

  // Función para obtener las preguntas desde el backend, opcionalmente filtradas por categoría.
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

  // Efecto para redirigir al login si no hay usuario y para cargar categorías y preguntas al montar el componente.
  React.useEffect(() => {
    if (!usuario) {
      navigate('/login');
    } else {
      obtenerCategorias();
      obtenerPreguntas();
    }
  }, [usuario, navigate]);

  // Efecto para manejar clics fuera de los desplegables y cerrarlos.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (desplegableRef.current && !desplegableRef.current.contains(event.target as Node)) {
        // Cerrar cualquier desplegable activo
        setDesplegableAbiertoCrear(false);
        setDesplegableAbiertoEliminarCategoria(false);
        setDesplegableAbiertoEliminarPregunta(false);
      }
    };

    // Revisar si algún desplegable está abierto
    const cualquierDesplegableActivo = desplegableAbiertoCrear || desplegableAbiertoEliminarCategoria || desplegableAbiertoEliminarPregunta;

    if (cualquierDesplegableActivo) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [desplegableAbiertoCrear, desplegableAbiertoEliminarCategoria, desplegableAbiertoEliminarPregunta]);

  // Manejadores de eventos y funciones auxiliares.
  const handleButtonClick = (buttonName: string) => {
    setSelectedButton(buttonName);
  };

  // Manejador para la subida de archivos de audio.
  const handleUpload = () => {
    if (archivoInputRef.current) {
      archivoInputRef.current.click();
    }
  };

  // Manejador para la selección de archivos de audio.
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setErrorSubida('');
    
    if (file) {
      const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/m4a', 'audio/aac', 'audio/mp4', 'video/mp4'];
      if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().match(/\.(mp3|wav|ogg|m4a|aac|mp4)$/)) {
        setErrorSubida('Por favor selecciona un archivo de audio válido (MP3, WAV, OGG, M4A, AAC, MP4)');
        setArchivoSeleccionado(null);
        return;
      }

      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setErrorSubida('El archivo es demasiado grande. El tamaño máximo permitido es 50MB');
        setArchivoSeleccionado(null);
        return;
      }

      setArchivoSeleccionado(file);
      console.log('Archivo seleccionado:', file.name, 'Tamaño:', file.size, 'Tipo:', file.type);
    }
  };

  // Manejadores para abrir y cerrar los distintos desplegables.
  const alternarDesplegable = (tipo: 'crearCategoria' | 'eliminarCategoria' | 'eliminarPregunta') => {
    if (tipo === 'crearCategoria') {
      const newState = !desplegableAbiertoCrear;
      setDesplegableAbiertoCrear(newState);
      if (newState) {
        setDesplegableAbiertoEliminarCategoria(false);
        setDesplegableAbiertoEliminarPregunta(false);
      }
      return;
    } 
    if (tipo === 'eliminarCategoria') {
      const newState = !desplegableAbiertoEliminarCategoria;
      setDesplegableAbiertoEliminarCategoria(newState);
      if (newState) {
        setDesplegableAbiertoCrear(false);
        setDesplegableAbiertoEliminarPregunta(false);
      }
      return;
    } 
    
    if (tipo === 'eliminarPregunta') {
      const newState = !desplegableAbiertoEliminarPregunta;
      setDesplegableAbiertoEliminarPregunta(newState);
      if (newState) {
        setDesplegableAbiertoCrear(false);
        setDesplegableAbiertoEliminarCategoria(false);
      }
    }
  };

  // Manejador para seleccionar categorías en el desplegable de creacion.
  const handleCriterioSelect = (categoria: Categoria) => {
    setCategoriaSeleccionada(categoria.nombreCategoria);
    setDesplegableAbiertoCrear(false);
  };

  // Manejador para seleccionar categorías en el desplegable de eliminación.
  const handleEliminarCriterioSelect = (categoria: Categoria) => {
    setCategoriaEliminarSeleccionada(categoria.nombreCategoria);
    setDesplegableAbiertoEliminarCategoria(false);
  };

  // Manejador para seleccionar preguntas en el desplegable de eliminación.
  const handleEliminarPreguntaSelect = (pregunta: string) => {
    stopAudio();
    
    setPreguntaSeleccionada(pregunta);
    setDesplegableAbiertoEliminarPregunta(false);
    
    const preguntaSeleccionada = preguntas.find(p => p.respuestaCorrecta === pregunta);
    if (preguntaSeleccionada && preguntaSeleccionada.audioUrl) {
      setTimeout(() => {
        playQuestionAudio(preguntaSeleccionada.audioUrl);
      }, 50);
    }
  };

  // Función para crear una nueva categoría.
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

  // Función para eliminar una categoría.
  const eliminarCategoria = async () => {
    setErrorEliminarCategoria('');
  
    const categoriaSeleccionada = categorias.find(cat => cat.nombreCategoria === categoriaEliminarSeleccionada);
    if (!categoriaSeleccionada) {
      setErrorEliminarCategoria('Categoría no encontrada');
      return;
    }

    setCategoriaParaEliminar(categoriaSeleccionada);
    setTipoEliminacion('categoria');
    setMostrarOverlayEliminar(true);
    setOverlayAnimacion(true);
  };

  // Manejador para confirmar la eliminación (categoría o pregunta).
  const handleConfirmDelete = async () => {
    if (tipoEliminacion === 'categoria') {
      await handleConfirmDeleteCategoria();
    } else {
      await handleConfirmDeletePregunta();
    }
  };

  // Funcion para eliminar una categoría.
  const handleConfirmDeleteCategoria = async () => {
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
        setCategoriaEliminarSeleccionada('Elija una categoría');
        setErrorEliminarCategoria('');

        handleCancelDelete();

        await obtenerCategorias();
      } else {
        setErrorEliminarCategoria(data.mensaje || 'Error al eliminar la categoría');
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      setErrorEliminarCategoria('Error de conexión con el servidor');
    } finally {
      setEliminandoCategoria(false);
    }
  };

  // Función para cancelar la eliminación (categoría o pregunta).
  const handleCancelDelete = () => {
    setErrorEliminarCategoria('');
    setErrorEliminarPregunta('');
    setOverlayAnimacion(false);
    setTimeout(() => {
      setMostrarOverlayEliminar(false);
      setCategoriaParaEliminar(null);
      setPreguntaParaEliminar(null);
    }, 300);
  };

  // Función para crear una nueva pregunta.
  const crearPregunta = async () => {
    setErrorPregunta('');
    
    if (!archivoSeleccionado) {
      setErrorPregunta('Debe seleccionar un archivo de audio');
      return;
    }

    if (categoriaSeleccionada === 'Elija una categoría') {
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
      formData.append('audio', archivoSeleccionado);
      formData.append('categoria', categoriaSeleccionada);
      formData.append('respuesta', respuestaFormateada);

      const response = await fetch('http://localhost:3012/crear-pregunta', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setArchivoSeleccionado(null);
        setRespuesta('');
        setCategoriaSeleccionada('Elija una categoría');
        setErrorPregunta('');
        if (archivoInputRef.current) {
          archivoInputRef.current.value = '';
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

  // Función para eliminar una pregunta.
  const eliminarPregunta = async () => {
    setErrorEliminarPregunta('');
  
    const preguntaSeleccionadaConcreta = preguntas.find(pregunta => pregunta.respuestaCorrecta === preguntaSeleccionada);
    if (!preguntaSeleccionadaConcreta) {
      setErrorEliminarPregunta('Pregunta no encontrada');
      return;
    }

    setPreguntaParaEliminar(preguntaSeleccionadaConcreta);
    setTipoEliminacion('pregunta');
    setMostrarOverlayEliminar(true);
    setOverlayAnimacion(true);
  };

  // Funcion para eliminar una pregunta.
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
        setPreguntaSeleccionada('Elija una pregunta');
        setErrorEliminarPregunta('');

        handleCancelDelete();

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

  // Funciones para reproducir y detener el audio de las preguntas.
  const playQuestionAudio = (audioUrl: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
        audioRef.current = null;
      }

      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
      audioRef.current.volume = 0.7;
      audioRef.current.src = audioUrl;

      audioRef.current.onerror = (e) => {
        console.error('Error al cargar audio:', e);
        console.error('URL del audio:', audioUrl);
      };

      audioRef.current.load();
      
      const playPromise = audioRef.current.play();
      
      playPromise.then(() => {
        console.log('Audio reproducido exitosamente');
      }).catch(error => {
        console.error('Error al reproducir audio:', error);
        console.error('URL del audio:', audioUrl);
      });

    } catch (error) {
      console.error('Error al crear elemento de audio:', error);
      console.error('URL del audio:', audioUrl);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
      audioRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

 
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
                ref={archivoInputRef}
                onChange={handleFileSelect}
                accept=".mp3,.wav,.ogg,.m4a,.aac,.mp4,audio/*"
                style={{ display: 'none' }}
              />
              <button 
                className={`upload-button ${archivoSeleccionado && !errorSubida ? 'uploaded' : ''}`}
                onClick={handleUpload}
              >
                <img src={uploadIcon} alt="Upload" className="upload-button-icon" />
                {archivoSeleccionado && !errorSubida ? 'Audio subido' : 'Subir audio'}
                {archivoSeleccionado && !errorSubida && (
                  <span style={{ color: '#ffffff', fontSize: '2vh', marginLeft: '1vh' }}>✓</span>
                )}
              </button>
              {errorSubida && (
                <div className="error-message" style={{ color: '#ff4444', fontSize: '1.6vh', marginTop: '1vh' }}>
                  {errorSubida}
                </div>
              )}
            </div>

            <div className='parte-superior-contenedor-desplegable-cuadro'>
              <div className='parte-superior-contenedor-desplegable'>
                <div 
                  className="desplegable-superior" 
                  ref={desplegableAbiertoCrear ? desplegableRef : null}
                >
                  <div 
                    className="cabecera-desplegable-superior"
                    onClick={() => alternarDesplegable('crearCategoria')}
                  >
                    <span>{cargandoCategorias ? 'Cargando...' : categoriaSeleccionada}</span>
                    <span className={`flecha-desplegable ${desplegableAbiertoCrear ? 'open' : ''}`}>▼</span>
                  </div>
                  {desplegableAbiertoCrear && !cargandoCategorias && (
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
                <div 
                  className="desplegable-superior" 
                  style={{ width: '20vw' }} 
                  ref={desplegableAbiertoEliminarCategoria ? desplegableRef : null}
                >
                  <div 
                    className="cabecera-desplegable-superior"
                    onClick={() => alternarDesplegable('eliminarCategoria')}
                  >
                    <span>{cargandoCategorias ? 'Cargando...' : categoriaEliminarSeleccionada}</span>
                    <span className={`flecha-desplegable ${desplegableAbiertoEliminarCategoria ? 'open' : ''}`}>▼</span>
                  </div>
                  {desplegableAbiertoEliminarCategoria && !cargandoCategorias && (
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
                {errorEliminarCategoria && (
                  <label className="error-label" style={{ fontSize: '12px', marginTop: '5px' }}>{errorEliminarCategoria}</label>
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
                <div 
                  className="desplegable-superior" 
                  style={{ width: '20vw' }} 
                  ref={desplegableAbiertoEliminarPregunta ? desplegableRef : null}
                >
                  <div 
                    className="cabecera-desplegable-superior"
                    onClick={() => alternarDesplegable('eliminarPregunta')}
                  >
                    <span>{preguntaSeleccionada}</span>
                    <span className={`flecha-desplegable ${desplegableAbiertoEliminarPregunta ? 'open' : ''}`}>▼</span>
                  </div>
                  {desplegableAbiertoEliminarPregunta && (
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

      {mostrarOverlayEliminar && (
        <div className={`overlay ${overlayAnimacion ? 'overlay-fade-in' : 'overlay-fade-out'}`}>
          <div className={`overlay-content ${overlayAnimacion ? 'content-fade-in' : 'content-fade-out'}`}>
            <h2>¿Seguro que quieres eliminar la {tipoEliminacion}?</h2>
            <p>
              Se eliminará la {tipoEliminacion} "<strong>{nombreItem}</strong>" 
              {tipoEliminacion === 'categoria' 
                ? ' y todas sus preguntas asociadas.' 
                : ' y su archivo de audio asociado.'
              }
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
                disabled={estaEliminando}
              >
                Cancelar
              </button>
              <button 
                className="overlay-confirm" 
                onClick={handleConfirmDelete}
                disabled={estaEliminando}
              >
                {estaEliminando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelAdmin;
