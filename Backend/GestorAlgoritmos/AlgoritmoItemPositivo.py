import random
import mysql.connector
import os
from collections import defaultdict
import math

class AlgoritmoItemPositivo:
    def __init__(self):
        self.nombre = "AlgoritmoItemPositivo"
        self.descripcion = "Te recomienda preguntas basándose en la similitud entre preguntas que otros usuarios han fallado juntas."
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', 'root'),
            'database': os.getenv('DB_NAME', 'mydb'),
            'port': int(os.getenv('DB_PORT', 3306))
        }
    
    def get_db_connection(self):
        return mysql.connector.connect(**self.db_config)
    
    def obtener_preguntas_falladas_usuario(self, usuario_id):
        """Obtiene las preguntas que el usuario ha fallado"""
        try:
            connection = self.get_db_connection()
            cursor = connection.cursor(dictionary=True)
            
            query = """
                SELECT DISTINCT Preguntas_idPregunta
                FROM Usuarios_has_Preguntas 
                WHERE Usuarios_idUsuario = %s 
                AND respuestaCorrecta = 0
            """
            cursor.execute(query, (usuario_id,))
            preguntas_falladas = cursor.fetchall()
            
            cursor.close()
            connection.close()
            
            return [p['Preguntas_idPregunta'] for p in preguntas_falladas]
            
        except mysql.connector.Error as db_error:
            raise Exception(f'Error de base de datos al obtener preguntas falladas: {str(db_error)}')
    
    def calcular_similitud_items(self, pregunta1_id, pregunta2_id):
        """Calcula la similitud entre dos preguntas basada en patrones de fallos de usuarios"""
        try:
            connection = self.get_db_connection()
            cursor = connection.cursor(dictionary=True)
            
            # Obtener usuarios que han respondido ambas preguntas
            query_usuarios_comunes = """
                SELECT DISTINCT uhp1.Usuarios_idUsuario
                FROM Usuarios_has_Preguntas uhp1
                INNER JOIN Usuarios_has_Preguntas uhp2 ON uhp1.Usuarios_idUsuario = uhp2.Usuarios_idUsuario
                WHERE uhp1.Preguntas_idPregunta = %s 
                AND uhp2.Preguntas_idPregunta = %s
            """
            cursor.execute(query_usuarios_comunes, (pregunta1_id, pregunta2_id))
            usuarios_comunes = cursor.fetchall()
            
            if len(usuarios_comunes) < 3:  # Necesitamos al menos 3 usuarios comunes
                cursor.close()
                connection.close()
                return 0
            
            # Obtener patrones de respuesta para ambas preguntas
            usuarios_ids = [u['Usuarios_idUsuario'] for u in usuarios_comunes]
            placeholders = ','.join(['%s'] * len(usuarios_ids))
            
            query_respuestas = """
                SELECT Usuarios_idUsuario, Preguntas_idPregunta, respuestaCorrecta
                FROM Usuarios_has_Preguntas 
                WHERE Usuarios_idUsuario IN ({})
                AND Preguntas_idPregunta IN (%s, %s)
                ORDER BY Usuarios_idUsuario, Preguntas_idPregunta
            """.format(placeholders)
            
            params = usuarios_ids + [pregunta1_id, pregunta2_id]
            cursor.execute(query_respuestas, params)
            respuestas = cursor.fetchall()
            
            cursor.close()
            connection.close()
            
            # Organizar respuestas por usuario
            respuestas_por_usuario = defaultdict(dict)
            for respuesta in respuestas:
                usuario_id = respuesta['Usuarios_idUsuario']
                pregunta_id = respuesta['Preguntas_idPregunta']
                es_correcta = respuesta['respuestaCorrecta']
                respuestas_por_usuario[usuario_id][pregunta_id] = es_correcta
            
            # Calcular similitud usando correlación de Pearson invertida (enfocada en fallos)
            return self.calcular_correlacion_fallos(respuestas_por_usuario, pregunta1_id, pregunta2_id)
            
        except mysql.connector.Error as db_error:
            raise Exception(f'Error de base de datos al calcular similitud: {str(db_error)}')
    
    def calcular_correlacion_fallos(self, respuestas_por_usuario, pregunta1_id, pregunta2_id):
        """Calcula correlación basada en patrones de fallos"""
        fallos_pregunta1 = []
        fallos_pregunta2 = []
        
        for usuario_id, respuestas in respuestas_por_usuario.items():
            if pregunta1_id in respuestas and pregunta2_id in respuestas:
                # Invertir valores para enfocarse en fallos (0 = fallo, 1 = acierto)
                fallo1 = 1 - respuestas[pregunta1_id]  # 1 si falló, 0 si acertó
                fallo2 = 1 - respuestas[pregunta2_id]
                fallos_pregunta1.append(fallo1)
                fallos_pregunta2.append(fallo2)
        
        if len(fallos_pregunta1) < 3:
            return 0
        
        # Calcular correlación de Pearson
        media1 = sum(fallos_pregunta1) / len(fallos_pregunta1)
        media2 = sum(fallos_pregunta2) / len(fallos_pregunta2)
        
        numerador = 0
        suma_cuadrados1 = 0
        suma_cuadrados2 = 0
        
        for i in range(len(fallos_pregunta1)):
            diff1 = fallos_pregunta1[i] - media1
            diff2 = fallos_pregunta2[i] - media2
            
            numerador += diff1 * diff2
            suma_cuadrados1 += diff1 ** 2
            suma_cuadrados2 += diff2 ** 2
        
        denominador = math.sqrt(suma_cuadrados1 * suma_cuadrados2)
        
        if denominador == 0:
            return 0
        
        correlacion = numerador / denominador
        return max(0, correlacion)  # Solo correlaciones positivas
    
    def encontrar_preguntas_similares(self, preguntas_falladas, usuario_id, limite_similares=50):
        """Encuentra preguntas similares a las que el usuario ha fallado"""
        try:
            connection = self.get_db_connection()
            cursor = connection.cursor(dictionary=True)
            
            # Obtener preguntas que el usuario ya ha respondido
            query_respondidas = """
                SELECT DISTINCT Preguntas_idPregunta
                FROM Usuarios_has_Preguntas 
                WHERE Usuarios_idUsuario = %s
            """
            cursor.execute(query_respondidas, (usuario_id,))
            preguntas_respondidas = {r['Preguntas_idPregunta'] for r in cursor.fetchall()}
            
            # Obtener todas las preguntas disponibles
            query_todas = """
                SELECT idPregunta, urlAudio, respuestaCorrecta, Categorias_idCategorias
                FROM Preguntas 
                WHERE idPregunta NOT IN ({})
            """.format(','.join(['%s'] * len(preguntas_respondidas)) if preguntas_respondidas else '%s')
            
            params = list(preguntas_respondidas) if preguntas_respondidas else [-1]
            cursor.execute(query_todas, params)
            preguntas_candidatas = cursor.fetchall()
            
            cursor.close()
            connection.close()
            
            if not preguntas_candidatas:
                return []
            
            # Calcular similitudes
            similitudes_preguntas = []
            
            for pregunta_candidata in preguntas_candidatas:
                pregunta_candidata_id = pregunta_candidata['idPregunta']
                similitud_maxima = 0
                
                # Calcular similitud máxima con cualquiera de las preguntas falladas
                for pregunta_fallada_id in preguntas_falladas:
                    similitud = self.calcular_similitud_items(pregunta_fallada_id, pregunta_candidata_id)
                    similitud_maxima = max(similitud_maxima, similitud)
                
                if similitud_maxima > 0.1:  # Umbral mínimo de similitud
                    similitudes_preguntas.append({
                        'pregunta': pregunta_candidata,
                        'similitud': similitud_maxima
                    })
            
            # Ordenar por similitud descendente
            similitudes_preguntas.sort(key=lambda x: x['similitud'], reverse=True)
            
            return similitudes_preguntas[:limite_similares]
            
        except mysql.connector.Error as db_error:
            raise Exception(f'Error de base de datos al encontrar preguntas similares: {str(db_error)}')
    
    def ejecutar(self, data):
        try:
            if not data or 'usuario_id' not in data:
                return {
                    'estado': 'error',
                    'mensaje': 'Se debe proporcionar usuario_id en los datos de entrada'
                }
            
            usuario_id = data['usuario_id']
            
            # Obtener preguntas que el usuario ha fallado
            preguntas_falladas = self.obtener_preguntas_falladas_usuario(usuario_id)
            
            if len(preguntas_falladas) < 2:
                return {
                    'estado': 'error',
                    'mensaje': 'El usuario debe haber fallado al menos 2 preguntas para usar este algoritmo'
                }
            
            # Encontrar preguntas similares a las falladas
            preguntas_similares = self.encontrar_preguntas_similares(preguntas_falladas, usuario_id)
            
            if not preguntas_similares:
                return {
                    'estado': 'error',
                    'mensaje': 'No se encontraron preguntas similares a las que has fallado'
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
            num_preguntas = min(10, len(preguntas_similares))
            
            for i in range(num_preguntas):
                item_similar = preguntas_similares[i]
                pregunta_principal = item_similar['pregunta']
                similitud = item_similar['similitud']
                
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
                    'similitud_maxima': round(similitud, 3),
                    'preguntas_falladas_base': len(preguntas_falladas)
                }
                
                preguntas_seleccionadas.append(pregunta_formateada)
            
            resultado = {
                'preguntas': preguntas_seleccionadas,
                'total_preguntas': len(preguntas_seleccionadas),
                'preguntas_falladas_usuario': len(preguntas_falladas),
                'preguntas_similares_encontradas': len(preguntas_similares),
                'usuario_id': usuario_id,
                'estado': 'completado',
                'mensaje': f'Algoritmo ejecutado correctamente - {len(preguntas_seleccionadas)} preguntas similares a las que has fallado'
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
            'parametros_salida': ['preguntas', 'total_preguntas', 'preguntas_falladas_usuario', 'preguntas_similares_encontradas', 'usuario_id', 'estado', 'mensaje']
        }
