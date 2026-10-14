package com.datashifter.notification.hub.repositories;

import com.datashifter.notification.hub.models.NotificationChannelConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationChannelRepository extends JpaRepository<NotificationChannelConfig, String> {

    List<NotificationChannelConfig> findByOrgId(String orgId);

    List<NotificationChannelConfig> findByOrgIdAndEnabledTrue(String orgId);

    List<NotificationChannelConfig> findByOrgIdAndPipelineId(String orgId, String pipelineId);

    List<NotificationChannelConfig> findByOrgIdAndPipelineIdIsNull(String orgId);
}
