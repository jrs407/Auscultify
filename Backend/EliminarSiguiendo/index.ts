import express from 'express';
import { Request, Response, NextFunction } from 'express';
import mysql, { Pool } from 'mysql2/promise';
import cors from 'cors';

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

const eliminarSiguiendoHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { emailSeguidor, emailSeguido } = req.body;

    if (!emailSeguidor || !emailSeguido) {
        return res.status(400).json({ mensaje: 'Email del seguidor y seguido son requeridos' });
    }

    try {
        const [seguidor]: any = await pool.execute(
            'SELECT idUsuario FROM Usuarios WHERE correoElectronico = ?',
            [emailSeguidor]
        );

        const [seguido]: any = await pool.execute(
            'SELECT idUsuario FROM Usuarios WHERE correoElectronico = ?',
            [emailSeguido]
        );

        const idSeguidor = seguidor[0].idUsuario;
        const idSeguido = seguido[0].idUsuario;

        await pool.execute(
            'DELETE FROM Usuarios_Seguidores WHERE idSeguidor = ? AND idSeguido = ?',
            [idSeguidor, idSeguido]
        );

        res.status(200).json({ mensaje: 'Has dejado de seguir al usuario exitosamente' });

    } catch (error) {
        console.error('Error al dejar de seguir usuario:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};

app.delete('/eliminar-siguiendo', eliminarSiguiendoHandler);

const PORT = process.env.PORT || 3008;
app.listen(PORT, () => {
    console.log(`EliminarSiguiendo service running on port ${PORT}`);
});
