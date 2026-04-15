from paho.mqtt import client as mqtt_client
import psycopg2

import random
import time
import json
import sys

connection = psycopg2.connect(
    host="rosie.db.elephantsql.com",
    database="fxhidcmt",
    user="fxhidcmt",
    password="4eXzjCATxWtDpiCfl5ASWZMD1sEyxn9X")

broker = '192.168.0.56' # Raspberry Pi IP Address
client_id = f'python-mqtt-{random.randint(0, 1000)}'
port = 1883 # MQTT default port
username = 'liam'
password = '1234'

listOfModuleIDs = []
for id in sys.argv:
    listOfModuleIDs.append(id)

topic = topic = "dwm/node/" + listOfModuleIDs[0] + "/uplink/config"

def mqtt_connection():
    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print("Connected to MQTT Broker")
            sys.stdout.flush()
        else:
            print("Failed to conenct to the MQTT broker")
        
    client = mqtt_client.Client(client_id)
    client.username_pw_set(username, password)
    client.on_connect = on_connect
    client.connect(broker, port)
    return client


def subscribe(client: mqtt_client, id):
    def on_message(client, userdata, msg):
        mqttData = msg.payload.decode() # Get mqtt topic data
        jsonData = json.loads(mqttData) # convert mqtt data to json
        data = jsonData['configuration']
        if (data['nodeType'] == 'ANCHOR'):
            insertAnchor(id, '0x0499', 'anchor', data['anchor']['position']['x'], data['anchor']['position']['y'], data['anchor']['position']['z'], data['anchor']['initiator'])
        else:
            insertTag(id, '0x0499', data['tag']['nomUpdateRate'], data['tag']['statUpdateRate'])

    client.subscribe("dwm/node/" + id + "/uplink/config")
    client.on_message = on_message
    time.sleep(0.3)


def insertAnchor(anchorID, networkID, name, x, y, z, initiator):
    cursor = connection.cursor()
    anchor_query = f'''INSERT INTO anchors (anchorid, networkid, name, x, y, z, initiator) VALUES ('{anchorID}', '{networkID}', 'room',{x}, {y}, {z}, {initiator})'''
    cursor.execute(anchor_query)
    connection.commit()
    print("Inserted anchor record")
    cursor.close()


def insertTag(tagid, networkID, n_update, s_update):
    cursor = connection.cursor()
    tag_query = f'''INSERT INTO tags (tagid, networkid, name, normal_update_rate, stationary_update_rate) VALUES ('{tagid}', '{networkID}','Un-Assigned', {n_update}, {s_update})'''
    cursor.execute(tag_query)
    connection.commit()
    print("Inserted tag record")
    cursor.close()


def run():
    time.sleep(0.2)
    client = mqtt_connection()

    client.loop_start()

    for id in listOfModuleIDs: 
        subscribe(client, id)
    

if __name__ == '__main__':
    run()