import { Injectable, Logger } from "@nestjs/common";

import { LangGraphProxyService } from "../ai/langgraph-proxy.service";
import { LangSmithService, FeedbackType } from "../ai/services/langsmith.service";
import { CreateAiFeedbackDto } from "./dto/create-ai-feedback.dto";
import { AiFeedbackResponseDto } from "./dto/ai-feedback-response.dto";

@Injectable()
export class AiFeedbackService {
  private readonly logger = new Logger(AiFeedbackService.name);

  constructor(
    private langSmithService: LangSmithService,
    private langGraphProxyService: LangGraphProxyService,
  ) {}

  async create(
    createDto: CreateAiFeedbackDto,
    userId?: string,
    organizationId?: string,
  ): Promise<AiFeedbackResponseDto> {
    // Extract LangSmith IDs from thread state
    let langsmithRunId: string | undefined;
    let langsmithTraceId: string | undefined;

    try {
      const langsmithIds = await this.extractLangSmithIds(
        createDto.thread_id,
        createDto.message_id,
      );
      langsmithRunId = langsmithIds.runId;
      langsmithTraceId = langsmithIds.traceId;
    } catch (error) {
      this.logger.warn(
        `Failed to extract LangSmith IDs from thread state: ${error.message}`,
      );
    }

    // If no LangSmith IDs found, return error
    if (!langsmithRunId && !langsmithTraceId) {
      return {
        langsmith_feedback_id: null,
        success: false,
        message: "Could not find LangSmith trace/run ID. Make sure LangSmith tracing is enabled.",
      };
    }

    // Convert feedback type to score
    const score = this.langSmithService.feedbackTypeToScore(createDto.type);

    // Send to LangSmith
    this.logger.warn(
      `[FEEDBACK] Sending feedback to LangSmith (run_id: ${langsmithRunId || "none"}, trace_id: ${langsmithTraceId || "none"})`,
    );

    // Build source info with additional context
    const sourceInfo: Record<string, any> = {
      issue_type: createDto.issue_type || undefined,
      message_id: createDto.message_id,
      thread_id: createDto.thread_id,
      organization_id: organizationId || undefined,
      user_id: userId || undefined,
    };
    // Remove undefined fields
    Object.keys(sourceInfo).forEach(
      (key) => sourceInfo[key] === undefined && delete sourceInfo[key],
    );

    const langsmithFeedbackId = await this.langSmithService.createFeedback({
      run_id: langsmithRunId || undefined,
      trace_id: langsmithTraceId || undefined,
      score: score,
      key: "user_feedback",
      value: score, // Also include as value for consistency
      comment: createDto.comment || undefined,
      correction: createDto.correction || undefined,
      source: "api", // Source type
      source_info: Object.keys(sourceInfo).length > 0 ? sourceInfo : undefined,
      created_by: userId || undefined,
    });

    if (langsmithFeedbackId) {
      this.logger.warn(
        `[FEEDBACK] ✅ Successfully sent to LangSmith with ID: ${langsmithFeedbackId}`,
      );
      return {
        langsmith_feedback_id: langsmithFeedbackId,
        success: true,
        message: "Feedback successfully submitted to LangSmith",
      };
    } else {
      return {
        langsmith_feedback_id: null,
        success: false,
        message: "Failed to submit feedback to LangSmith. Check logs for details.",
      };
    }
  }

