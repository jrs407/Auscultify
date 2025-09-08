import random
import mysql.connector
import os

class AleatorioSimple:
    def __init__(self):
        self.nombre = "AleatorioSimple"
        self.descripcion = "Algoritmo que genera 10 preguntas aleatorias de la base de datos"
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

            connection = self.get_db_connection()
            cursor = connection.cursor(dictionary=True)
            

            query = "SELECT idPregunta, urlAudio, respuestaCorrecta, Categorias_idCategorias FROM Preguntas"
            cursor.execute(query)
            todas_las_preguntas = cursor.fetchall()
            
            cursor.close()
            connection.close()
            
            if not todas_las_preguntas:
                return {
                    'estado': 'error',
                    'mensaje': 'No hay preguntas disponibles en la base de datos'
                }
            
            if len(todas_las_preguntas) < 4:
                return {
                    'estado': 'error',
                    'mensaje': 'Se necesitan al menos 4 preguntas en la base de datos para generar opciones'
                }
            
            preguntas_seleccionadas = []
            for i in range(10):
                pregunta_principal = random.choice(todas_las_preguntas)
                
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
            
            resultado = {
                'preguntas': preguntas_seleccionadas,
                'total_preguntas': len(preguntas_seleccionadas),
                'estado': 'completado',
                'mensaje': 'Algoritmo ejecutado correctamente - 10 preguntas aleatorias seleccionadas'
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
        """
        Retorna información sobre el algoritmo
        """
        return {
            'nombre': self.nombre,
            'descripcion': self.descripcion,
            'parametros_entrada': ['datos (opcional)'],
            'parametros_salida': ['preguntas', 'total_preguntas', 'estado', 'mensaje']
        }