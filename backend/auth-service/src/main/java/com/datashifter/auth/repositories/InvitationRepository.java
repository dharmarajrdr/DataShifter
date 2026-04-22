package com.datashifter.auth.repositories;

import com.datashifter.common.models.Invitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvitationRepository extends JpaRepository<Invitation, String> {
    List<Invitation> findByOrganization_IdAndStatus(String orgId, String status);
    Optional<Invitation> findByToken(String token);
    List<Invitation> findByEmailAndStatus(String email, String status);
    Optional<Invitation> findByEmailAndOrganization_IdAndStatus(String email, String orgId, String status);
}
