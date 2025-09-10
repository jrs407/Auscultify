import React, { useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Resultado.css';
import copaTrofeoIcon from './assets/copaTrofeoIcon.png';

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
  preguntasAcertadas: number;
  preguntasTotales: number;
  preguntas: { id: number }[];
  preguntasAcertadasIds: number[];
}

const Resultado: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    usuario, 
    preguntasAcertadas, 
    preguntasTotales, 
    preguntas, 
    preguntasAcertadasIds 
  } = (location.state as LocationState) || { 
    usuario: null, 
    preguntasAcertadas: 0, 
    preguntasTotales: 10, 
    preguntas: [], 
    preguntasAcertadasIds: [] 
  };

  const actualizarDatosUsuario = useCallback(async () => {
    if (!usuario || !preguntas || preguntas.length === 0) {
      console.log('No hay datos de usuario o preguntas para actualizar');
      return;
    }

    try {
      const preguntasResultados = preguntas.map(pregunta => ({
        id: pregunta.id,
        acertada: preguntasAcertadasIds.includes(pregunta.id)
      }));

      const response = await fetch('http://localhost:3015/actualizar-datos-usuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          usuarioId: parseInt(usuario.id),
          preguntasResultados: preguntasResultados
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Datos del usuario actualizados correctamente:', data);
      } else {
        console.error('Error al actualizar datos del usuario:', response.statusText);
      }
    } catch (error) {
      console.error('Error al actualizar datos del usuario:', error);
    }
  }, [usuario, preguntas, preguntasAcertadasIds]);

  useEffect(() => {
    actualizarDatosUsuario();
  }, [actualizarDatosUsuario]);

  const mensajeResultado = () => {
    if (preguntasAcertadas === preguntasTotales) {
      return "Has acertado todas las preguntas, ¡Felicidades!";
    }
    if (preguntasAcertadas < 5) {
      return `Has acertado ${preguntasAcertadas}/${preguntasTotales}, no te preocupes. ¡La próxima vez lo harás mejor!`;
    }
    return `¡Has acertado ${preguntasAcertadas}/${preguntasTotales}! ¡Felicidades!`;
  };

  const handleSalir = () => {
    navigate('/home', { state: { usuario } });
  };

  return (
    <div className="contenedor-resultado">
        <div className="contenedor-titulo-resultado">
            <p>{mensajeResultado()}</p>
        </div>

        {preguntasAcertadas >= 5 && (
          <div className="contenedor-trofeo-resultado">
              <img src={copaTrofeoIcon} alt="Trofeo" className="icono-trofeo-resultado" />
          </div>
        )}

        <div className="contenedor-salir-resultado">
            <button className='salir-resultado' onClick={handleSalir}>
                Volver
            </button>
        </div>
    </div>
  );
};

export default Resultado;
