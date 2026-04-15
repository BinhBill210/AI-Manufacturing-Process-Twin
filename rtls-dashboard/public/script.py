from paho.mqtt import client as mqtt_client
import psycopg2
import random
import time
import json

# Elephant Postgres database connection
connection = psycopg2.connect(
    host="rosie.db.elephantsql.com",
    database="fxhidcmt",
    user="fxhidcmt",
    password="4eXzjCATxWtDpiCfl5ASWZMD1sEyxn9X")

broker = '192.168.0.127' # Raspberry Pi IP Address
port = 1883 # MQTT default port
client_id = "python-mqtt-{random.randint(0, 1000)}"
username = 'liam'
password = '1234'

tagID = "c532"
#tagID2 = "9c2e"
#tagID3 = "9903"
topic = "dwm/node/" + tagID + "/uplink/location"
#topic2 = "dwm/node/" + tagID2 + "/uplink/location"
#topic3 = "dwm/node/" + tagID3 + "/uplink/location"

x_offset = 31.5
y_offset = 5

def mqtt_connection():
    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print("Connected to MQTT Broker")
        else:
            print("Failed to conenct to the MQTT broker")
        
    def on_message(client, userdata, msg):
        mqttData = msg.payload.decode() # Get mqtt topic data
        jsonData = json.loads(mqttData) # convert mqtt data to json
        location = jsonData['position'] # Get position data E.G (x, y, z) and quality
        
        if (location['x'] != 'NaN' and location['y'] != 'NaN' and location['z'] != 'NaN'):
            x = round(location['x'], 2)
            y = round(location['y'], 2)
            z = round(location['z'], 2)
            quality = round(location['quality'], 2)
            #topic_split = msg.topic.split('/')
            #id = topic_split[2]
            insertLocationRecord('c532', x + x_offset, y + y_offset, z, quality) # Need to add the x and y offsets because anchors are not in cornes of FoF
        
        

    client = mqtt_client.Client(client_id)
    client.username_pw_set(username, password)
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(broker, port)
    return client

        
def insertLocationRecord(tagID, x, y, z, quality):
    cursor = connection.cursor()
    location_query = "INSERT INTO location (tagid, x, y, z, quality) VALUES ('{0}',{1}, {2}, {3}, {4})".format(tagID, x, y, z, quality)
    cursor.execute(location_query)
    connection.commit()
    print("Inserted location record")
    cursor.close() 


def run():
    client = mqtt_connection()
    client.loop_start()

    client.subscribe(topic)
    #client.subscribe(topic2)
    #client.subscribe(topic3)

    while True:
        time.sleep(1)

if __name__ == '__main__':
    run()