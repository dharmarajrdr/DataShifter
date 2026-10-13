package com.datashifter.notification.hub.repositories;

import com.datashifter.notification.hub.models.NotificationTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationTemplateRepository extends JpaRepository<NotificationTemplate, String> {

    List<NotificationTemplate> findByOrgId(String orgId);

    Optional<NotificationTemplate> findByOrgIdAndName(String orgId, String name);

    boolean existsByOrgIdAndName(String orgId, String name);
}
