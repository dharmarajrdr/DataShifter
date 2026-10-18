package com.datashifter.notification.hub.controllers;

import com.datashifter.notification.hub.dto.ListenerRequest;
import com.datashifter.notification.hub.models.NotificationListener;
import com.datashifter.notification.hub.repositories.NotificationListenerRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ListenerControllerTest {

    @Mock private NotificationListenerRepository listenerRepository;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks
    private ListenerController listenerController;

    @Test
    @DisplayName("updateListener derives eventAction from eventKey when eventAction is omitted")
    void testUpdateListenerDerivesEventActionFromEventKey() {
        NotificationListener existing = NotificationListener.builder()
                .id("b9b636cc-96c8-4452-b3d2-4faa50f051af")
                .orgId("054c4e3f-c927-4c3b-817c-139b643d414e")
                .resourceType("SETUP")
                .eventAction("UPDATED")
                .eventKey("setup.updated")
                .name("Old Name")
                .channelId("ch-1")
                .build();

        when(listenerRepository.findByOrgIdAndId(any(), eq("b9b636cc-96c8-4452-b3d2-4faa50f051af")))
                .thenReturn(Optional.of(existing));
        when(listenerRepository.save(any(NotificationListener.class))).thenAnswer(inv -> inv.getArgument(0));

        ListenerRequest request = ListenerRequest.builder()
                .name("On Setup Updates")
                .resourceType("PIPELINE")
                .eventKey("pipeline.started")
                .channelId("a9c07fb9-8707-4724-9b61-5fef334bb52f")
                .templateId("f782777f-2a16-4979-9f68-43cae9ccc32e")
                .priority("INFO")
                .enabled(true)
                .build();

        ResponseEntity<NotificationListener> response = listenerController.updateListener(
                "054c4e3f-c927-4c3b-817c-139b643d414e", "b9b636cc-96c8-4452-b3d2-4faa50f051af", request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        NotificationListener updated = response.getBody();
        assertThat(updated).isNotNull();
        assertThat(updated.getName()).isEqualTo("On Setup Updates");
        assertThat(updated.getResourceType()).isEqualTo("PIPELINE");
        assertThat(updated.getEventKey()).isEqualTo("pipeline.started");
        assertThat(updated.getEventAction()).isEqualTo("STARTED");

        ArgumentCaptor<NotificationListener> captor = ArgumentCaptor.forClass(NotificationListener.class);
        verify(listenerRepository).save(captor.capture());
        assertThat(captor.getValue().getEventAction()).isEqualTo("STARTED");
    }
}
