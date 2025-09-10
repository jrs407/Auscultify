import random
import mysql.connector
import os

class PreguntasNoHechas:
    def __init__(self):
        self.nombre = "PreguntasNoHechas"
        self.descripcion = "Elige aleatoriamente preguntas que no has hecho. Si no hay preguntas sin hacer, se eligira las que más tiempo lleve sin hacerse."
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', 'root'),
            'database': os.getenv('DB_NAME', 'mydb'),
            'port': int(os.getenv('DB_PORT', 3306))
        }
    
    def get_db_connection(self):
        return mysql.connector.connect(**self.db_config)
    
    def ejecutar(self, data):
        try:
            if not data or 'usuario_id' not in data:
                return {
                    'estado': 'error',
                    'mensaje': 'Se debe proporcionar usuario_id en los datos de entrada'
                }
            
            usuario_id = data['usuario_id']
            
            connection = self.get_db_connection()
            cursor = connection.cursor(dictionary=True)
            
            query_no_hechas = """
                SELECT p.idPregunta, p.urlAudio, p.respuestaCorrecta, p.Categorias_idCategorias
                FROM Preguntas p
                LEFT JOIN Usuarios_has_Preguntas uhp ON p.idPregunta = uhp.Preguntas_idPregunta 
                    AND uhp.Usuarios_idUsuario = %s
                WHERE uhp.Preguntas_idPregunta IS NULL
            """
            cursor.execute(query_no_hechas, (usuario_id,))
            preguntas_no_hechas = cursor.fetchall()
            
            query_mas_antiguas = """
                SELECT p.idPregunta, p.urlAudio, p.respuestaCorrecta, p.Categorias_idCategorias,
                       MAX(uhp.fechaDeContestacion) as ultima_fecha
                FROM Preguntas p
                INNER JOIN Usuarios_has_Preguntas uhp ON p.idPregunta = uhp.Preguntas_idPregunta 
                    AND uhp.Usuarios_idUsuario = %s
                GROUP BY p.idPregunta, p.urlAudio, p.respuestaCorrecta, p.Categorias_idCategorias
                ORDER BY ultima_fecha ASC
            """
            cursor.execute(query_mas_antiguas, (usuario_id,))
            preguntas_mas_antiguas = cursor.fetchall()
           
            preguntas_candidatas = []
            preguntas_mas_antiguas_ids = set()
            

            preguntas_candidatas.extend(preguntas_no_hechas)
            

            if len(preguntas_candidatas) < 10:
                preguntas_necesarias = 10 - len(preguntas_candidatas)
                preguntas_antiguas_seleccionadas = preguntas_mas_antiguas[:preguntas_necesarias]
                preguntas_candidatas.extend(preguntas_antiguas_seleccionadas)
                preguntas_mas_antiguas_ids = {p['idPregunta'] for p in preguntas_antiguas_seleccionadas}
            
            query_todas = "SELECT idPregunta, urlAudio, respuestaCorrecta, Categorias_idCategorias FROM Preguntas"
            cursor.execute(query_todas)
            todas_las_preguntas = cursor.fetchall()
            
            cursor.close()
            connection.close()
            
            if not preguntas_candidatas:
                return {
                    'estado': 'error',
                    'mensaje': 'No hay preguntas disponibles en la base de datos'
                }
            
            if len(todas_las_preguntas) < 4:
                return {
                    'estado': 'error',
                    'mensaje': 'Se necesitan al menos 4 preguntas en la base de datos para generar opciones'
                }

            num_preguntas = min(10, len(preguntas_candidatas))
            preguntas_seleccionadas_raw = random.sample(preguntas_candidatas, num_preguntas)
            
            preguntas_antiguas_a_actualizar = [p for p in preguntas_seleccionadas_raw if p['idPregunta'] in preguntas_mas_antiguas_ids]
            
            if preguntas_antiguas_a_actualizar:
                connection = self.get_db_connection()
                cursor = connection.cursor()
                
                for pregunta in preguntas_antiguas_a_actualizar:
                    update_query = """
                        UPDATE Usuarios_has_Preguntas 
                        SET fechaDeContestacion = CURDATE()
                        WHERE Usuarios_idUsuario = %s AND Preguntas_idPregunta = %s
                        ORDER BY fechaDeContestacion DESC
                        LIMIT 1
                    """
                    cursor.execute(update_query, (usuario_id, pregunta['idPregunta']))
                
                connection.commit()
                cursor.close()
                connection.close()
            
            preguntas_seleccionadas = []
            
            for pregunta_principal in preguntas_seleccionadas_raw:
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
                    'Categorias_idCategorias': pregunta_principal['Categorias_idCategorias']
                }
                
                preguntas_seleccionadas.append(pregunta_formateada)
            
            mensaje = f'Algoritmo ejecutado correctamente - {len(preguntas_seleccionadas)} preguntas seleccionadas'
            if preguntas_no_hechas:
                if len(preguntas_no_hechas) >= 10:
                    mensaje += ' (todas no respondidas)'
                else:
                    mensaje += f' ({len(preguntas_no_hechas)} no respondidas + {len(preguntas_seleccionadas) - len(preguntas_no_hechas)} más antiguas)'
            else:
                mensaje += ' (todas las más antiguas)'
            
            resultado = {
                'preguntas': preguntas_seleccionadas,
                'total_preguntas': len(preguntas_seleccionadas),
                'usuario_id': usuario_id,
                'tipo_seleccion': 'no_hechas' if preguntas_no_hechas else 'mas_antiguas',
                'estado': 'completado',
                'mensaje': mensaje
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
            'parametros_salida': ['preguntas', 'total_preguntas', 'usuario_id', 'tipo_seleccion', 'estado', 'mensaje']
        }