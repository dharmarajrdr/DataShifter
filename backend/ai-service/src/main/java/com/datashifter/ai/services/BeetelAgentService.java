package com.datashifter.ai.services;

import com.datashifter.ai.services.LlmClientRouter.LlmInvocationResult;
import com.datashifter.ai.spi.BeetelCapability;
import com.datashifter.ai.spi.BeetelContextAdvisor;
import com.datashifter.ai.tools.BeetelReadOnlyToolFacade;
import com.datashifter.common.dtos.AiDtos.*;
import com.datashifter.common.dtos.ConnectionDtos.*;
import com.datashifter.common.dtos.NamespaceDtos.CreateNamespaceRequest;
import com.datashifter.common.dtos.NamespaceDtos.NamespaceResponse;
import com.datashifter.common.dtos.PipelineDtos.*;
import com.datashifter.common.dtos.UdfDtos.UdfResponse;
import com.datashifter.common.dtos.WorkflowDtos.*;
import com.datashifter.common.enums.*;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.exceptions.ResourceNotFoundException;
import com.datashifter.common.models.AiChatMessage;
import com.datashifter.common.models.AiChatSession;
import com.datashifter.common.models.AiChatSessionMember;
import com.datashifter.common.models.AiExecutionPlan;
import com.datashifter.common.models.AppUser;
import com.datashifter.common.repositories.AiChatMessageRepository;
import com.datashifter.common.repositories.AiChatSessionMemberRepository;
import com.datashifter.common.repositories.AiChatSessionRepository;
import com.datashifter.common.repositories.AiExecutionPlanRepository;
import com.datashifter.common.repositories.CommonAppUserRepository;
import com.datashifter.common.security.UserContext;
import com.datashifter.connector.services.interfaces.ConnectionService;
import com.datashifter.monitor.services.interfaces.MonitorService;
import com.datashifter.pipeline.services.implementations.NamespaceService;
import com.datashifter.pipeline.services.interfaces.PipelineService;
import com.datashifter.pipeline.services.interfaces.WorkflowService;
import com.datashifter.udf.services.UdfRegistryService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BeetelAgentService {

    private static final Pattern PLAN_BLOCK_PATTERN = Pattern.compile(
            "<BEETEL_PLAN>\\s*(\\{[\\s\\S]*?\\})\\s*</BEETEL_PLAN>",
            Pattern.CASE_INSENSITIVE
    );

    private final AiChatSessionRepository sessionRepository;
    private final AiChatSessionMemberRepository sessionMemberRepository;
    private final AiChatMessageRepository messageRepository;
    private final AiExecutionPlanRepository planRepository;
    private final CommonAppUserRepository appUserRepository;
    private final LlmClientRouter llmClientRouter;
    private final AgentPermissionService agentPermissionService;
    private final BeetelReadOnlyToolFacade readOnlyToolFacade;
    private final List<BeetelCapability> capabilities;
    private final List<BeetelContextAdvisor> contextAdvisors;

    // Services invoked when an Execution Plan is confirmed by the user
    private final ConnectionService connectionService;
    private final PipelineService pipelineService;
    private final WorkflowService workflowService;
    private final NamespaceService namespaceService;
    private final MonitorService monitorService;
    private final UdfRegistryService udfRegistryService;
    private final ObjectMapper objectMapper;

    @Value("${datashifter.ai.agent-name:Beetel}")
    private String agentName;

    // =========================================================================
    // SESSIONS & SAME-ORG SHARING
    // =========================================================================

    @Transactional(readOnly = true)
    public List<ChatParticipantDto> listOrganizationMembers() {
        String orgId = UserContext.getCurrentOrgId();
        return appUserRepository.findByOrganization_IdAndIsActiveTrueOrderByFullNameAsc(orgId)
                .stream()
                .map(u -> toParticipantDto(u, false, null))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ChatSessionResponse> listSessions(AiContextType contextType, String contextId) {
        String userId = UserContext.getCurrentUserId();
        String orgId = UserContext.getCurrentOrgId();

        List<AiChatSession> sessions;
        if (contextType != null && contextType != AiContextType.NONE && contextId != null && !contextId.isBlank()) {
            sessions = sessionRepository.findAccessibleSessionsByUserAndOrgAndContext(
                    userId, orgId, contextType, contextId);
        } else {
            sessions = sessionRepository.findAccessibleSessionsByUserAndOrg(userId, orgId);
        }

        return sessions.stream()
                .map(s -> toSessionResponse(s, false))
                .toList();
    }

    @Transactional
    public ChatSessionResponse createSession(CreateChatSessionRequest request) {
        String userId = UserContext.getCurrentUserId();
        String orgId = UserContext.getCurrentOrgId();

        AiContextType ctxType = request != null && request.getContextType() != null
                ? request.getContextType()
                : AiContextType.NONE;
        String ctxId = request != null ? request.getContextId() : null;
        String ctxName = request != null ? request.getContextName() : null;
        String title = request != null && request.getTitle() != null && !request.getTitle().isBlank()
                ? request.getTitle().trim()
                : (ctxName != null && !ctxName.isBlank() ? agentName + " • " + ctxName : "New " + agentName + " Chat");

        AiChatSession session = AiChatSession.builder()
                .userId(userId)
                .orgId(orgId)
                .title(title)
                .contextType(ctxType)
                .contextId(ctxId)
                .contextName(ctxName)
                .build();

        session = sessionRepository.save(session);
        return toSessionResponse(session, true);
    }

    @Transactional(readOnly = true)
    public ChatSessionResponse getSession(String sessionId) {
        AiChatSession session = findAuthorizedSession(sessionId);
        return toSessionResponse(session, true);
    }

    @Transactional
    public ChatSessionResponse shareSession(String sessionId, ShareChatSessionRequest request) {
        String currentUserId = UserContext.getCurrentUserId();
        String currentOrgId = UserContext.getCurrentOrgId();

        // Any member who already has access (owner or shared member in same org) can share with more org members
        AiChatSession session = findAuthorizedSession(sessionId);

        if (request == null || request.getMemberUserIds() == null || request.getMemberUserIds().isEmpty()) {
            throw new DatashifterException("Please select at least one organization member to share with.");
        }

        Set<String> requestedIds = request.getMemberUserIds().stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(id -> !id.isEmpty())
                .collect(Collectors.toCollection(LinkedHashSet::new));

        if (requestedIds.isEmpty()) {
            throw new DatashifterException("Please select at least one organization member to share with.");
        }

        // Strict same-organization check: verify ALL requested user IDs belong to currentOrgId
        List<AppUser> orgUsers = appUserRepository.findByIdInAndOrganization_Id(requestedIds, currentOrgId);
        Map<String, AppUser> validUsersById = orgUsers.stream()
                .filter(u -> Boolean.TRUE.equals(u.getIsActive()))
                .collect(Collectors.toMap(AppUser::getId, u -> u, (a, b) -> a));

        if (validUsersById.size() != requestedIds.size()) {
            throw new DatashifterException("Cannot share conversation with users outside your organization.");
        }

        Set<String> existingMemberIds = sessionMemberRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream()
                .map(AiChatSessionMember::getUserId)
                .collect(Collectors.toSet());

        List<AppUser> newlyGrantedUsers = new ArrayList<>();
        for (String targetUserId : requestedIds) {
            if (targetUserId.equals(session.getUserId()) || existingMemberIds.contains(targetUserId)) {
                continue;
            }
            AiChatSessionMember member = AiChatSessionMember.builder()
                    .sessionId(session.getId())
                    .orgId(currentOrgId)
                    .userId(targetUserId)
                    .grantedByUserId(currentUserId)
                    .build();
            sessionMemberRepository.save(member);
            AppUser targetUser = validUsersById.get(targetUserId);
            if (targetUser != null) {
                newlyGrantedUsers.add(targetUser);
            }
        }

        if (!newlyGrantedUsers.isEmpty()) {
            AppUser granter = appUserRepository.findById(currentUserId).orElse(null);
            String granterName = granter != null && granter.getFullName() != null && !granter.getFullName().isBlank()
                    ? granter.getFullName()
                    : "A member";

            List<String> firstThreeNames = newlyGrantedUsers.stream()
                    .limit(3)
                    .map(u -> "**" + u.getFullName() + "**")
                    .toList();
            String targetsText;
            int extraCount = newlyGrantedUsers.size() - 3;
            if (extraCount > 0) {
                targetsText = String.join(", ", firstThreeNames)
                        + " and **" + extraCount + (extraCount == 1 ? " other**" : " others**");
            } else if (firstThreeNames.size() == 1) {
                targetsText = firstThreeNames.get(0);
            } else if (firstThreeNames.size() == 2) {
                targetsText = firstThreeNames.get(0) + " and " + firstThreeNames.get(1);
            } else {
                targetsText = firstThreeNames.get(0) + ", " + firstThreeNames.get(1) + ", and " + firstThreeNames.get(2);
            }

            AiChatMessage auditMsg = AiChatMessage.builder()
                    .sessionId(session.getId())
                    .senderUserId(currentUserId)
                    .role("AUDIT")
                    .content("**" + granterName + "** granted access to " + targetsText)
                    .build();
            messageRepository.save(auditMsg);
        }

        session.setUpdatedAt(Instant.now());
        session = sessionRepository.save(session);
        return toSessionResponse(session, true);
    }

    @Transactional
    public ChatSessionResponse updateSessionContext(String sessionId, UpdateSessionContextRequest request) {
        AiChatSession session = findAuthorizedSession(sessionId);
        session.setContextType(request.getContextType() != null ? request.getContextType() : AiContextType.NONE);
        session.setContextId(request.getContextId());
        session.setContextName(request.getContextName());
        session = sessionRepository.save(session);
        return toSessionResponse(session, true);
    }

    @Transactional
    public void deleteSession(String sessionId) {
        throw new DatashifterException("Conversations cannot be deleted.");
    }

    // =========================================================================
    // CHAT & PLAN GENERATION
    // =========================================================================

    public ChatMessageResponse sendMessage(ChatMessageRequest request) {
        if ((request.getMessage() == null || request.getMessage().isBlank())
                && (request.getMarkdownContent() == null || request.getMarkdownContent().isBlank())) {
            throw new DatashifterException("Message or markdown specification is required.");
        }

        String currentUserId = UserContext.getCurrentUserId();
        String currentOrgId = UserContext.getCurrentOrgId();

        AiChatSession session;
        if (request.getSessionId() != null && !request.getSessionId().isBlank()) {
            session = findAuthorizedSession(request.getSessionId());
            if (request.getContextType() != null) {
                session.setContextType(request.getContextType());
                session.setContextId(request.getContextId());
                session.setContextName(request.getContextName());
            }
        } else {
            session = AiChatSession.builder()
                    .userId(currentUserId)
                    .orgId(currentOrgId)
                    .title(deriveSessionTitle(request.getMessage(), request.getMarkdownFileName()))
                    .contextType(request.getContextType() != null ? request.getContextType() : AiContextType.NONE)
                    .contextId(request.getContextId())
                    .contextName(request.getContextName())
                    .build();
            session = sessionRepository.save(session);
        }

        // Auto-title session if still default
        if (("New " + agentName + " Chat").equals(session.getTitle()) || "New Beetel Chat".equals(session.getTitle())) {
            session.setTitle(deriveSessionTitle(request.getMessage(), request.getMarkdownFileName()));
        }

        List<AiChatMessage> existingMessages = messageRepository.findBySessionIdOrderByCreatedAtAsc(session.getId());

        String userPromptText = buildUserPromptWithMarkdown(request);

        // Save user message with sender identity
        AiChatMessage userMsg = AiChatMessage.builder()
                .sessionId(session.getId())
                .senderUserId(currentUserId)
                .role("USER")
                .content(request.getMessage() != null && !request.getMessage().isBlank()
                        ? request.getMessage().trim()
                        : "Uploaded markdown requirement file: `" + request.getMarkdownFileName() + "`")
                .markdownFileName(request.getMarkdownFileName())
                .markdownContent(request.getMarkdownContent())
                .build();
        messageRepository.save(userMsg);

        // Build conversation history for LLM (last 6 USER/ASSISTANT messages, capped to prevent token bloat)
        List<Message> historyForLlm = new ArrayList<>();
        int startIdx = Math.max(0, existingMessages.size() - 6);
        for (int i = startIdx; i < existingMessages.size(); i++) {
            AiChatMessage m = existingMessages.get(i);
            String msgContent = m.getContent() != null ? m.getContent() : "";
            if (msgContent.length() > 1200) {
                msgContent = msgContent.substring(0, 1200) + "... [truncated]";
            }
            if ("USER".equalsIgnoreCase(m.getRole())) {
                historyForLlm.add(new UserMessage(msgContent));
            } else if ("ASSISTANT".equalsIgnoreCase(m.getRole())) {
                historyForLlm.add(new AssistantMessage(msgContent));
            }
        }

        // Build System Prompt with extensible advisors and capabilities
        String systemPrompt = buildSystemPrompt(userPromptText, session.getContextType(), session.getContextId());

        // Collect all read-only tool beans + extensible capability tool beans
        List<Object> toolBeans = new ArrayList<>();
        toolBeans.add(readOnlyToolFacade);
        for (BeetelCapability cap : capabilities) {
            if (cap.isEnabled() && cap.getToolBeans() != null) {
                toolBeans.addAll(cap.getToolBeans());
            }
        }

        LlmInvocationResult llmResult;
        try {
            llmResult = llmClientRouter.callWithFailover(
                    systemPrompt,
                    historyForLlm,
                    userPromptText,
                    toolBeans,
                    request.getPreferredProvider(),
                    session.getUserId()
            );
        } catch (Exception ex) {
            String errorText = ex.getMessage() != null && !ex.getMessage().isBlank()
                    ? ex.getMessage()
                    : "Beetel encountered an unexpected error while invoking configured LLM providers.";
            log.warn("Persisting LLM error message in session {}: {}", session.getId(), errorText);

            AiChatMessage errorMsg = AiChatMessage.builder()
                    .sessionId(session.getId())
                    .role("ERROR")
                    .content(errorText)
                    .providerUsed(request.getPreferredProvider() != null ? request.getPreferredProvider().name() : "AUTO_FAILOVER")
                    .build();
            errorMsg = messageRepository.save(errorMsg);

            session.setUpdatedAt(Instant.now());
            sessionRepository.save(session);

            return toMessageResponse(errorMsg, Map.of());
        }

        String rawContent = llmResult.content();
        PlanExtractionResult extraction = extractAndSavePlanIfPresent(rawContent, session);
        AiExecutionPlan savedPlan = extraction.plan();
        String cleanAssistantText;
        if (extraction.restrictionMessage() != null) {
            cleanAssistantText = extraction.restrictionMessage();
        } else {
            cleanAssistantText = stripPlanBlock(rawContent).trim();
            if (cleanAssistantText.isEmpty() && savedPlan != null) {
                cleanAssistantText = "I have prepared an execution plan **" + savedPlan.getTitle() + "**. Please review the summary and steps below, and click **Approve & Execute** to proceed.";
            }
        }

        AiChatMessage assistantMsg = AiChatMessage.builder()
                .sessionId(session.getId())
                .role("ASSISTANT")
                .content(cleanAssistantText)
                .planId(savedPlan != null ? savedPlan.getId() : null)
                .providerUsed(llmResult.providerUsed())
                .modelUsed(llmResult.modelUsed())
                .keySource(llmResult.keySource())
                .build();
        assistantMsg = messageRepository.save(assistantMsg);

        session.setUpdatedAt(Instant.now());
        sessionRepository.save(session);

        return toMessageResponse(assistantMsg, savedPlan != null ? Map.of(savedPlan.getId(), savedPlan) : Map.of());
    }

    // =========================================================================
    // PLAN CONFIRMATION & EXECUTION
    // =========================================================================

    public ChatMessageResponse decidePlan(String planId, PlanDecisionRequest decision) {
        String orgId = UserContext.getCurrentOrgId();
        AiExecutionPlan plan = planRepository.findByIdAndOrgId(planId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("AiExecutionPlan", planId));

        AiChatSession session = findAuthorizedSession(plan.getSessionId());

        if (plan.getStatus() != AiPlanStatus.PENDING_CONFIRMATION && plan.getStatus() != AiPlanStatus.FAILED) {
            throw new DatashifterException("Plan is already in status: " + plan.getStatus());
        }

        if (!decision.isApproved()) {
            plan.setStatus(AiPlanStatus.REJECTED);
            plan.setCompletedAt(Instant.now());
            plan = planRepository.save(plan);

            String feedbackNote = decision.getFeedback() != null && !decision.getFeedback().isBlank()
                    ? " Reason/feedback: _" + decision.getFeedback().trim() + "_. Let me know how you'd like to adjust the plan!"
                    : " Let me know what changes you'd like to make to the plan.";

            AiChatMessage rejectedMsg = AiChatMessage.builder()
                    .sessionId(session.getId())
                    .role("ASSISTANT")
                    .content("Execution plan **" + plan.getTitle() + "** was cancelled." + feedbackNote)
                    .planId(plan.getId())
                    .build();
            rejectedMsg = messageRepository.save(rejectedMsg);
            return toMessageResponse(rejectedMsg, Map.of(plan.getId(), plan));
        }

        // Execute approved plan steps sequentially
        plan.setStatus(AiPlanStatus.EXECUTING);
        plan.setConfirmedAt(Instant.now());
        planRepository.save(plan);

        List<PlanStepDto> steps = parseStepsJson(plan.getStepsJson());
        List<String> executionLogs = new ArrayList<>();
        Map<String, String> runtimeVars = new HashMap<>();
        if (session.getContextType() == AiContextType.PIPELINE && session.getContextId() != null) {
            runtimeVars.put("$CONTEXT_PIPELINE_ID", session.getContextId());
            runtimeVars.put("$LAST_PIPELINE_ID", session.getContextId());
        } else if (session.getContextType() == AiContextType.WORKFLOW && session.getContextId() != null) {
            runtimeVars.put("$CONTEXT_WORKFLOW_ID", session.getContextId());
            runtimeVars.put("$LAST_WORKFLOW_ID", session.getContextId());
        }

        boolean allSucceeded = true;
        String primaryEntityType = null;
        String primaryEntityId = null;

        for (PlanStepDto step : steps) {
            try {
                StepExecutionOutcome outcome = executeSingleStep(step, runtimeVars);
                step.setStatus("COMPLETED");
                step.setResultSummary(outcome.summary());
                executionLogs.add("Step " + step.getStepNumber() + " (" + step.getTitle() + "): " + outcome.summary());
                if (outcome.entityType() != null && outcome.entityId() != null) {
                    primaryEntityType = outcome.entityType();
                    primaryEntityId = outcome.entityId();
                }
            } catch (Exception ex) {
                allSucceeded = false;
                String err = ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName();
                step.setStatus("FAILED");
                step.setResultSummary("Failed: " + err);
                executionLogs.add("Step " + step.getStepNumber() + " (" + step.getTitle() + ") FAILED: " + err);
                log.error("Beetel plan {} failed at step {}: {}", planId, step.getStepNumber(), err, ex);
                break;
            }
        }

        // Mark remaining steps as SKIPPED if an earlier step failed
        if (!allSucceeded) {
            for (PlanStepDto step : steps) {
                if ("PENDING".equals(step.getStatus()) || step.getStatus() == null) {
                    step.setStatus("SKIPPED");
                }
            }
        }

        plan.setStepsJson(toJson(steps));
        plan.setExecutionLogJson(toJson(executionLogs));
        plan.setResultEntityType(primaryEntityType);
        plan.setResultEntityId(primaryEntityId);
        plan.setStatus(allSucceeded ? AiPlanStatus.COMPLETED : AiPlanStatus.FAILED);
        plan.setCompletedAt(Instant.now());
        plan = planRepository.save(plan);

        // If a new pipeline or workflow was created and session had no context, bind it!
        if (allSucceeded && primaryEntityId != null && session.getContextType() == AiContextType.NONE) {
            if ("PIPELINE".equals(primaryEntityType)) {
                session.setContextType(AiContextType.PIPELINE);
                session.setContextId(primaryEntityId);
                sessionRepository.save(session);
            } else if ("WORKFLOW".equals(primaryEntityType)) {
                session.setContextType(AiContextType.WORKFLOW);
                session.setContextId(primaryEntityId);
                sessionRepository.save(session);
            }
        }

        StringBuilder summaryMd = new StringBuilder();
        if (allSucceeded) {
            summaryMd.append("✅ **Plan Executed Successfully: ").append(plan.getTitle()).append("**\n\n");
        } else {
            summaryMd.append("⚠️ **Plan Execution Encountered an Error: ").append(plan.getTitle()).append("**\n\n");
        }
        for (String logEntry : executionLogs) {
            summaryMd.append("- ").append(logEntry).append("\n");
        }

        AiChatMessage resultMsg = AiChatMessage.builder()
                .sessionId(session.getId())
                .role("ASSISTANT")
                .content(summaryMd.toString())
                .planId(plan.getId())
                .build();
        resultMsg = messageRepository.save(resultMsg);

        return toMessageResponse(resultMsg, Map.of(plan.getId(), plan));
    }

    private record StepExecutionOutcome(String summary, String entityType, String entityId) {}

    @SuppressWarnings("unchecked")
    private StepExecutionOutcome executeSingleStep(PlanStepDto step, Map<String, String> runtimeVars) throws Exception {
        agentPermissionService.assertStepPermission(step);
        String actionType = step.getActionType() != null ? step.getActionType().trim().toUpperCase() : "";
        Map<String, Object> rawParams = step.getParameters() != null ? step.getParameters() : Map.of();
        String resolvedJson = resolveVariablesInJson(objectMapper.writeValueAsString(rawParams), runtimeVars);
        Map<String, Object> params = objectMapper.readValue(resolvedJson, new TypeReference<Map<String, Object>>() {});

        return switch (actionType) {
            case "CREATE_NAMESPACE" -> {
                CreateNamespaceRequest req = convertCleanParams(params, CreateNamespaceRequest.class);
                NamespaceResponse res = namespaceService.create(req);
                runtimeVars.put("$LAST_NAMESPACE_ID", res.getId());
                yield new StepExecutionOutcome(
                        "Created namespace '" + res.getName() + "' (ID: " + res.getId() + ")",
                        "NAMESPACE", res.getId());
            }
            case "DELETE_NAMESPACE" -> {
                String nsId = resolveTargetId(params, "namespaceId", runtimeVars, "$LAST_NAMESPACE_ID");
                namespaceService.delete(nsId);
                yield new StepExecutionOutcome(
                        "Deleted namespace (ID: " + nsId + ")",
                        "NAMESPACE", nsId);
            }
            case "CREATE_CONNECTION" -> {
                CreateConnectionRequest req = convertCleanParams(params, CreateConnectionRequest.class);
                ConnectionResponse res = connectionService.create(req);
                runtimeVars.put("$LAST_CONNECTION_ID", res.getId());
                runtimeVars.put("$CONNECTION_" + res.getName().toUpperCase().replaceAll("[^A-Z0-9]", "_"), res.getId());
                yield new StepExecutionOutcome(
                        "Created connection '" + res.getName() + "' (" + res.getDbType() + ", ID: " + res.getId() + ")",
                        "CONNECTION", res.getId());
            }
            case "UPDATE_CONNECTION" -> {
                String connId = resolveConnectionId(params, runtimeVars);
                UpdateConnectionRequest req = convertCleanParams(params, UpdateConnectionRequest.class);
                ConnectionResponse res = connectionService.update(connId, req);
                yield new StepExecutionOutcome(
                        "Updated connection '" + res.getName() + "' (ID: " + res.getId() + ")",
                        "CONNECTION", res.getId());
            }
            case "DELETE_CONNECTION" -> {
                String connId = resolveConnectionId(params, runtimeVars);
                connectionService.delete(connId);
                yield new StepExecutionOutcome(
                        "Deleted connection (ID: " + connId + ")",
                        "CONNECTION", connId);
            }
            case "CREATE_PIPELINE" -> {
                CreatePipelineRequest req = convertCleanParams(params, CreatePipelineRequest.class);
                PipelineResponse res = pipelineService.create(req);
                runtimeVars.put("$LAST_PIPELINE_ID", res.getId());
                runtimeVars.put("$PIPELINE_" + res.getName().toUpperCase().replaceAll("[^A-Z0-9]", "_"), res.getId());
                yield new StepExecutionOutcome(
                        "Created pipeline '" + res.getName() + "' (ID: " + res.getId() + ") with " + (res.getTables() != null ? res.getTables().size() : 0) + " table(s)",
                        "PIPELINE", res.getId());
            }
            case "IMPORT_PIPELINE" -> {
                PipelineExportDto exportDto = convertCleanParams(params, PipelineExportDto.class);
                PipelineImportResultDto res = pipelineService.importPipeline(exportDto);
                if (!res.isSuccess()) {
                    throw new DatashifterException("Import failed: " + String.join("; ", res.getErrors()));
                }
                runtimeVars.put("$LAST_PIPELINE_ID", res.getPipelineId());
                if (res.getPipelineName() != null) {
                    runtimeVars.put("$PIPELINE_" + res.getPipelineName().toUpperCase().replaceAll("[^A-Z0-9]", "_"), res.getPipelineId());
                }
                yield new StepExecutionOutcome(
                        "Generated pipeline '" + res.getPipelineName() + "' (ID: " + res.getPipelineId() + ") with "
                                + res.getTablesCount() + " table(s) and " + res.getColumnMappingsCount() + " column mapping(s)",
                        "PIPELINE", res.getPipelineId());
            }
            case "UPDATE_PIPELINE_SETTINGS", "UPDATE_PIPELINE", "RENAME_PIPELINE" -> {
                String pipelineId = resolvePipelineId(params, runtimeVars);
                UpdatePipelineRequest req = convertCleanParams(params, UpdatePipelineRequest.class);
                if (params.containsKey("newName") && (req.getName() == null || req.getName().isBlank())) {
                    req.setName(String.valueOf(params.get("newName")));
                }
                PipelineResponse res = pipelineService.update(pipelineId, req);
                yield new StepExecutionOutcome(
                        "Updated pipeline '" + res.getName() + "' (ID: " + res.getId() + ")",
                        "PIPELINE", res.getId());
            }
            case "DELETE_PIPELINE" -> {
                String pipelineId = resolvePipelineId(params, runtimeVars);
                pipelineService.delete(pipelineId);
                yield new StepExecutionOutcome(
                        "Deleted pipeline (ID: " + pipelineId + ")",
                        "PIPELINE", pipelineId);
            }
            case "ADD_TABLE_PAIR" -> {
                String pipelineId = resolvePipelineId(params, runtimeVars);
                AddTablePairRequest req = convertCleanParams(params, AddTablePairRequest.class);
                PipelineResponse res = pipelineService.addTablePair(pipelineId, req);
                yield new StepExecutionOutcome(
                        "Added table pair " + req.getSourceTable() + " → " + req.getTargetTable() + " to pipeline '" + res.getName() + "'",
                        "PIPELINE", res.getId());
            }
            case "REMOVE_TABLE_PAIR" -> {
                String pipelineId = resolvePipelineId(params, runtimeVars);
                String pipelineTableId = String.valueOf(params.getOrDefault("pipelineTableId", params.get("tableId")));
                PipelineResponse res = pipelineService.removeTablePair(pipelineId, pipelineTableId);
                yield new StepExecutionOutcome(
                        "Removed table pair " + pipelineTableId + " from pipeline '" + res.getName() + "'",
                        "PIPELINE", res.getId());
            }
            case "UPDATE_MAPPINGS" -> {
                String pipelineId = resolvePipelineId(params, runtimeVars);
                Object tablesRaw = params.get("tables");
                List<PipelineTableRequest> tables = objectMapper.convertValue(
                        tablesRaw, new TypeReference<List<PipelineTableRequest>>() {});
                PipelineResponse res = pipelineService.updateMappings(pipelineId, tables);
                yield new StepExecutionOutcome(
                        "Updated column mappings, transformations, and filters for pipeline '" + res.getName() + "' (" + (tables != null ? tables.size() : 0) + " table(s))",
                        "PIPELINE", res.getId());
            }
            case "VALIDATE_PIPELINE" -> {
                String pipelineId = resolvePipelineId(params, runtimeVars);
                PipelineActionRequest actionReq = new PipelineActionRequest();
                actionReq.setAction(PipelineAction.VALIDATE);
                PipelineResponse res = pipelineService.performAction(pipelineId, actionReq);
                if (res.getStatus() == PipelineStatus.INVALID) {
                    yield new StepExecutionOutcome(
                            "Validated pipeline '" + res.getName() + "' — status is INVALID: " + String.join("; ", res.getValidationErrors()),
                            "PIPELINE", res.getId());
                }
                yield new StepExecutionOutcome(
                        "Validated pipeline '" + res.getName() + "' — status is VALIDATED",
                        "PIPELINE", res.getId());
            }
            case "PIPELINE_ACTION", "RUN_PIPELINE" -> {
                String pipelineId = resolvePipelineId(params, runtimeVars);
                String actStr = String.valueOf(params.getOrDefault("action", "START")).toUpperCase();
                PipelineActionRequest actionReq = new PipelineActionRequest();
                actionReq.setAction(PipelineAction.valueOf(actStr));
                PipelineResponse res = pipelineService.performAction(pipelineId, actionReq);
                yield new StepExecutionOutcome(
                        "Executed action " + actStr + " on pipeline '" + res.getName() + "' (status: " + res.getStatus() + ")",
                        "PIPELINE", res.getId());
            }
            case "CREATE_WORKFLOW" -> {
                CreateWorkflowRequest req = convertCleanParams(params, CreateWorkflowRequest.class);
                WorkflowResponse res = workflowService.create(req);
                runtimeVars.put("$LAST_WORKFLOW_ID", res.getId());
                yield new StepExecutionOutcome(
                        "Created workflow '" + res.getName() + "' (ID: " + res.getId() + ") with "
                                + (res.getNodes() != null ? res.getNodes().size() : 0) + " node(s)",
                        "WORKFLOW", res.getId());
            }
            case "UPDATE_WORKFLOW", "RENAME_WORKFLOW" -> {
                String workflowId = resolveWorkflowId(params, runtimeVars);
                UpdateWorkflowRequest req = convertCleanParams(params, UpdateWorkflowRequest.class);
                if (params.containsKey("newName") && (req.getName() == null || req.getName().isBlank())) {
                    req.setName(String.valueOf(params.get("newName")));
                }
                WorkflowResponse res = workflowService.update(workflowId, req);
                yield new StepExecutionOutcome(
                        "Updated workflow '" + res.getName() + "' (ID: " + res.getId() + ", status: " + res.getStatus() + ")",
                        "WORKFLOW", res.getId());
            }
            case "UPDATE_WORKFLOW_CANVAS" -> {
                String workflowId = resolveWorkflowId(params, runtimeVars);
                SaveWorkflowCanvasRequest req = convertCleanParams(params, SaveWorkflowCanvasRequest.class);
                WorkflowResponse res = workflowService.saveCanvas(workflowId, req);
                yield new StepExecutionOutcome(
                        "Updated DAG canvas for workflow '" + res.getName() + "' (status: " + res.getStatus() + ")",
                        "WORKFLOW", res.getId());
            }
            case "ADD_WORKFLOW_PIPELINES" -> {
                String workflowId = resolveWorkflowId(params, runtimeVars);
                AddWorkflowPipelinesRequest req = convertCleanParams(params, AddWorkflowPipelinesRequest.class);
                WorkflowResponse res = workflowService.addPipelines(workflowId, req);
                yield new StepExecutionOutcome(
                        "Added pipelines to workflow '" + res.getName() + "' (total nodes: " + (res.getNodes() != null ? res.getNodes().size() : 0) + ")",
                        "WORKFLOW", res.getId());
            }
            case "REMOVE_WORKFLOW_PIPELINE" -> {
                String workflowId = resolveWorkflowId(params, runtimeVars);
                String pipelineId = resolvePipelineId(params, runtimeVars);
                WorkflowResponse res = workflowService.removePipeline(workflowId, pipelineId);
                yield new StepExecutionOutcome(
                        "Removed pipeline " + pipelineId + " from workflow '" + res.getName() + "'",
                        "WORKFLOW", res.getId());
            }
            case "DELETE_WORKFLOW" -> {
                String workflowId = resolveWorkflowId(params, runtimeVars);
                workflowService.delete(workflowId);
                yield new StepExecutionOutcome(
                        "Deleted workflow (ID: " + workflowId + ")",
                        "WORKFLOW", workflowId);
            }
            case "WORKFLOW_ACTION", "RUN_WORKFLOW" -> {
                String workflowId = resolveWorkflowId(params, runtimeVars);
                String actStr = String.valueOf(params.getOrDefault("action", "START")).toUpperCase();
                WorkflowActionRequest req = WorkflowActionRequest.builder()
                        .action(WorkflowAction.valueOf(actStr))
                        .build();
                WorkflowResponse res = workflowService.performAction(workflowId, req);
                yield new StepExecutionOutcome(
                        "Executed action " + actStr + " on workflow '" + res.getName() + "' (status: " + res.getStatus() + ")",
                        "WORKFLOW", res.getId());
            }
            case "DELETE_UDF" -> {
                String udfId = resolveUdfId(params);
                udfRegistryService.delete(udfId);
                yield new StepExecutionOutcome(
                        "Deleted UDF (ID: " + udfId + ")",
                        "UDF", udfId);
            }
            case "CLEAR_ERRORS" -> {
                String pipelineId = resolvePipelineId(params, runtimeVars);
                monitorService.clearErrors(pipelineId);
                yield new StepExecutionOutcome(
                        "Cleared error logs for pipeline " + pipelineId,
                        "PIPELINE", pipelineId);
            }
            default -> throw new DatashifterException("Unsupported plan step actionType: " + actionType);
        };
    }

    private <T> T convertCleanParams(Map<String, Object> params, Class<T> targetClass) {
        Map<String, Object> copy = new HashMap<>(params);
        copy.remove("workflowId");
        copy.remove("pipelineId");
        copy.remove("connectionId");
        copy.remove("udfId");
        copy.remove("id");
        copy.remove("newName");
        return objectMapper.convertValue(copy, targetClass);
    }

    private String resolveWorkflowId(Map<String, Object> params, Map<String, String> runtimeVars) {
        try {
            String candidate = resolveTargetId(params, "workflowId", runtimeVars, "$LAST_WORKFLOW_ID");
            for (WorkflowSummaryResponse w : workflowService.getAll()) {
                if (w.getId().equals(candidate) || (w.getName() != null && w.getName().equalsIgnoreCase(candidate))) {
                    return w.getId();
                }
            }
            return candidate;
        } catch (Exception ignored) {
            Object byName = params.getOrDefault("workflowName", params.get("currentName"));
            if (byName != null) {
                String nameStr = String.valueOf(byName).trim();
                for (WorkflowSummaryResponse w : workflowService.getAll()) {
                    if (w.getName() != null && w.getName().equalsIgnoreCase(nameStr)) {
                        return w.getId();
                    }
                }
            }
            List<WorkflowSummaryResponse> all = workflowService.getAll();
            if (all.size() == 1) {
                return all.get(0).getId();
            }
            throw new DatashifterException("Missing required workflowId for plan step");
        }
    }

    private String resolvePipelineId(Map<String, Object> params, Map<String, String> runtimeVars) {
        try {
            String candidate = resolveTargetId(params, "pipelineId", runtimeVars, "$LAST_PIPELINE_ID");
            for (PipelineSummaryResponse p : pipelineService.getAll()) {
                if (p.getId().equals(candidate) || (p.getName() != null && p.getName().equalsIgnoreCase(candidate))) {
                    return p.getId();
                }
            }
            return candidate;
        } catch (Exception ignored) {
            Object byName = params.getOrDefault("pipelineName", params.get("currentName"));
            if (byName != null) {
                String nameStr = String.valueOf(byName).trim();
                for (PipelineSummaryResponse p : pipelineService.getAll()) {
                    if (p.getName() != null && p.getName().equalsIgnoreCase(nameStr)) {
                        return p.getId();
                    }
                }
            }
            throw new DatashifterException("Missing required pipelineId for plan step");
        }
    }

    private String resolveConnectionId(Map<String, Object> params, Map<String, String> runtimeVars) {
        try {
            String candidate = resolveTargetId(params, "connectionId", runtimeVars, "$LAST_CONNECTION_ID");
            for (ConnectionResponse c : connectionService.getAll()) {
                if (c.getId().equals(candidate) || (c.getName() != null && c.getName().equalsIgnoreCase(candidate))) {
                    return c.getId();
                }
            }
            return candidate;
        } catch (Exception ignored) {
            Object byName = params.getOrDefault("connectionName", params.get("name"));
            if (byName != null) {
                String nameStr = String.valueOf(byName).trim();
                for (ConnectionResponse c : connectionService.getAll()) {
                    if (c.getName() != null && c.getName().equalsIgnoreCase(nameStr)) {
                        return c.getId();
                    }
                }
            }
            throw new DatashifterException("Missing required connectionId for plan step");
        }
    }

    private String resolveUdfId(Map<String, Object> params) {
        Object raw = params.getOrDefault("udfId",
                params.getOrDefault("id",
                        params.getOrDefault("udfName", params.get("name"))));
        List<UdfResponse> allUdfs = udfRegistryService.getAll();
        if (raw != null && !String.valueOf(raw).isBlank()) {
            String target = String.valueOf(raw).trim();
            for (UdfResponse u : allUdfs) {
                if (target.equals(u.getId())
                        || (u.getName() != null && u.getName().equalsIgnoreCase(target))
                        || (u.getArtifactName() != null && (u.getArtifactName().equalsIgnoreCase(target)
                            || u.getArtifactName().toLowerCase().startsWith(target.toLowerCase())))) {
                    return u.getId();
                }
            }
            return target;
        }
        if (allUdfs.size() == 1) {
            return allUdfs.get(0).getId();
        }
        throw new DatashifterException("Missing required udfId or udfName for DELETE_UDF step");
    }

    private String resolveTargetId(Map<String, Object> params, String key, Map<String, String> runtimeVars, String fallbackVar) {
        Object val = params.getOrDefault(key, params.get("id"));
        if (val != null && !String.valueOf(val).isBlank() && !String.valueOf(val).startsWith("$")) {
            return String.valueOf(val);
        }
        if (val != null && runtimeVars.containsKey(String.valueOf(val))) {
            return runtimeVars.get(String.valueOf(val));
        }
        String fallback = runtimeVars.get(fallbackVar);
        if (fallback != null && !fallback.isBlank()) {
            return fallback;
        }
        throw new DatashifterException("Missing required target ID (" + key + ") for plan step");
    }

    private String resolveVariablesInJson(String json, Map<String, String> runtimeVars) {
        String result = json;
        for (Map.Entry<String, String> entry : runtimeVars.entrySet()) {
            if (entry.getKey() != null && entry.getValue() != null) {
                result = result.replace(entry.getKey(), entry.getValue());
            }
        }
        return result;
    }

    // =========================================================================
    // PROMPT CONSTRUCTION & PLAN PARSING
    // =========================================================================

    private String buildSystemPrompt(String userMessage, AiContextType contextType, String contextId) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are **").append(agentName).append("**, DataShifter's intelligent Agentic AI Data Engineering Assistant.\n");
        sb.append("Your mission is to help users design, generate, validate, orchestrate, and debug database migration pipelines, DAG workflows, connections, and UDFs.\n\n");

        sb.append("""
                ### Core Operating Rules
                1. **Use Pre-Loaded Live Workspace Inventory First**:
                   - The current Connections, Pipelines, Workflows (with full DAG nodes & edges), and UDFs are already listed below under **Live Workspace Inventory**. Do NOT call `listConnections`, `listPipelines`, `listWorkflows`, or `listUdfs` unless the inventory is missing.
                   - Only call `listDatabaseTables` or `getTableSchema` when you need table/column schemas for a specific `connectionId`, or `getPipelineErrorLogs` / `getPipelineDetails` when debugging a specific pipeline.
                2. **Never Guess Missing Details (Ask First!)**:
                   - When generating a pipeline or workflow (from chat or a `.md` specification), verify that the source connection, target connection, and table names exist.
                   - If a connection does not exist and credentials (`dbType`, `host`, `port`, `databaseName`, `username`, `password`) are missing, or if table names are missing, **DO NOT generate a plan yet** — politely ask the user for the missing details.
                3. **Plan-Confirm-Execute Protocol (Mandatory for All Mutations)**:
                   - Never claim a pipeline, workflow, connection, or UDF has already been created/updated/deleted before user confirmation.
                   - Whenever the user asks to create, update, rename, delete, validate, or run any pipeline, workflow, connection, namespace, or UDF, summarize the plan and steps in markdown AND append a `<BEETEL_PLAN>` JSON block at the end of your message:
                   <BEETEL_PLAN>
                   {
                     "title": "Plan title",
                     "summary": "Brief summary of the plan",
                     "steps": [
                       {
                         "stepNumber": 1,
                         "actionType": "UPDATE_WORKFLOW",
                         "title": "Rename workflow to Stg Workflow",
                         "description": "Update workflow name from Dev Workflow to Stg Workflow",
                         "toolName": "WorkflowService.update",
                         "parameters": {
                           "workflowId": "<workflow-id>",
                           "name": "Stg Workflow"
                         }
                       }
                     ]
                   }
                   </BEETEL_PLAN>
                - Supported `actionType` & `parameters`:
                  - `CREATE_NAMESPACE`: `{"name","description","color"}`
                  - `DELETE_NAMESPACE`: `{"namespaceId"}`
                  - `CREATE_CONNECTION`: `{"name","dbType":"POSTGRESQL|MYSQL|ORACLE|SQL_SERVER|SPANNER","host","port","databaseName","schemaName","username","password"}`
                  - `UPDATE_CONNECTION`: `{"connectionId","name","host","port","databaseName","schemaName","username","password"}`
                  - `DELETE_CONNECTION`: `{"connectionId"}`
                  - `CREATE_PIPELINE`: `{"name","description","namespaceId","sourceConnectionId","targetConnectionId","chunkSize":10000,"defaultWriteMode":"UPSERT|INSERT|REPLACE|INSERT_IGNORE","tables":[{"sourceTable","executionOrder":0,"targetMappings":[{"targetTable","writeMode"}]}]}`
                  - `UPDATE_PIPELINE`: `{"pipelineId","name","description","chunkSize","defaultWriteMode","ignoreExceptions","maxErrorThreshold"}` (use this to rename or update pipeline settings)
                  - `DELETE_PIPELINE`: `{"pipelineId"}`
                  - `UPDATE_MAPPINGS`: `{"pipelineId":"$LAST_PIPELINE_ID or <id>","tables":[{"sourceTable","executionOrder":0,"mappingType":"ONE_TO_ONE","targetMappings":[{"targetTable","writeMode":"UPSERT","columnMappings":[{"sourceColumn","sourceType","targetColumn","targetType","mappingOrder":0,"transformations":[{"functionName":"TRIM|UPPER|...","arguments":null,"executionOrder":0}]}]}],"filters":[]}]}`
                  - `ADD_TABLE_PAIR`: `{"pipelineId","sourceTable","targetTable"}`
                  - `REMOVE_TABLE_PAIR`: `{"pipelineId","pipelineTableId"}`
                  - `VALIDATE_PIPELINE`: `{"pipelineId":"$LAST_PIPELINE_ID or <id>"}`
                  - `RUN_PIPELINE`: `{"pipelineId","action":"START|PAUSE|RESUME|STOP"}`
                  - `CREATE_WORKFLOW`: `{"name","description","nodes":[{"pipelineId","positionX":120,"positionY":100}],"edges":[{"sourcePipelineId","targetPipelineId","onFailureAction":"STOP_WORKFLOW"}]}`
                  - `UPDATE_WORKFLOW`: `{"workflowId","name","description","namespaceId"}` (use this to rename or update a workflow's metadata)
                  - `UPDATE_WORKFLOW_CANVAS`: `{"workflowId":"$LAST_WORKFLOW_ID or <id>","nodes":[{"pipelineId","positionX":120,"positionY":100}],"edges":[{"sourcePipelineId","targetPipelineId","onFailureAction":"STOP_WORKFLOW"}]}`
                  - `ADD_WORKFLOW_PIPELINES`: `{"workflowId","pipelineIds":["<pipeline-id>"]}`
                  - `REMOVE_WORKFLOW_PIPELINE`: `{"workflowId","pipelineId"}`
                  - `DELETE_WORKFLOW`: `{"workflowId"}`
                  - `RUN_WORKFLOW`: `{"workflowId","action":"START|PAUSE|RESUME|STOP|RERUN_FAILED_STAGE|RERUN_FROM_CHECKPOINT"}`
                  - `DELETE_UDF`: `{"udfId":"<udf-id>","udfName":"<udf-name>"}` (use this to delete a registered Java UDF)
                  - `CLEAR_ERRORS`: `{"pipelineId"}`
                - Cross-step variables supported: `$LAST_CONNECTION_ID`, `$LAST_PIPELINE_ID`, `$LAST_WORKFLOW_ID`, `$PIPELINE_<UPPERCASE_NAME>`.
                """);

        // Append Agent Role Policy & Allowed Permissions
        sb.append(agentPermissionService.buildPolicyPromptSection());

        // Append extensible capability context (e.g. RAG platform knowledge)
        for (BeetelCapability cap : capabilities) {
            if (cap.isEnabled()) {
                String aug = cap.augmentSystemContext(userMessage,
                        contextType != null ? contextType.name() : null,
                        contextId);
                if (aug != null && !aug.isBlank()) {
                    sb.append("\n").append(aug).append("\n");
                }
            }
        }

        // Append ordered context advisors (e.g. active Pipeline or Workflow live state)
        contextAdvisors.stream()
                .sorted(Comparator.comparingInt(BeetelContextAdvisor::getOrder))
                .forEach(advisor -> {
                    String section = advisor.buildContextSection(userMessage, contextType, contextId);
                    if (section != null && !section.isBlank()) {
                        sb.append("\n").append(section).append("\n");
                    }
                });

        return sb.toString();
    }

    private String buildUserPromptWithMarkdown(ChatMessageRequest request) {
        StringBuilder sb = new StringBuilder();
        if (request.getMarkdownContent() != null && !request.getMarkdownContent().isBlank()) {
            sb.append("The user attached a Markdown specification file");
            if (request.getMarkdownFileName() != null && !request.getMarkdownFileName().isBlank()) {
                sb.append(" (`").append(request.getMarkdownFileName()).append("`)");
            }
            sb.append(":\n\n```markdown\n")
                    .append(request.getMarkdownContent().trim())
                    .append("\n```\n\n");
            sb.append("Analyze the markdown requirements carefully. Inspect existing connections, tables, and schemas using your tools. If any required connection details, table names, or column mappings are missing, ask the user for them. If all details are available, formulate a complete step-by-step Execution Plan (`<BEETEL_PLAN>`) and ask for user confirmation.\n\n");
        }
        if (request.getMessage() != null && !request.getMessage().isBlank()) {
            sb.append(request.getMessage().trim());
        }
        return sb.toString();
    }

    private record PlanExtractionResult(AiExecutionPlan plan, String restrictionMessage) {}

    private PlanExtractionResult extractAndSavePlanIfPresent(String rawContent, AiChatSession session) {
        if (rawContent == null || rawContent.isBlank()) return new PlanExtractionResult(null, null);
        Matcher matcher = PLAN_BLOCK_PATTERN.matcher(rawContent);
        if (!matcher.find()) {
            return new PlanExtractionResult(null, null);
        }

        String jsonBlock = matcher.group(1);
        try {
            JsonNode root = objectMapper.readTree(jsonBlock);
            String title = root.path("title").asText("Beetel Execution Plan");
            String summary = root.path("summary").asText("Review and confirm the steps below to execute.");
            JsonNode stepsNode = root.path("steps");

            List<PlanStepDto> steps = new ArrayList<>();
            if (stepsNode.isArray()) {
                int idx = 1;
                for (JsonNode sn : stepsNode) {
                    Map<String, Object> params = sn.has("parameters") && sn.get("parameters").isObject()
                            ? objectMapper.convertValue(sn.get("parameters"), new TypeReference<Map<String, Object>>() {})
                            : Map.of();
                    steps.add(PlanStepDto.builder()
                            .stepNumber(sn.path("stepNumber").asInt(idx))
                            .actionType(sn.path("actionType").asText("UNKNOWN"))
                            .title(sn.path("title").asText("Step " + idx))
                            .description(sn.path("description").asText(""))
                            .toolName(sn.path("toolName").asText(""))
                            .parameters(params)
                            .status("PENDING")
                            .build());
                    idx++;
                }
            }

            if (steps.isEmpty()) {
                return new PlanExtractionResult(null, null);
            }

            Optional<String> restriction = agentPermissionService.validatePlanPermissions(steps);
            if (restriction.isPresent()) {
                return new PlanExtractionResult(null, restriction.get());
            }

            AiExecutionPlan plan = AiExecutionPlan.builder()
                    .sessionId(session.getId())
                    .orgId(session.getOrgId())
                    .userId(session.getUserId())
                    .title(title)
                    .summary(summary)
                    .status(AiPlanStatus.PENDING_CONFIRMATION)
                    .contextType(session.getContextType())
                    .contextId(session.getContextId())
                    .stepsJson(toJson(steps))
                    .build();

            return new PlanExtractionResult(planRepository.save(plan), null);
        } catch (Exception e) {
            log.warn("Could not parse <BEETEL_PLAN> JSON block from LLM output: {}", e.getMessage());
            return new PlanExtractionResult(null, null);
        }
    }

    private String stripPlanBlock(String rawContent) {
        if (rawContent == null) return "";
        return PLAN_BLOCK_PATTERN.matcher(rawContent).replaceAll("");
    }

    private String deriveSessionTitle(String message, String markdownFileName) {
        if (markdownFileName != null && !markdownFileName.isBlank()) {
            return "Spec: " + markdownFileName;
        }
        if (message == null || message.isBlank()) {
            return "New " + agentName + " Chat";
        }
        String clean = message.trim().replaceAll("\\s+", " ");
        return clean.length() > 48 ? clean.substring(0, 48) + "..." : clean;
    }

    private AiChatSession findAuthorizedSession(String sessionId) {
        String userId = UserContext.getCurrentUserId();
        String orgId = UserContext.getCurrentOrgId();
        AiChatSession session = sessionRepository.findByIdAndOrgId(sessionId, orgId)
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException(
                        "You don't have permission to access this page. Contact your organization administrator to request the required permissions."));

        boolean isOwner = session.getUserId().equals(userId);
        boolean isSharedMember = !isOwner
                && sessionMemberRepository.existsBySessionIdAndUserIdAndOrgId(sessionId, userId, orgId);

        if (!isOwner && !isSharedMember) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "You don't have permission to access this page. Contact your organization administrator to request the required permissions.");
        }
        return session;
    }

    private ChatParticipantDto toParticipantDto(AppUser u, boolean isOwner, Instant grantedAt) {
        if (u == null) return null;
        return ChatParticipantDto.builder()
                .userId(u.getId())
                .fullName(u.getFullName())
                .email(u.getAccount() != null ? u.getAccount().getEmail() : null)
                .displayInitials(u.getDisplayInitials() != null && !u.getDisplayInitials().isBlank()
                        ? u.getDisplayInitials()
                        : deriveInitials(u.getFullName()))
                .avatarColor(u.getAvatarColor() != null && !u.getAvatarColor().isBlank()
                        ? u.getAvatarColor()
                        : "#534AB7")
                .roleName(u.getRole() != null ? u.getRole().getName() : "Member")
                .isOwner(isOwner)
                .grantedAt(grantedAt)
                .build();
    }

    private String deriveInitials(String fullName) {
        if (fullName == null || fullName.isBlank()) return "U";
        String[] parts = fullName.trim().split("\\s+");
        if (parts.length == 1) {
            return parts[0].substring(0, Math.min(2, parts[0].length())).toUpperCase();
        }
        return ("" + parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    private ChatSessionResponse toSessionResponse(AiChatSession s, boolean includeMessages) {
        List<AiChatSessionMember> memberRows = sessionMemberRepository.findBySessionIdOrderByCreatedAtAsc(s.getId());
        Set<String> userIdsToLoad = new LinkedHashSet<>();
        userIdsToLoad.add(s.getUserId());
        memberRows.forEach(m -> userIdsToLoad.add(m.getUserId()));

        List<AiChatMessage> msgs = null;
        if (includeMessages) {
            msgs = messageRepository.findBySessionIdOrderByCreatedAtAsc(s.getId());
            for (AiChatMessage m : msgs) {
                if (m.getSenderUserId() != null && !m.getSenderUserId().isBlank()) {
                    userIdsToLoad.add(m.getSenderUserId());
                }
            }
        }

        Map<String, AppUser> usersById = appUserRepository.findByIdInAndOrganization_Id(userIdsToLoad, s.getOrgId())
                .stream()
                .collect(Collectors.toMap(AppUser::getId, u -> u, (a, b) -> a));

        ChatParticipantDto ownerDto = toParticipantDto(usersById.get(s.getUserId()), true, s.getCreatedAt());
        List<ChatParticipantDto> sharedMemberDtos = memberRows.stream()
                .map(row -> toParticipantDto(usersById.get(row.getUserId()), false, row.getCreatedAt()))
                .filter(Objects::nonNull)
                .toList();

        List<ChatMessageResponse> msgResponses = null;
        if (includeMessages && msgs != null) {
            Map<String, AiExecutionPlan> plansById = new HashMap<>();
            planRepository.findBySessionIdOrderByCreatedAtDesc(s.getId())
                    .forEach(p -> plansById.put(p.getId(), p));
            msgResponses = msgs.stream()
                    .map(m -> toMessageResponse(m, plansById, usersById, s.getUserId()))
                    .toList();
        }
        return ChatSessionResponse.builder()
                .id(s.getId())
                .title(s.getTitle())
                .ownerUserId(s.getUserId())
                .owner(ownerDto)
                .isShared(!sharedMemberDtos.isEmpty())
                .sharedMembers(sharedMemberDtos)
                .contextType(s.getContextType())
                .contextId(s.getContextId())
                .contextName(s.getContextName())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .messages(msgResponses)
                .build();
    }

    private ChatMessageResponse toMessageResponse(AiChatMessage m, Map<String, AiExecutionPlan> plansById) {
        return toMessageResponse(m, plansById, null, null);
    }

    private ChatMessageResponse toMessageResponse(
            AiChatMessage m,
            Map<String, AiExecutionPlan> plansById,
            Map<String, AppUser> usersById,
            String fallbackOwnerUserId
    ) {
        ExecutionPlanResponse planDto = null;
        if (m.getPlanId() != null) {
            AiExecutionPlan plan = plansById != null ? plansById.get(m.getPlanId()) : null;
            if (plan == null) {
                plan = planRepository.findById(m.getPlanId()).orElse(null);
            }
            if (plan != null) {
                planDto = toPlanResponse(plan);
            }
        }

        String effectiveSenderId = m.getSenderUserId();
        if ((effectiveSenderId == null || effectiveSenderId.isBlank()) && "USER".equalsIgnoreCase(m.getRole())) {
            effectiveSenderId = fallbackOwnerUserId != null ? fallbackOwnerUserId : UserContext.getCurrentUserId();
        }

        String senderName = null;
        String senderInitials = null;
        String senderAvatarColor = null;

        if (effectiveSenderId != null && !effectiveSenderId.isBlank()) {
            AppUser sender = usersById != null ? usersById.get(effectiveSenderId) : null;
            if (sender == null) {
                sender = appUserRepository.findById(effectiveSenderId).orElse(null);
            }
            if (sender != null) {
                senderName = sender.getFullName();
                senderInitials = sender.getDisplayInitials() != null && !sender.getDisplayInitials().isBlank()
                        ? sender.getDisplayInitials()
                        : deriveInitials(sender.getFullName());
                senderAvatarColor = sender.getAvatarColor() != null && !sender.getAvatarColor().isBlank()
                        ? sender.getAvatarColor()
                        : "#534AB7";
            }
        }

        return ChatMessageResponse.builder()
                .id(m.getId())
                .sessionId(m.getSessionId())
                .senderUserId(effectiveSenderId)
                .senderName(senderName)
                .senderInitials(senderInitials)
                .senderAvatarColor(senderAvatarColor)
                .role(m.getRole())
                .content(m.getContent())
                .markdownFileName(m.getMarkdownFileName())
                .markdownContent(m.getMarkdownContent())
                .providerUsed(m.getProviderUsed())
                .modelUsed(m.getModelUsed())
                .keySource(m.getKeySource())
                .plan(planDto)
                .createdAt(m.getCreatedAt())
                .build();
    }

    private ExecutionPlanResponse toPlanResponse(AiExecutionPlan p) {
        return ExecutionPlanResponse.builder()
                .id(p.getId())
                .sessionId(p.getSessionId())
                .title(p.getTitle())
                .summary(p.getSummary())
                .status(p.getStatus())
                .contextType(p.getContextType())
                .contextId(p.getContextId())
                .steps(parseStepsJson(p.getStepsJson()))
                .executionLogs(parseLogsJson(p.getExecutionLogJson()))
                .resultEntityType(p.getResultEntityType())
                .resultEntityId(p.getResultEntityId())
                .confirmedAt(p.getConfirmedAt())
                .completedAt(p.getCompletedAt())
                .createdAt(p.getCreatedAt())
                .build();
    }

    private List<PlanStepDto> parseStepsJson(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<PlanStepDto>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<String> parseLogsJson(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "[]";
        }
    }
}
