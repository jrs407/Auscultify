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

const obtenerUsuariosPublicosHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { busqueda, usuarioActual } = req.query as { busqueda?: string; usuarioActual?: string };

    try {
        let query = `SELECT u.correoElectronico as email 
            FROM Usuarios u
            WHERE u.esPublico = 1`;
        
        let queryParams: any[] = [];

        if (usuarioActual && usuarioActual.trim() !== '') {
            query += ` AND u.correoElectronico != ?`;
            queryParams.push(usuarioActual);
        }

        if (usuarioActual && usuarioActual.trim() !== '') {
            query += ` AND u.idUsuario NOT IN (
                SELECT us.idSeguido 
                FROM Usuarios_Seguidores us 
                JOIN Usuarios u_seguidor ON us.idSeguidor = u_seguidor.idUsuario 
                WHERE u_seguidor.correoElectronico = ?
            )`;
            queryParams.push(usuarioActual);
        }

        if (busqueda && busqueda.trim() !== '') {
            query += ` AND u.correoElectronico LIKE ?`;
            queryParams.push(`${busqueda}%`);
        }

        const [usuarios] = await pool.execute(query, queryParams);

        res.status(200).json({
            usuarios: usuarios,
            total: Array.isArray(usuarios) ? usuarios.length : 0
        });

    } catch (error) {
        console.error('Error al obtener usuarios públicos:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};

app.get('/obtener-usuarios-publicos', obtenerUsuariosPublicosHandler);

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`ObtenerUsuariosPublicos service running on port ${PORT}`);
});
