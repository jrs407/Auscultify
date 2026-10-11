# Auscultify

🇪🇸 Español | [🇬🇧 English](README.en.md)

**Auscultify** es una aplicación web para entrenar el oído en la **auscultación médica**. El usuario escucha audios reales de sonidos cardíacos, pulmonares y abdominales y debe identificar de qué se trata eligiendo entre cuatro opciones. Un conjunto de algoritmos de recomendación decide qué preguntas mostrar en cada sesión según el historial del propio usuario y el de usuarios similares.

> 🎓 **Calificación obtenida: 9,4 / 10.**

---

## Índice

- [Qué ofrece](#qué-ofrece)
- [Más allá de la medicina](#más-allá-de-la-medicina)
- [Arquitectura](#arquitectura)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Cómo montarlo](#cómo-montarlo)
- [Añadir categorías y audios](#añadir-categorías-y-audios)
- [Algoritmos de selección de preguntas](#algoritmos-de-selección-de-preguntas)
- [Trabajo futuro](#trabajo-futuro)
- [Licencia](#licencia)

---

## Qué ofrece

- **Sesiones de preguntas**: cada sesión contiene 10 preguntas. Se reproduce un audio y se muestran 4 respuestas posibles (la correcta y tres distractores tomados de otras preguntas).
- **Algoritmos de recomendación**: 11 criterios distintos para elegir las preguntas, desde el aleatorio simple hasta el filtrado colaborativo basado en usuarios y en ítems (correlación de Pearson).
- **Estadísticas individuales**: aciertos, fallos, racha de días y tendencia de preguntas diarias.
- **Componente social**: perfiles públicos o privados, seguir a otros usuarios y comparar estadísticas con ellos (estadísticas grupales).
- **Gestión de perfil**: cambiar correo y contraseña, o eliminar la cuenta.
- **Panel de administración**: crear y eliminar categorías y preguntas (subiendo el audio y su respuesta) desde la propia interfaz.
- **Sincronización automática**: al arrancar, los audios de la carpeta [Audios/](Audios/) se cargan en la base de datos sin intervención manual.

## Más allá de la medicina

Aunque Auscultify está pensada para audios de medicina, su diseño es **genérico**: una pregunta es simplemente *un audio + su respuesta correcta*, agrupados en *categorías* que el administrador crea libremente. Nada en el código está atado al dominio médico.

Esto significa que la misma aplicación puede usarse en otros ámbitos con solo crear las categorías y subir los audios correspondientes, por ejemplo:

- **Idiomas**: identificar palabras, acentos o pronunciaciones.
- **Música**: reconocer acordes, intervalos, instrumentos o escalas.
- **Naturaleza**: identificar cantos de aves o sonidos de animales.
- **Mecánica / industria**: diagnosticar averías por el sonido de un motor o una máquina.
- **Seguridad / radio**: reconocer señales, alarmas o códigos sonoros.

Los algoritmos de recomendación, las estadísticas y el componente social funcionan igual en cualquiera de estos casos.

## Arquitectura

La aplicación sigue una arquitectura de **microservicios** orquestada con Docker Compose:

| Servicio | Tecnología | Puerto | Responsabilidad |
|---|---|---|---|
| `frontend` | React 19 + TypeScript + Vite | 5173 | Interfaz web (Chart.js para gráficas) |
| `database` | MySQL 8.0 | 3308 → 3306 | Persistencia; se inicializa con [BaseDatos/init.sql](BaseDatos/init.sql) |
| `sincronizar-datos` | Node.js + Express + TS | 3001 | Crea el admin y sincroniza categorías y audios con la BD |
| `gestion-autentificacion` | Node.js + Express + TS | 3002 | Registro e inicio de sesión (bcrypt) |
| `gestor-perfil-usuario` | Node.js + Express + TS | 3003 | Modificar perfil y eliminar cuenta |
| `gestion-siguiendo` | Node.js + Express + TS | 3004 | Usuarios públicos, seguir y dejar de seguir |
| `gestion-categoria` | Node.js + Express + TS | 3005 | Crear, listar y eliminar categorías |
| `gestionar-preguntas` | Node.js + Express + TS | 3012 | Crear (subida de audio), listar y eliminar preguntas |
| `obtener-algoritmos` | Node.js + Express + TS | 3013 | Lista de criterios de selección disponibles |
| `gestor-algoritmos` | Python 3.11 + Flask | 3014 | Ejecuta los algoritmos de recomendación |
| `gestor-datos-usuario-preguntas` | Node.js + Express + TS | 3015 | Guarda respuestas y calcula estadísticas |

Modelo de datos principal: `Usuarios`, `Categorias`, `Preguntas`, `Usuarios_has_Preguntas` (historial de respuestas), `Usuarios_Seguidores` y `CriterioAlgoritmo`.

## Estructura del repositorio

```
Auscultify/
├── Audios/                      # Banco de audios (montado como volumen en Docker)
│   ├── Abdominal/  Cardiaco/  Pulmonar/
│   ├── categorias.txt           # Una categoría por línea
│   └── rutaAudios.txt           # "Categoria/archivo.m4a|Respuesta" por línea
├── Backend/
│   ├── GestionAutentificacion/  # Cada servicio Node: index.ts, package.json, Dockerfile
│   ├── GestionCategoria/
│   ├── GestionPerfil/
│   ├── GestionSiguiendo/
│   ├── GestionarPreguntas/
│   ├── GestorDatosUsuarioPreguntas/
│   ├── ObtenerAlgoritmos/
│   ├── SincronizarDatos/
│   └── GestorAlgoritmos/        # Servicio Python: app.py + un fichero por algoritmo
├── BaseDatos/
│   └── init.sql                 # Esquema y criterios de algoritmo iniciales
├── Frontend/
│   └── Auscultify/              # App React (src/ contiene una vista por pantalla)
├── docker-compose.yaml
└── LICENSE
```

## Cómo montarlo

### Requisitos

- [Docker](https://www.docker.com/) y Docker Compose (incluido en Docker Desktop).
- Los puertos `5173`, `3001`–`3005`, `3012`–`3015` y `3308` libres.

### Puesta en marcha

```bash
git clone https://github.com/jrs407/Auscultify.git
cd Auscultify
docker compose up --build
```

La primera vez tarda unos minutos en construir las imágenes. Cuando MySQL esté listo, el servicio `sincronizar-datos` creará automáticamente el usuario administrador y cargará las categorías y audios de [Audios/](Audios/).

Abre **http://localhost:5173** en el navegador.

### Usuario administrador

| Correo | Contraseña |
|---|---|
| `admin@auscultify.com` | `admin` |

Desde el panel de administración se pueden gestionar categorías y preguntas. Para usar la app como estudiante, registra una cuenta nueva desde la pantalla de registro.

> ⚠️ Las credenciales de la base de datos, el `JWT_SECRET` y la contraseña del admin son valores de desarrollo definidos en [docker-compose.yaml](docker-compose.yaml) y [Backend/SincronizarDatos/index.ts](Backend/SincronizarDatos/index.ts). Cámbialos antes de desplegar en un entorno real.

### Parar y reiniciar

```bash
docker compose down        # Para los contenedores (los datos se conservan)
docker compose down -v     # Para y borra el volumen de MySQL (reinicio desde cero)
```

## Añadir categorías y audios

Hay dos formas:

1. **Desde el panel de administración** (recomendado): crea una categoría y sube un audio indicando su respuesta. El audio se guarda en `Audios/<Categoria>/` y se registra en `rutaAudios.txt` automáticamente.
2. **Manualmente**: copia el audio a `Audios/<Categoria>/`, añade la categoría a `categorias.txt` (si es nueva) y una línea a `rutaAudios.txt`:

   ```
   Cardiaco/SoploSistolico.m4a|Soplo sistólico
   ```

   Al reiniciar `sincronizar-datos` (o al abrir la pantalla de inicio de sesión, que también lanza la sincronización) los nuevos audios se insertan en la base de datos. La sincronización es idempotente: no duplica lo que ya existe.

> Se necesitan **al menos 4 preguntas** en total para poder generar las cuatro opciones de respuesta.

## Algoritmos de selección de preguntas

Implementados en [Backend/GestorAlgoritmos/](Backend/GestorAlgoritmos/). El usuario elige el criterio en la pantalla de inicio:

| # | Criterio | Descripción |
|---|---|---|
| 1 | Aleatorio simple | Preguntas al azar, sin tener en cuenta ningún historial. |
| 2 | Preguntas que no has hecho | Prioriza las preguntas nunca respondidas; si no quedan, las que llevan más tiempo sin hacerse. |
| 3 | Categoría concreta | Preguntas aleatorias de la categoría elegida. |
| 4 | Categoría que peor se te da | Preguntas de la categoría con peor porcentaje de acierto. |
| 5 | Categoría que mejor se te da | Preguntas de la categoría con mejor porcentaje de acierto. |
| 6 | Preguntas que tiendes a fallar | Repite las que has fallado, priorizando las más falladas. |
| 7 | Preguntas que tiendes a acertar | Repite las que has acertado, priorizando las más acertadas. |
| 8 | Usuarios similares fallan | Filtrado colaborativo basado en usuarios: lo que fallan usuarios parecidos a ti. |
| 9 | Usuarios similares aciertan | Filtrado colaborativo basado en usuarios: lo que aciertan usuarios parecidos a ti. |
| 10 | Ítems similares que se fallan | Filtrado colaborativo basado en ítems: preguntas que suelen fallarse juntas. |
| 11 | Ítems similares que se aciertan | Filtrado colaborativo basado en ítems: preguntas que suelen acertarse juntas. |

Cuando un algoritmo no tiene datos suficientes (por ejemplo, un usuario nuevo), la aplicación recurre a un algoritmo de respaldo para que la sesión siempre pueda empezar.

## Trabajo futuro

- **Soporte para imágenes**: el modelo pregunta–respuesta–categoría se puede ampliar para admitir imágenes además de audio (radiografías, electrocardiogramas, dermatología, histología…, o fuera de la medicina, cualquier tipo de reconocimiento visual). Esto convertiría Auscultify en una plataforma de entrenamiento perceptivo multimodal.
- Preguntas que combinen audio e imagen.
- Despliegue de producción (build estático del frontend, secretos fuera del repositorio, HTTPS).

## Licencia

Distribuido bajo licencia MIT. Consulta [LICENSE](LICENSE).
