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
#ifndef CONFIG_H
#define CONFIG_H

// WiFi Configuration
const char* WIFI_SSID = "SSID";
const char* WIFI_PASSWORD = "PASSWORD";

// Server Configuration
const char* SERVER_URL = "http://192.168.178.27:3005";  // Change to your server IP
const char* CLIENT_ID = "door-001";  // Unique client identifier

// Hardware Pins
#define RELAY_PIN       2
#define LED_GREEN_PIN   12
#define LED_RED_PIN     13
#define BUZZER_PIN      14
#define CONTACT_PIN     15

// I2C Configuration for PN532
#define SDA_PIN         21  // Default I2C SDA pin for ESP32
#define SCL_PIN         22  // Default I2C SCL pin for ESP32

// Timing Configuration
#define DOOR_UNLOCK_TIME 3000    // Time door stays unlocked (ms)
#define CARD_READ_DELAY  1000    // Delay between card reads (ms)
#define WIFI_TIMEOUT     10000   // WiFi connection timeout (ms)
#define HTTP_TIMEOUT     5000    // HTTP request timeout (ms)

// Debug Configuration
#define DEBUG_SERIAL     true
#define SERIAL_BAUD      115200

#endif
