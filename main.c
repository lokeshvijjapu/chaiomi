#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "nvs_flash.h"
#include "esp_netif.h"
#include "esp_http_server.h"
#include "esp_http_client.h"
#include "esp_crt_bundle.h"
#include "driver/gpio.h"

#define TAG "RELAY_WEB"

// ==================== PEM Certificate As C String ====================
const char ca_cert[] =
"-----BEGIN CERTIFICATE-----\n"
"MIICnzCCAiWgAwIBAgIQf/MZd5csIkp2FV0TttaF4zAKBggqhkjOPQQDAzBHMQsw\n"
"CQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZpY2VzIExMQzEU\n"
"MBIGA1UEAxMLR1RTIFJvb3QgUjQwHhcNMjMxMjEzMDkwMDAwWhcNMjkwMjIwMTQw\n"
"MDAwWjA7MQswCQYDVQQGEwJVUzEeMBwGA1UEChMVR29vZ2xlIFRydXN0IFNlcnZp\n"
"Y2VzMQwwCgYDVQQDEwNXRTEwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAARvzTr+\n"
"Z1dHTCEDhUDCR127WEcPQMFcF4XGGTfn1XzthkubgdnXGhOlCgP4mMTG6J7/EFmP\n"
"LCaY9eYmJbsPAvpWo4H+MIH7MA4GA1UdDwEB/wQEAwIBhjAdBgNVHSUEFjAUBggr\n"
"BgEFBQcDAQYIKwYBBQUHAwIwEgYDVR0TAQH/BAgwBgEB/wIBADAdBgNVHQ4EFgQU\n"
"kHeSNWfE/6jMqeZ72YB5e8yT+TgwHwYDVR0jBBgwFoAUgEzW63T/STaj1dj8tT7F\n"
"avCUHYwwNAYIKwYBBQUHAQEEKDAmMCQGCCsGAQUFBzAChhhodHRwOi8vaS5wa2ku\n"
"Z29vZy9yNC5jcnQwKwYDVR0fBCQwIjAgoB6gHIYaaHR0cDovL2MucGtpLmdvb2cv\n"
"ci9yNC5jcmwwEwYDVR0gBAwwCjAIBgZngQwBAgEwCgYIKoZIzj0EAwMDaAAwZQIx\n"
"AOcCq1HW90OVznX+0RGU1cxAQXomvtgM8zItPZCuFQ8jSBJSjz5keROv9aYsAm5V\n"
"sQIwJonMaAFi54mrfhfoFNZEfuNMSQ6/bIBiNLiyoX46FohQvKeIoJ99cx7sUkFN\n"
"7uJW\n"
"-----END CERTIFICATE-----\n"
"";

#define WIFI_SSID      "Neonflake"
#define WIFI_PASS      "FanSense#2023"

#define NUM_RELAYS 6
gpio_num_t relay_pins[NUM_RELAYS] = {
    GPIO_NUM_1,
    GPIO_NUM_2,
    GPIO_NUM_41,
    GPIO_NUM_42,
    GPIO_NUM_45,
    GPIO_NUM_46
};

const char *relay_names[NUM_RELAYS] = {
    "Tea",
    "Coffee",
    "Hot water",
    "Milk",
    "Cold coffee",
    "Green tea"
};

// ==================== Wi-Fi Event Handler ====================
static void wifi_event_handler(void *arg, esp_event_base_t event_base,
                               int32_t event_id, void *event_data)
{
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        ESP_LOGW(TAG, "WiFi disconnected! Retrying...");
        esp_wifi_connect();
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *event = (ip_event_got_ip_t *)event_data;
        ESP_LOGI(TAG, "✅ WiFi connected! IP: " IPSTR, IP2STR(&event->ip_info.ip));
    }
}

// ==================== Wi-Fi Init ====================
void wifi_init(void)
{
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    esp_event_handler_instance_t instance_any_id;
    esp_event_handler_instance_t instance_got_ip;
    ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID,
                                                       &wifi_event_handler, NULL, &instance_any_id));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP,
                                                       &wifi_event_handler, NULL, &instance_got_ip));

    wifi_config_t wifi_config = {
        .sta = {
            .ssid = WIFI_SSID,
            .password = WIFI_PASS,
        },
    };
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());
}

// ==================== Send Log to Backend ====================
void send_log_to_backend(const char *deviceId, const char *message)
{
    esp_http_client_config_t config = {
        .url = "https://api-chaiomi.onrender.com/api/logs",
        .method = HTTP_METHOD_POST,
        .cert_pem = ca_cert,
        .timeout_ms = 8000,
    };

    esp_http_client_handle_t client = esp_http_client_init(&config);

    char post_data[256];
    snprintf(post_data, sizeof(post_data),
             "{\"deviceId\":\"%s\", \"message\":\"%s\"}",
             deviceId, message);

    esp_http_client_set_header(client, "Content-Type", "application/json");
    esp_http_client_set_post_field(client, post_data, strlen(post_data));

    esp_err_t err = esp_http_client_perform(client);

    if (err == ESP_OK) {
        int status = esp_http_client_get_status_code(client);
        ESP_LOGI(TAG, "✅ Log sent! HTTP Status: %d | %s", status, message);
    } else {
        ESP_LOGE(TAG, "❌ Failed to send log: %s", esp_err_to_name(err));
    }

    esp_http_client_cleanup(client);
}

