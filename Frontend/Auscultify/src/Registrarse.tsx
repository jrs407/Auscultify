import React from 'react';
import { useNavigate } from 'react-router-dom';
import './IniciarSesion.css';

const Registrarse: React.FC = () => {
    const navigate = useNavigate();

    // Campos de texto del formulario.
    const [usuario, setUsuario] = React.useState('');
    const [contrasena1, setContrasena1] = React.useState('');
    const [contrasena2, setContrasena2] = React.useState('');

    // Mensaje de error.
    const [error, setError] = React.useState('');

    // Llamada al endpoint del backend para registrar un nuevo usuario.
    const handleRegister = async () => {
        try {

            // Comprobación básica de que los campos no estén vacíos.
            if (!usuario || !contrasena1 || !contrasena2) {
                setError('Todos los campos son obligatorios');
                return;
            }

            // Llamada al endpoint del backend.
            const response = await fetch('http://localhost:3002/registrarse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    usuario,
                    contrasena1,
                    contrasena2
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.mensaje);
                return;
            }

            // Navega a /home pasando los datos del usuario en el state
            navigate('/home', { state: { usuario: data.usuario } });

        } catch {
            setError('Error al conectar con el servidor');
        }
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
