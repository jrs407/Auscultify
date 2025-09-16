import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import './EstadisticasIndividual.css';
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

const EstadisticasIndividual: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const usuario = (location.state as LocationState)?.usuario;
    const [selectedButton, setSelectedButton] = useState('estadisticas');
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

    return (
        <div className="fondo">
            <Sidebar 
                usuario={usuario} 
                selectedButton={selectedButton} 
                onButtonClick={handleButtonClick} 
            />
            <div className='segunda-mitad'>
                <div className='contenido-estadisticas-individual'>
                    <div className='contenedor-titulo-estadisticas-individual'>
                        <p>Estadísticas personales</p>
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

                        <div className='contenedor-dato-numerico-individual'>
                            <div className='contenedor-dato-numerico-individual-titulo'>
                                <p>Preguntas Falladas</p>
                            </div>

                            <div className='contenedor-dato-numerico-individual-valor'>
                                <p>{estadisticasAdicionales?.datosUsuario.totalPreguntasFalladas || 0}</p>
                            </div>
                        </div>

                        <div className='contenedor-dato-numerico-individual'>
                            <div className='contenedor-dato-numerico-individual-titulo'>
                                <p>Racha de días</p>
                            </div>

                            <div className='contenedor-dato-numerico-individual-valor'>
                                <p>{estadisticasAdicionales?.datosUsuario.racha || 0}</p>
                            </div>
                        </div>
                    </div>

                    <div className='contenedor-datos-numericos-grupo-inferior'>
                        <div className='contenedor-dato-numerico-individual'>
                            <div className='contenedor-dato-numerico-individual-titulo'>
                                <p>Promedio general</p>
                            </div>

                            <div className='contenedor-dato-numerico-individual-valor'>
                                <p>{estadisticasAdicionales?.porcentajeGeneral || 0}%</p>
                            </div>
                        </div>

                        <div className='contenedor-dato-numerico-individual'>
                            <div className='contenedor-dato-numerico-individual-titulo'>
                                <p>Mejor categoria</p>
                            </div>

                            <div className='contenedor-dato-numerico-individual-valor'>
                                <p style={{fontSize: '1.5vw', marginTop: '0.5vh'}}>{estadisticasAdicionales?.categoriaMasUsada ?? 'N/A'}</p>
                            </div>
                        </div>

                        <div className='contenedor-dato-numerico-individual'>
                            <div className='contenedor-dato-numerico-individual-titulo'>
                                <p style={{fontSize: '0.9vw'}}>Promedio mejor categoria</p>
                            </div>

                            <div className='contenedor-dato-numerico-individual-valor'>
                                <p>{estadisticasAdicionales?.porcentajeMejorCategoria || 0}%</p>
                            </div>
                        </div>

                        <div className='contenedor-dato-numerico-individual'>
                            <div className='contenedor-dato-numerico-individual-titulo'>
                                <p style={{fontSize: '0.9vw'}}>Promedio peor categoria</p>
                            </div>

                            <div className='contenedor-dato-numerico-individual-valor'>
                                <p>{estadisticasAdicionales?.porcentajePeorCategoria || 0}%</p>
                            </div>
                        </div>
                    </div>

                    <div className='contenedor-graficas'>
                        {estadisticasAdicionales && (
                            <>                    
                                <div className='grafica-container'>
                                    <h3>Tendencia de preguntas diarias</h3>
                                    <Line
                                        data={{
                                            labels: ['Día -6', 'Día -5', 'Día -4', 'Día -3', 'Día -2', 'Ayer', 'Hoy'],
                                            datasets: [
                                                {
                                                    label: 'Total de Preguntas',
                                                    data: estadisticasAdicionales.preguntasPor7Dias,
                                                    borderColor: '#FFD700',
                                                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                                                    borderWidth: 3,
                                                    fill: true,
                                                },
                                                {
                                                    label: 'Preguntas Acertadas',
                                                    data: estadisticasAdicionales.preguntasAcertadasPor7Dias,
                                                    borderColor: '#4CAF50',
                                                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                                    borderWidth: 3,
                                                    fill: false,
                                                },
                                                {
                                                    label: 'Preguntas Falladas',
                                                    data: estadisticasAdicionales.preguntasfalladasPor7Dias,
                                                    borderColor: '#F44336',
                                                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                                    borderWidth: 3,
                                                    fill: false,
                                                }
                                            ],
                                        }}
                                        options={{
                                            responsive: true,
                                            plugins: {
                                                legend: {
                                                    position: 'top' as const,
                                                    labels: {
                                                        color: '#ffffff',
                                                        font: {
                                                            size: 12
                                                        }
                                                    }
                                                },
                                                title: {
                                                    display: true,
                                                    text: 'Actividad diaria',
                                                    color: '#ffffff',
                                                    font: {
                                                        size: 14,
                                                        weight: 'bold'
                                                    }
                                                },
                                            },
                                            scales: {
                                                x: {
                                                    ticks: {
                                                        color: '#ffffff'
                                                    },
                                                    grid: {
                                                        color: 'rgba(255, 255, 255, 0.1)'
                                                    }
                                                },
                                                y: {
                                                    beginAtZero: true,
                                                    ticks: {
                                                        stepSize: 1,
                                                        color: '#ffffff'
                                                    },
                                                    grid: {
                                                        color: 'rgba(255, 255, 255, 0.1)'
                                                    }
                                                },
                                            },
                                        }}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
} 

export default EstadisticasIndividual;