// ==================== Relay Control ====================
void relay_on_for_10s(void *param)
{
    int relay_id = (int)param;
    if (relay_id < 0 || relay_id >= NUM_RELAYS) {
        vTaskDelete(NULL);
        return;
    }

    gpio_set_level(relay_pins[relay_id], 1);
    ESP_LOGI(TAG, "%s ON", relay_names[relay_id]);
    send_log_to_backend("Device-1", relay_names[relay_id]);

    vTaskDelay(pdMS_TO_TICKS(10000));

    gpio_set_level(relay_pins[relay_id], 0);
    ESP_LOGI(TAG, "%s OFF", relay_names[relay_id]);
    vTaskDelete(NULL);
}

// ========== PING ENDPOINT ==========
esp_err_t ping_get_handler(httpd_req_t *req)
{
    httpd_resp_send(req, "pong", HTTPD_RESP_USE_STRLEN);
    return ESP_OK;
}

// ========== Heartbeat Task ==========
void heartbeat_task(void *param)
{
    while (1) {
        esp_http_client_config_t config = {
            .url = "https://api-chaiomi.onrender.com/api/heartbeat",
            .method = HTTP_METHOD_POST,
            .cert_pem = ca_cert,
            .timeout_ms = 8000,
        };

        esp_http_client_handle_t client = esp_http_client_init(&config);
        char post_data[100];
        snprintf(post_data, sizeof(post_data), "{\"deviceId\":\"Device-1\"}");

        esp_http_client_set_header(client, "Content-Type", "application/json");
        esp_http_client_set_post_field(client, post_data, strlen(post_data));
        esp_err_t err = esp_http_client_perform(client);

        if (err == ESP_OK) {
            ESP_LOGI(TAG, "✅ Heartbeat sent");
        } else {
            ESP_LOGE(TAG, "❌ Failed to send heartbeat: %s", esp_err_to_name(err));
        }

        esp_http_client_cleanup(client);
        vTaskDelay(pdMS_TO_TICKS(60000)); // Wait 60 seconds
    }
}

// ==================== HTTP Handlers ====================
esp_err_t root_get_handler(httpd_req_t *req)
{
    char html[2048];
    snprintf(html, sizeof(html),
             "<html><body style='text-align:center;font-family:sans-serif;background:#f5f5f5'>"
             "<h2>Chaiomi Control Panel</h2>");

    for (int i = 0; i < NUM_RELAYS; i++) {
        char btn[300];
        snprintf(btn, sizeof(btn),
                 "<button onclick=\"fetch('/relay/%d')\" "
                 "style='font-size:20px;margin:10px;padding:10px 30px;"
                 "background:#007bff;color:white;border:none;border-radius:10px;cursor:pointer;'>%s</button><br>",
                 i, relay_names[i]);
        strcat(html, btn);
    }

    strcat(html, "</body></html>");
    httpd_resp_send(req, html, HTTPD_RESP_USE_STRLEN);
    return ESP_OK;
}

esp_err_t relay_get_handler(httpd_req_t *req)
{
    char path[64];
    strcpy(path, req->uri);

    int relay_id = atoi(path + 7);
    if (relay_id < 0 || relay_id >= NUM_RELAYS) {
        httpd_resp_send_404(req);
        return ESP_FAIL;
    }

    ESP_LOGI(TAG, "Relay request received for %s", relay_names[relay_id]);
    xTaskCreate(relay_on_for_10s, "relay_task", 4096, (void *)relay_id, 5, NULL);

    httpd_resp_sendstr(req, "OK");
    return ESP_OK;
}

// ==================== Web Server ====================
httpd_handle_t start_webserver(void)
{
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.uri_match_fn = httpd_uri_match_wildcard;

    httpd_handle_t server = NULL;
    if (httpd_start(&server, &config) == ESP_OK) {
        httpd_uri_t root_uri = {
            .uri = "/",
            .method = HTTP_GET,
            .handler = root_get_handler,
            .user_ctx = NULL
        };
        httpd_register_uri_handler(server, &root_uri);

        httpd_uri_t relay_uri = {
            .uri = "/relay/*",
            .method = HTTP_GET,
            .handler = relay_get_handler,
            .user_ctx = NULL
        };
        httpd_register_uri_handler(server, &relay_uri);

        httpd_uri_t ping_uri = {
            .uri = "/ping",
            .method = HTTP_GET,
            .handler = ping_get_handler,
            .user_ctx = NULL
        };
        httpd_register_uri_handler(server, &ping_uri);
    }
    return server;
}

// ==================== Main ====================
void app_main(void)
{
    ESP_ERROR_CHECK(nvs_flash_init());
    wifi_init();

    for (int i = 0; i < NUM_RELAYS; i++) {
        gpio_reset_pin(relay_pins[i]);
        gpio_set_direction(relay_pins[i], GPIO_MODE_OUTPUT);
        gpio_set_level(relay_pins[i], 0);
    }

    xTaskCreate(heartbeat_task, "heartbeat_task", 4096, NULL, 5, NULL);

    ESP_LOGI(TAG, "Loaded backend certificate (hardcoded string)");

    start_webserver();
    ESP_LOGI(TAG, "🌐 Web server started. Open the ESP32 IP in your browser!");
}
