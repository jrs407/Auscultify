import random
import mysql.connector
import os
from collections import defaultdict
import math

class AlgoritmoUsuarioPositivo:
    def __init__(self):
        self.nombre = "AlgoritmoUsuarioPositivo"
        self.descripcion = "Te pone preguntas que otros usuarios similares a ti han fallado."
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', 'root'),
            'database': os.getenv('DB_NAME', 'mydb'),
            'port': int(os.getenv('DB_PORT', 3306))
        }
    
    def get_db_connection(self):
        return mysql.connector.connect(**self.db_config)
    
    def obtener_usuarios_similares(self, usuario_id, limite_usuarios=10):
        """Encuentra usuarios similares basado en patrones de respuesta"""
        try:
            connection = self.get_db_connection()
            cursor = connection.cursor(dictionary=True)
            
            # Obtener todas las respuestas del usuario objetivo
            query_usuario_actual = """
                SELECT Preguntas_idPregunta, respuestaCorrecta
                FROM Usuarios_has_Preguntas 
                WHERE Usuarios_idUsuario = %s
            """
            cursor.execute(query_usuario_actual, (usuario_id,))
            respuestas_usuario_actual = cursor.fetchall()
            
            if len(respuestas_usuario_actual) < 5:
                cursor.close()
                connection.close()
                return []
            
            # Crear diccionario de respuestas del usuario actual
            respuestas_actual = {r['Preguntas_idPregunta']: r['respuestaCorrecta'] for r in respuestas_usuario_actual}
            preguntas_comunes = set(respuestas_actual.keys())
            
            # Obtener todos los otros usuarios con sus respuestas
            query_otros_usuarios = """
                SELECT DISTINCT Usuarios_idUsuario
                FROM Usuarios_has_Preguntas 
                WHERE Usuarios_idUsuario != %s
                AND Preguntas_idPregunta IN ({})
                GROUP BY Usuarios_idUsuario
                HAVING COUNT(*) >= 5
            """.format(','.join(['%s'] * len(preguntas_comunes)))
            
            params = [usuario_id] + list(preguntas_comunes)
            cursor.execute(query_otros_usuarios, params)
            otros_usuarios = cursor.fetchall()
            
            similaridades = []
            
            for otro_usuario in otros_usuarios:
                otro_id = otro_usuario['Usuarios_idUsuario']
                
                # Obtener respuestas del otro usuario
                query_respuestas_otro = """
                    SELECT Preguntas_idPregunta, respuestaCorrecta
                    FROM Usuarios_has_Preguntas 
                    WHERE Usuarios_idUsuario = %s
                    AND Preguntas_idPregunta IN ({})
                """.format(','.join(['%s'] * len(preguntas_comunes)))
                
                params_otro = [otro_id] + list(preguntas_comunes)
                cursor.execute(query_respuestas_otro, params_otro)
                respuestas_otro = cursor.fetchall()
                
                respuestas_otro_dict = {r['Preguntas_idPregunta']: r['respuestaCorrecta'] for r in respuestas_otro}
                
                # Calcular similitud usando coeficiente de correlación de Pearson
                similitud = self.calcular_similitud_pearson(respuestas_actual, respuestas_otro_dict)
                
                if similitud > 0:  # Solo usuarios con similitud positiva
                    similaridades.append((otro_id, similitud))
            
            # Ordenar por similitud descendente y tomar los más similares
            similaridades.sort(key=lambda x: x[1], reverse=True)
            usuarios_similares = [user_id for user_id, _ in similaridades[:limite_usuarios]]
            
            cursor.close()
            connection.close()
            
            return usuarios_similares
            
        except mysql.connector.Error as db_error:
            raise Exception(f'Error de base de datos al obtener usuarios similares: {str(db_error)}')
    
    def calcular_similitud_pearson(self, respuestas1, respuestas2):
        """Calcula la correlación de Pearson entre dos conjuntos de respuestas"""
        preguntas_comunes = set(respuestas1.keys()) & set(respuestas2.keys())
        
        if len(preguntas_comunes) < 3:
            return 0
        
        # Calcular medias
        suma1 = sum([respuestas1[p] for p in preguntas_comunes])
        suma2 = sum([respuestas2[p] for p in preguntas_comunes])
        
        media1 = suma1 / len(preguntas_comunes)
        media2 = suma2 / len(preguntas_comunes)
        
        # Calcular correlación
        numerador = 0
        suma_cuadrados1 = 0
        suma_cuadrados2 = 0
        
        for pregunta in preguntas_comunes:
            diff1 = respuestas1[pregunta] - media1
            diff2 = respuestas2[pregunta] - media2
            
            numerador += diff1 * diff2
            suma_cuadrados1 += diff1 ** 2
            suma_cuadrados2 += diff2 ** 2
        
        denominador = math.sqrt(suma_cuadrados1 * suma_cuadrados2)
        
        if denominador == 0:
            return 0
        
        return numerador / denominador
    
    def obtener_preguntas_falladas_usuarios_similares(self, usuarios_similares, usuario_id):
        """Obtiene preguntas que usuarios similares han fallado frecuentemente"""
        try:
            connection = self.get_db_connection()
            cursor = connection.cursor(dictionary=True)
            
            if not usuarios_similares:
                cursor.close()
                connection.close()
                return []
            
            # Obtener preguntas que el usuario actual ya ha respondido
            query_respondidas = """
                SELECT DISTINCT Preguntas_idPregunta
                FROM Usuarios_has_Preguntas 
                WHERE Usuarios_idUsuario = %s
            """
            cursor.execute(query_respondidas, (usuario_id,))
            preguntas_respondidas = {r['Preguntas_idPregunta'] for r in cursor.fetchall()}
            
            # Obtener preguntas falladas por usuarios similares
            query_falladas = """
                SELECT 
                    uhp.Preguntas_idPregunta,
                    p.idPregunta,
                    p.urlAudio,
                    p.respuestaCorrecta,
                    p.Categorias_idCategorias,
                    COUNT(*) as total_intentos,
                    SUM(CASE WHEN uhp.respuestaCorrecta = 0 THEN 1 ELSE 0 END) as total_fallos,
                    (SUM(CASE WHEN uhp.respuestaCorrecta = 0 THEN 1 ELSE 0 END) / COUNT(*)) as tasa_fallo
                FROM Usuarios_has_Preguntas uhp
                INNER JOIN Preguntas p ON uhp.Preguntas_idPregunta = p.idPregunta
                WHERE uhp.Usuarios_idUsuario IN ({})
                AND uhp.Preguntas_idPregunta NOT IN ({})
                GROUP BY uhp.Preguntas_idPregunta, p.idPregunta, p.urlAudio, p.respuestaCorrecta, p.Categorias_idCategorias
                HAVING total_intentos >= 2 AND tasa_fallo >= 0.4
                ORDER BY tasa_fallo DESC, total_fallos DESC
                LIMIT 50
            """.format(
                ','.join(['%s'] * len(usuarios_similares)),
                ','.join(['%s'] * len(preguntas_respondidas)) if preguntas_respondidas else '%s'
            )
            
            params = usuarios_similares + (list(preguntas_respondidas) if preguntas_respondidas else [-1])
            cursor.execute(query_falladas, params)
            preguntas_falladas = cursor.fetchall()
            
            cursor.close()
            connection.close()
            
            return preguntas_falladas
            
        except mysql.connector.Error as db_error:
            raise Exception(f'Error de base de datos al obtener preguntas falladas: {str(db_error)}')
    
    def ejecutar(self, data):
        try:
            if not data or 'usuario_id' not in data:
                return {
                    'estado': 'error',
                    'mensaje': 'Se debe proporcionar usuario_id en los datos de entrada'
                }
            
            usuario_id = data['usuario_id']
            
            # Encontrar usuarios similares
            usuarios_similares = self.obtener_usuarios_similares(usuario_id)
            
            if not usuarios_similares:
                return {
                    'estado': 'error',
                    'mensaje': 'No se encontraron usuarios similares. El usuario debe haber respondido al menos 5 preguntas.'
                }
            
            # Obtener preguntas que usuarios similares han fallado
            preguntas_candidatas = self.obtener_preguntas_falladas_usuarios_similares(usuarios_similares, usuario_id)
            
            if not preguntas_candidatas:
                return {
                    'estado': 'error',
                    'mensaje': 'No se encontraron preguntas recomendadas basadas en usuarios similares.'
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
            
            # Seleccionar las 10 mejores preguntas recomendadas
            preguntas_seleccionadas = []
            num_preguntas = min(10, len(preguntas_candidatas))
            
            for i in range(num_preguntas):
                pregunta_principal = preguntas_candidatas[i]
                
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
                    'tasa_fallo_similares': round(pregunta_principal['tasa_fallo'], 2),
                    'total_usuarios_similares': len(usuarios_similares)
                }
                
                preguntas_seleccionadas.append(pregunta_formateada)
            
            resultado = {
                'preguntas': preguntas_seleccionadas,
                'total_preguntas': len(preguntas_seleccionadas),
                'usuarios_similares_encontrados': len(usuarios_similares),
                'usuario_id': usuario_id,
                'estado': 'completado',
                'mensaje': f'Algoritmo ejecutado correctamente - {len(preguntas_seleccionadas)} preguntas recomendadas basadas en {len(usuarios_similares)} usuarios similares'
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
            'parametros_salida': ['preguntas', 'total_preguntas', 'usuarios_similares_encontrados', 'usuario_id', 'estado', 'mensaje']
        }
