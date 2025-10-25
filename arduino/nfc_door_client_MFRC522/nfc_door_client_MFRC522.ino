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
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <MFRC522.h>
#include <SPI.h>
#include "config.h"

MFRC522 mfrc522(SS_PIN, RST_PIN);
WiFiClient wifiClient;
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
  
  // Connect to WiFi
  connectToWiFi();
  
  if (DEBUG_SERIAL) {
    Serial.println("System ready. Waiting for NFC cards...");
  }
  
  // Success beep
  beep(2, 100);
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    if (DEBUG_SERIAL) {
      Serial.println("WiFi disconnected. Reconnecting...");
    }
    connectToWiFi();
  }
  
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

void connectToWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  if (DEBUG_SERIAL) {
    Serial.print("Connecting to WiFi");
  }
  
  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < WIFI_TIMEOUT) {
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
  if (WiFi.status() != WL_CONNECTED) {
    if (DEBUG_SERIAL) {
      Serial.println("No WiFi connection - access denied");
    }
    return false;
  }
  
  http.begin(wifiClient, String(SERVER_URL) + "/tags/validate");
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(HTTP_TIMEOUT);
  
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
  
  int httpResponseCode = http.POST(payload);
  bool accessGranted = false;
  
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