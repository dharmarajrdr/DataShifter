package com.datashifter.notification.hub.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebhookFieldMetadata {
    private String key;
    private String description;
    private String example;
    private boolean defaultIncluded;
}
