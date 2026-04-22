package com.datashifter.pipeline.services.implementations;

import com.datashifter.common.dtos.NamespaceDtos.*;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.exceptions.ResourceNotFoundException;
import com.datashifter.common.models.AppUser;
import com.datashifter.common.models.Namespace;
import com.datashifter.common.models.Pipeline;
import com.datashifter.common.security.UserContext;
import com.datashifter.pipeline.repositories.NamespaceRepository;
import com.datashifter.pipeline.repositories.PipelineRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NamespaceService {

    private final NamespaceRepository namespaceRepository;
    private final PipelineRepository pipelineRepository;
    private final EntityManager entityManager;

    @Transactional(readOnly = true)
    public List<NamespaceResponse> getAll() {
        String orgId = UserContext.getCurrentOrgId();
        return namespaceRepository.findByOrgId(orgId).stream()
                .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public NamespaceResponse getById(String id) {
        return toResponse(findEntity(id));
    }

    @Transactional
    public NamespaceResponse create(CreateNamespaceRequest request) {
        String orgId = UserContext.getCurrentOrgId();
        if (namespaceRepository.existsByOrgIdAndName(orgId, request.getName())) {
            throw new DatashifterException("Namespace already exists: " + request.getName());
        }
        AppUser createdBy = entityManager.getReference(AppUser.class, UserContext.getCurrentUserId());
        Namespace ns = Namespace.builder()
                .name(request.getName())
                .createdBy(createdBy)
                .description(request.getDescription())
                .color(request.getColor() != null ? request.getColor() : "#534AB7")
                .build();
        namespaceRepository.save(ns);
        log.info("Namespace created: {} ({}) in org {}", ns.getName(), ns.getId(), orgId);
        return toResponse(ns);
    }

    @Transactional
    public NamespaceResponse update(String id, UpdateNamespaceRequest request) {
        Namespace ns = findEntity(id);
        String orgId = UserContext.getCurrentOrgId();
        if (request.getName() != null && !request.getName().equals(ns.getName())) {
            if (namespaceRepository.existsByOrgIdAndName(orgId, request.getName())) {
                throw new DatashifterException("Namespace name already taken: " + request.getName());
            }
            ns.setName(request.getName());
        }
        if (request.getDescription() != null) ns.setDescription(request.getDescription());
        if (request.getColor() != null) ns.setColor(request.getColor());
        namespaceRepository.save(ns);
        return toResponse(ns);
    }

    @Transactional
    public void delete(String id) {
        Namespace ns = findEntity(id);
        Namespace defaultNs = getOrCreateDefault();
        List<Pipeline> pipelines = pipelineRepository.findByNamespaceId(id);
        for (Pipeline p : pipelines) { p.setNamespace(defaultNs); }
        pipelineRepository.saveAll(pipelines);
        namespaceRepository.delete(ns);
        log.info("Namespace deleted: {} — {} pipelines moved to Default", ns.getName(), pipelines.size());
    }

    @Transactional
    public void movePipeline(String pipelineId, String namespaceId) {
        Pipeline pipeline = pipelineRepository.findById(pipelineId)
                .orElseThrow(() -> new ResourceNotFoundException("Pipeline", pipelineId));
        String currentOrgId = UserContext.getCurrentOrgId();
        if (currentOrgId != null && pipeline.getCreatedBy() != null
                && !currentOrgId.equals(pipeline.getCreatedBy().getOrganization().getId())) {
            throw new DatashifterException("Pipeline not found or access denied");
        }
        Namespace target = findEntity(namespaceId);
        pipeline.setNamespace(target);
        pipelineRepository.save(pipeline);
        log.info("Pipeline {} moved to namespace {}", pipelineId, namespaceId);
    }

    @Transactional(readOnly = true)
    public String getNamespaceName(String namespaceId) {
        if (namespaceId == null) return "Default";
        return namespaceRepository.findById(namespaceId).map(Namespace::getName).orElse("Default");
    }

    private Namespace findEntity(String id) {
        Namespace ns = namespaceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Namespace", id));
        String currentOrgId = UserContext.getCurrentOrgId();
        if (currentOrgId != null && ns.getCreatedBy() != null
                && ns.getCreatedBy().getOrganization() != null
                && !currentOrgId.equals(ns.getCreatedBy().getOrganization().getId())) {
            throw new DatashifterException("Namespace not found or access denied");
        }
        return ns;
    }

    private Namespace getOrCreateDefault() {
        String orgId = UserContext.getCurrentOrgId();
        return namespaceRepository.findByOrgIdAndName(orgId, "Default").orElseGet(() -> {
            AppUser createdBy = entityManager.getReference(AppUser.class, UserContext.getCurrentUserId());
            Namespace ns = Namespace.builder().name("Default").createdBy(createdBy).color("#534AB7").build();
            return namespaceRepository.save(ns);
        });
    }

    private NamespaceResponse toResponse(Namespace ns) {
        int count = pipelineRepository.findByNamespaceId(ns.getId()).size();
        return NamespaceResponse.builder()
                .id(ns.getId())
                .name(ns.getName())
                .description(ns.getDescription())
                .color(ns.getColor())
                .createdBy(ns.getCreatedBy() != null ? ns.getCreatedBy().getFullName() : null)
                .pipelineCount(count)
                .createdAt(ns.getCreatedAt())
                .build();
    }
}
