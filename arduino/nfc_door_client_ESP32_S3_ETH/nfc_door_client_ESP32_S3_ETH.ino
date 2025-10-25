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
#include <Wire.h>
#include <Adafruit_PN532.h>
#include <SPI.h>
#include <Ethernet.h>

EthernetClient networkClient;
Adafruit_PN532 nfc(SDA_PIN, SCL_PIN);

unsigned long lastCardTime = 0;
bool doorLocked = true;
unsigned long doorUnlockTime = 0;

void setup() {
  if (DEBUG_SERIAL) {
    Serial.begin(SERIAL_BAUD);
    Serial.println("NFC Door Control Client (PN532) Starting...");
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

  // Initialize I2C and PN532
  Wire.begin(SDA_PIN, SCL_PIN);
  nfc.begin();
  nfc.SAMConfig();

  // Connect to network
  connectToNetwork();

  if (DEBUG_SERIAL) {
    Serial.println("System ready. Waiting for NFC cards...");
  }

  // Success beep
  beep(2, 100);
}

void loop() {
  // Check Ethernet connection
  if (Ethernet.linkStatus() == LinkOFF) {
    if (DEBUG_SERIAL) {
      Serial.println("Ethernet disconnected. Reconnecting...");
    }
    connectToNetwork();
  }

  // Check if door should be locked again
  if (!doorLocked && millis() - doorUnlockTime > DOOR_UNLOCK_TIME) {
    lockDoor();
  }

  // Check for new NFC card
  uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };
  uint8_t uidLength;

  if (nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength)) {
    if (millis() - lastCardTime > CARD_READ_DELAY) {
      handleNFCCard(uid, uidLength);
      lastCardTime = millis();
    }
  }

  delay(100);
}

void connectToNetwork() {
  if (DEBUG_SERIAL) {
    Serial.print("Connecting to Ethernet (W5500)");
  }

  // Initialize SPI with W5500 custom pins
  SPI.begin(W5500_SCK, W5500_MISO, W5500_MOSI, W5500_CS);

  // Initialize Ethernet with W5500
  Ethernet.init(W5500_CS);
  Ethernet.begin(mac, ip, dns, gateway, subnet);

  // Verify if IP address is properly assigned
  if (Ethernet.localIP() == IPAddress(0, 0, 0, 0)) {
    if (DEBUG_SERIAL) {
      Serial.println();
      Serial.println("Failed to configure Ethernet with static IP");
    }
  } else {
    if (DEBUG_SERIAL) {
      Serial.println();
      Serial.print("Ethernet connected! IP: ");
      Serial.println(Ethernet.localIP());
    }
  }
}

void handleNFCCard(uint8_t* uid, uint8_t uidLength) {
  String tagId = getTagId(uid, uidLength);

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

String getTagId(uint8_t* uid, uint8_t uidLength) {
  String tagId = "";
  for (uint8_t i = 0; i < uidLength; i++) {
    if (uid[i] < 0x10) {
      tagId += "0";
    }
    tagId += String(uid[i], HEX);
  }
  tagId.toUpperCase();
  return tagId;
}

bool validateTag(String tagId) {
  if (Ethernet.linkStatus() == LinkOFF) {
    if (DEBUG_SERIAL) {
      Serial.println("No Ethernet connection - access denied");
    }
    return false;
  }

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

  // Manual HTTP request for Ethernet
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
