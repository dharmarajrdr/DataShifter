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
import com.datashifter.common.dtos.WorkflowDtos.*;
import com.datashifter.common.enums.*;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.exceptions.ResourceNotFoundException;
import com.datashifter.common.models.AiChatMessage;
import com.datashifter.common.models.AiChatSession;
import com.datashifter.common.models.AiExecutionPlan;
import com.datashifter.common.repositories.AiChatMessageRepository;
import com.datashifter.common.repositories.AiChatSessionRepository;
import com.datashifter.common.repositories.AiExecutionPlanRepository;
import com.datashifter.common.security.UserContext;
import com.datashifter.connector.services.interfaces.ConnectionService;
import com.datashifter.monitor.services.interfaces.MonitorService;
import com.datashifter.pipeline.services.implementations.NamespaceService;
import com.datashifter.pipeline.services.interfaces.PipelineService;
import com.datashifter.pipeline.services.interfaces.WorkflowService;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class BeetelAgentService {

    private static final Pattern PLAN_BLOCK_PATTERN = Pattern.compile(
            "<BEETEL_PLAN>\\s*(\\{[\\s\\S]*?\\})\\s*</BEETEL_PLAN>",
            Pattern.CASE_INSENSITIVE
    );

    private final AiChatSessionRepository sessionRepository;
    private final AiChatMessageRepository messageRepository;
    private final AiExecutionPlanRepository planRepository;
    private final LlmClientRouter llmClientRouter;
    private final BeetelReadOnlyToolFacade readOnlyToolFacade;
    private final List<BeetelCapability> capabilities;
    private final List<BeetelContextAdvisor> contextAdvisors;

    // Services invoked when an Execution Plan is confirmed by the user
    private final ConnectionService connectionService;
    private final PipelineService pipelineService;
    private final WorkflowService workflowService;
    private final NamespaceService namespaceService;
    private final MonitorService monitorService;
    private final ObjectMapper objectMapper;

    @Value("${datashifter.ai.agent-name:Beetel}")
    private String agentName;

    // =========================================================================
    // SESSIONS
    // =========================================================================

    @Transactional(readOnly = true)
    public List<ChatSessionResponse> listSessions(AiContextType contextType, String contextId) {
        String userId = UserContext.getCurrentUserId();
        String orgId = UserContext.getCurrentOrgId();

        List<AiChatSession> sessions;
        if (contextType != null && contextType != AiContextType.NONE && contextId != null && !contextId.isBlank()) {
            sessions = sessionRepository.findByUserIdAndOrgIdAndContextTypeAndContextIdOrderByUpdatedAtDesc(
                    userId, orgId, contextType, contextId);
        } else {
            sessions = sessionRepository.findByUserIdAndOrgIdOrderByUpdatedAtDesc(userId, orgId);
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
        AiChatSession session = findAuthorizedSession(sessionId);
        sessionRepository.delete(session);
    }

    // =========================================================================
    // CHAT & PLAN GENERATION
    // =========================================================================

    @Transactional
    public ChatMessageResponse sendMessage(ChatMessageRequest request) {
        if ((request.getMessage() == null || request.getMessage().isBlank())
                && (request.getMarkdownContent() == null || request.getMarkdownContent().isBlank())) {
            throw new DatashifterException("Message or markdown specification is required.");
        }

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
                    .userId(UserContext.getCurrentUserId())
                    .orgId(UserContext.getCurrentOrgId())
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

        // Save user message
        AiChatMessage userMsg = AiChatMessage.builder()
                .sessionId(session.getId())
                .role("USER")
                .content(request.getMessage() != null && !request.getMessage().isBlank()
                        ? request.getMessage().trim()
                        : "Uploaded markdown requirement file: `" + request.getMarkdownFileName() + "`")
                .markdownFileName(request.getMarkdownFileName())
                .markdownContent(request.getMarkdownContent())
                .build();
        messageRepository.save(userMsg);

        // Build conversation history for LLM (last 12 messages)
        List<Message> historyForLlm = new ArrayList<>();
        int startIdx = Math.max(0, existingMessages.size() - 12);
        for (int i = startIdx; i < existingMessages.size(); i++) {
            AiChatMessage m = existingMessages.get(i);
            if ("USER".equalsIgnoreCase(m.getRole())) {
                historyForLlm.add(new UserMessage(m.getContent()));
            } else if ("ASSISTANT".equalsIgnoreCase(m.getRole())) {
                historyForLlm.add(new AssistantMessage(m.getContent()));
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

        LlmInvocationResult llmResult = llmClientRouter.callWithFailover(
                systemPrompt,
                historyForLlm,
                userPromptText,
                toolBeans,
                request.getPreferredProvider()
        );

        String rawContent = llmResult.content();
        AiExecutionPlan savedPlan = extractAndSavePlanIfPresent(rawContent, session);
        String cleanAssistantText = stripPlanBlock(rawContent).trim();
        if (cleanAssistantText.isEmpty() && savedPlan != null) {
            cleanAssistantText = "I have prepared an execution plan **" + savedPlan.getTitle() + "**. Please review the summary and steps below, and click **Approve & Execute** to proceed.";
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

    @Transactional
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
        String actionType = step.getActionType() != null ? step.getActionType().trim().toUpperCase() : "";
        Map<String, Object> rawParams = step.getParameters() != null ? step.getParameters() : Map.of();
        String resolvedJson = resolveVariablesInJson(objectMapper.writeValueAsString(rawParams), runtimeVars);
        Map<String, Object> params = objectMapper.readValue(resolvedJson, new TypeReference<Map<String, Object>>() {});

        return switch (actionType) {
            case "CREATE_NAMESPACE" -> {
                CreateNamespaceRequest req = objectMapper.convertValue(params, CreateNamespaceRequest.class);
                NamespaceResponse res = namespaceService.create(req);
                runtimeVars.put("$LAST_NAMESPACE_ID", res.getId());
                yield new StepExecutionOutcome(
                        "Created namespace '" + res.getName() + "' (ID: " + res.getId() + ")",
                        "NAMESPACE", res.getId());
            }
            case "CREATE_CONNECTION" -> {
                CreateConnectionRequest req = objectMapper.convertValue(params, CreateConnectionRequest.class);
                ConnectionResponse res = connectionService.create(req);
                runtimeVars.put("$LAST_CONNECTION_ID", res.getId());
                runtimeVars.put("$CONNECTION_" + res.getName().toUpperCase().replaceAll("[^A-Z0-9]", "_"), res.getId());
                yield new StepExecutionOutcome(
                        "Created connection '" + res.getName() + "' (" + res.getDbType() + ", ID: " + res.getId() + ")",
                        "CONNECTION", res.getId());
            }
            case "UPDATE_CONNECTION" -> {
                String connId = String.valueOf(params.getOrDefault("connectionId", params.get("id")));
                UpdateConnectionRequest req = objectMapper.convertValue(params, UpdateConnectionRequest.class);
                ConnectionResponse res = connectionService.update(connId, req);
                yield new StepExecutionOutcome(
                        "Updated connection '" + res.getName() + "' (ID: " + res.getId() + ")",
                        "CONNECTION", res.getId());
            }
            case "CREATE_PIPELINE" -> {
                CreatePipelineRequest req = objectMapper.convertValue(params, CreatePipelineRequest.class);
                PipelineResponse res = pipelineService.create(req);
                runtimeVars.put("$LAST_PIPELINE_ID", res.getId());
                runtimeVars.put("$PIPELINE_" + res.getName().toUpperCase().replaceAll("[^A-Z0-9]", "_"), res.getId());
                yield new StepExecutionOutcome(
                        "Created pipeline '" + res.getName() + "' (ID: " + res.getId() + ") with " + (res.getTables() != null ? res.getTables().size() : 0) + " table(s)",
                        "PIPELINE", res.getId());
            }
            case "IMPORT_PIPELINE" -> {
                PipelineExportDto exportDto = objectMapper.convertValue(params, PipelineExportDto.class);
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
            case "UPDATE_PIPELINE_SETTINGS", "UPDATE_PIPELINE" -> {
                String pipelineId = resolveTargetId(params, "pipelineId", runtimeVars, "$LAST_PIPELINE_ID");
                UpdatePipelineRequest req = objectMapper.convertValue(params, UpdatePipelineRequest.class);
                PipelineResponse res = pipelineService.update(pipelineId, req);
                yield new StepExecutionOutcome(
                        "Updated settings for pipeline '" + res.getName() + "' (ID: " + res.getId() + ")",
                        "PIPELINE", res.getId());
            }
            case "ADD_TABLE_PAIR" -> {
                String pipelineId = resolveTargetId(params, "pipelineId", runtimeVars, "$LAST_PIPELINE_ID");
                AddTablePairRequest req = objectMapper.convertValue(params, AddTablePairRequest.class);
                PipelineResponse res = pipelineService.addTablePair(pipelineId, req);
                yield new StepExecutionOutcome(
                        "Added table pair " + req.getSourceTable() + " → " + req.getTargetTable() + " to pipeline '" + res.getName() + "'",
                        "PIPELINE", res.getId());
            }
            case "UPDATE_MAPPINGS" -> {
                String pipelineId = resolveTargetId(params, "pipelineId", runtimeVars, "$LAST_PIPELINE_ID");
                Object tablesRaw = params.get("tables");
                List<PipelineTableRequest> tables = objectMapper.convertValue(
                        tablesRaw, new TypeReference<List<PipelineTableRequest>>() {});
                PipelineResponse res = pipelineService.updateMappings(pipelineId, tables);
                yield new StepExecutionOutcome(
                        "Updated column mappings, transformations, and filters for pipeline '" + res.getName() + "' (" + (tables != null ? tables.size() : 0) + " table(s))",
                        "PIPELINE", res.getId());
            }
            case "VALIDATE_PIPELINE" -> {
                String pipelineId = resolveTargetId(params, "pipelineId", runtimeVars, "$LAST_PIPELINE_ID");
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
                String pipelineId = resolveTargetId(params, "pipelineId", runtimeVars, "$LAST_PIPELINE_ID");
                String actStr = String.valueOf(params.getOrDefault("action", "START")).toUpperCase();
                PipelineActionRequest actionReq = new PipelineActionRequest();
                actionReq.setAction(PipelineAction.valueOf(actStr));
                PipelineResponse res = pipelineService.performAction(pipelineId, actionReq);
                yield new StepExecutionOutcome(
                        "Executed action " + actStr + " on pipeline '" + res.getName() + "' (status: " + res.getStatus() + ")",
                        "PIPELINE", res.getId());
            }
            case "CREATE_WORKFLOW" -> {
                CreateWorkflowRequest req = objectMapper.convertValue(params, CreateWorkflowRequest.class);
                WorkflowResponse res = workflowService.create(req);
                runtimeVars.put("$LAST_WORKFLOW_ID", res.getId());
                yield new StepExecutionOutcome(
                        "Created workflow '" + res.getName() + "' (ID: " + res.getId() + ") with "
                                + (res.getNodes() != null ? res.getNodes().size() : 0) + " node(s)",
                        "WORKFLOW", res.getId());
            }
            case "UPDATE_WORKFLOW", "UPDATE_WORKFLOW_CANVAS" -> {
                String workflowId = resolveTargetId(params, "workflowId", runtimeVars, "$LAST_WORKFLOW_ID");
                SaveWorkflowCanvasRequest req = objectMapper.convertValue(params, SaveWorkflowCanvasRequest.class);
                WorkflowResponse res = workflowService.saveCanvas(workflowId, req);
                yield new StepExecutionOutcome(
                        "Updated DAG canvas for workflow '" + res.getName() + "' (status: " + res.getStatus() + ")",
                        "WORKFLOW", res.getId());
            }
            case "ADD_WORKFLOW_PIPELINES" -> {
                String workflowId = resolveTargetId(params, "workflowId", runtimeVars, "$LAST_WORKFLOW_ID");
                AddWorkflowPipelinesRequest req = objectMapper.convertValue(params, AddWorkflowPipelinesRequest.class);
                WorkflowResponse res = workflowService.addPipelines(workflowId, req);
                yield new StepExecutionOutcome(
                        "Added pipelines to workflow '" + res.getName() + "' (total nodes: " + (res.getNodes() != null ? res.getNodes().size() : 0) + ")",
                        "WORKFLOW", res.getId());
            }
            case "WORKFLOW_ACTION", "RUN_WORKFLOW" -> {
                String workflowId = resolveTargetId(params, "workflowId", runtimeVars, "$LAST_WORKFLOW_ID");
                String actStr = String.valueOf(params.getOrDefault("action", "START")).toUpperCase();
                WorkflowActionRequest req = WorkflowActionRequest.builder()
                        .action(WorkflowAction.valueOf(actStr))
                        .build();
                WorkflowResponse res = workflowService.performAction(workflowId, req);
                yield new StepExecutionOutcome(
                        "Executed action " + actStr + " on workflow '" + res.getName() + "' (status: " + res.getStatus() + ")",
                        "WORKFLOW", res.getId());
            }
            case "CLEAR_ERRORS" -> {
                String pipelineId = resolveTargetId(params, "pipelineId", runtimeVars, "$LAST_PIPELINE_ID");
                monitorService.clearErrors(pipelineId);
                yield new StepExecutionOutcome(
                        "Cleared error logs for pipeline " + pipelineId,
                        "PIPELINE", pipelineId);
            }
            default -> throw new DatashifterException("Unsupported plan step actionType: " + actionType);
        };
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
        sb.append("Your mission is to help users design, generate, validate, orchestrate, and debug database migration pipelines and DAG workflows.\n\n");

        sb.append("""
                ### Core Operating Rules
                1. **Use Your Read/Discovery `@Tool`s First**:
                   - Always call `listConnections`, `listDatabaseTables`, `getTableSchema`, `listPipelines`, `listWorkflows`, `listNamespaces`, or `listUdfs` to verify what connections, tables, columns, and pipelines actually exist in the user's organization.
                   - When debugging an issue, always call `getPipelineErrorLogs`, `getWorkflowErrorLogs`, `getPipelineDetails`, and `getPipelineColumnMappings` to inspect the exact error messages, failing rows, and column mappings.
                2. **Never Guess Missing Details (Ask First!)**:
                   - When a user provides a requirement or uploads a Markdown (`.md`) file to generate a pipeline or workflow, check if the source DB connection, target DB connection, and source/target table names exist.
                   - If a connection does not exist and connection details (dbType, host, port, databaseName, username, password) are missing, OR if table names / column mapping requirements are missing or ambiguous, **DO NOT generate a plan yet**. Politely list the exact missing details and ask the user to provide them.
                3. **Plan-Confirm-Execute Protocol (Mandatory for All Changes)**:
                   - You must NEVER claim you have already created or modified a pipeline, workflow, or connection before the user confirms your plan.
                   - When you have all necessary details to create or modify connections, pipelines, column mappings, settings, or workflows (or to apply a bug fix), explain your plan clearly in markdown (including a summary of the plan and steps involved) AND include a single `<BEETEL_PLAN>` JSON block at the end of your message so the UI can render an interactive **Approve & Execute** confirmation card.
                4. **`<BEETEL_PLAN>` JSON Schema**:
                   When proposing an executable plan, append this exact block at the end of your response:
                   <BEETEL_PLAN>
                   {
                     "title": "Short descriptive title of the plan",
                     "summary": "Brief summary of what this plan will create or fix",
                     "steps": [
                       {
                         "stepNumber": 1,
                         "actionType": "CREATE_PIPELINE",
                         "title": "Create pipeline Orders Migration",
                         "description": "Create pipeline connecting Postgres Source to Postgres Target",
                         "toolName": "PipelineService.create",
                         "parameters": {
                           "name": "Orders Migration",
                           "description": "Migrates orders and order_items",
                           "sourceConnectionId": "<actual-source-connection-id>",
                           "targetConnectionId": "<actual-target-connection-id>",
                           "chunkSize": 10000,
                           "defaultWriteMode": "UPSERT",
                           "tables": [
                             {
                               "sourceTable": "orders",
                               "executionOrder": 0,
                               "targetMappings": [
                                 { "targetTable": "orders", "writeMode": "UPSERT" }
                               ]
                             }
                           ]
                         }
                       },
                       {
                         "stepNumber": 2,
                         "actionType": "UPDATE_MAPPINGS",
                         "title": "Configure column mappings and transformations",
                         "description": "Map source columns to target columns with transformations and filters",
                         "toolName": "PipelineService.updateMappings",
                         "parameters": {
                           "pipelineId": "$LAST_PIPELINE_ID",
                           "tables": [
                             {
                               "sourceTable": "orders",
                               "executionOrder": 0,
                               "mappingType": "ONE_TO_ONE",
                               "targetMappings": [
                                 {
                                   "targetTable": "orders",
                                   "writeMode": "UPSERT",
                                   "columnMappings": [
                                     {
                                       "sourceColumn": "id",
                                       "sourceType": "int4",
                                       "targetColumn": "id",
                                       "targetType": "int4",
                                       "mappingOrder": 0,
                                       "transformations": []
                                     }
                                   ]
                                 }
                               ],
                               "filters": []
                             }
                           ]
                         }
                       },
                       {
                         "stepNumber": 3,
                         "actionType": "VALIDATE_PIPELINE",
                         "title": "Validate pipeline configuration",
                         "description": "Run schema and PK validation checks on the pipeline",
                         "toolName": "PipelineService.performAction",
                         "parameters": {
                           "pipelineId": "$LAST_PIPELINE_ID",
                           "action": "VALIDATE"
                         }
                       }
                     ]
                   }
                   </BEETEL_PLAN>
                   - Supported `actionType` values in `<BEETEL_PLAN>`:
                     - `CREATE_NAMESPACE`: `{ "name": "...", "description": "...", "color": "#534AB7" }`
                     - `CREATE_CONNECTION`: `{ "name": "...", "dbType": "POSTGRESQL|MYSQL|ORACLE|SQL_SERVER|SPANNER", "host": "...", "port": 5432, "databaseName": "...", "schemaName": "public", "username": "...", "password": "..." }`
                     - `CREATE_PIPELINE`: `{ "name": "...", "description": "...", "namespaceId": "...", "sourceConnectionId": "...", "targetConnectionId": "...", "chunkSize": 10000, "defaultWriteMode": "UPSERT|INSERT|REPLACE|INSERT_IGNORE", "tables": [...] }`
                     - `UPDATE_MAPPINGS`: `{ "pipelineId": "$LAST_PIPELINE_ID or <id>", "tables": [ { "sourceTable": "...", "executionOrder": 0, "mappingType": "ONE_TO_ONE", "targetMappings": [ { "targetTable": "...", "writeMode": "UPSERT", "columnMappings": [ { "sourceColumn": "...", "sourceType": "...", "targetColumn": "...", "targetType": "...", "mappingOrder": 0, "defaultValue": null, "transformations": [ { "functionName": "TRIM|UPPER|...", "arguments": null, "executionOrder": 0 } ] } ] } ], "filters": [ { "columnName": "...", "operator": "EQUALS|...", "value": "...", "logicalOperator": "AND", "filterOrder": 0 } ] } ] }`
                     - `UPDATE_PIPELINE_SETTINGS`: `{ "pipelineId": "...", "name": "...", "chunkSize": 10000, "defaultWriteMode": "UPSERT", "ignoreExceptions": false, "maxErrorThreshold": 1000 }`
                     - `ADD_TABLE_PAIR`: `{ "pipelineId": "...", "sourceTable": "...", "targetTable": "..." }`
                     - `VALIDATE_PIPELINE`: `{ "pipelineId": "$LAST_PIPELINE_ID or <id>" }`
                     - `CREATE_WORKFLOW`: `{ "name": "...", "description": "...", "namespaceId": "...", "nodes": [ { "pipelineId": "...", "positionX": 120, "positionY": 100 } ], "edges": [ { "sourcePipelineId": "...", "targetPipelineId": "...", "onFailureAction": "STOP_WORKFLOW" } ] }`
                     - `UPDATE_WORKFLOW_CANVAS`: `{ "workflowId": "$LAST_WORKFLOW_ID or <id>", "nodes": [...], "edges": [...] }`
                     - `CLEAR_ERRORS`: `{ "pipelineId": "..." }`
                     - `RUN_PIPELINE`: `{ "pipelineId": "...", "action": "START|PAUSE|RESUME|STOP" }`
                     - `RUN_WORKFLOW`: `{ "workflowId": "...", "action": "START|PAUSE|RESUME|STOP|RERUN_FAILED_STAGE|RERUN_FROM_CHECKPOINT" }`
                   - You can reference `$LAST_CONNECTION_ID`, `$LAST_PIPELINE_ID`, `$LAST_WORKFLOW_ID`, or `$PIPELINE_<UPPERCASE_NAME>` across steps in the same plan!
                """);

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

    private AiExecutionPlan extractAndSavePlanIfPresent(String rawContent, AiChatSession session) {
        if (rawContent == null || rawContent.isBlank()) return null;
        Matcher matcher = PLAN_BLOCK_PATTERN.matcher(rawContent);
        if (!matcher.find()) {
            return null;
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
                return null;
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

            return planRepository.save(plan);
        } catch (Exception e) {
            log.warn("Could not parse <BEETEL_PLAN> JSON block from LLM output: {}", e.getMessage());
            return null;
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
        return sessionRepository.findByIdAndUserIdAndOrgId(sessionId, userId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("AiChatSession", sessionId));
    }

    private ChatSessionResponse toSessionResponse(AiChatSession s, boolean includeMessages) {
        List<ChatMessageResponse> msgResponses = null;
        if (includeMessages) {
            List<AiChatMessage> msgs = messageRepository.findBySessionIdOrderByCreatedAtAsc(s.getId());
            Map<String, AiExecutionPlan> plansById = new HashMap<>();
            planRepository.findBySessionIdOrderByCreatedAtDesc(s.getId())
                    .forEach(p -> plansById.put(p.getId(), p));
            msgResponses = msgs.stream()
                    .map(m -> toMessageResponse(m, plansById))
                    .toList();
        }
        return ChatSessionResponse.builder()
                .id(s.getId())
                .title(s.getTitle())
                .contextType(s.getContextType())
                .contextId(s.getContextId())
                .contextName(s.getContextName())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .messages(msgResponses)
                .build();
    }

    private ChatMessageResponse toMessageResponse(AiChatMessage m, Map<String, AiExecutionPlan> plansById) {
        ExecutionPlanResponse planDto = null;
        if (m.getPlanId() != null) {
            AiExecutionPlan plan = plansById.get(m.getPlanId());
            if (plan == null) {
                plan = planRepository.findById(m.getPlanId()).orElse(null);
            }
            if (plan != null) {
                planDto = toPlanResponse(plan);
            }
        }
        return ChatMessageResponse.builder()
                .id(m.getId())
                .sessionId(m.getSessionId())
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
