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

const obtenerCategoriasHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;

    try {
        const [categorias]: any = await pool.execute(
            'SELECT idCategorias, nombreCategoria FROM Categorias ORDER BY nombreCategoria'
        );

        res.status(200).json({
            categorias: categorias,
            total: categorias.length
        });

    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};

app.get('/obtener-categorias', obtenerCategoriasHandler);

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
    console.log(`ObtenerCategorias service running on port ${PORT}`);
});
