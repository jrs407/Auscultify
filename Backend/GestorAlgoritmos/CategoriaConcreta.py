import random
import mysql.connector
import os

class CategoriaConcreta:
    def __init__(self):
        self.nombre = "CategoriaConcreta"
        self.descripcion = "Elige aleatoriamente una pregunta de una categoria en concreto."
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
            if not data or 'categoria_id' not in data:
                return {
                    'estado': 'error',
                    'mensaje': 'Se debe proporcionar categoria_id en los datos de entrada'
                }
            
            categoria_id = data['categoria_id']
            
            connection = self.get_db_connection()
            cursor = connection.cursor(dictionary=True)
            
            query = "SELECT idPregunta, urlAudio, respuestaCorrecta, Categorias_idCategorias FROM Preguntas WHERE Categorias_idCategorias = %s"
            cursor.execute(query, (categoria_id,))
            preguntas_categoria = cursor.fetchall()
            
            query_todas = "SELECT idPregunta, urlAudio, respuestaCorrecta, Categorias_idCategorias FROM Preguntas"
            cursor.execute(query_todas)
            todas_las_preguntas = cursor.fetchall()
            
            cursor.close()
            connection.close()
            
            if not preguntas_categoria:
                return {
                    'estado': 'error',
                    'mensaje': f'No hay preguntas disponibles en la categoría {categoria_id}'
                }
            
            if len(todas_las_preguntas) < 4:
                return {
                    'estado': 'error',
                    'mensaje': 'Se necesitan al menos 4 preguntas en la base de datos para generar opciones'
                }
            
            preguntas_seleccionadas = []
            
            preguntas_a_usar = []
            for i in range(10):
                pregunta_seleccionada = random.choice(preguntas_categoria)
                preguntas_a_usar.append(pregunta_seleccionada)
            
            for pregunta_principal in preguntas_a_usar:
                respuestas_incorrectas = set()
                otras_preguntas_categoria = [p for p in preguntas_categoria if p['idPregunta'] != pregunta_principal['idPregunta']]
                
                while len(respuestas_incorrectas) < 3 and len(otras_preguntas_categoria) > 0:
                    pregunta_incorrecta = random.choice(otras_preguntas_categoria)
                    respuesta_incorrecta = pregunta_incorrecta['respuestaCorrecta']
                    
                    if (respuesta_incorrecta != pregunta_principal['respuestaCorrecta'] and 
                        respuesta_incorrecta not in respuestas_incorrectas):
                        respuestas_incorrectas.add(respuesta_incorrecta)
                    
                    otras_preguntas_categoria.remove(pregunta_incorrecta)
                
                if len(respuestas_incorrectas) < 3:
                    otras_preguntas_otras_categorias = [p for p in todas_las_preguntas 
                                                       if p['idPregunta'] != pregunta_principal['idPregunta'] 
                                                       and p['Categorias_idCategorias'] != categoria_id]
                    
                    while len(respuestas_incorrectas) < 3 and len(otras_preguntas_otras_categorias) > 0:
                        pregunta_incorrecta = random.choice(otras_preguntas_otras_categorias)
                        respuesta_incorrecta = pregunta_incorrecta['respuestaCorrecta']
                        
                        if (respuesta_incorrecta != pregunta_principal['respuestaCorrecta'] and 
                            respuesta_incorrecta not in respuestas_incorrectas):
                            respuestas_incorrectas.add(respuesta_incorrecta)
                        
                        otras_preguntas_otras_categorias.remove(pregunta_incorrecta)
                
                pregunta_formateada = {
                    'idPregunta': pregunta_principal['idPregunta'],
                    'urlAudio': pregunta_principal['urlAudio'],
                    'respuestaCorrecta': pregunta_principal['respuestaCorrecta'],
                    'respuestasIncorrectas': list(respuestas_incorrectas),
                    'Categorias_idCategorias': pregunta_principal['Categorias_idCategorias']
                }
                
                preguntas_seleccionadas.append(pregunta_formateada)
            
            resultado = {
                'preguntas': preguntas_seleccionadas,
                'total_preguntas': len(preguntas_seleccionadas),
                'categoria_id': categoria_id,
                'estado': 'completado',
                'mensaje': f'Algoritmo ejecutado correctamente - {len(preguntas_seleccionadas)} preguntas aleatorias de la categoría {categoria_id} seleccionadas'
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
            'parametros_entrada': ['categoria_id (requerido)'],
            'parametros_salida': ['preguntas', 'total_preguntas', 'categoria_id', 'estado', 'mensaje']
        }
