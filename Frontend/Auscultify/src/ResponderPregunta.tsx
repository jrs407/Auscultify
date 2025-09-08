import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './ResponderPregunta.css';
import copaTrofeoIcon from './assets/copaTrofeoIcon.png';
import altavozSinReproducir from './assets/AltavozSinReproducir.png';
import altavozReproduciendo from './assets/AltavozReproduciendo.png';

interface Pregunta {
  idPregunta: number;
  urlAudio: string;
  respuestaCorrecta: string;
  respuestasIncorrectas: string[];
  Categorias_idCategorias: number;
}

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
  algoritmoSeleccionado?: {
    idCriterioAlgoritmo: number;
    textoCriterio: string;
    tituloCriterio: string;
  };
  categoriaSeleccionada?: {
    idCategorias: number;
    nombreCategoria: string;
  };
  preguntas?: Pregunta[];
}

const ResponderPregunta: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, algoritmoSeleccionado, categoriaSeleccionada, preguntas } = (location.state as LocationState) || { usuario: null };
  const [numeroPregunta, setNumeroPregunta] = useState<number>(1);
  const [progresoActual, setProgresoActual] = useState<number>(0);
  const [progresoAnimado, setProgresoAnimado] = useState<number>(0);
  const [estaReproduciendose, setEstaReproduciendose] = useState<boolean>(false);
  const [botonActivado, setBotonActivado] = useState<boolean>(false);
  const [botonClickeado, setBotonClickeado] = useState<number | null>(null);
  const [preguntasAcertadas, setPreguntasAcertadas] = useState<number>(0);
  const [respuestaCorrecta, setRespuestaCorrecta] = useState<boolean>(false);
  const [respuestaFallada, setRespuestaFallada] = useState<boolean>(false);
  const progresoAnteriorRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [preguntaActual, setPreguntaActual] = useState<Pregunta | null>(null);
  const [opcionesRespuesta, setOpcionesRespuesta] = useState<string[]>([]);
  const [respuestaCorrectaIndex, setRespuestaCorrectaIndex] = useState<number>(0);

  useEffect(() => {
    if (!usuario) {
      navigate('/login');
    } else {

      if (preguntas && preguntas.length > 0) {
        console.log('Preguntas recibidas:', preguntas);
      } else {
        console.log('No hay preguntas disponibles');

        navigate('/home', { state: { usuario } });
      }
      
      if (algoritmoSeleccionado) {
        console.log('Algoritmo seleccionado:', algoritmoSeleccionado);
      }
      if (categoriaSeleccionada) {
        console.log('Categoría seleccionada:', categoriaSeleccionada);
      }
    }
  }, [usuario, navigate, algoritmoSeleccionado, categoriaSeleccionada, preguntas]);


  const cargarPregunta = useCallback((indicePregunta: number) => {
    if (!preguntas || preguntas.length === 0) return;
    
    const pregunta = preguntas[indicePregunta - 1];
    if (!pregunta) return;
    
    setPreguntaActual(pregunta);
    
    const todasLasOpciones = [
      pregunta.respuestaCorrecta,
      ...pregunta.respuestasIncorrectas
    ];
    
    const opcionesMezcladas = [...todasLasOpciones].sort(() => Math.random() - 0.5);
    setOpcionesRespuesta(opcionesMezcladas);
    
    const indiceRespuestaCorrecta = opcionesMezcladas.findIndex(
      opcion => opcion === pregunta.respuestaCorrecta
    );
    setRespuestaCorrectaIndex(indiceRespuestaCorrecta);
    
    console.log(`Pregunta ${indicePregunta} cargada:`, {
      pregunta: pregunta,
      opciones: opcionesMezcladas,
      respuestaCorrectaIndex: indiceRespuestaCorrecta
    });
  }, [preguntas]);

  useEffect(() => {
    if (preguntas && preguntas.length > 0) {
      cargarPregunta(numeroPregunta);
    }
  }, [numeroPregunta, preguntas, cargarPregunta]);

  useEffect(() => {
    const progresoObjetivo = (numeroPregunta / 10) * 100;
    
    setProgresoActual(progresoObjetivo);
    
    const timer = setTimeout(() => {
      setProgresoAnimado(progresoObjetivo);
      progresoAnteriorRef.current = progresoObjetivo;
    }, 50);

    return () => clearTimeout(timer);
  }, [numeroPregunta]);

  useEffect(() => {
    setProgresoAnimado(progresoActual);
  }, [progresoActual]);

  const handleExit = () => {
    navigate('/home', { state: { usuario } });
  };

  const handleClickAltavoz = () => {
    if (estaReproduciendose) {

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setEstaReproduciendose(false);
    } else {

      reproducirAudio();
    }
  };

  const reproducirAudio = () => {
    if (!preguntaActual) return;
    
    try {

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      audioRef.current = new Audio();
      audioRef.current.src = `http://localhost:3012/audio/${preguntaActual.urlAudio}`;
      audioRef.current.volume = 0.7;


      audioRef.current.onloadstart = () => {
        console.log('Cargando audio...');
      };

      audioRef.current.oncanplay = () => {
        console.log('El audio puede empezar a reproducirse');
      };

      audioRef.current.onplay = () => {
        setEstaReproduciendose(true);
        console.log('El audio ha comenzado a reproducirse');
      };

      audioRef.current.onended = () => {
        setEstaReproduciendose(false);
        console.log('El audio ha terminado de reproducirse');
      };

      audioRef.current.onerror = (e) => {
        setEstaReproduciendose(false);
        console.error('Error:', e);
      };

      audioRef.current.onpause = () => {
        setEstaReproduciendose(false);
      };


      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('El audio ha comenzado a reproducirse');
          })
          .catch(error => {
            console.error('Error:', error);
            setEstaReproduciendose(false);
          });
      }
    } catch (error) {
      console.error('Error:', error);
      setEstaReproduciendose(false);
    }
  };


  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  const handleSiguientePregunta = () => {
    setBotonActivado(false);
    setBotonClickeado(null);
    setRespuestaCorrecta(false);
    setRespuestaFallada(false);
    
    if (numeroPregunta < 10) {
      setNumeroPregunta(prev => prev + 1);
      console.log(`Avanzando a pregunta ${numeroPregunta + 1}`);
    } else {
      console.log('Terminando cuestionario, navegando a resultados...');
      console.log('Preguntas acertadas:', preguntasAcertadas);

      setTimeout(() => {
        navigate('/resultado', { 
          state: { 
            usuario,
            preguntasAcertadas,
            preguntasTotales: 10
          } 
        });
      }, 100);
    }
  };

  const handleSaltarPregunta = () => {
    console.log('Pregunta saltada');
    setBotonActivado(false);
    setBotonClickeado(null);
    setRespuestaCorrecta(false);
    setRespuestaFallada(false);
    
    if (numeroPregunta < 10) {
      setNumeroPregunta(prev => prev + 1);
      console.log(`Saltando a pregunta ${numeroPregunta + 1}`);
    } else {
      console.log('Última pregunta saltada, navegando a resultados...');
      
      setTimeout(() => {
        navigate('/resultado', { 
          state: { 
            usuario,
            preguntasAcertadas,
            preguntasTotales: 10
          } 
        });
      }, 100);
    }
  };

  const handleSeleccionarRespuesta = (buttonNumber: number) => {
    if (botonActivado) return;

    setBotonClickeado(buttonNumber);
    setBotonActivado(true);
    
    if (buttonNumber - 1 === respuestaCorrectaIndex) {
      setPreguntasAcertadas(prev => prev + 1);
      setRespuestaCorrecta(true);
      setRespuestaFallada(false);
      console.log('Respuesta correcta! Total aciertos:', preguntasAcertadas + 1);
    } else {
      setRespuestaCorrecta(false);
      setRespuestaFallada(true);
      console.log('Respuesta incorrecta!');
    }
  };

  if (!usuario) return null;

  return (
    <div className="fondo">
        <div className="contenido-pregunta-audio">
            <div className="contenedor-progreso">
                <div className="contenedor-salir">
                    <button className="boton-salir" onClick={handleExit}>X</button>
                </div>
                <div className="contenedor-numero-pregunta">
                    <p>{numeroPregunta}/10</p>
                </div>
                <div className="contenedor-barra-progreso">
                    <div className="barra-progreso">
                        <div 
                            className="barra-progreso-relleno" 
                            style={{ width: `${progresoAnimado}%` }}
                        ></div>
                    </div>
                </div>
                <div className="contenedor-trofeo">
                    <img src={copaTrofeoIcon} alt="Trofeo" className="icono-trofeo" />
                </div>
            </div>

            <div className="contenedor-audio-titulo">
                <div className="contenedor-titulo">
                    <p>¿Qué escuchas?</p>
                </div>
                <div className="contenedor-audio">
                    <img 
                        src={estaReproduciendose ? altavozReproduciendo : altavozSinReproducir}
                        alt={estaReproduciendose ? "Reproduciendo audio" : "Reproducir audio"}
                        className="altavoz-imagen"
                        onClick={handleClickAltavoz}
                    />
                </div>
            </div>

            <div className="contenedor-hueco">

            </div>

            <div className="contenedor-botones">
                <div className="contenedor-botones-superiores">
                    <button 
                        className={`boton-pregunta-sin-seleccionar ${
                          botonActivado && botonClickeado === 1 ? 
                            (1 - 1 === respuestaCorrectaIndex ? 'boton-pregunta-seleccionado' : 'boton-pregunta-incorrecto') 
                            : ''
                        }`}
                        onClick={() => handleSeleccionarRespuesta(1)}
                        disabled={botonActivado}
                    >
                        {opcionesRespuesta[0] || 'Opción 1'}
                    </button>

                    <button 
                        className={`boton-pregunta-sin-seleccionar ${
                          botonActivado && botonClickeado === 2 ? 
                            (2 - 1 === respuestaCorrectaIndex ? 'boton-pregunta-seleccionado' : 'boton-pregunta-incorrecto') 
                            : ''
                        }`}
                        onClick={() => handleSeleccionarRespuesta(2)}
                        disabled={botonActivado}
                    >
                        {opcionesRespuesta[1] || 'Opción 2'}
                    </button>
                </div>

                <div className="contenedor-botones-inferiores">
                    <button 
                        className={`boton-pregunta-sin-seleccionar ${
                          botonActivado && botonClickeado === 3 ? 
                            (3 - 1 === respuestaCorrectaIndex ? 'boton-pregunta-seleccionado' : 'boton-pregunta-incorrecto') 
                            : ''
                        }`}
                        onClick={() => handleSeleccionarRespuesta(3)}
                        disabled={botonActivado}
                    >
                        {opcionesRespuesta[2] || 'Opción 3'}
                    </button>
                    
                    <button 
                        className={`boton-pregunta-sin-seleccionar ${
                          botonActivado && botonClickeado === 4 ? 
                            (4 - 1 === respuestaCorrectaIndex ? 'boton-pregunta-seleccionado' : 'boton-pregunta-incorrecto') 
                            : ''
                        }`}
                        onClick={() => handleSeleccionarRespuesta(4)}
                        disabled={botonActivado}
                    >
                        {opcionesRespuesta[3] || 'Opción 4'}
                    </button>
                </div>
            </div>

            <div className="contenedor-hueco-pregunta">

            </div>

            <div className={`contenedor-saltar-pregunta ${respuestaCorrecta || respuestaFallada ? 'oculto' : ''}`}>
                <button 
                    className="boton-saltar-pregunta"
                    onClick={handleSaltarPregunta}
                >
                    Saltar
                </button>
            </div>

            <div className={`contenedor-pregunta-acertada ${!respuestaCorrecta ? 'oculto' : ''}`}>
              <p>¡Felicidades!, ¡Vamos al siguiente!</p>
              <button 
                className="boton-siguiente-acertado"
                onClick={handleSiguientePregunta}
              >
                Siguiente
              </button>
            </div>

            <div className={`contenedor-pregunta-fallada ${!respuestaFallada ? 'oculto' : ''}`}>
              <p>¡Una pena!, La respuesta correcta era: {preguntaActual?.respuestaCorrecta}</p>
              <button 
                className="boton-siguiente-fallado"
                onClick={handleSiguientePregunta}
              >
                Siguiente
              </button>
            </div>
        </div>
    </div>
  );
};

export default ResponderPregunta;