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

// Alarm system variables
bool alarmActive = false;
unsigned long alarmStartTime = 0;
unsigned long lastAlarmBlinkTime = 0;
bool alarmBlinkState = false;

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
  pinMode(CONTACT_PIN, INPUT_PULLUP);  // Pullup for alarm contact (HIGH = normal)

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
  // Check alarm contact (LOW = contact lost, trigger alarm)
  if (digitalRead(CONTACT_PIN) == LOW) {
    if (!alarmActive) {
      // Start alarm
      alarmActive = true;
      alarmStartTime = millis();
      if (DEBUG_SERIAL) {
        Serial.println("ALARM! Contact lost - activating alarm for 5 minutes");
      }

      // Report tamper attempt to server
      reportTamperAttempt();
    }
  }

  // Handle alarm blinking and timeout
  if (alarmActive) {
    unsigned long currentTime = millis();

    // Check if alarm duration has elapsed
    if (currentTime - alarmStartTime >= ALARM_DURATION) {
      // Stop alarm
      alarmActive = false;
      digitalWrite(BUZZER_PIN, LOW);
      digitalWrite(LED_RED_PIN, doorLocked ? HIGH : LOW);  // Restore normal state
      if (DEBUG_SERIAL) {
        Serial.println("Alarm duration expired - deactivating alarm");
      }
    } else {
      // Blink buzzer and red LED
      if (currentTime - lastAlarmBlinkTime >= ALARM_BLINK_INTERVAL) {
        alarmBlinkState = !alarmBlinkState;
        digitalWrite(BUZZER_PIN, alarmBlinkState ? HIGH : LOW);
        digitalWrite(LED_RED_PIN, alarmBlinkState ? HIGH : LOW);
        lastAlarmBlinkTime = currentTime;
      }
    }
  }

  // Only process normal operations if alarm is not active
  if (!alarmActive) {
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

  // Create JSON document
  DynamicJsonDocument doc(16384);
  doc["tagId"] = tagId;
  doc["clientId"] = CLIENT_ID;

#ifdef ENABLE_CAMERA
  if (DEBUG_SERIAL) {
    Serial.println("Capturing image...");
    Serial.print("Free heap before: ");
    Serial.println(ESP.getFreeHeap());
  }

  String imageBase64 = captureImageBase64();

  if (DEBUG_SERIAL) {
    Serial.print("Free heap after: ");
    Serial.println(ESP.getFreeHeap());
    Serial.print("Base64 length: ");
    Serial.println(imageBase64.length());
  }

  if (imageBase64.length() > 0) {
    doc["image"] = imageBase64;
  }
#endif

  // Measure JSON size for Content-Length (no String copy!)
  size_t contentLen = measureJson(doc);

  if (DEBUG_SERIAL) {
    Serial.print("Connecting to ");
    Serial.print(SERVER_HOST);
    Serial.print(":");
    Serial.println(SERVER_PORT);
    Serial.print("Content-Length: ");
    Serial.println(contentLen);
  }

  if (!networkClient.connect(SERVER_HOST, SERVER_PORT)) {
    if (DEBUG_SERIAL) {
      Serial.println("Connection failed");
    }
    return false;
  }

  networkClient.setTimeout(15000);

  if (DEBUG_SERIAL) {
    Serial.println("Connected! Sending request...");
  }

  // Send HTTP headers
  networkClient.print(
    String("POST /tags/validate HTTP/1.1\r\n") +
    "Host: " + String(SERVER_HOST) + "\r\n" +
    "Content-Type: application/json\r\n" +
    "Connection: close\r\n" +
    "Content-Length: " + String(contentLen) + "\r\n" +
    "\r\n"
  );

  // Stream JSON directly to socket (no String copy!)
  serializeJson(doc, networkClient);

  if (DEBUG_SERIAL) {
    Serial.println("Request sent, waiting for response...");
  }

  // Read response headers until \r\n\r\n
  String header;
  unsigned long t0 = millis();
  while (millis() - t0 < 15000) {
    while (networkClient.available()) {
      char c = networkClient.read();
      header += c;
      if (header.endsWith("\r\n\r\n")) goto headers_done;
    }
    if (!networkClient.connected()) break;
    delay(1);
  }
headers_done:

  if (DEBUG_SERIAL) {
    Serial.println("Response headers:");
    Serial.println(header);
  }

  // Extract status code
  int statusCode = 0;
  int idx = header.indexOf(" ");
  if (idx >= 0) {
    statusCode = header.substring(idx + 1).toInt();
  }

  // Read response body
  String body;
  t0 = millis();
  while (millis() - t0 < 5000) {
    while (networkClient.available()) {
      char c = networkClient.read();
      body += c;
      t0 = millis();
    }
    if (!networkClient.connected()) break;
    delay(1);
  }

  networkClient.stop();

  if (DEBUG_SERIAL) {
    Serial.print("HTTP status: ");
    Serial.println(statusCode);
    Serial.print("Server body: ");
    Serial.println(body);
  }

  // Parse JSON response
  DynamicJsonDocument responseDoc(256);
  DeserializationError err = deserializeJson(responseDoc, body);
  if (err) {
    if (DEBUG_SERIAL) {
      Serial.print("JSON parse error: ");
      Serial.println(err.c_str());
    }
    return false;
  }

  bool allowed = responseDoc["allowed"] | false;
  return allowed;
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

void reportTamperAttempt() {
  if (DEBUG_SERIAL) {
    Serial.println("Reporting tamper attempt to server...");
  }

  if (Ethernet.linkStatus() == LinkOFF) {
    if (DEBUG_SERIAL) {
      Serial.println("No Ethernet connection - cannot report tamper");
    }
    return;
  }

  // Create JSON document
  DynamicJsonDocument doc(16384);
  doc["clientId"] = CLIENT_ID;
  doc["type"] = "tamper";
  doc["timestamp"] = millis();

#ifdef ENABLE_CAMERA
  if (DEBUG_SERIAL) {
    Serial.println("Capturing tamper image...");
  }

  String imageBase64 = captureImageBase64();

  if (imageBase64.length() > 0) {
    doc["image"] = imageBase64;
  }
#endif

  // Measure JSON size for Content-Length
  size_t contentLen = measureJson(doc);

  if (DEBUG_SERIAL) {
    Serial.print("Connecting to server for tamper report...");
    Serial.print("Content-Length: ");
    Serial.println(contentLen);
  }

  if (!networkClient.connect(SERVER_HOST, SERVER_PORT)) {
    if (DEBUG_SERIAL) {
      Serial.println("Connection failed");
    }
    return;
  }

  networkClient.setTimeout(15000);

  if (DEBUG_SERIAL) {
    Serial.println("Connected! Sending tamper report...");
  }

  // Send HTTP headers
  networkClient.print(
    String("POST /alarm/tamper HTTP/1.1\r\n") +
    "Host: " + String(SERVER_HOST) + "\r\n" +
    "Content-Type: application/json\r\n" +
    "Connection: close\r\n" +
    "Content-Length: " + String(contentLen) + "\r\n" +
    "\r\n"
  );

  // Stream JSON directly to socket
  serializeJson(doc, networkClient);

  if (DEBUG_SERIAL) {
    Serial.println("Tamper report sent, waiting for response...");
  }

  // Read response headers
  String header;
  unsigned long t0 = millis();
  while (millis() - t0 < 15000) {
    while (networkClient.available()) {
      char c = networkClient.read();
      header += c;
      if (header.endsWith("\r\n\r\n")) goto tamper_headers_done;
    }
    if (!networkClient.connected()) break;
    delay(1);
  }
tamper_headers_done:

  if (DEBUG_SERIAL) {
    Serial.println("Tamper report response:");
    Serial.println(header);
  }

  networkClient.stop();

  if (DEBUG_SERIAL) {
    Serial.println("Tamper report completed");
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
  // Clear old frames from buffer by capturing and discarding 2-3 frames
  for (int i = 0; i < 3; i++) {
    camera_fb_t *fb_discard = esp_camera_fb_get();
    if (fb_discard) {
      esp_camera_fb_return(fb_discard);
    }
    delay(10);  // Small delay between frames
  }

  // Now capture the actual fresh frame
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
