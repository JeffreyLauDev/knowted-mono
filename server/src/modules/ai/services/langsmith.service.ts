import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

export enum FeedbackType {
  THUMBS_UP = "thumbs_up",
  THUMBS_DOWN = "thumbs_down",
}

@Injectable()
export class LangSmithService {
  private readonly logger = new Logger(LangSmithService.name);
  private readonly client: AxiosInstance | null = null;
  private readonly apiKey: string | null = null;
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>("LANGSMITH_API_KEY") || null;
    this.apiUrl =
      this.configService.get<string>("LANGSMITH_API_URL") ||
      "https://api.smith.langchain.com";

    if (this.apiKey) {
      this.client = axios.create({
        baseURL: this.apiUrl,
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });
      this.logger.log("LangSmith service initialized");
    } else {
      this.logger.warn(
        "LangSmith API key not configured. Feedback will not be sent to LangSmith.",
      );
    }
  }

  /**
   * Create feedback in LangSmith
   * @param feedback Feedback data to send to LangSmith
   * @returns LangSmith feedback ID if successful, null otherwise
   */
  async createFeedback(feedback: {
    run_id?: string;
    trace_id?: string;
    score?: number;
    key?: string;
    comment?: string;
    value?: number;
    correction?: string;
    source?: string;
    source_info?: Record<string, any>;
    created_by?: string;
  }): Promise<string | null> {
    if (!this.client || !this.apiKey) {
      this.logger.debug(
        "LangSmith not configured, skipping feedback submission",
      );
      return null;
    }

    try {
      // Convert feedback type to score
      const score =
        feedback.score !== undefined
          ? feedback.score
          : feedback.value !== undefined
            ? feedback.value
            : null;

      const payload: any = {
        run_id: feedback.run_id,
        trace_id: feedback.trace_id,
        key: feedback.key || "user_feedback",
        score: score,
        value: feedback.value || undefined,
        comment: feedback.comment || undefined,
        correction: feedback.correction || undefined,
      };

      // Add feedback_source if source or created_by is provided
      if (feedback.source || feedback.created_by || feedback.source_info) {
        payload.feedback_source = {
          type: feedback.source || "api",
          user_id: feedback.created_by || undefined,
          metadata: feedback.source_info || undefined,
        };
        // Remove undefined fields from feedback_source
        Object.keys(payload.feedback_source).forEach(
          (key) =>
            payload.feedback_source[key] === undefined &&
            delete payload.feedback_source[key],
        );
        // Remove feedback_source if it's empty
        if (Object.keys(payload.feedback_source).length === 0) {
          delete payload.feedback_source;
        }
      }

      // Remove undefined fields
      Object.keys(payload).forEach(
        (key) => payload[key] === undefined && delete payload[key],
      );

      // LangSmith requires at least run_id or trace_id
      if (!payload.run_id && !payload.trace_id) {
        this.logger.warn(
          "Cannot create LangSmith feedback: missing run_id or trace_id",
        );
        return null;
      }

      // Validate run_id format - LangGraph run IDs (lc_run--...) are not valid LangSmith run IDs
      // If we only have a LangGraph run ID, we can't create LangSmith feedback
      if (payload.run_id && payload.run_id.startsWith("lc_run--")) {
        this.logger.debug(
          `Skipping LangSmith feedback: run_id is a LangGraph ID (${payload.run_id}), not a LangSmith run ID. Need actual LangSmith trace/run ID.`,
        );
        return null;
      }

      this.logger.debug(
        `Sending feedback to LangSmith: ${JSON.stringify(payload)}`,
      );

      const response = await this.client.post("/api/v1/feedback", payload);

      if (response.data?.id) {
        this.logger.warn(
          `[LANGSMITH] ✅ Feedback created in LangSmith: ${response.data.id}`,
        );
        return response.data.id;
      }

      return null;
    } catch (error: any) {
      // Log detailed error information
      const errorMessage = error.message || "Unknown error";
      const errorResponse = error.response?.data;
      const errorStatus = error.response?.status;

      this.logger.error(
        `Failed to create feedback in LangSmith: ${errorMessage} (Status: ${errorStatus})`,
      );

      if (errorResponse) {
        this.logger.error(
          `LangSmith error response: ${JSON.stringify(errorResponse)}`,
        );
      }

      // Log the payload that was sent for debugging
      this.logger.debug(
        `Failed payload: ${JSON.stringify({
          run_id: feedback.run_id,
          trace_id: feedback.trace_id,
          score: feedback.score,
          key: feedback.key,
          comment: feedback.comment,
        })}`,
      );

      return null;
    }
  }

  /**
   * Convert feedback type to LangSmith score
   */
  feedbackTypeToScore(type: FeedbackType): number {
    return type === FeedbackType.THUMBS_UP ? 1 : 0;
  }
}

