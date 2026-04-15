#from paho.mqtt import client as mqtt_client
import psycopg2
import random
import time

# Elephant Postgres database connection
connection = psycopg2.connect(
    host="rosie.db.elephantsql.com",
    database="fxhidcmt",
    user="fxhidcmt",
    password="4eXzjCATxWtDpiCfl5ASWZMD1sEyxn9X")


def deleleteZones():
    cursor = connection.cursor()
    location_query = f'DELETE FROM zones'
    cursor.execute(location_query)
    connection.commit()
    print("Deleted Zones");
    cursor.close() 
    
def deleleteNotifications():
    cursor = connection.cursor()
    location_query = f'DELETE FROM notifications'
    cursor.execute(location_query)
    connection.commit()
    print("Deleted Notifications");
    cursor.close() 

def insertLocationRecord(tagid, x, y, z, quality):
    cursor = connection.cursor()
    location_query = f'''INSERT INTO location (tagid, x, y, z, quality) VALUES ('{tagid}',{x}, {y}, {z}, {quality})'''
    cursor.execute(location_query)
    connection.commit()
    print("Inserted location record")
    cursor.close() 


def run():
    x = 26
    y = 14.5
    z = 1

    deleleteNotifications();
    deleleteZones()
    #for i in range(0, 20):
     #   insertLocationRecord('0xc532', x, y, z, random.randint(50, 100))
      #  x = x - 1
       # time.sleep(0.5)

if __name__ == '__main__':
    run()



# from paho.mqtt import client as mqtt_client
# import psycopg2

# import random
# import time
# import json

# # Elephant Postgres database connection
# connection = psycopg2.connect(
#     host="rosie.db.elephantsql.com",
#     database="fxhidcmt",
#     user="fxhidcmt",
#     password="4eXzjCATxWtDpiCfl5ASWZMD1sEyxn9X")

# create_table_query = '''CREATE Table Location
# (ID SERIAL PRIMARY KEY,
# tagID TEXT NOT NULL,
# systemID TEXT NOT NULL,
# x REAL NOT NULL,
# y REAL NOT NULL,
# z REAL NOT NULL,
# quality INT NOT NULL,
# time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);'''


# broker = '127.0.1.1' # Raspberry Pi IP Address
# port = 1883 # MQTT default port

# tagID = "c532"
# anchorID = "0ab5"
# tagID2 = "robot"
# tagID3 = "laptop"
# tagID3 = "person1"


# topic = "dwm/node/" + tagID + "/uplink/location" # Tag location
# topic2 = "dwm/node/" + anchorID + "/uplink/config" # anchor location
# client_id = "python-mqtt-{random.randint(0, 1000)}"

# username = 'liam'
# password = '1234'

# def mqtt_connection():
#     def on_connect(client, userdata, flags, rc):
#         if rc == 0:
#             print("Connected to MQTT Broker")
#         else:
#             print("Failed to conenct to the MQTT broker")
        
#     client = mqtt_client.Client(client_id)
#     client.username_pw_set(username, password)
#     client.on_connect = on_connect
#     client.connect(broker, port)
#     return client

# def publish(client):
#     msg_count = 0
    
#     while True:
#         time.sleep(1)
#         msg = "messages: {0}".format(msg_count)
#         result = client.publish(topic, msg)

#         status = result[0]

#         if status == 0:
#             print("Test")
#         else:
#             print("Test2")

#         msg_count += 1


# def subscribe(client: mqtt_client):
#     # Variables for testing document
#     x = 0
#     numPositions = 0
#     totalQuality = 0
#     xPositions = []
#     yPositions = []
#     numNaN = 0
    
#     while True:
#         def on_message(client, userdata, msg):
#             if (x < 900):
#                 nonlocal x
#                 x += 1
#                 print(x)
#                 mqttData = msg.payload.decode() # Get mqtt topic data
#                 jsonData = json.loads(mqttData) # convert mqtt data to json
#                 location = jsonData['position'] # Get position data E.G (x, y, z) and quality
#                 print("x:" + str(location['x']) + "  y: " + str(location['y']) + ' z: ' + str(location['z']) + ' Quality: ' + str(location['quality']))
                    
#                 # Check that a float value was found for the location data
#                 if ((location['x'] != 'NaN') and (location['y'] != 'NaN') and (location['z'] != 'NaN') and (location['quality'] != 'NaN')):
#                     insertLocationRecord(tagID, round(location['x'], 2), round(location['y'], 2), round(location['z'], 2), location['quality'])
                    
#                     nonlocal numPositions
#                     numPositions += 1
                    
#                     nonlocal totalQuality
#                     totalQuality += location['quality']
                    
#                     nonlocal xPositions
#                     xPositions.append(location['x'])
                    
#                     nonlocal yPositions
#                     yPositions.append(location['y'])
#                 else:
#                     nonlocal numNaN
#                     numNaN += 1
#                     print("Location error")
                        
#             else:
#                 varianceX = 0
#                 varianceY = 0

#                 averageQuality = totalQuality / numPositions

#                 totalX = 0

#                 for xPos in xPositions:
#                     totalX = totalX + xPos

#                 meanX = totalX / len(xPositions)

#                 for xPos in xPositions:
#                     varianceX = varianceX + abs(meanX - xPos)

#                 totalY = 0

#                 for yPos in yPositions:
#                     totalY = totalY + yPos

#                 meanY = totalY / len(yPositions)

#                 for yPos in yPositions:
#                     varianceY = varianceY + abs(meanY - yPos)

#                 print("Average Quality = " + str(round(averageQuality, 2)))
#                 print("Variance = " + str(round((varianceX + varianceY) / 2, 2)))
#                 print("Percentage NaN = " + str(round((numNaN / x) * 100, 2)) + "%")
#                 exit()

#     # Get location for 30s interval (testing)
    
#         client.subscribe(topic)
#         client.on_message = on_message
#         time.sleep(1)

    

# def anchorLocation(client: mqtt_client):
#     while True:
        
#         def on_message(client, userdata, msg):
#             mqttData = msg.payload.decode() # Get mqtt topic data
#             jsonData = json.loads(mqttData) # convert mqtt data to json
#             print(jsonData)
#             #anchorLocation = jsonData['configuration']['anchor']['position']# Get position data E.G (x, y, z) and quality
#             #print(anchorLocation['x'])pg
#             #print(anchorLocation['y'])
#             #print(anchorLocation['z'])
#             time.sleep(1)
    
#         client.subscribe('#')
#         client.on_message = on_message
        
        
# def insertLocationRecord(tagID, x, y, z, quality):
#     cursor = connection.cursor()
#     location_query = "INSERT INTO location (tagid, x, y, z, quality) VALUES ('{0}',{1}, {2}, {3}, {4})".format(tagID, x, y, z, quality)
#     cursor.execute(location_query)
#     connection.commit()
#     print("Inserted location record")
#     cursor.close() 

        
# def tempDelete():
#     cursor = connection.cursor()
#     location_query = "INSERT INTO tags (networkID, tagID, name, normal_update_rate, stationary_update_rate) VALUES ('0x0RT6', 'c532', 'Liam', 0.5, 0.5)"
#     cursor.execute(location_query)
#     connection.commit()
#     print("Inserted tag")
#     cursor.close() 

# def run():
#     x = 4
#     y = 4
#     z = 1

#     #insertLocationRecord('0xAAAA', x, y, z, random.randint(50, 100))
#     #time.sleep(0.1)

#     client = mqtt_connection()
#     client.loop_start()
#     while True:
#         subscribe(client)
#         time.sleep(1)

# if __name__ == '__main__':
#     run()