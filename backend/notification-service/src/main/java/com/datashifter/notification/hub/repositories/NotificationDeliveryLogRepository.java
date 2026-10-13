package com.datashifter.notification.hub.repositories;

import com.datashifter.notification.hub.models.DeliveryStatus;
import com.datashifter.notification.hub.models.NotificationDeliveryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationDeliveryLogRepository extends JpaRepository<NotificationDeliveryLog, String> {

    List<NotificationDeliveryLog> findByOrgIdOrderByCreatedAtDesc(String orgId);

    List<NotificationDeliveryLog> findByOrgIdAndPipelineIdOrderByCreatedAtDesc(String orgId, String pipelineId);

    List<NotificationDeliveryLog> findByOrgIdAndStatus(String orgId, DeliveryStatus status);
}
