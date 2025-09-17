import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './IniciarSesion.css';

const IniciarSesion: React.FC = () => {
  const navigate = useNavigate();

  // Campos de texto del formulario.
  const [usuario, setUsuario] = React.useState('');
  const [contrasena, setContrasena] = React.useState('');

  // Mensaje de error.
  const [error, setError] = React.useState('');

  // Variable para asegurar que la sincronización solo se ejecuta una vez.
  const ejecutado = useRef<boolean>(false);


  React.useEffect(() => {

    // Llamada al endpoint del backend para sincronizar datos.
    const sincronizarDatos = async () => {

      // Si ya se ha ejecutado, no hacer nada.
      if (ejecutado.current) {
        return;
      }

      ejecutado.current = true;

      try {
        await fetch('http://localhost:3001/sincronizar-datos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ email: 'system' })
        });
      } catch (error) {
        console.log('Error al sincronizar datos:', error);
      }
    };

    // Ejecutar la sincronización de datos.
    sincronizarDatos();
  }, []);

  // Llamada al endpoint del backend para iniciar sesión.
  const handleLogin = async () => {

    // Reseteamos el mensaje de error.
    setError('');
    try {
      const response = await fetch('http://localhost:3002/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ usuario, contrasena })
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.mensaje || 'Error al iniciar sesión');
        return;
      }

      const data = await response.json();

      // Navega a /home pasando los datos del usuario en el state
      navigate('/home', { state: { usuario: data.usuario } });
      
    } catch {
      setError('No se pudo conectar con el servidor');
    }
  };

  return (
    <div className='fondo'>
        <div className='cuadro-central'>
            <div className='cuadro-central-titulo'>
                <p>Inicia sesión</p>
            </div>
            
            <div className='cuadro-central-texto-inicio'>
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
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                />
                <button onClick={handleLogin}>Inicia sesión</button>
            </div>
            
            <div className='cuadro-central-texto-registrarse'>
                <p onClick={() => navigate('/Registrarse')}>¿No tienes cuenta? <span>¡Regístrate con nosotros!</span></p>
            </div>

            {error && <p className='mensaje-error'>{error}</p>}
        </div>
    </div>
  );
};

export default IniciarSesion;
