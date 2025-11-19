import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class LangGraphProxyService {
  private readonly logger = new Logger(LangGraphProxyService.name);
  private readonly client: AxiosInstance;
  private readonly langgraphUrl: string;

  constructor(private configService: ConfigService) {
    this.langgraphUrl =
      this.configService.get<string>('LANGGRAPH_URL') ||
      'http://localhost:2024';

    this.client = axios.create({
      baseURL: this.langgraphUrl,
      timeout: 300000, // 5 minutes for long-running agents
    });

    // Log the LangGraph URL for debugging
    this.logger.log(`LangGraph proxy configured to: ${this.langgraphUrl}`);
  }

  /**
   * Stream a run from LangGraph server
   */
  async streamRun(
    assistantId: string,
    threadId: string,
    body: any,
  ): Promise<NodeJS.ReadableStream> {
    // LOG: First thing - log what we received (using WARN to ensure visibility)
    this.logger.warn(
      `[streamRun] ===== SERVICE ENTRY POINT =====`,
    );
    this.logger.warn(
      `[streamRun] Received call: assistantId=${assistantId}, threadId=${threadId}`,
    );
    this.logger.warn(
      `[streamRun] Body type: ${typeof body}, is null: ${body === null}, is undefined: ${body === undefined}`,
    );
    if (body) {
      this.logger.log(
        `[streamRun] Body keys: ${Object.keys(body).join(', ')}`,
      );
      this.logger.log(
        `[streamRun] Body has config: ${!!body.config}`,
      );
      if (body.config) {
        this.logger.log(
          `[streamRun] Body.config type: ${typeof body.config}`,
        );
        this.logger.log(
          `[streamRun] Body.config keys: ${Object.keys(body.config).join(', ')}`,
        );
        if (body.config.configurable) {
          this.logger.log(
            `[streamRun] Body.config.configurable keys: ${Object.keys(body.config.configurable).join(', ')}`,
          );
          this.logger.log(
            `[streamRun] Body.config.configurable.organization_id: ${body.config.configurable.organization_id}`,
          );
          this.logger.log(
            `[streamRun] Body.config.configurable.user_id: ${body.config.configurable.user_id}`,
          );
        } else {
          this.logger.warn(
            `[streamRun] ⚠️  Body.config.configurable is missing!`,
          );
        }
      } else {
        this.logger.warn(
          `[streamRun] ⚠️  Body.config is missing!`,
        );
      }
    } else {
      this.logger.warn(
        `[streamRun] ⚠️  Body is null or undefined!`,
      );
    }

    this.logger.log(
      `Streaming run for assistant ${assistantId}, thread ${threadId}`,
    );
    this.logger.log(
      `Request URL: ${this.langgraphUrl}/threads/${threadId}/runs/stream`,
    );

    try {
      // Since we only have one agent (knowted_agent), we don't need to manage assistant IDs
      // LangGraph will use the default agent if assistant_id is not provided
      // We can optionally pass the graph name if needed, but it's not required

      // Ensure thread exists before creating a run
      // Extract config from body to pass to thread creation if needed
      const threadConfig = body.config || {};
      await this.ensureThreadExists(assistantId, threadId, threadConfig);

      // LOG: Trace incoming body BEFORE creating requestBody
      this.logger.log(
        `[streamRun] Incoming body keys: ${Object.keys(body).join(', ')}`,
      );
      if (body.config) {
        this.logger.log(
          `[streamRun] Incoming body.config: ${JSON.stringify(body.config, null, 2)}`,
        );
        const incomingConfigurable = body.config.configurable || {};
        this.logger.log(
          `[streamRun] Incoming body.config.configurable keys: ${Object.keys(incomingConfigurable).join(', ')}`,
        );
        if (incomingConfigurable.organization_id) {
          this.logger.log(
            `[streamRun] ✅ Incoming body has organization_id: ${incomingConfigurable.organization_id}`,
          );
        } else {
          this.logger.warn(
            `[streamRun] ⚠️  Incoming body.config.configurable.organization_id NOT found!`,
          );
        }
        if (incomingConfigurable.user_id) {
          this.logger.log(
            `[streamRun] ✅ Incoming body has user_id: ${incomingConfigurable.user_id}`,
          );
        } else {
          this.logger.warn(
            `[streamRun] ⚠️  Incoming body.config.configurable.user_id NOT found!`,
          );
        }
      } else {
        this.logger.warn(`[streamRun] ⚠️  No config in incoming body!`);
      }

      // LangGraph API uses /threads/{threadId}/runs/stream
      // assistant_id is optional - if not provided, LangGraph uses the default agent
      // Since we only have one agent, we can omit it or pass the graph name
      const requestBody = {
        ...body,
        // Only include assistant_id if it's explicitly provided in the body
        // Otherwise, let LangGraph use the default agent
        assistant_id: body.assistant_id || assistantId,
      };

      // Log the exact request being made to LangGraph
      this.logger.log(
        `Making stream request to LangGraph: POST ${this.langgraphUrl}/threads/${threadId}/runs/stream`,
      );
      this.logger.log(`Request body keys: ${Object.keys(requestBody).join(', ')}`);
      
      // LOG: Trace config in request body AFTER creating requestBody
      if (requestBody.config) {
        this.logger.log(
          `[streamRun] Config in request body: ${JSON.stringify(requestBody.config, null, 2)}`,
        );
        const configurable = requestBody.config.configurable || {};
        this.logger.log(
          `[streamRun] Config configurable keys: ${Object.keys(configurable).join(', ')}`,
        );
        if (configurable.organization_id) {
          this.logger.log(
            `[streamRun] ✅ organization_id in config: ${configurable.organization_id}`,
          );
        } else {
          this.logger.warn(
            `[streamRun] ⚠️  organization_id NOT found in config!`,
          );
        }
        if (configurable.user_id) {
          this.logger.log(
            `[streamRun] ✅ user_id in config: ${configurable.user_id}`,
          );
        } else {
          this.logger.warn(`[streamRun] ⚠️  user_id NOT found in config!`);
        }
      } else {
        this.logger.warn(`[streamRun] ⚠️  No config in request body!`);
      }

      const response = await this.client.post(
        `/threads/${threadId}/runs/stream`,
        requestBody,
        {
          responseType: 'stream',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
        },
      );

      return response.data;
    } catch (error) {
      // Safely extract error information without circular references
      let errorMessage = 'Unknown error';
      let statusCode: number | string = 'UNKNOWN';

      try {
        // Extract error message safely
        if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        // Extract status code safely (only primitive values)
        const err = error as any;
        if (typeof err?.response?.status === 'number') {
          statusCode = err.response.status;
        } else if (typeof err?.status === 'number' || typeof err?.status === 'string') {
          statusCode = err.status;
        } else if (typeof err?.code === 'number' || typeof err?.code === 'string') {
          statusCode = err.code;
        }

        // Try to extract response data safely (only if it's a plain object)
        // For stream errors, response.data might be a stream, so we need to be careful
        if (err?.response?.data && typeof err.response.data === 'object') {
          try {
            // Check if it's a stream - streams have circular references
            if (err.response.data.readable || err.response.data.pipe) {
              // It's a stream, don't try to extract data from it
              if (statusCode === 404) {
                errorMessage = `LangGraph assistant '${assistantId}' not found`;
              } else if (statusCode === 500) {
                errorMessage = 'LangGraph server error';
              } else {
                errorMessage = `LangGraph server returned status ${statusCode}`;
              }
            } else {
              // It's a plain object, try to extract message
              const data = err.response.data;
              if (data.message || data.error) {
                errorMessage = data.message || data.error || errorMessage;
              }
            }
          } catch {
            // Ignore if we can't extract data
          }
        }

        // Handle specific error codes
        if (statusCode === 404) {
          errorMessage = `LangGraph assistant '${assistantId}' not found or endpoint does not exist`;
        } else if (statusCode === 422) {
          // 422 is validation error - try to get more details from response
          const detail = err?.response?.data?.detail || err?.response?.data?.message;
          if (detail) {
            errorMessage = `LangGraph validation error: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`;
          } else {
            errorMessage = `LangGraph validation error: Request format is invalid for thread '${threadId}'`;
          }
          
          // Log full error details for debugging
          try {
            const responseData = err?.response?.data;
            this.logger.error(
              `LangGraph 422 error details: ${JSON.stringify({
                threadId,
                assistantId,
                bodyKeys: Object.keys(body),
                bodyPreview: {
                  hasInput: !!body.input,
                  hasMessages: !!body.messages,
                  inputType: body.input ? typeof body.input : undefined,
                  messagesType: body.messages ? typeof body.messages : undefined,
                  configKeys: body.config?.configurable ? Object.keys(body.config.configurable) : [],
                },
                responseData: responseData ? (typeof responseData === 'string' ? responseData : JSON.stringify(responseData)) : 'no response data',
                responseStatus: err?.response?.status,
              })}`,
            );
          } catch (logError) {
            this.logger.error(`Failed to log 422 error details: ${logError}`);
          }
        } else if (statusCode === 'ECONNREFUSED' || errorMessage.includes('ECONNREFUSED')) {
          errorMessage = 'Cannot connect to LangGraph server. Please ensure it is running.';
        }
      } catch {
        // If extraction fails, use defaults
      }

      this.logger.error(
        `Failed to stream run for assistant ${assistantId}, thread ${threadId}: ${errorMessage} (Status: ${statusCode})`,
      );

      // Create a clean error object without circular references
      // IMPORTANT: Don't attach the original error or response object
      const cleanError = new Error(errorMessage);
      (cleanError as any).status = statusCode;
      // Explicitly remove any circular references by not attaching response or request
      throw cleanError;
    }
  }

  /**
   * Create a run (non-streaming)
   */
  async createRun(
    assistantId: string,
    threadId: string,
    body: any,
  ): Promise<any> {
    this.logger.log(
      `Creating run for assistant ${assistantId}, thread ${threadId}`,
    );

    try {
      // Since we only have one agent (knowted_agent), we don't need to manage assistant IDs
      // Ensure thread exists before creating a run
      const threadConfig = body.config || {};
      await this.ensureThreadExists(assistantId, threadId, threadConfig);

      // LangGraph API uses /threads/{threadId}/runs
      // assistant_id is optional - if not provided, LangGraph uses the default agent
      const requestBody = {
        ...body,
        assistant_id: body.assistant_id || assistantId,
      };

      const response = await this.client.post(
        `/threads/${threadId}/runs`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      // Safely extract error information without circular references
      let errorMessage = 'Failed to create run';
      let statusCode: number | string = 'UNKNOWN';

      try {
        if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        const err = error as any;
        if (typeof err?.response?.status === 'number') {
          statusCode = err.response.status;
        } else if (typeof err?.status === 'number' || typeof err?.status === 'string') {
          statusCode = err.status;
        } else if (typeof err?.code === 'number' || typeof err?.code === 'string') {
          statusCode = err.code;
        }
      } catch {
        // If extraction fails, use defaults
      }

      this.logger.error(
        `Failed to create run for assistant ${assistantId}, thread ${threadId}: ${errorMessage} (Status: ${statusCode})`,
      );

      const cleanError = new Error(errorMessage);
      (cleanError as any).status = statusCode;
      throw cleanError;
    }
  }

  /**
   * Get thread state
   */
  async getThreadState(
    assistantId: string,
    threadId: string,
  ): Promise<any> {
    this.logger.log(
      `Getting thread state for assistant ${assistantId}, thread ${threadId}`,
    );

    try {
      // Since we only have one agent (knowted_agent), we don't need to manage assistant IDs
      // Ensure thread exists before getting state
      await this.ensureThreadExists(assistantId, threadId);

      // LangGraph API uses /threads/{threadId}/state
      // assistant_id is optional as a query parameter - if not provided, LangGraph uses the default agent
      const response = await this.client.get(
        `/threads/${threadId}/state`,
        {
          params: {
            assistant_id: assistantId, // Pass graph name, LangGraph will handle it
          },
        },
      );

      return response.data;
    } catch (error) {
      // Safely extract error information without circular references
      let errorMessage = 'Failed to get thread state';
      let statusCode: number | string = 'UNKNOWN';

      try {
        // Extract error message safely
        if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        // Extract status code safely (only primitive values)
        const err = error as any;
        if (typeof err?.response?.status === 'number') {
          statusCode = err.response.status;
        } else if (typeof err?.status === 'number' || typeof err?.status === 'string') {
          statusCode = err.status;
        } else if (typeof err?.code === 'number' || typeof err?.code === 'string') {
          statusCode = err.code;
        }

        // Handle specific error codes
        if (statusCode === 404) {
          errorMessage = `LangGraph assistant '${assistantId}' or thread '${threadId}' not found`;
        } else if (statusCode === 'ECONNREFUSED' || errorMessage.includes('ECONNREFUSED')) {
          errorMessage = 'Cannot connect to LangGraph server. Please ensure it is running.';
        }
      } catch {
        // If extraction fails, use defaults
      }

      this.logger.error(
        `Failed to get thread state for assistant ${assistantId}, thread ${threadId}: ${errorMessage} (Status: ${statusCode})`,
      );

      // Create a clean error object without circular references
      const cleanError = new Error(errorMessage);
      (cleanError as any).status = statusCode;
      throw cleanError;
    }
  }

  /**
   * Create a new thread
   */
  async createThread(body: any): Promise<any> {
    this.logger.log('Creating new thread');

    const response = await this.client.post('/threads', body, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  /**
   * Check if thread exists, and create it if it doesn't
   */
  async ensureThreadExists(
    assistantId: string,
    threadId: string,
    config?: any,
  ): Promise<void> {
    try {
      // Try to get the thread to see if it exists
      const threadResponse = await this.client.get(`/threads/${threadId}`);
      const existingThread = threadResponse.data;
      
      // Check if thread exists but config is missing organization_id or user_id
      const existingConfig = existingThread?.config?.configurable || {};
      const requiredConfigKeys = ['organization_id', 'user_id'];
      const missingConfigKeys = requiredConfigKeys.filter(
        (key) => !existingConfig[key] && config?.configurable?.[key],
      );

      if (missingConfigKeys.length > 0 && config?.configurable) {
        // Note: LangGraph doesn't persist config from run requests to thread state
        // The config will be available during the run, but won't be stored in the checkpoint
        // This is OK - the agent will receive the config with each run
        // The frontend is already passing organization_id and user_id in the request body,
        // and we're correctly using them, so this is just informational
        this.logger.debug(
          `Thread '${threadId}' exists but stored config is missing keys: ${missingConfigKeys.join(', ')}. ` +
          `Config will be passed with each run request (this is expected behavior).`,
        );
      } else {
        this.logger.log(`Thread '${threadId}' exists`);
      }
    } catch (error) {
      const err = error as any;
      // If thread doesn't exist (404), try to create it
      if (err?.response?.status === 404) {
        this.logger.warn(
          `Thread '${threadId}' not found. Attempting to create it...`,
        );
        try {
          // Create thread - LangGraph API expects thread_id in the body
          // Use if_exists: "do_nothing" to avoid errors if thread was created concurrently
          const createPayload: any = {
            thread_id: threadId,
            if_exists: 'do_nothing', // Return existing thread if it exists
          };

          // Include config if provided (for initial state)
          if (config) {
            createPayload.config = config;
          }

          const response = await this.client.post('/threads', createPayload, {
            headers: {
              'Content-Type': 'application/json',
            },
          });

          const createdThreadId =
            response.data?.thread_id || response.data?.threadId || threadId;
          this.logger.log(
            `Successfully created/verified thread '${createdThreadId}'`,
          );
        } catch (createError) {
          const createErr = createError as any;
          const createErrorMessage =
            createErr?.response?.data?.detail ||
            createErr?.response?.data?.message ||
            createErr?.message ||
            'Unknown error';
          this.logger.error(
            `Failed to create thread '${threadId}': ${createErrorMessage}`,
          );

          // Provide helpful error message
          throw new Error(
            `Thread '${threadId}' does not exist and could not be created: ${createErrorMessage}. ` +
            `Please ensure the LangGraph server is running at ${this.langgraphUrl}`,
          );
        }
      } else {
        // Re-throw other errors
        throw error;
      }
    }
  }

  /**
   * Check if assistant exists, and create it if it doesn't
   * Returns the actual assistant UUID (not the graph name)
   */
  async ensureAssistantExists(assistantId: string): Promise<string> {
    // If assistantId is already a UUID format, try to use it directly
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(assistantId)) {
      try {
        await this.client.get(`/assistants/${assistantId}`);
        this.logger.log(`Assistant UUID '${assistantId}' exists`);
        return assistantId;
      } catch (error) {
        const err = error as any;
        if (err?.response?.status === 404) {
          throw new Error(`Assistant UUID '${assistantId}' not found`);
        }
        throw error;
      }
    }

    // assistantId is a graph name, not a UUID
    // Try to create/get the assistant using the graph name
    try {
      // Create assistant using the graph name from langgraph.json
      // LangGraph API expects: { graph_id: string, assistant_id?: string }
      // When running langgraph dev, graphs are available by their name
      const createPayload: any = {
        graph_id: assistantId,
      };
      
      const response = await this.client.post(
        '/assistants',
        createPayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      
      // LangGraph returns the assistant with a UUID assistant_id
      const actualAssistantId = response.data?.assistant_id || response.data?.id;
      if (!actualAssistantId) {
        throw new Error('Assistant creation succeeded but no assistant_id returned');
      }
      
      // Verify the assistant actually exists by trying to get it
      try {
        await this.client.get(`/assistants/${actualAssistantId}`);
        this.logger.log(
          `Successfully created and verified assistant UUID '${actualAssistantId}' from graph '${assistantId}'`,
        );
      } catch (verifyError) {
        const verifyErr = verifyError as any;
        this.logger.warn(
          `Assistant UUID '${actualAssistantId}' was created but verification failed: ${verifyErr?.response?.status || verifyErr?.message}`,
        );
        // Still return the ID - it might work even if GET fails
      }
      
      return actualAssistantId;
    } catch (createError) {
      const createErr = createError as any;
      const createErrorMessage =
        createErr?.response?.data?.detail ||
        createErr?.response?.data?.message ||
        createErr?.message ||
        'Unknown error';
      this.logger.error(
        `Failed to create assistant from graph '${assistantId}': ${createErrorMessage}`,
      );
      
      // Provide helpful error message
      throw new Error(
        `Assistant '${assistantId}' does not exist and could not be created: ${createErrorMessage}. ` +
        `Please ensure: 1) LangGraph server is running at ${this.langgraphUrl}, ` +
        `2) The graph '${assistantId}' is defined in langgraph.json, ` +
        `3) The LangGraph server has loaded the graphs correctly. ` +
        `You can check available graphs at ${this.langgraphUrl}/docs`,
      );
    }
  }
}

