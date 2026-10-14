package com.datashifter.notification.hub.dto;

import com.datashifter.notification.hub.models.DeliveryStatus;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {
    private String notificationId;
    private DeliveryStatus status;
    private String message;
    private Instant timestamp;
}
