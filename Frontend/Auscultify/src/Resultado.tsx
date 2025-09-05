import React from 'react';
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
}

const Resultado: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, preguntasAcertadas, preguntasTotales } = (location.state as LocationState) || { usuario: null, preguntasAcertadas: 0, preguntasTotales: 10 };

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
