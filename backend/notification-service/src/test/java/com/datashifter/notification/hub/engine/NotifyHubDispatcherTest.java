package com.datashifter.notification.hub.engine;

import com.datashifter.notification.hub.channels.ChannelRegistry;
import com.datashifter.notification.hub.channels.NotificationChannel;
import com.datashifter.notification.hub.dto.NotificationContext;
import com.datashifter.notification.hub.dto.NotificationRequest;
import com.datashifter.notification.hub.dto.NotificationResponse;
import com.datashifter.notification.hub.models.*;
import com.datashifter.notification.hub.repositories.NotificationChannelRepository;
import com.datashifter.notification.hub.repositories.NotificationDeliveryLogRepository;
import com.datashifter.notification.hub.templates.TemplateEngine;
import com.datashifter.notification.hub.templates.TemplateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotifyHubDispatcherTest {

    @Mock
    private ChannelRegistry channelRegistry;
    @Mock
    private NotificationChannelRepository channelRepository;
    @Mock
    private NotificationDeliveryLogRepository deliveryLogRepository;
    @Mock
    private TemplateService templateService;
    @Mock
    private NotificationChannel mockChannel;

    private TemplateEngine templateEngine = new TemplateEngine();
    private RetryExecutor retryExecutor = new RetryExecutor();

    private NotifyHubDispatcher dispatcher;

    @BeforeEach
    void setUp() {
        dispatcher = new NotifyHubDispatcher(
                channelRegistry,
                channelRepository,
                deliveryLogRepository,
                templateService,
                templateEngine,
                retryExecutor
        );
    }

    @Test
    void testDispatchSyncSuccess() throws Exception {
        String orgId = "org-test-123";
        NotificationRequest request = NotificationRequest.builder()
                .orgId(orgId)
                .pipelineName("Orders Pipeline")
                .pipelineId("p-1")
                .errorMessage("Fatal error")
                .priority("HIGH")
                .build();

        NotificationTemplate template = NotificationTemplate.builder()
                .name("pipeline-failure-alert")
                .subjectTemplate("Alert: {{pipeline_name}}")
                .bodyTemplate("Error encountered: {{error_message}}")
                .build();

        when(templateService.getTemplate(eq(orgId), any())).thenReturn(template);

        NotificationChannelConfig config = NotificationChannelConfig.builder()
                .name("Slack Alert Channel")
                .channelType(ChannelType.SLACK)
                .enabled(true)
                .orgId(orgId)
                .build();

        when(channelRepository.findByOrgIdAndEnabledTrue(orgId)).thenReturn(List.of(config));
        when(channelRegistry.getChannel(ChannelType.SLACK)).thenReturn(Optional.of(mockChannel));

        NotificationResponse response = dispatcher.dispatchSync(request);

        assertNotNull(response);
        assertEquals(DeliveryStatus.SENT, response.getStatus());
        verify(mockChannel, times(1)).send(eq(config), any(NotificationContext.class));
        verify(deliveryLogRepository, times(1)).save(any(NotificationDeliveryLog.class));
    }

    @Test
    void testDispatchWhenNoChannelsConfigured() {
        String orgId = "org-empty";
        NotificationRequest request = NotificationRequest.builder()
                .orgId(orgId)
                .pipelineName("Standalone Pipeline")
                .build();

        NotificationTemplate template = NotificationTemplate.builder()
                .name("pipeline-failure-alert")
                .subjectTemplate("Subject")
                .bodyTemplate("Body")
                .build();

        when(templateService.getTemplate(eq(orgId), any())).thenReturn(template);
        when(channelRepository.findByOrgIdAndEnabledTrue(orgId)).thenReturn(List.of());

        NotificationResponse response = dispatcher.dispatchSync(request);

        assertNotNull(response);
        assertEquals(DeliveryStatus.SENT, response.getStatus());
        assertTrue(response.getMessage().contains("No active channels"));
    }
}
