package com.datashifter.notification.hub.repositories;

import com.datashifter.notification.hub.models.NotificationListener;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationListenerRepository extends JpaRepository<NotificationListener, String> {

    List<NotificationListener> findByOrgIdOrderByCreatedAtDesc(String orgId);

    List<NotificationListener> findByOrgIdAndEnabledTrue(String orgId);

    List<NotificationListener> findByOrgIdAndEventKeyAndEnabledTrue(String orgId, String eventKey);

    Optional<NotificationListener> findByOrgIdAndId(String orgId, String id);
}
