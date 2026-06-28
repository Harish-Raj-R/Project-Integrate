package com.civicdesk.common.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class NotificationClient {
    private static final Logger log = LoggerFactory.getLogger(NotificationClient.class);
    private final RestClient restClient;

    public NotificationClient(RestClient.Builder builder,
                              @Value("${app.notification.base-url:http://localhost:8080/civicDesk/notificationsAlerts}") String baseUrl) {
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    public void sendNotification(String userId, String message, String category) {
        try {
            NotificationRequest payload = new NotificationRequest(userId, message, category);
            restClient.post()
                    .uri("/createNotification")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Successfully sent {} notification to user {}", category, userId);
        } catch (Exception e) {
            log.error("Failed to send {} notification to user {}: {}", category, userId, e.getMessage());
        }
    }

    public record NotificationRequest(String userId, String message, String category) {}
}
