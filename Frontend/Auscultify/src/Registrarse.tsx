import React from 'react';
import { useNavigate } from 'react-router-dom';
import './IniciarSesion.css';

const Registrarse: React.FC = () => {
    const navigate = useNavigate();
    const [usuario, setUsuario] = React.useState('');
    const [contrasena1, setContrasena1] = React.useState('');
    const [contrasena2, setContrasena2] = React.useState('');
    const [error] = React.useState('');

    const handleRegister = async () => {
        
    };

  return (
    <div className='fondo'>
        <div className='cuadro-central'>
            <div className='cuadro-central-titulo'>
                <p>Registrarse</p>
            </div>
            
            <div className='cuadro-central-texto-registro'>
                <p>Usuario</p>
                <input 
                    type="text" 
                    placeholder="Usuario" 
                    className='input'
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)} 
                />
                <p>Contraseña</p>
                <input 
                    type="password" 
                    placeholder="Contraseña" 
                    className='input'
                    value={contrasena1}
                    onChange={(e) => setContrasena1(e.target.value)}
                />
                <p>Confirmar contraseña</p>
                <input 
                    type="password" 
                    placeholder="Confirmar contraseña" 
                    className='input'
                    value={contrasena2}
                    onChange={(e) => setContrasena2(e.target.value)}
                />
                <button onClick={handleRegister}>Registrarse</button>         
            </div>
            
            <div className='cuadro-central-texto-registrarse'>
                <p onClick={() => navigate('/login')}>¿Ya tienes cuenta? <span>Inicia sesión</span></p>
            </div>
            
            {error && <p className='mensaje-error'>{error}</p>}
            
        </div>
    </div>
  );
};

export default Registrarse;
