# Auscultify

[🇪🇸 Español](README.md) | 🇬🇧 English

**Auscultify** is a web application for training your ear in **medical auscultation**. Users listen to real recordings of heart, lung and abdominal sounds and must identify each one by choosing among four options. A set of recommendation algorithms decides which questions to show in each session, based on the user's own history and that of similar users.

> 🎓 **Grade obtained: 9.4 / 10.**

---

## Table of contents

- [Features](#features)
- [Beyond medicine](#beyond-medicine)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
- [Adding categories and audio files](#adding-categories-and-audio-files)
- [Question selection algorithms](#question-selection-algorithms)
- [Future work](#future-work)
- [License](#license)

---

## Features

- **Question sessions**: each session has 10 questions. An audio clip plays and 4 possible answers are shown (the correct one plus three distractors taken from other questions).
- **Recommendation algorithms**: 11 different criteria for choosing questions, from simple random selection to user-based and item-based collaborative filtering (Pearson correlation).
- **Individual statistics**: correct and wrong answers, daily streak and daily question trend.
- **Social features**: public or private profiles, following other users and comparing statistics with them (group statistics).
- **Profile management**: change email and password, or delete the account.
- **Admin panel**: create and delete categories and questions (uploading the audio and its answer) from the UI.
- **Automatic sync**: on startup, the audio files in [Audios/](Audios/) are loaded into the database with no manual steps.

## Beyond medicine

Although Auscultify is designed for medical audio, its design is **generic**: a question is simply *an audio clip + its correct answer*, grouped into *categories* that the administrator creates freely. Nothing in the code is tied to the medical domain.

This means the same application can be used in other fields just by creating the categories and uploading the matching audio, for example:

- **Languages**: identifying words, accents or pronunciations.
- **Music**: recognising chords, intervals, instruments or scales.
- **Nature**: identifying bird songs or animal sounds.
- **Mechanics / industry**: diagnosing faults from the sound of an engine or machine.
- **Security / radio**: recognising signals, alarms or audio codes.

The recommendation algorithms, statistics and social features work the same way in all of these cases.

## Architecture

The application uses a **microservice** architecture orchestrated with Docker Compose:

| Service | Technology | Port | Responsibility |
|---|---|---|---|
| `frontend` | React 19 + TypeScript + Vite | 5173 | Web UI (Chart.js for charts) |
| `database` | MySQL 8.0 | 3308 → 3306 | Persistence; initialised from [BaseDatos/init.sql](BaseDatos/init.sql) |
| `sincronizar-datos` | Node.js + Express + TS | 3001 | Creates the admin and syncs categories and audio with the DB |
| `gestion-autentificacion` | Node.js + Express + TS | 3002 | Sign-up and login (bcrypt) |
| `gestor-perfil-usuario` | Node.js + Express + TS | 3003 | Edit profile and delete account |
| `gestion-siguiendo` | Node.js + Express + TS | 3004 | Public users, follow and unfollow |
| `gestion-categoria` | Node.js + Express + TS | 3005 | Create, list and delete categories |
| `gestionar-preguntas` | Node.js + Express + TS | 3012 | Create (audio upload), list and delete questions |
| `obtener-algoritmos` | Node.js + Express + TS | 3013 | List of available selection criteria |
| `gestor-algoritmos` | Python 3.11 + Flask | 3014 | Runs the recommendation algorithms |
| `gestor-datos-usuario-preguntas` | Node.js + Express + TS | 3015 | Stores answers and computes statistics |

Main data model: `Usuarios` (users), `Categorias` (categories), `Preguntas` (questions), `Usuarios_has_Preguntas` (answer history), `Usuarios_Seguidores` (followers) and `CriterioAlgoritmo` (algorithm criteria).

## Repository structure

```
Auscultify/
├── Audios/                      # Audio bank (mounted as a Docker volume)
│   ├── Abdominal/  Cardiaco/  Pulmonar/
│   ├── categorias.txt           # One category per line
│   └── rutaAudios.txt           # "Category/file.m4a|Answer" per line
├── Backend/
│   ├── GestionAutentificacion/  # Each Node service: index.ts, package.json, Dockerfile
│   ├── GestionCategoria/
│   ├── GestionPerfil/
│   ├── GestionSiguiendo/
│   ├── GestionarPreguntas/
│   ├── GestorDatosUsuarioPreguntas/
│   ├── ObtenerAlgoritmos/
│   ├── SincronizarDatos/
│   └── GestorAlgoritmos/        # Python service: app.py + one file per algorithm
├── BaseDatos/
│   └── init.sql                 # Schema and initial algorithm criteria
├── Frontend/
│   └── Auscultify/              # React app (src/ has one view per screen)
├── docker-compose.yaml
└── LICENSE
```

## Getting started

### Requirements

- [Docker](https://www.docker.com/) and Docker Compose (included with Docker Desktop).
- Ports `5173`, `3001`–`3005`, `3012`–`3015` and `3308` free.

### Run it

```bash
git clone https://github.com/jrs407/Auscultify.git
cd Auscultify
docker compose up --build
```

The first build takes a few minutes. Once MySQL is ready, the `sincronizar-datos` service automatically creates the admin user and loads the categories and audio from [Audios/](Audios/).

Open **http://localhost:5173** in your browser.

### Admin user

| Email | Password |
|---|---|
| `admin@auscultify.com` | `admin` |

Categories and questions can be managed from the admin panel. To use the app as a student, create a new account from the sign-up screen.

> ⚠️ The database credentials, `JWT_SECRET` and admin password are development values defined in [docker-compose.yaml](docker-compose.yaml) and [Backend/SincronizarDatos/index.ts](Backend/SincronizarDatos/index.ts). Change them before deploying to a real environment.

### Stop and reset

```bash
docker compose down        # Stop the containers (data is kept)
docker compose down -v     # Stop and delete the MySQL volume (fresh start)
```

## Adding categories and audio files

There are two ways:

1. **From the admin panel** (recommended): create a category and upload an audio file with its answer. The file is saved to `Audios/<Category>/` and registered in `rutaAudios.txt` automatically.
2. **Manually**: copy the audio file to `Audios/<Category>/`, add the category to `categorias.txt` (if it is new) and add a line to `rutaAudios.txt`:

   ```
   Cardiaco/SystolicMurmur.m4a|Systolic murmur
   ```

   When `sincronizar-datos` restarts (or when the login screen is opened, which also triggers a sync) the new audio files are inserted into the database. Syncing is idempotent: it never duplicates existing entries.

> At least **4 questions** in total are needed to generate the four answer options.

## Question selection algorithms

Implemented in [Backend/GestorAlgoritmos/](Backend/GestorAlgoritmos/). Users pick the criterion on the home screen (the names below are translated; the UI is in Spanish):

| # | Criterion | Description |
|---|---|---|
| 1 | Simple random | Random questions, ignoring any history. |
| 2 | Questions you haven't done | Prioritises never-answered questions; if none remain, those not answered for the longest time. |
| 3 | Specific category | Random questions from the chosen category. |
| 4 | Your weakest category | Questions from the category with your lowest success rate. |
| 5 | Your strongest category | Questions from the category with your highest success rate. |
| 6 | Questions you tend to fail | Repeats questions you got wrong, most-failed first. |
| 7 | Questions you tend to get right | Repeats questions you got right, most-correct first. |
| 8 | Similar users fail | User-based collaborative filtering: what users like you get wrong. |
| 9 | Similar users get right | User-based collaborative filtering: what users like you get right. |
| 10 | Similar items failed | Item-based collaborative filtering: questions that tend to be failed together. |
| 11 | Similar items answered correctly | Item-based collaborative filtering: questions that tend to be answered correctly together. |

When an algorithm does not have enough data (for example, for a new user), the app falls back to another algorithm so a session can always start.

## Future work

- **Image support**: the question–answer–category model can be extended to support images as well as audio (X-rays, ECGs, dermatology, histology…, or outside medicine, any kind of visual recognition task). This would turn Auscultify into a multimodal perceptual training platform.
- Questions that combine audio and images.
- Production deployment (static frontend build, secrets kept out of the repository, HTTPS).

## License

Distributed under the MIT License. See [LICENSE](LICENSE).
