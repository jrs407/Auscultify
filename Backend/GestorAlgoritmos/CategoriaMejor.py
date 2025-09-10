import random
import mysql.connector
import os

class CategoriaMejor:
    def __init__(self):
        self.nombre = "CategoriaMejor"
        self.descripcion = "Te pone automaticamente preguntas de la categoria que mejor se te da."
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', 'root'),
            'database': os.getenv('DB_NAME', 'mydb'),
            'port': int(os.getenv('DB_PORT', 3306))
        }
    
    def get_db_connection(self):
        return mysql.connector.connect(**self.db_config)
    
    def obtener_categoria_mejor(self, usuario_id):
        """Obtiene la categoría con mejor porcentaje de aciertos para el usuario"""
        try:
            connection = self.get_db_connection()
            cursor = connection.cursor(dictionary=True)
            
            query = """
                SELECT 
                    p.Categorias_idCategorias,
                    COUNT(*) as total_respondidas,
                    SUM(uhp.respuestaCorrecta) as total_correctas,
                    (SUM(uhp.respuestaCorrecta) / COUNT(*)) * 100 as porcentaje_aciertos
                FROM Usuarios_has_Preguntas uhp
                INNER JOIN Preguntas p ON uhp.Preguntas_idPregunta = p.idPregunta
                WHERE uhp.Usuarios_idUsuario = %s
                GROUP BY p.Categorias_idCategorias
                HAVING COUNT(*) >= 3
                ORDER BY porcentaje_aciertos DESC
                LIMIT 1
            """
            cursor.execute(query, (usuario_id,))
            categoria_mejor = cursor.fetchone()
            
            cursor.close()
            connection.close()
            
            return categoria_mejor
            
        except mysql.connector.Error as db_error:
            raise Exception(f'Error de base de datos al obtener categoría mejor: {str(db_error)}')
    
    def ejecutar(self, data):
        try:
            if not data or 'usuario_id' not in data:
                return {
                    'estado': 'error',
                    'mensaje': 'Se debe proporcionar usuario_id en los datos de entrada'
                }
            
            usuario_id = data['usuario_id']
            
            categoria_mejor = self.obtener_categoria_mejor(usuario_id)
            
            if not categoria_mejor:
                return {
                    'estado': 'error',
                    'mensaje': 'El usuario debe haber respondido al menos 3 preguntas en alguna categoría para usar este algoritmo'
                }
            
            categoria_id = categoria_mejor['Categorias_idCategorias']
            
            connection = self.get_db_connection()
            cursor = connection.cursor(dictionary=True)
            
            query = "SELECT idPregunta, urlAudio, respuestaCorrecta, Categorias_idCategorias FROM Preguntas WHERE Categorias_idCategorias = %s"
            cursor.execute(query, (categoria_id,))
            preguntas_categoria = cursor.fetchall()
            
            cursor.close()
            connection.close()
            
            if not preguntas_categoria:
                return {
                    'estado': 'error',
                    'mensaje': f'No hay preguntas disponibles en la categoría {categoria_id}'
                }
            
            if len(preguntas_categoria) < 4:
                return {
                    'estado': 'error',
                    'mensaje': 'Se necesitan al menos 4 preguntas en la categoría para generar opciones'
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
                    todas_otras_respuestas = [p['respuestaCorrecta'] for p in preguntas_categoria 
                                            if p['idPregunta'] != pregunta_principal['idPregunta'] 
                                            and p['respuestaCorrecta'] != pregunta_principal['respuestaCorrecta']
                                            and p['respuestaCorrecta'] not in respuestas_incorrectas]

                    respuestas_faltantes = min(3 - len(respuestas_incorrectas), len(todas_otras_respuestas))
                    respuestas_adicionales = random.sample(todas_otras_respuestas, respuestas_faltantes)
                    respuestas_incorrectas.update(respuestas_adicionales)
                
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
                'porcentaje_aciertos': round(categoria_mejor['porcentaje_aciertos'], 2),
                'total_respondidas_categoria': categoria_mejor['total_respondidas'],
                'usuario_id': usuario_id,
                'estado': 'completado',
                'mensaje': f'Algoritmo ejecutado correctamente - {len(preguntas_seleccionadas)} preguntas de la categoría {categoria_id} (mejor categoría con {round(categoria_mejor["porcentaje_aciertos"], 2)}% de aciertos)'
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
            'parametros_salida': ['preguntas', 'total_preguntas', 'categoria_id', 'porcentaje_aciertos', 'total_respondidas_categoria', 'usuario_id', 'estado', 'mensaje']
        }