import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './ResponderPregunta.css';
import copaTrofeoIcon from './assets/copaTrofeoIcon.png';
import altavozSinReproducir from './assets/AltavozSinReproducir.png';
import altavozReproduciendo from './assets/AltavozReproduciendo.png';

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

const ResponderPregunta: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario = (location.state as LocationState)?.usuario;
  const [numeroPregunta, setNumeroPregunta] = useState<number>(1);
  const [progresoActual, setProgresoActual] = useState<number>(0);
  const [progresoAnimado, setProgresoAnimado] = useState<number>(0);
  const [estaReproduciendose, setEstaReproduciendose] = useState<boolean>(false);
  const [audioUrl] = useState<string>('Abdominal/AbdominalRespuesta11.m4a');
  const [botonVerde] = useState<number>(1);
  const [botonActivado, setBotonActivado] = useState<boolean>(false);
  const [botonClickeado, setBotonClickeado] = useState<number | null>(null);
  const [preguntasAcertadas, setPreguntasAcertadas] = useState<number>(0);
  const [respuestaCorrecta, setRespuestaCorrecta] = useState<boolean>(false);
  const [respuestaFallada, setRespuestaFallada] = useState<boolean>(false);
  const progresoAnteriorRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!usuario) {
      navigate('/login');
    }
  }, [usuario, navigate]);

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
  }, []);

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
    try {

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }


      audioRef.current = new Audio();
      audioRef.current.src = `http://localhost:3012/audio/${audioUrl}`;
      audioRef.current.volume = 0.7;


      audioRef.current.onloadstart = () => {
        console.log('Audio loading started');
      };

      audioRef.current.oncanplay = () => {
        console.log('Audio can start playing');
      };

      audioRef.current.onplay = () => {
        setEstaReproduciendose(true);
        console.log('Audio started playing');
      };

      audioRef.current.onended = () => {
        setEstaReproduciendose(false);
        console.log('Audio finished playing');
      };

      audioRef.current.onerror = (e) => {
        setEstaReproduciendose(false);
        console.error('Error playing audio:', e);
      };

      audioRef.current.onpause = () => {
        setEstaReproduciendose(false);
      };


      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Audio playback started successfully');
          })
          .catch(error => {
            console.error('Error starting audio playbook:', error);
            setEstaReproduciendose(false);
          });
      }
    } catch (error) {
      console.error('Error creating audio element:', error);
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

  const handleSeleccionarRespuesta = (buttonNumber: number) => {
    if (botonActivado) return;

    setBotonClickeado(buttonNumber);
    setBotonActivado(true);
    
    if (buttonNumber === botonVerde) {
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

  const handleSaltarPregunta = () => {
    console.log('Pregunta saltada');
    setBotonActivado(false);
    setBotonClickeado(null);
    setRespuestaCorrecta(false);
    setRespuestaFallada(false);
    
    if (numeroPregunta < 10) {
      setNumeroPregunta(prev => prev + 1);
    }
  };

  const handleSiguientePregunta = () => {
    setBotonActivado(false);
    setBotonClickeado(null);
    setRespuestaCorrecta(false);
    setRespuestaFallada(false);
    
    if (numeroPregunta < 10) {
      setNumeroPregunta(prev => prev + 1);
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
                            (1 === botonVerde ? 'boton-pregunta-seleccionado' : 'boton-pregunta-incorrecto') 
                            : ''
                        }`}
                        onClick={() => handleSeleccionarRespuesta(1)}
                        disabled={botonActivado}
                    >
                        Opción 1
                    </button>

                    <button 
                        className={`boton-pregunta-sin-seleccionar ${
                          botonActivado && botonClickeado === 2 ? 
                            (2 === botonVerde ? 'boton-pregunta-seleccionado' : 'boton-pregunta-incorrecto') 
                            : ''
                        }`}
                        onClick={() => handleSeleccionarRespuesta(2)}
                        disabled={botonActivado}
                    >
                        Opción 2
                    </button>
                </div>

                <div className="contenedor-botones-inferiores">
                    <button 
                        className={`boton-pregunta-sin-seleccionar ${
                          botonActivado && botonClickeado === 3 ? 
                            (3 === botonVerde ? 'boton-pregunta-seleccionado' : 'boton-pregunta-incorrecto') 
                            : ''
                        }`}
                        onClick={() => handleSeleccionarRespuesta(3)}
                        disabled={botonActivado}
                    >
                        Opción 3
                    </button>
                    
                    <button 
                        className={`boton-pregunta-sin-seleccionar ${
                          botonActivado && botonClickeado === 4 ? 
                            (4 === botonVerde ? 'boton-pregunta-seleccionado' : 'boton-pregunta-incorrecto') 
                            : ''
                        }`}
                        onClick={() => handleSeleccionarRespuesta(4)}
                        disabled={botonActivado}
                    >
                        Opción 4
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
              <p>¡Una pena!, La respuesta correcta era</p>
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