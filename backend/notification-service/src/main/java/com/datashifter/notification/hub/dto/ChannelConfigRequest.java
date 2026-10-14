package com.datashifter.notification.hub.dto;

import com.datashifter.notification.hub.models.ChannelType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelConfigRequest {

    private String pipelineId;

    private java.util.List<String> allowedPipelineIds;

    private java.util.List<String> allowedResources;

    @NotBlank(message = "Channel name is required")
    private String name;

    @NotNull(message = "Channel type is required")
    private ChannelType channelType;

    @Builder.Default
    private boolean enabled = true;

    @NotNull(message = "Config map is required")
    private Map<String, Object> config;
}
