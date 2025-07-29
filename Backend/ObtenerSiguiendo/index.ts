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

const obtenerSiguiendoHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { email } = req.query as { email: string };

    try {

        const [siguiendo]: any = await pool.execute(
            `SELECT u_seguido.correoElectronico as email 
             FROM Usuarios_Seguidores us 
             JOIN Usuarios u_seguidor ON us.idSeguidor = u_seguidor.idUsuario 
             JOIN Usuarios u_seguido ON us.idSeguido = u_seguido.idUsuario 
             WHERE u_seguidor.correoElectronico = ? AND u_seguido.esPublico = 1
             ORDER BY u_seguido.correoElectronico`,
            [email]
        );

        res.status(200).json({
            siguiendo: siguiendo,
            total: siguiendo.length
        });

    } catch (error) {
        console.error('Error al obtener usuarios seguidos:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};

app.get('/obtener-siguiendo', obtenerSiguiendoHandler);

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
    console.log(`ObtenerSiguiendo service running on port ${PORT}`);
});
