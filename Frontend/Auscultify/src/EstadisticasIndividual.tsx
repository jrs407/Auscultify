import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import './EstadisticasIndividual.css';

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

const EstadisticasIndividual: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const usuario = (location.state as LocationState)?.usuario;
    const [selectedButton, setSelectedButton] = useState('estadisticas');

    React.useEffect(() => {
        if (!usuario) {
          navigate('/login');
        }
    }, [usuario, navigate]);

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
                <h1>Estadísticas Individual</h1>
            </div>

        </div>
    );
} 

export default EstadisticasIndividual;