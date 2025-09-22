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

// Handler para eliminar la cuenta del usuario.
const eliminarCuentaHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;

    // Datos de entrada.
    const { usuario, contrasena } = req.body as {
        usuario: string;
        contrasena: string;
    };

    try {

        // Verificar que el usuario existe.
        const [rows]: any = await pool.execute(
            'SELECT * FROM Usuarios WHERE correoElectronico = ?',
            [usuario]
        );

        // Si no se encuentra el usuario o la contraseña es incorrecta, devuelve un error.
        if (rows.length === 0) {
            res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos' });
            return;
        }

        // Si el usuario y la contraseña son correctos, se procede a eliminar los datos asociados al usuario.
        const usuarioDb = rows[0];
        
        // Se inicia una transacción para asegurar la integridad de los datos.
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Se eliminan las respuestas del usuario.
            await connection.execute(
                'DELETE FROM Usuarios_has_Preguntas WHERE Usuarios_idUsuario = ?',
                [usuarioDb.idUsuario]
            );

            // Se elimina el usuario de los seguidores y seguidos.
            await connection.execute(
                'DELETE FROM Usuarios_Seguidores WHERE idSeguidor = ?',
                [usuarioDb.idUsuario]
            );

            await connection.execute(
                'DELETE FROM Usuarios_Seguidores WHERE idSeguido = ?',
                [usuarioDb.idUsuario]
            );

            // Se elimina el usuario.
            await connection.execute(
                'DELETE FROM Usuarios WHERE idUsuario = ?',
                [usuarioDb.idUsuario]
            );
            
            await connection.commit();
            connection.release();

            res.json({ mensaje: 'Cuenta eliminada exitosamente' });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Error al eliminar la cuenta:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};


// Handler para modificar el perfil del usuario.
const modificarPerfilHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;

    // Datos de entrada.
    const { userId, esPublico, nuevaContrasena, nuevoCorreo } = req.body as {
        userId: number;
        esPublico?: boolean;
        nuevaContrasena?: string;
        nuevoCorreo?: string;
    };

    try {

        // Si se ha proporcionado un correo nuevo, se valida y actualiza.
        if (nuevoCorreo) {

            // Validacion del formato del correo.
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(nuevoCorreo)) {
                res.status(400).json({ mensaje: 'Dirección de correo electrónico no válida' });
                return;
            }

            // Se comprueba que el correo no esté ya en uso por otro usuario.
            const [usuarioConDatosCoincidentes] : any = await pool.execute(
                'SELECT idUsuario FROM Usuarios WHERE correoElectronico = ? AND idUsuario != ?',
                [nuevoCorreo, userId]
            );

            // Si ya existe otro usuario con ese correo, se devuelve un error.
            if (usuarioConDatosCoincidentes.length > 0) {
                res.status(400).json({ mensaje: 'El correo electrónico ya está en uso' });
                return;
            }

            // Se actualiza el correo del usuario.
            await pool.execute(
                'UPDATE Usuarios SET correoElectronico = ? WHERE idUsuario = ?',
                [nuevoCorreo, userId]
            );

        }

        // Si se ha proporcionado una nueva contraseña, se encripta y actualiza.
        if (nuevaContrasena) {
            const salt = await bcrypt.genSalt(10);
            const contrasenaEncriptada = await bcrypt.hash(nuevaContrasena, salt);

            await pool.execute(
                'UPDATE Usuarios SET contrasena = ? WHERE idUsuario = ?',
                [contrasenaEncriptada, userId]
            );

        }

        // Si se ha proporcionado un nuevo estado de privacidad, se actualiza.
        if (esPublico !== undefined) {
            await pool.execute(
                'UPDATE Usuarios SET esPublico = ? WHERE idUsuario = ?',
                [esPublico ? 1 : 0, userId]
            );
        }


        // Una vez hemos terminado de actualizar con todos los datos, se vuelve a obtener el usuario actualizado.
        const [usuarioActualizado]: any = await pool.execute(
            'SELECT * FROM Usuarios WHERE idUsuario = ?',
            [userId]
        );

        // Si se ha encontrado el usuario, se devuelve el usuario actualizado.
        if (usuarioActualizado.length > 0) {
            const usuario = usuarioActualizado[0];
            res.json({
                mensaje: 'Perfil actualizado correctamente',
                usuario: {
                    id: usuario.idUsuario,
                    email: usuario.correoElectronico,
                    totalPreguntasAcertadas: usuario.totalPreguntasAcertadas,
                    totalPreguntasFalladas: usuario.totalPreguntasFalladas,
                    totalPreguntasContestadas: usuario.totalPreguntasContestadas,
                    racha: usuario.racha,
                    ultimoDiaPregunta: usuario.ultimoDiaPregunta,
                    esPublico: usuario.esPublico,
                    idCriterioMasUsado: usuario.idCriterioMasUsado
                }
            });
        } else {
            res.json({ mensaje: 'Perfil actualizado correctamente' });
        }

    } catch (error) {
        console.error('Error al modificar el perfil:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};

app.put('/modificar-perfil', modificarPerfilHandler);

app.post('/eliminar-cuenta', eliminarCuentaHandler);

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`GestionPerfil service running on port ${PORT}`);
});
