package com.datashifter.notification.hub.channels;

import com.datashifter.notification.hub.dto.ChannelConfigRequest;
import com.datashifter.notification.hub.models.NotificationChannelConfig;
import com.datashifter.notification.hub.repositories.NotificationChannelRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@Slf4j
@RequiredArgsConstructor
public class ChannelService {

    private final NotificationChannelRepository channelRepository;
    private final ChannelRegistry channelRegistry;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<NotificationChannelConfig> listChannels(String orgId, String pipelineId) {
        if (pipelineId != null && !pipelineId.isBlank()) {
            return channelRepository.findByOrgIdAndPipelineId(orgId, pipelineId);
        }
        return channelRepository.findByOrgId(orgId);
    }

    @Transactional(readOnly = true)
    public NotificationChannelConfig getChannel(String orgId, String channelId) {
        NotificationChannelConfig config = channelRepository.findById(channelId)
                .orElseThrow(() -> new NoSuchElementException("Channel config not found: " + channelId));
        if (!config.getOrgId().equals(orgId)) {
            throw new SecurityException("Unauthorized access to channel configuration.");
        }
        return config;
    }

    @Transactional
    public NotificationChannelConfig createChannel(String orgId, ChannelConfigRequest request) {
        String configJson;
        try {
            configJson = objectMapper.writeValueAsString(request.getConfig());
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid configuration map: " + e.getMessage(), e);
        }

        String allowedPipelinesJson = null;
        if (request.getAllowedPipelineIds() != null && !request.getAllowedPipelineIds().isEmpty()) {
            try {
                allowedPipelinesJson = objectMapper.writeValueAsString(request.getAllowedPipelineIds());
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize allowedPipelineIds: {}", e.getMessage());
            }
        }

        NotificationChannelConfig channelConfig = NotificationChannelConfig.builder()
                .orgId(orgId)
                .pipelineId(request.getPipelineId())
                .name(request.getName())
                .channelType(request.getChannelType())
                .enabled(request.isEnabled())
                .configJson(configJson)
                .allowedPipelinesJson(allowedPipelinesJson)
                .build();

        // Validate config with specific channel implementation
        channelRegistry.getChannel(request.getChannelType()).ifPresent(ch -> ch.validateConfig(channelConfig));

        return channelRepository.save(channelConfig);
    }

    @Transactional
    public NotificationChannelConfig updateChannel(String orgId, String channelId, ChannelConfigRequest request) {
        NotificationChannelConfig channelConfig = getChannel(orgId, channelId);

        String configJson;
        try {
            configJson = objectMapper.writeValueAsString(request.getConfig());
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid configuration map: " + e.getMessage(), e);
        }

        String allowedPipelinesJson = null;
        if (request.getAllowedPipelineIds() != null && !request.getAllowedPipelineIds().isEmpty()) {
            try {
                allowedPipelinesJson = objectMapper.writeValueAsString(request.getAllowedPipelineIds());
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize allowedPipelineIds: {}", e.getMessage());
            }
        }

        channelConfig.setName(request.getName());
        channelConfig.setPipelineId(request.getPipelineId());
        channelConfig.setChannelType(request.getChannelType());
        channelConfig.setEnabled(request.isEnabled());
        channelConfig.setConfigJson(configJson);
        channelConfig.setAllowedPipelinesJson(allowedPipelinesJson);

        channelRegistry.getChannel(request.getChannelType()).ifPresent(ch -> ch.validateConfig(channelConfig));

        return channelRepository.save(channelConfig);
    }

    @Transactional
    public void deleteChannel(String orgId, String channelId) {
        NotificationChannelConfig channelConfig = getChannel(orgId, channelId);
        channelRepository.delete(channelConfig);
    }
}
