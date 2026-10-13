package com.datashifter.notification.hub.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TemplateSamplePreview {
    private String templateName;
    private List<String> availablePlaceholders;
    private String sampleSubject;
    private String sampleBody;
}
