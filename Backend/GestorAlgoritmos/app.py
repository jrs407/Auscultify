from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import os
from AleatorioSimple import AleatorioSimple
from CategoriaConcreta import CategoriaConcreta
from PreguntasNoHechas import PreguntasNoHechas
from CategoriaPeor import CategoriaPeor
from CategoriaMejor import CategoriaMejor
from AlgoritmoUsuarioPositivo import AlgoritmoUsuarioPositivo
from AlgoritmoUsuarioNegativo import AlgoritmoUsuarioNegativo
from AlgoritmoItemPositivo import AlgoritmoItemPositivo
from AlgoritmoItemNegativo import AlgoritmoItemNegativo
from PreguntasMasFalladasPasado import PreguntasMasFalladasPasado
from PreguntasMasAcertadasPasado import PreguntasMasAcertadasPasado

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'root'),
    'database': os.getenv('DB_NAME', 'mydb'),
    'port': int(os.getenv('DB_PORT', 3306))
}

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'service': 'GestorAlgoritmos'})

@app.route('/algoritmos/aleatorio-simple', methods=['POST'])
def ejecutar_aleatorio_simple():
    try:
        data = request.get_json()
        algoritmo = AleatorioSimple()
        resultado = algoritmo.ejecutar(data)
        return jsonify({'success': True, 'resultado': resultado})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/algoritmos/categoria-concreta', methods=['POST'])
def ejecutar_categoria_concreta():
    try:
        data = request.get_json()
        algoritmo = CategoriaConcreta()
        resultado = algoritmo.ejecutar(data)
        return jsonify({'success': True, 'resultado': resultado})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/algoritmos/preguntas-no-hechas', methods=['POST'])
def ejecutar_preguntas_no_hechas():
    try:
        data = request.get_json()
        algoritmo = PreguntasNoHechas()
        resultado = algoritmo.ejecutar(data)
        return jsonify({'success': True, 'resultado': resultado})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/algoritmos/categoria-peor', methods=['POST'])
def ejecutar_categoria_peor():
    try:
        data = request.get_json()
        algoritmo = CategoriaPeor()
        resultado = algoritmo.ejecutar(data)
        return jsonify({'success': True, 'resultado': resultado})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/algoritmos/categoria-mejor', methods=['POST'])
def ejecutar_categoria_mejor():
    try:
        data = request.get_json()
        algoritmo = CategoriaMejor()
        resultado = algoritmo.ejecutar(data)
        return jsonify({'success': True, 'resultado': resultado})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/algoritmos/usuario-positivo', methods=['POST'])
def ejecutar_usuario_positivo():
    try:
        data = request.get_json()
        algoritmo = AlgoritmoUsuarioPositivo()
        resultado = algoritmo.ejecutar(data)
        return jsonify({'success': True, 'resultado': resultado})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/algoritmos/usuario-negativo', methods=['POST'])
def ejecutar_usuario_negativo():
    try:
        data = request.get_json()
        algoritmo = AlgoritmoUsuarioNegativo()
        resultado = algoritmo.ejecutar(data)
        return jsonify({'success': True, 'resultado': resultado})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/algoritmos/item-positivo', methods=['POST'])
def ejecutar_item_positivo():
    try:
        data = request.get_json()
        algoritmo = AlgoritmoItemPositivo()
        resultado = algoritmo.ejecutar(data)
        return jsonify({'success': True, 'resultado': resultado})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/algoritmos/item-negativo', methods=['POST'])
def ejecutar_item_negativo():
    try:
        data = request.get_json()
        algoritmo = AlgoritmoItemNegativo()
        resultado = algoritmo.ejecutar(data)
        return jsonify({'success': True, 'resultado': resultado})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/algoritmos/preguntas-mas-falladas-pasado', methods=['POST'])
def ejecutar_preguntas_mas_falladas_pasado():
    try:
        data = request.get_json()
        algoritmo = PreguntasMasFalladasPasado()
        resultado = algoritmo.ejecutar(data)
        return jsonify({'success': True, 'resultado': resultado})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/algoritmos/preguntas-mas-acertadas-pasado', methods=['POST'])
def ejecutar_preguntas_mas_acertadas_pasado():
    try:
        data = request.get_json()
        algoritmo = PreguntasMasAcertadasPasado()
        resultado = algoritmo.ejecutar(data)
        return jsonify({'success': True, 'resultado': resultado})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/algoritmos/disponibles', methods=['GET'])
def obtener_algoritmos_disponibles():
    algoritmos = [
        {
            'nombre': 'AleatorioSimple',
            'descripcion': 'Algoritmo aleatorio simple',
            'endpoint': '/algoritmos/aleatorio-simple'
        },
        {
            'nombre': 'CategoriaConcreta',
            'descripcion': 'Elige aleatoriamente una pregunta de una categoria en concreto',
            'endpoint': '/algoritmos/categoria-concreta'
        },
        {
            'nombre': 'PreguntasNoHechas',
            'descripcion': 'Elige aleatoriamente preguntas que no has hecho',
            'endpoint': '/algoritmos/preguntas-no-hechas'
        },
        {
            'nombre': 'CategoriaPeor',
            'descripcion': 'Te pone automaticamente preguntas de la categoria que peor se te da',
            'endpoint': '/algoritmos/categoria-peor'
        },
        {
            'nombre': 'CategoriaMejor',
            'descripcion': 'Te pone automaticamente preguntas de la categoria que mejor se te da',
            'endpoint': '/algoritmos/categoria-mejor'
        },
        {
            'nombre': 'PreguntasMasFalladasPasado',
            'descripcion': 'Te pone preguntas que has fallado previamente en el pasado priorizando las que mas te equivocas',
            'endpoint': '/algoritmos/preguntas-mas-falladas-pasado'
        },
        {
            'nombre': 'PreguntasMasAcertadasPasado',
            'descripcion': 'Te pone preguntas que has acertado previamente en el pasado priorizando las que mas aciertas',
            'endpoint': '/algoritmos/preguntas-mas-acertadas-pasado'
        },
        {
            'nombre': 'AlgoritmoUsuarioPositivo',
            'descripcion': 'Te pone preguntas que otros usuarios similares a ti han fallado',
            'endpoint': '/algoritmos/usuario-positivo'
        },
        {
            'nombre': 'AlgoritmoUsuarioNegativo',
            'descripcion': 'Te pone preguntas que otros usuarios similares a ti han acertado',
            'endpoint': '/algoritmos/usuario-negativo'
        },
        {
            'nombre': 'AlgoritmoItemPositivo',
            'descripcion': 'Te recomienda preguntas basándose en la similitud entre preguntas que otros usuarios han fallado juntas',
            'endpoint': '/algoritmos/item-positivo'
        },
        {
            'nombre': 'AlgoritmoItemNegativo',
            'descripcion': 'Te recomienda preguntas basándose en la similitud entre preguntas que otros usuarios han acertado juntas',
            'endpoint': '/algoritmos/item-negativo'
        }
    ]
    return jsonify({'algoritmos': algoritmos})


if __name__ == '__main__':
    port = int(os.getenv('PORT', 3014))
    app.run(host='0.0.0.0', port=port, debug=True)