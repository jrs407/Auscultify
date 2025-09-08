from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import os
from AleatorioSimple import AleatorioSimple

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

@app.route('/algoritmos/disponibles', methods=['GET'])
def obtener_algoritmos_disponibles():
    algoritmos = [
        {
            'nombre': 'AleatorioSimple',
            'descripcion': 'Algoritmo aleatorio simple',
            'endpoint': '/algoritmos/aleatorio-simple'
        }
    ]
    return jsonify({'algoritmos': algoritmos})


if __name__ == '__main__':
    port = int(os.getenv('PORT', 3014))
    app.run(host='0.0.0.0', port=port, debug=True)