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

// Handler para obtener usuarios públicos.
const obtenerUsuariosPublicosHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;

    // Datos de entrada.
    const { busqueda, usuarioActual } = req.query as { busqueda?: string; usuarioActual?: string };

    try {

        // Consulta base para obtener usuarios públicos, sin ningún filtro.
        let consulta = `SELECT Usuarios.correoElectronico AS email 
            FROM Usuarios
            WHERE esPublico = 1 `;

        // Variable para añadir condiciones a la consulta.
        let parametrosConsulta: any[] = [];

        // Si se proporciona el correo del usuario actual, se excluye de los resultados.
        if (usuarioActual?.trim() !== '') {

            consulta += ` AND Usuarios.correoElectronico != ? 
                AND Usuarios.idUsuario NOT IN (
                    SELECT us.idSeguido 
                    FROM Usuarios_Seguidores us 
                    JOIN Usuarios u_seguidor ON us.idSeguidor = u_seguidor.idUsuario 
                    WHERE u_seguidor.correoElectronico = ?
                )`;
            
            parametrosConsulta.push(usuarioActual, usuarioActual);
        }

        // Si se proporciona un término de búsqueda, se filtran los correos que contienen ese término.
        if (busqueda?.trim() !== '') {
            consulta += ` AND Usuarios.correoElectronico LIKE ?`;
            parametrosConsulta.push(`%${busqueda}%`);
        }

        // Se ejecuta la consulta.
        const [usuarios] = await pool.execute(consulta, parametrosConsulta);

        // Se devuelve la lista de usuarios encontrados.
        res.status(200).json({
            usuarios: usuarios,
            total: Array.isArray(usuarios) ? usuarios.length : 0
        });


    } catch (error) {
        console.error('Error al obtener usuarios públicos:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }

};


// Handler para seguir a un usuario.
const seguirUsuarioHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;

    // Datos de entrada.
    const { emailSeguidor, emailSeguido } = req.body as {
        emailSeguidor: string;
        emailSeguido: string;
    };

    try {

        // Buscar el ID del usuario seguidor.
        const [seguidor]: any = await pool.execute(
            'SELECT idUsuario FROM Usuarios WHERE correoElectronico = ?',
            [emailSeguidor]
        );

        // Si no se encuentra el usuario seguidor, devolver error.
        if (seguidor.length === 0) {
            res.status(404).json({ mensaje: 'Usuario seguidor no encontrado' });
            return;
        }

        // Buscar el ID del usuario a seguir.
        const [seguido]: any = await pool.execute(
            'SELECT idUsuario, esPublico FROM Usuarios WHERE correoElectronico = ?',
            [emailSeguido]
        );

        // Si no se encuentra el usuario a seguir, devolver error.
        if (seguido.length === 0) {
            res.status(404).json({ mensaje: 'Usuario a seguir no encontrado' });
            return;
        }


        // Obtener los IDs de ambos usuarios.
        const idSeguidor = seguidor[0].idUsuario;
        const idSeguido = seguido[0].idUsuario;

        // Verificar que el usuario a seguir es público, si no lo es, devolver error.
        if (!seguido[0].esPublico) {
            res.status(403).json({ mensaje: 'No puedes seguir a un usuario privado' });
            return;
        }


        // Verificar que no se está tratando de seguir a uno mismo.
        if (idSeguidor === idSeguido) {
            res.status(400).json({ mensaje: 'No puedes seguirte a ti mismo' });
            return;
        }


        // Verificar que no se está tratando de seguir a un usuario que ya se sigue.
        const [seguimientoExistente]: any = await pool.execute(
            'SELECT * FROM Usuarios_Seguidores WHERE idSeguidor = ? AND idSeguido = ?',
            [idSeguidor, idSeguido]
        );

        // Si ya existe el seguimiento, devolver error.
        if (seguimientoExistente.length > 0) {
            res.status(400).json({ mensaje: 'Ya estás siguiendo a este usuario' });
            return;
        }

        // Insertar el nuevo seguimiento en la base de datos.
        await pool.execute(
            'INSERT INTO Usuarios_Seguidores (idSeguidor, idSeguido) VALUES (?, ?)',
            [idSeguidor, idSeguido]
        );

        res.status(201).json({ mensaje: 'Usuario seguido correctamente' });

    } catch (error) {
        console.error('Error al seguir usuario:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
}

// Handler para obtener los usuarios que un usuario sigue.
const obtenerSiguiendoHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;

    // Datos de entrada.
    const { email } = req.query as { email: string };

    try {

        // Buscar los usuarios que el usuario con el correo proporcionado sigue.
        const [siguiendo]: any = await pool.execute(
            `SELECT u_seguido.correoElectronico as email 
             FROM Usuarios_Seguidores us 
             JOIN Usuarios u_seguidor ON us.idSeguidor = u_seguidor.idUsuario 
             JOIN Usuarios u_seguido ON us.idSeguido = u_seguido.idUsuario 
             WHERE u_seguidor.correoElectronico = ? AND u_seguido.esPublico = 1
             ORDER BY u_seguido.correoElectronico`,
            [email]
        );

        // Devolver la lista de usuarios seguidos.
        res.status(200).json({
            siguiendo: siguiendo,
            total: siguiendo.length
        });

    } catch (error) {
        console.error('Error al obtener usuarios seguidos:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};

// Handler para dejar de seguir a un usuario.
const eliminarSiguiendoHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;

    // Datos de entrada.
    const { emailSeguidor, emailSeguido } = req.body;

    // Validar que se proporcionen ambos correos.
    if (!emailSeguidor || !emailSeguido) {
        return res.status(400).json({ mensaje: 'Email del seguidor y seguido son requeridos' });
    }

    try {

        // Buscar el ID del usuario seguidor.
        const [seguidor]: any = await pool.execute(
            'SELECT idUsuario FROM Usuarios WHERE correoElectronico = ?',
            [emailSeguidor]
        );

        // Si no se encuentra el usuario seguidor, devolver error.
        if (seguidor.length === 0) {
            res.status(404).json({ mensaje: 'Usuario seguidor no encontrado' });
            return;
        }

        // Buscar el ID del usuario a dejar de seguir.
        const [seguido]: any = await pool.execute(
            'SELECT idUsuario FROM Usuarios WHERE correoElectronico = ?',
            [emailSeguido]
        );

        // Si no se encuentra el usuario a seguir, devolver error.
        if (seguido.length === 0) {
            res.status(404).json({ mensaje: 'Usuario a seguir no encontrado' });
            return;
        }

        // Obtener los IDs de ambos usuarios.
        const idSeguidor = seguidor[0].idUsuario;
        const idSeguido = seguido[0].idUsuario;

        // Verificar que no se está tratando de seguir a un usuario que ya se sigue.
        const [seguimientoExistente]: any = await pool.execute(
            'SELECT * FROM Usuarios_Seguidores WHERE idSeguidor = ? AND idSeguido = ?',
            [idSeguidor, idSeguido]
        );

        // Si no existe el seguimiento, devolver error.
        if (seguimientoExistente.length === 0) {
            res.status(400).json({ mensaje: 'No estás siguiendo a este usuario' });
            return;
        }

        // Eliminar el seguimiento de la base de datos.
        await pool.execute(
            'DELETE FROM Usuarios_Seguidores WHERE idSeguidor = ? AND idSeguido = ?',
            [idSeguidor, idSeguido]
        );

        res.status(200).json({ mensaje: 'Has dejado de seguir al usuario exitosamente' });


    } catch (error) {
        console.error('Error al dejar de seguir usuario:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
}

app.get('/obtener-usuarios-publicos', obtenerUsuariosPublicosHandler);
app.post('/seguir', seguirUsuarioHandler);
app.get('/obtener-siguiendo', obtenerSiguiendoHandler);
app.delete('/eliminar-siguiendo', eliminarSiguiendoHandler);

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
    console.log(`GestionSiguiendo service running on port ${PORT}`);
});
