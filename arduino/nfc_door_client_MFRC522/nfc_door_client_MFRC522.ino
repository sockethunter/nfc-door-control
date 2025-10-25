/*
 * Copyright (c) 2025 sockethunter
 *
 * This file is part of nfc-door-control
 * (see https://github.com/sockethunter/nfc-door-control).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
#include "config.h"
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <MFRC522.h>
#include <SPI.h>

#ifdef USE_ETHERNET
  #include <Ethernet.h>
  EthernetClient networkClient;
#else
  #include <WiFi.h>
  WiFiClient networkClient;
#endif

MFRC522 mfrc522(SS_PIN, RST_PIN);
HTTPClient http;

unsigned long lastCardTime = 0;
bool doorLocked = true;
unsigned long doorUnlockTime = 0;

void setup() {
  if (DEBUG_SERIAL) {
    Serial.begin(SERIAL_BAUD);
    Serial.println("NFC Door Control Client Starting...");
  }
  
  // Initialize pins
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(CONTACT_PIN, INPUT);
  
  // Initial state
  digitalWrite(RELAY_PIN, LOW);   // Door locked
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_RED_PIN, HIGH); // Red LED on (locked)
  
  // Initialize SPI and MFRC522
  SPI.begin();
  mfrc522.PCD_Init();

  // Connect to network
  connectToNetwork();
  
  if (DEBUG_SERIAL) {
    Serial.println("System ready. Waiting for NFC cards...");
  }
  
  // Success beep
  beep(2, 100);
}

void loop() {
  // Check network connection
  #ifdef USE_ETHERNET
    if (Ethernet.linkStatus() == LinkOFF) {
      if (DEBUG_SERIAL) {
        Serial.println("Ethernet disconnected. Reconnecting...");
      }
      connectToNetwork();
    }
  #else
    if (WiFi.status() != WL_CONNECTED) {
      if (DEBUG_SERIAL) {
        Serial.println("WiFi disconnected. Reconnecting...");
      }
      connectToNetwork();
    }
  #endif
  
  // Check if door should be locked again
  if (!doorLocked && millis() - doorUnlockTime > DOOR_UNLOCK_TIME) {
    lockDoor();
  }
  
  // Check for new NFC card
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    if (millis() - lastCardTime > CARD_READ_DELAY) {
      handleNFCCard();
      lastCardTime = millis();
    }
    mfrc522.PICC_HaltA();
  }

  // Check if box is opened
  //if (digitalRead)
  
  delay(100);
}

void connectToNetwork() {
  #ifdef USE_ETHERNET
    if (DEBUG_SERIAL) {
      Serial.print("Connecting to Ethernet");
    }

    #ifdef ip
      Ethernet.begin(mac, ip);
    #else
      Ethernet.begin(mac);
    #endif

    unsigned long startTime = millis();
    while (Ethernet.linkStatus() == LinkOFF && millis() - startTime < NETWORK_TIMEOUT) {
      delay(500);
      if (DEBUG_SERIAL) {
        Serial.print(".");
      }
    }

    if (Ethernet.linkStatus() == LinkON) {
      if (DEBUG_SERIAL) {
        Serial.println();
        Serial.print("Ethernet connected! IP: ");
        Serial.println(Ethernet.localIP());
      }
    } else {
      if (DEBUG_SERIAL) {
        Serial.println();
        Serial.println("Ethernet connection failed!");
      }
    }
  #else
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    if (DEBUG_SERIAL) {
      Serial.print("Connecting to WiFi");
    }

    unsigned long startTime = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startTime < NETWORK_TIMEOUT) {
      delay(500);
      if (DEBUG_SERIAL) {
        Serial.print(".");
      }
    }

    if (WiFi.status() == WL_CONNECTED) {
      if (DEBUG_SERIAL) {
        Serial.println();
        Serial.print("WiFi connected! IP: ");
        Serial.println(WiFi.localIP());
      }
    } else {
      if (DEBUG_SERIAL) {
        Serial.println();
        Serial.println("WiFi connection failed!");
      }
    }
  #endif
}

void handleNFCCard() {
  String tagId = getTagId();
  
  if (DEBUG_SERIAL) {
    Serial.print("NFC Tag detected: ");
    Serial.println(tagId);
  }
  
  // Validate tag with server
  bool accessGranted = validateTag(tagId);
  
  if (accessGranted) {
    unlockDoor();
  } else {
    denyAccess();
  }
}

String getTagId() {
  String tagId = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      tagId += "0";
    }
    tagId += String(mfrc522.uid.uidByte[i], HEX);
  }
  tagId.toUpperCase();
  return tagId;
}

bool validateTag(String tagId) {
  #ifdef USE_ETHERNET
    if (Ethernet.linkStatus() == LinkOFF) {
      if (DEBUG_SERIAL) {
        Serial.println("No Ethernet connection - access denied");
      }
      return false;
    }
  #else
    if (WiFi.status() != WL_CONNECTED) {
      if (DEBUG_SERIAL) {
        Serial.println("No WiFi connection - access denied");
      }
      return false;
    }
  #endif

  // Create JSON payload
  DynamicJsonDocument doc(201);
  doc["tagId"] = tagId;
  doc["clientId"] = CLIENT_ID;

  String payload;
  serializeJson(doc, payload);

  if (DEBUG_SERIAL) {
    Serial.print("Sending request: ");
    Serial.println(payload);
  }

  bool accessGranted = false;

  #ifdef USE_ETHERNET
    // Manual HTTP request for Ethernet
    // Parse host and port from SERVER_HOST and SERVER_PORT
    if (networkClient.connect(SERVER_HOST, SERVER_PORT)) {
      networkClient.println("POST /tags/validate HTTP/1.1");
      networkClient.println("Host: " + String(SERVER_HOST));
      networkClient.println("Content-Type: application/json");
      networkClient.println("Connection: close");
      networkClient.print("Content-Length: ");
      networkClient.println(payload.length());
      networkClient.println();
      networkClient.println(payload);

      // Read response
      while (networkClient.connected() && !networkClient.available()) {
        delay(1);
      }

      bool headersPassed = false;
      String response = "";
      while (networkClient.available()) {
        String line = networkClient.readStringUntil('\n');
        if (line == "\r") {
          headersPassed = true;
        } else if (headersPassed) {
          response += line;
        }
      }

      networkClient.stop();

      if (DEBUG_SERIAL) {
        Serial.print("Server response: ");
        Serial.println(response);
      }

      DynamicJsonDocument responseDoc(201);
      deserializeJson(responseDoc, response);
      accessGranted = responseDoc["allowed"] | false;
    } else {
      if (DEBUG_SERIAL) {
        Serial.println("Connection failed");
      }
    }
  #else
    // Use HTTPClient for WiFi
    String url = "http://" + String(SERVER_HOST) + ":" + String(SERVER_PORT) + "/tags/validate";
    http.begin(networkClient, url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(HTTP_TIMEOUT);

    int httpResponseCode = http.POST(payload);

    if (httpResponseCode == 201) {
      String response = http.getString();

      if (DEBUG_SERIAL) {
        Serial.print("Server response: ");
        Serial.println(response);
      }

      DynamicJsonDocument responseDoc(201);
      deserializeJson(responseDoc, response);

      accessGranted = responseDoc["allowed"] | false;
    } else {
      if (DEBUG_SERIAL) {
        Serial.print("HTTP Error: ");
        Serial.println(httpResponseCode);
      }
    }

    http.end();
  #endif

  return accessGranted;
}

void unlockDoor() {
  if (DEBUG_SERIAL) {
    Serial.println("Access granted - unlocking door");
  }
  
  doorLocked = false;
  doorUnlockTime = millis();
  
  // Unlock door
  digitalWrite(RELAY_PIN, HIGH);
  
  // Green LED
  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, HIGH);
  
  // Success beep
  beep(1, 500);
}

void lockDoor() {
  if (DEBUG_SERIAL) {
    Serial.println("Locking door");
  }
  
  doorLocked = true;
  
  // Lock door
  digitalWrite(RELAY_PIN, LOW);
  
  // Red LED
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_RED_PIN, HIGH);
}

void denyAccess() {
  if (DEBUG_SERIAL) {
    Serial.println("Access denied");
  }
  
  // Error beep
  beep(3, 200);
  
  // Flash red LED
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_RED_PIN, LOW);
    delay(100);
    digitalWrite(LED_RED_PIN, HIGH);
    delay(100);
  }
}

void beep(int count, int duration) {
  for (int i = 0; i < count; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(duration);
    digitalWrite(BUZZER_PIN, LOW);
    if (i < count - 1) {
      delay(100);
    }
  }
}