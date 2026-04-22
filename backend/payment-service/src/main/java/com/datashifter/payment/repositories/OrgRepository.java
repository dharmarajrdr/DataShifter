package com.datashifter.payment.repositories;

import com.datashifter.common.models.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrgRepository extends JpaRepository<Organization, String> {
}
