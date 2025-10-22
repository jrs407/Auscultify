import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import './EstadisticasGrupal.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement
);

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
    usuarioSeleccionado?: {
        email: string;
    };
}

interface DatosUsuario {
  totalPreguntasAcertadas: number;
  totalPreguntasFalladas: number;
  totalPreguntasContestadas: number;
  racha: number;
}

interface EstadisticasResponse {
  categoriaMasUsada: string | null;
  porcentajeGeneral: number;
  porcentajeMejorCategoria: number;
  porcentajePeorCategoria: number;
  preguntasPor7Dias: number[];
  preguntasAcertadasPor7Dias: number[];
  preguntasfalladasPor7Dias: number[];
  datosUsuario: DatosUsuario;
}

const EstadisticasGrupal: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const usuario = (location.state as LocationState)?.usuario;
    const usuarioSeleccionado = (location.state as LocationState)?.usuarioSeleccionado;
    const [selectedButton, setSelectedButton] = useState('siguiendo');
    const [estadisticasAdicionales, setEstadisticasAdicionales] = useState<EstadisticasResponse | null>(null);

    React.useEffect(() => {
        if (!usuario) {
          navigate('/login');
        }
    }, [usuario, navigate]);

    useEffect(() => {
        const obtenerEstadisticasAdicionales = async () => {
            if (!usuario) return;
            
            try {
                const response = await fetch(`http://localhost:3015/estadisticas-usuario/${usuario.id}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('Preguntas por 7 días:', data.preguntasPor7Dias);
                    console.log('Preguntas acertadas por 7 días:', data.preguntasAcertadasPor7Dias);
                    console.log('Preguntas falladas por 7 días:', data.preguntasfalladasPor7Dias);
                    setEstadisticasAdicionales(data);
                } else {
                    console.error('Error al obtener estadísticas adicionales:', response.statusText);
                }
            } catch (error) {
                console.error('Error al obtener estadísticas adicionales:', error);
            }
        };

        obtenerEstadisticasAdicionales();
    }, [usuario]);

    const handleButtonClick = (buttonName: string) => {
        setSelectedButton(buttonName);
    };

    if (!usuario) return null;

    return (
        <div className="fondo">
            <Sidebar 
                usuario={usuario} 
                selectedButton={selectedButton} 
                onButtonClick={handleButtonClick} 
            />
            <div className='segunda-mitad'>
                <div className='contenido-estadisticas-individual'>
                    <div className='contenedor-titulo-estadisticas-grupal'>
                        <p>Estadísticas entre amigos</p>
                    </div>
                    <div className='contenedor-datos-numericos-grupo-superior'>
                        <div className='contenedor-dato-numerico-individual'>
                            <div className='contenedor-dato-numerico-individual-titulo'>
                                <p>Preguntas respondidas</p>
                            </div>

                            <div className='contenedor-dato-numerico-individual-valor'>
                                <p>{estadisticasAdicionales?.datosUsuario.totalPreguntasContestadas || 0}</p>
                            </div>
                        </div>

                        <div className='contenedor-dato-numerico-individual'>
                            <div className='contenedor-dato-numerico-individual-titulo'>
                                <p>Preguntas acertadas</p>
                            </div>

                            <div className='contenedor-dato-numerico-individual-valor'>
                                <p>{estadisticasAdicionales?.datosUsuario.totalPreguntasAcertadas || 0}</p>
                            </div>
                        </div>

                    </div>

                    <div className='contenedor-datos-numericos-grupo-inferior'>

                        <div className='contenedor-dato-numerico-individual'>
                            <div className='contenedor-dato-numerico-individual-titulo'>
                                <p>Racha de días</p>
                            </div>

                            <div className='contenedor-dato-numerico-individual-valor'>
                                <p>{estadisticasAdicionales?.datosUsuario.racha || 0}</p>
                            </div>
                        </div>

                        <div className='contenedor-dato-numerico-individual'>
                            <div className='contenedor-dato-numerico-individual-titulo'>
                                <p>Promedio general</p>
                            </div>

                            <div className='contenedor-dato-numerico-individual-valor'>
                                <p>{estadisticasAdicionales?.porcentajeGeneral || 0}%</p>
                            </div>
                        </div>

                    </div>

                    
                </div>
            </div>

        </div>
    );
} 

export default EstadisticasGrupal;