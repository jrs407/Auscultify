import random
import mysql.connector
import os

class PreguntasMasAcertadasPasado:
    def __init__(self):
        self.nombre = "PreguntasMasAcertadasPasado"
        self.descripcion = "Te pone preguntas que has acertado previamente en el pasado priorizando las que mas aciertas."
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', 'root'),
            'database': os.getenv('DB_NAME', 'mydb'),
            'port': int(os.getenv('DB_PORT', 3306))
        }
    
    def get_db_connection(self):
        return mysql.connector.connect(**self.db_config)
    
    def obtener_preguntas_mas_acertadas(self, usuario_id):
        """Obtiene las preguntas que el usuario ha acertado más frecuentemente"""
        try:
            connection = self.get_db_connection()
            cursor = connection.cursor(dictionary=True)
            
            query = """
                SELECT 
                    p.idPregunta,
                    p.urlAudio,
                    p.respuestaCorrecta,
                    p.Categorias_idCategorias,
                    COUNT(*) as total_intentos,
                    SUM(CASE WHEN uhp.respuestaCorrecta = 1 THEN 1 ELSE 0 END) as total_aciertos,
                    SUM(CASE WHEN uhp.respuestaCorrecta = 0 THEN 1 ELSE 0 END) as total_fallos,
                    (SUM(CASE WHEN uhp.respuestaCorrecta = 1 THEN 1 ELSE 0 END) / COUNT(*)) as tasa_acierto,
                    MAX(uhp.fechaDeContestacion) as ultima_fecha
                FROM Usuarios_has_Preguntas uhp
                INNER JOIN Preguntas p ON uhp.Preguntas_idPregunta = p.idPregunta
                WHERE uhp.Usuarios_idUsuario = %s
                GROUP BY p.idPregunta, p.urlAudio, p.respuestaCorrecta, p.Categorias_idCategorias
                HAVING SUM(CASE WHEN uhp.respuestaCorrecta = 1 THEN 1 ELSE 0 END) > 0
                ORDER BY tasa_acierto DESC, total_aciertos DESC, ultima_fecha ASC
                LIMIT 50
            """
            cursor.execute(query, (usuario_id,))
            preguntas_acertadas = cursor.fetchall()
            
            cursor.close()
            connection.close()
            
            return preguntas_acertadas
            
        except mysql.connector.Error as db_error:
            raise Exception(f'Error de base de datos al obtener preguntas acertadas: {str(db_error)}')
    
    def ejecutar(self, data):
        try:
            if not data or 'usuario_id' not in data:
                return {
                    'estado': 'error',
                    'mensaje': 'Se debe proporcionar usuario_id en los datos de entrada'
                }
            
            usuario_id = data['usuario_id']
            
            # Obtener preguntas que el usuario ha acertado
            preguntas_acertadas = self.obtener_preguntas_mas_acertadas(usuario_id)
            
            if not preguntas_acertadas:
                return {
                    'estado': 'error',
                    'mensaje': 'El usuario no ha acertado ninguna pregunta previamente'
                }
            
            # Obtener todas las preguntas para generar opciones incorrectas
            connection = self.get_db_connection()
            cursor = connection.cursor(dictionary=True)
            query_todas = "SELECT idPregunta, urlAudio, respuestaCorrecta, Categorias_idCategorias FROM Preguntas"
            cursor.execute(query_todas)
            todas_las_preguntas = cursor.fetchall()
            cursor.close()
            connection.close()
            
            if len(todas_las_preguntas) < 4:
                return {
                    'estado': 'error',
                    'mensaje': 'Se necesitan al menos 4 preguntas en la base de datos para generar opciones'
                }
            
            # Seleccionar las mejores preguntas basadas en tasa de acierto
            preguntas_seleccionadas = []
            num_preguntas = min(10, len(preguntas_acertadas))
            
            # Usar ponderación para dar más probabilidad a preguntas con mayor tasa de acierto
            pesos = []
            for pregunta in preguntas_acertadas:
                # Peso basado en tasa de acierto (0.1 a 1.0) + número de aciertos normalizados
                peso_tasa = pregunta['tasa_acierto']
                peso_cantidad = min(pregunta['total_aciertos'] / 10, 0.5)  # Normalizar cantidad de aciertos
                peso_total = peso_tasa + peso_cantidad
                pesos.append(peso_total)
            
            # Selección ponderada de preguntas
            preguntas_elegidas = []
            preguntas_disponibles = preguntas_acertadas.copy()
            pesos_disponibles = pesos.copy()
            
            for i in range(num_preguntas):
                if not preguntas_disponibles:
                    break
                
                # Selección ponderada
                suma_pesos = sum(pesos_disponibles)
                if suma_pesos == 0:
                    pregunta_elegida = random.choice(preguntas_disponibles)
                    indice_elegido = preguntas_disponibles.index(pregunta_elegida)
                else:
                    probabilidades = [peso / suma_pesos for peso in pesos_disponibles]
                    indice_elegido = random.choices(range(len(preguntas_disponibles)), weights=probabilidades)[0]
                    pregunta_elegida = preguntas_disponibles[indice_elegido]
                
                preguntas_elegidas.append(pregunta_elegida)
                preguntas_disponibles.pop(indice_elegido)
                pesos_disponibles.pop(indice_elegido)
            
            for pregunta_principal in preguntas_elegidas:
                # Generar respuestas incorrectas
                respuestas_incorrectas = set()
                otras_preguntas = [p for p in todas_las_preguntas if p['idPregunta'] != pregunta_principal['idPregunta']]
                
                while len(respuestas_incorrectas) < 3 and len(otras_preguntas) > 0:
                    pregunta_incorrecta = random.choice(otras_preguntas)
                    respuesta_incorrecta = pregunta_incorrecta['respuestaCorrecta']
                    
                    if (respuesta_incorrecta != pregunta_principal['respuestaCorrecta'] and 
                        respuesta_incorrecta not in respuestas_incorrectas):
                        respuestas_incorrectas.add(respuesta_incorrecta)
                    
                    otras_preguntas.remove(pregunta_incorrecta)
                
                pregunta_formateada = {
                    'idPregunta': pregunta_principal['idPregunta'],
                    'urlAudio': pregunta_principal['urlAudio'],
                    'respuestaCorrecta': pregunta_principal['respuestaCorrecta'],
                    'respuestasIncorrectas': list(respuestas_incorrectas),
                    'Categorias_idCategorias': pregunta_principal['Categorias_idCategorias'],
                    'tasa_acierto_personal': round(pregunta_principal['tasa_acierto'], 2),
                    'total_aciertos_personal': pregunta_principal['total_aciertos'],
                    'total_intentos_personal': pregunta_principal['total_intentos'],
                    'ultima_fecha': pregunta_principal['ultima_fecha'].strftime('%Y-%m-%d') if pregunta_principal['ultima_fecha'] else None
                }
                
                preguntas_seleccionadas.append(pregunta_formateada)
            
            # Calcular estadísticas
            tasa_acierto_promedio = sum([p['tasa_acierto'] for p in preguntas_elegidas]) / len(preguntas_elegidas)
            total_aciertos_seleccionadas = sum([p['total_aciertos'] for p in preguntas_elegidas])
            
            resultado = {
                'preguntas': preguntas_seleccionadas,
                'total_preguntas': len(preguntas_seleccionadas),
                'total_preguntas_acertadas_disponibles': len(preguntas_acertadas),
                'tasa_acierto_promedio': round(tasa_acierto_promedio, 2),
                'total_aciertos_seleccionadas': total_aciertos_seleccionadas,
                'usuario_id': usuario_id,
                'estado': 'completado',
                'mensaje': f'Algoritmo ejecutado correctamente - {len(preguntas_seleccionadas)} preguntas que has acertado previamente (tasa de acierto promedio: {round(tasa_acierto_promedio * 100, 1)}%)'
            }
            
            if data:
                resultado['datos_entrada'] = data
            
            return resultado
        
        except mysql.connector.Error as db_error:
            return {
                'estado': 'error',
                'mensaje': f'Error de base de datos: {str(db_error)}'
            }
        except Exception as e:
            return {
                'estado': 'error',
                'mensaje': f'Error en el algoritmo: {str(e)}'
            }
    
    def obtener_info(self):
        return {
            'nombre': self.nombre,
            'descripcion': self.descripcion,
            'parametros_entrada': ['usuario_id (requerido)'],
            'parametros_salida': ['preguntas', 'total_preguntas', 'total_preguntas_acertadas_disponibles', 'tasa_acierto_promedio', 'total_aciertos_seleccionadas', 'usuario_id', 'estado', 'mensaje']
        }
