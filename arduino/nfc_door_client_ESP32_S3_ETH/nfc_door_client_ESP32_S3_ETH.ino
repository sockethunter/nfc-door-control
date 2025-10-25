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

#ifdef ENABLE_CAMERA
  #include "esp_camera.h"
  #include "base64.h"
#endif

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

#ifdef ENABLE_CAMERA
  // Initialize camera
  initCamera();
#endif

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
  DynamicJsonDocument doc(16384);  // Larger size for optional image (16KB)
  doc["tagId"] = tagId;
  doc["clientId"] = CLIENT_ID;

#ifdef ENABLE_CAMERA
  // Capture and add image if camera is enabled
  if (DEBUG_SERIAL) {
    Serial.println("Capturing image...");
    Serial.print("Free heap before: ");
    Serial.println(ESP.getFreeHeap());
  }

  String imageBase64 = captureImageBase64();

  if (DEBUG_SERIAL) {
    Serial.print("Free heap after: ");
    Serial.println(ESP.getFreeHeap());
    Serial.print("Image size: ");
    Serial.println(imageBase64.length());
  }

  if (imageBase64.length() > 0) {
    doc["image"] = imageBase64;
    if (DEBUG_SERIAL) {
      Serial.println("Image added to payload");
    }
  }
#endif

  String payload;
  serializeJson(doc, payload);

  if (DEBUG_SERIAL) {
    Serial.print("Sending request (payload size: ");
    Serial.print(payload.length());
    Serial.println(" bytes)");
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
    networkClient.print(payload);
    networkClient.flush();  // Make sure all data is sent

    if (DEBUG_SERIAL) {
      Serial.println("Request sent, waiting for response...");
    }

    // Wait for response with timeout
    unsigned long timeout = millis();
    while (networkClient.connected() && !networkClient.available()) {
      if (millis() - timeout > 10000) {  // 10 second timeout
        if (DEBUG_SERIAL) {
          Serial.println("Response timeout!");
        }
        networkClient.stop();
        return false;
      }
      delay(10);
    }

    bool headersPassed = false;
    String response = "";
    timeout = millis();
    while (networkClient.available() || (networkClient.connected() && (millis() - timeout < 5000))) {
      if (networkClient.available()) {
        String line = networkClient.readStringUntil('\n');
        timeout = millis();  // Reset timeout on data received
        if (line == "\r") {
          headersPassed = true;
        } else if (headersPassed) {
          response += line;
        }
      }
      delay(1);
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

#ifdef ENABLE_CAMERA
void initCamera() {
  pinMode(CAM_ENABLE, OUTPUT);
  digitalWrite(CAM_ENABLE, LOW);

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.frame_size = FRAMESIZE_QQVGA;  // Very small size to avoid memory issues (160x120)
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = 20;  // Higher value = lower quality = smaller size
  config.fb_count = 1;

  if (psramFound()) {
    config.jpeg_quality = 15;  // Moderate compression for PSRAM
    config.fb_count = 2;
    config.grab_mode = CAMERA_GRAB_LATEST;
    config.frame_size = FRAMESIZE_QVGA;  // Can use larger size with PSRAM
  } else {
    config.fb_location = CAMERA_FB_IN_DRAM;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    if (DEBUG_SERIAL) {
      Serial.printf("Camera init failed with error 0x%x\n", err);
    }
    return;
  }

  sensor_t *s = esp_camera_sensor_get();
  if (s->id.PID == OV5640_PID) {
    s->set_vflip(s, 1);
  } else {
    s->set_vflip(s, 0);
  }

  if (DEBUG_SERIAL) {
    Serial.println("Camera initialized successfully");
  }
}

String captureImageBase64() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    if (DEBUG_SERIAL) {
      Serial.println("Camera capture failed");
    }
    return "";
  }

  if (DEBUG_SERIAL) {
    Serial.print("Captured frame size: ");
    Serial.print(fb->len);
    Serial.println(" bytes");
  }

  // Reserve memory for base64 string (base64 is ~1.33x larger than binary)
  String imageBase64;
  imageBase64.reserve((fb->len * 4) / 3 + 4);

  // Encode to base64
  imageBase64 = base64::encode(fb->buf, fb->len);

  // Return framebuffer immediately after encoding
  esp_camera_fb_return(fb);

  if (DEBUG_SERIAL) {
    Serial.print("Base64 string size: ");
    Serial.print(imageBase64.length());
    Serial.println(" bytes");
  }

  return imageBase64;
}
#endif