  private async extractLangSmithIds(
    threadId: string,
    messageId: string,
  ): Promise<{ runId?: string; traceId?: string }> {
    try {
      const assistantId = "knowted_agent";
      const threadState = await this.langGraphProxyService.getThreadState(
        assistantId,
        threadId,
      );

      // Log thread state structure for debugging
      this.logger.warn(
        `[FEEDBACK] Thread state keys: ${Object.keys(threadState || {}).join(", ")}`,
      );

      // Check thread state metadata first (LangSmith IDs might be at thread level)
      const threadMetadata = threadState?.metadata || threadState?.values?.metadata || {};
      let runId = threadMetadata.run_id || threadMetadata.runId || undefined;
      let traceId = threadMetadata.trace_id || threadMetadata.traceId || undefined;

      // Check for LangSmith-specific fields in thread metadata
      if (!runId && !traceId) {
        runId = threadMetadata.langsmith_run_id || threadMetadata.langsmithRunId || undefined;
        traceId = threadMetadata.langsmith_trace_id || threadMetadata.langsmithTraceId || undefined;
      }

      // Thread state contains messages array
      const messages = threadState?.values?.messages || threadState?.messages || [];
      this.logger.warn(
        `[FEEDBACK] Found ${messages.length} messages in thread state`,
      );

      // Find the message by ID
      const message = messages.find((msg: any) => {
        // Message ID could be in different formats
        return (
          msg.id === messageId ||
          msg.id?.toString() === messageId.toString() ||
          msg.message_id === messageId ||
          msg.id?.includes(messageId) ||
          messageId.includes(msg.id)
        );
      });

      if (!message) {
        this.logger.warn(
          `[FEEDBACK] Message ${messageId} not found in thread ${threadId}. Available message IDs: ${messages.map((m: any) => m.id || m.message_id || "no-id").slice(0, 5).join(", ")}`,
        );
        // If message not found, try to use thread-level metadata
        if (runId || traceId) {
          return {
            runId: runId || undefined,
            traceId: traceId || undefined,
          };
        }
        return {};
      }

      // Extract run_id and trace_id from message metadata
      // LangGraph messages may have metadata in different locations
      const messageMetadata = message.metadata || message.additional_kwargs?.metadata || {};
      
      // Log message structure for debugging
      this.logger.warn(
        `[FEEDBACK] Message metadata keys: ${Object.keys(messageMetadata).join(", ")}`,
      );
      this.logger.warn(
        `[FEEDBACK] Message structure: ${JSON.stringify({
          id: message.id,
          hasMetadata: !!message.metadata,
          hasAdditionalKwargs: !!message.additional_kwargs,
          metadataKeys: Object.keys(messageMetadata),
        })}`,
      );

      // Try message metadata if thread metadata didn't have IDs
      if (!runId && !traceId) {
        runId = messageMetadata.run_id || messageMetadata.runId || undefined;
        traceId = messageMetadata.trace_id || messageMetadata.traceId || undefined;
      }

      // Check for LangSmith IDs in various metadata locations
      // LangSmith tracing stores IDs in different places depending on configuration
      if (!runId && !traceId) {
        // Check if there's a langsmith_run_id or langsmith_trace_id in metadata
        runId = messageMetadata.langsmith_run_id || messageMetadata.langsmithRunId || undefined;
        traceId = messageMetadata.langsmith_trace_id || messageMetadata.langsmithTraceId || undefined;
      }

      // Check if message has a parent_run_id or run_id that might be a LangSmith ID
      if (!runId && !traceId) {
        const parentRunId = messageMetadata.parent_run_id || messageMetadata.parentRunId;
        if (parentRunId && !parentRunId.startsWith("lc_run--")) {
          // This might be a LangSmith run ID
          runId = parentRunId;
        }
      }

      // Check thread state for run information
      if (!runId && !traceId) {
        const runs = threadState?.values?.runs || threadState?.runs || [];
        if (runs.length > 0) {
          // Get the most recent run
          const latestRun = runs[runs.length - 1];
          const runMetadata = latestRun?.metadata || latestRun?.run_metadata || {};
          runId = runMetadata.run_id || runMetadata.runId || runMetadata.langsmith_run_id || undefined;
          traceId = runMetadata.trace_id || runMetadata.traceId || runMetadata.langsmith_trace_id || undefined;
        }
      }

      // Note: LangGraph run IDs (lc_run--...) are NOT valid LangSmith run IDs
      // Filter out LangGraph internal IDs
      if (runId && runId.startsWith("lc_run--")) {
        this.logger.warn(
          `[FEEDBACK] Found LangGraph run ID (not LangSmith): ${runId}`,
        );
        runId = undefined;
      }

      this.logger.warn(
        `[FEEDBACK] Extracted LangSmith IDs - runId: ${runId || "none"}, traceId: ${traceId || "none"}`,
      );

      return {
        runId: runId || undefined,
        traceId: traceId || undefined,
      };
    } catch (error) {
      this.logger.warn(
        `[FEEDBACK] Error extracting LangSmith IDs: ${error.message}`,
      );
      if (error instanceof Error && error.stack) {
        this.logger.warn(`[FEEDBACK] Stack trace: ${error.stack}`);
      }
      return {};
    }
  }
}
