import express from 'express';
import { Request, Response, NextFunction } from 'express';
import mysql, { Pool } from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcryptjs';

const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});
app.use(express.json());

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'mydb',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).db = pool;
    next();
});

// Handler para el inicio de sesión de usuarios.
const iniciarSesionHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;

    // Datos de entrada.
    const { usuario, contrasena } = req.body as { 
        usuario: string; 
        contrasena: string
     };

     // Se valida que el formato del correo sea uno valido.
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(usuario)) {
        res.status(400).json({ mensaje: 'Te has equivocado a la hora de introducir el correo.' });
        return;
    }

    try {

        // Se busca el usuario en la base de datos.
        const [buscarUsuarios]: any = await pool.execute(
            'SELECT * FROM Usuarios WHERE correoElectronico = ?',
            [usuario]
        );

        // Si no existe el usuario, se devuelve un error.
        if (buscarUsuarios.length === 0) {
            res.status(401).json({ mensaje: 'Usuario no encontrado' });
            return;
        }

        // Guardamos el usuario encontrado en una variable.
        const usuarioEncontrado = buscarUsuarios[0];

        // Se compara la contraseña introducida con la almacenada en la base de datos.
        const contrasenaValida = await bcrypt.compare(contrasena, usuarioEncontrado.contrasena);

        // Si la contraseña no es correcta, se devuelve un error.
        if (!contrasenaValida) {
            res.status(401).json({ mensaje: 'Contraseña incorrecta' });
            return;
        }

        // Si todo es correcto, se devuelve el usuario.
        res.status(200).json({
            usuario: {
                id: usuarioEncontrado.idUsuario,
                email: usuarioEncontrado.correoElectronico,
                totalPreguntasAcertadas: usuarioEncontrado.totalPreguntasAcertadas,
                totalPreguntasFalladas: usuarioEncontrado.totalPreguntasFalladas,
                totalPreguntasContestadas: usuarioEncontrado.totalPreguntasContestadas,
                racha: usuarioEncontrado.racha,
                ultimoDiaPregunta: usuarioEncontrado.ultimoDiaPregunta,
                esPublico: usuarioEncontrado.esPublico,
                idCriterioMasUsado: usuarioEncontrado.idCriterioMasUsado
            }
        });

    } catch (error) {
        console.error('Error en la gestión de autentificación:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};



// Handler para el registro de nuevos usuarios.
const registrarseHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;

    // Datos de entrada.
    const { usuario, contrasena1, contrasena2 } = req.body as { 
        usuario: string;
        contrasena1: string;
        contrasena2: string;
    };

    // Se valida que el formato del correo sea uno valido.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(usuario)) {
        res.status(400).json({ mensaje: 'Dirección de correo electrónico no válida' });
        return;
    }

    try {

        // Se comrpueba que las contraseñas coincidan, para asegurar que el usuario no se ha equivocado.
        if (contrasena1 !== contrasena2) {
            res.status(400).json({ mensaje: 'Las contraseñas no coinciden' });
            return;
        }

        // Se comprueba si ya existe un usuario con el mismo correo.
        const [usuarioRepetido]: any = await pool.execute(
            'SELECT * FROM Usuarios WHERE correoElectronico = ?',
            [usuario]
        );

        if (usuarioRepetido.length > 0) {
            res.status(400).json({ mensaje: 'El usuario ya existe' });
            return;
        }

        // Aqui ya sabemos que el usuario no existe y que las contraseñas coinciden.
        // Se encripta la contraseña para guardarla de forma segura.
        const salt = await bcrypt.genSalt(10);
        const contrasenaEncriptada = await bcrypt.hash(contrasena1, salt);

        // Se inserta el usuario en la base de datos.
        const [usuarioRegistrado]: any = await pool.execute(
            `INSERT INTO Usuarios (
                correoElectronico, contrasena, totalPreguntasAcertadas,
                totalPreguntasFalladas, totalPreguntasContestadas, racha,
                esPublico, idCriterioMasUsado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                usuario, contrasenaEncriptada, 0,
                0, 0, 0,
                1, 1
            ]
        );

        res.status(200).json({
            usuario: {
                id: usuarioRegistrado,
                email: usuario,
                totalPreguntasAcertadas: 0,
                totalPreguntasFalladas: 0,
                totalPreguntasContestadas: 0,
                racha: 0,
                ultimoDiaPregunta: null,
                esPublico: 1,
                idCriterioMasUsado: 0
            }
        });

    } catch (error) {
        console.error('Error en la gestión de autentificación:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};

app.post('/registrarse', registrarseHandler);
app.post('/login', iniciarSesionHandler);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`GestionAutentificacion service running on port ${PORT}`);
});
