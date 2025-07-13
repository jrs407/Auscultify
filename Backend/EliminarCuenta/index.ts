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

const eliminarCuentaHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { usuario, contrasena } = req.body as {
        usuario: string;
        contrasena: string;
    };

    try {
        // Verificar que el usuario existe y la contraseña es correcta
        const [rows]: any = await pool.execute(
            'SELECT * FROM Usuarios WHERE correoElectronico = ?',
            [usuario]
        );

        if (rows.length === 0) {
            res.status(401).json({ mensaje: 'Usuario no encontrado' });
            return;
        }

        const usuarioDb = rows[0];
        
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Eliminar respuestas del usuario
            await connection.execute(
                'DELETE FROM Usuarios_has_Preguntas WHERE Usuarios_idUsuario = ?',
                [usuarioDb.idUsuario]
            );

            // Eliminar relaciones de seguidores donde el usuario es seguidor
            await connection.execute(
                'DELETE FROM Usuarios_Seguidores WHERE idSeguidor = ?',
                [usuarioDb.idUsuario]
            );

            // Eliminar relaciones de seguidores donde el usuario es seguido
            await connection.execute(
                'DELETE FROM Usuarios_Seguidores WHERE idSeguido = ?',
                [usuarioDb.idUsuario]
            );

            // Finalmente eliminar el usuario
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
        console.error('Error al eliminar cuenta:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};

app.post('/eliminar-cuenta', eliminarCuentaHandler);

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
    console.log(`Eliminar cuenta service running on port ${PORT}`);
});
