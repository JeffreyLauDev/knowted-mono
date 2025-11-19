import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationsService } from '../organizations/organizations.service';
import { ProfilesService } from '../profiles/profiles.service';
import { LangGraphProxyService } from './langgraph-proxy.service';

@ApiTags('LangGraph Proxy')
@ApiBearerAuth('access-token')
@Controller('api/v1/langgraph')
@UseGuards(JwtAuthGuard)
export class LangGraphProxyController {
  private readonly logger = new Logger(LangGraphProxyController.name);

  constructor(
    private readonly langGraphProxyService: LangGraphProxyService,
    private readonly organizationsService: OrganizationsService,
    private readonly profilesService: ProfilesService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Proxy streaming requests to LangGraph server
   * POST /api/v1/langgraph/assistants/:assistantId/threads/:threadId/runs/stream
   */
  @Post('assistants/:assistantId/threads/:threadId/runs/stream')
  @ApiOperation({
    summary: 'Stream agent run from LangGraph',
    description:
      'Proxies streaming requests to LangGraph server with authentication and context',
  })
  async streamRun(
    @Param('assistantId') assistantId: string,
    @Param('threadId') threadId: string,
    @Body() body: any,
    @GetUser() user: any,
    @Res() res: Response,
  ) {
    try {
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      // Add organization_id and user_id to config
      const config = body.config || {};
      config.configurable = {
        ...config.configurable,
        organization_id: user.organization_id,
        user_id: user.sub,
        thread_id: threadId,
      };

      // Forward request to LangGraph server
      const stream = await this.langGraphProxyService.streamRun(
        assistantId,
        threadId,
        {
          ...body,
          config,
        },
      );

      // Pipe the stream to client
      stream.pipe(res);

      // Handle stream errors
      stream.on('error', (error) => {
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      });

      // Handle stream end
      stream.on('end', () => {
        res.end();
      });
    } catch (error) {
      res.write(`event: error\n`);
      res.write(
        `data: ${JSON.stringify({ error: error.message || 'Stream error' })}\n\n`,
      );
      res.end();
    }
  }

  /**
   * Proxy non-streaming run creation
   * POST /api/v1/langgraph/assistants/:assistantId/threads/:threadId/runs
   */
  @Post('assistants/:assistantId/threads/:threadId/runs')
  @ApiOperation({
    summary: 'Create agent run in LangGraph',
    description:
      'Proxies run creation to LangGraph server with authentication and context',
  })
  async createRun(
    @Param('assistantId') assistantId: string,
    @Param('threadId') threadId: string,
    @Body() body: any,
    @GetUser() user: any,
  ) {
    try {
      // Add organization_id and user_id to config
      const config = body.config || {};
      config.configurable = {
        ...config.configurable,
        organization_id: user.organization_id,
        user_id: user.sub,
        thread_id: threadId,
      };

      const result = await this.langGraphProxyService.createRun(
        assistantId,
        threadId,
        {
          ...body,
          config,
        },
      );

      return result;
    } catch (error) {
      // Safely extract error information without circular references
      let errorMessage = 'Failed to create run';
      let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

      try {
        if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        // Safely extract status code (only primitive values)
        const err = error as any;
        if (typeof err?.status === 'number') {
          statusCode = err.status;
        } else if (typeof err?.response?.status === 'number') {
          statusCode = err.response.status;
        } else if (typeof err?.code === 'number') {
          statusCode = err.code;
        }
      } catch {
        // If extraction fails, use defaults
      }

      throw new HttpException(errorMessage, statusCode);
    }
  }

  /**
   * Get thread state
   * GET /api/v1/langgraph/assistants/:assistantId/threads/:threadId/state
   */
  @Get('assistants/:assistantId/threads/:threadId/state')
  @ApiOperation({
    summary: 'Get thread state from LangGraph',
    description: 'Retrieves the current state of a thread from LangGraph',
  })
  async getThreadState(
    @Param('assistantId') assistantId: string,
    @Param('threadId') threadId: string,
    @GetUser() user: any,
  ) {
    try {
      const result = await this.langGraphProxyService.getThreadState(
        assistantId,
        threadId,
      );

      return result;
    } catch (error) {
      // Safely extract error information without circular references
      let errorMessage = 'Failed to get thread state';
      let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

      try {
        if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        // Safely extract status code (only primitive values)
        const err = error as any;
        if (typeof err?.status === 'number') {
          statusCode = err.status;
        } else if (typeof err?.response?.status === 'number') {
          statusCode = err.response.status;
        } else if (typeof err?.code === 'number') {
          statusCode = err.code;
        }
      } catch {
        // If extraction fails, use defaults
      }

      throw new HttpException(errorMessage, statusCode);
    }
  }

  /**
   * Create a new thread
   * POST /api/v1/langgraph/threads
   */
  @Post('threads')
  @ApiOperation({
    summary: 'Create a new thread in LangGraph',
    description:
      'Creates a new thread in LangGraph server with authentication and context',
  })
  async createThread(@Body() body: any, @GetUser() user: any) {
    try {
      // Add organization_id and user_id to config if provided
      if (body.config?.configurable) {
        body.config.configurable = {
          ...body.config.configurable,
          organization_id: user.organization_id,
          user_id: user.sub,
        };
      } else if (body.config) {
        body.config.configurable = {
          organization_id: user.organization_id,
          user_id: user.sub,
        };
      } else {
        body.config = {
          configurable: {
            organization_id: user.organization_id,
            user_id: user.sub,
          },
        };
      }

      const result = await this.langGraphProxyService.createThread(body);

      return result;
    } catch (error) {
      // Safely extract error information without circular references
      let errorMessage = 'Failed to create thread';
      let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

      try {
        if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        // Safely extract status code (only primitive values)
        const err = error as any;
        if (typeof err?.status === 'number') {
          statusCode = err.status;
        } else if (typeof err?.response?.status === 'number') {
          statusCode = err.response.status;
        } else if (typeof err?.code === 'number') {
          statusCode = err.code;
        }
      } catch {
        // If extraction fails, use defaults
      }

      throw new HttpException(errorMessage, statusCode);
    }
  }

  /**
   * Create a new thread and stream run (for when threadId is not provided)
   * POST /api/v1/langgraph/threads/new/runs/stream
   * This route handles the case when LangGraph SDK needs to create a new thread
   */
  @Post('threads/new/runs/stream')
  @ApiOperation({
    summary: 'Create new thread and stream run from LangGraph',
    description:
      'Creates a new thread (LangGraph generates the ID) and streams the run',
  })
  async streamRunNewThread(
    @Body() body: any,
    @GetUser() user: any,
    @Res() res: Response,
  ) {
    try {
      // Extract assistantId from body or use default
      const assistantId = body.assistant_id || 'knowted_agent';

      // Create a new thread - LangGraph will generate the thread_id
      const threadConfig = {
        configurable: {
          organization_id: user.organization_id,
          user_id: user.sub,
        },
      };
      const newThread = await this.langGraphProxyService.createThread({
        config: threadConfig,
      });
      const actualThreadId =
        newThread.thread_id || newThread.threadId || newThread.id;

      // Set up SSE headers BEFORE writing thread_id event
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      // Send the new thread ID back to the client via SSE
      res.write(`event: thread_id\n`);
      res.write(`data: ${JSON.stringify({ thread_id: actualThreadId })}\n\n`);

      // Add organization_id and user_id to config
      const config = body.config || {};
      config.configurable = {
        ...config.configurable,
        organization_id: user.organization_id,
        user_id: user.sub,
        thread_id: actualThreadId,
      };

      // Transform request body: LangGraph API expects 'input' not 'messages'
      // The SDK sends { messages: [...] } but LangGraph expects { input: { messages: [...] } }
      const transformedBody: any = {
        ...body,
        config,
      };

      // If body has 'messages' but no 'input', convert messages to input format
      if (body.messages && !body.input) {
        transformedBody.input = { messages: body.messages };
        // Remove messages from body since we've converted it to input
        delete transformedBody.messages;
      }

      // Forward request to LangGraph server
      const stream = await this.langGraphProxyService.streamRun(
        assistantId,
        actualThreadId,
        transformedBody,
      );

      // Pipe the stream to client
      stream.pipe(res);

      // Handle stream errors
      stream.on('error', (error) => {
        const errorMessage = error.message || 'Unknown stream error';
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
        res.end();
      });

      // Handle stream end
      stream.on('end', () => {
        res.end();
      });
    } catch (error) {
      // Handle connection errors or other exceptions
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    }
  }

  /**
   * Proxy streaming requests to LangGraph server (SDK pattern)
   * POST /api/v1/langgraph/threads/:threadId/runs/stream
   * This route matches the LangGraph SDK's expected URL pattern
   * For existing threads - threadId must be a valid UUID
   */
  @Post('threads/:threadId/runs/stream')
  @ApiOperation({
    summary: 'Stream agent run from LangGraph (SDK pattern)',
    description:
      'Proxies streaming requests to LangGraph server using SDK URL pattern for existing threads',
  })
  async streamRunSdkPattern(
    @Param('threadId') threadId: string,
    @Body() body: any,
    @GetUser() user: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // LOG: Entry point - verify this method is being called (using WARN to ensure visibility)
    this.logger.warn(
      `[streamRunSdkPattern] ===== CONTROLLER ENTRY POINT =====`,
    );
    this.logger.warn(
      `[streamRunSdkPattern] Received request: threadId=${threadId}`,
    );
    this.logger.warn(
      `[streamRunSdkPattern] User: ${user ? `sub=${user.sub}, org_id=${user.organization_id}` : 'NO USER'}`,
    );
    this.logger.warn(
      `[streamRunSdkPattern] Body keys: ${body ? Object.keys(body).join(', ') : 'NO BODY'}`,
    );
    if (body?.config) {
      this.logger.warn(
        `[streamRunSdkPattern] Body.config exists: ${JSON.stringify(body.config)}`,
      );
    } else {
      this.logger.warn(
        `[streamRunSdkPattern] ⚠️  Body.config does NOT exist in incoming request!`,
      );
    }

    try {
      // Extract assistantId from body or use default
      const assistantId = body.assistant_id || 'knowted_agent';

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      // Add organization_id, user_id, and service secret to config
      // IMPORTANT: Preserve existing config values if user object doesn't have them
      const config = body.config || {};
      const existingConfigurable = config.configurable || {};
      
      // Use user.organization_id if available, otherwise preserve existing value from body
      // The frontend sends organization_id in the config, so we should preserve it
      const organizationId = user.organization_id || existingConfigurable.organization_id;
      const userId = user.sub || existingConfigurable.user_id;
      
      if (!organizationId) {
        this.logger.warn(
          `[streamRunSdkPattern] ⚠️  WARNING: organization_id not found in user object or existing config!`,
        );
      }
      
      // CRITICAL: Validate user belongs to organization BEFORE passing to agent
      if (organizationId && userId) {
        try {
          const userOrg = await this.organizationsService.getUserOrganizationWithTeam(
            userId,
            organizationId,
          );
          if (!userOrg) {
            throw new ForbiddenException(
              'User does not belong to this organization',
            );
          }
        } catch (error) {
          if (error instanceof ForbiddenException) {
            throw error;
          }
          this.logger.error(
            `[streamRunSdkPattern] Error validating user-organization: ${error.message}`,
          );
          throw new ForbiddenException(
            'Failed to validate user-organization membership',
          );
        }
      }
      
      // Get service secret from config
      const internalServiceSecret = this.configService.get<string>(
        'INTERNAL_SERVICE_SECRET',
      );
      if (!internalServiceSecret) {
        throw new Error('INTERNAL_SERVICE_SECRET not configured');
      }
      
      // Fetch organization name, team name, and user name
      let organizationName: string | undefined = existingConfigurable.organization_name;
      let teamName: string | undefined = existingConfigurable.team_name;
      let userName: string | undefined = existingConfigurable.user_name;
      
      if (organizationId && userId) {
        try {
          // Fetch organization name
          if (!organizationName) {
            const organization = await this.organizationsService.findOne(organizationId);
            if (organization) {
              organizationName = organization.name || undefined;
            }
          }
          
          // Fetch team name from user's organization membership
          if (!teamName) {
            const userOrg = await this.organizationsService.getUserOrganizationWithTeam(
              userId,
              organizationId,
            );
            if (userOrg && userOrg.team) {
              teamName = userOrg.team.name;
            }
          }

          // Fetch user name from profile
          if (!userName) {
            try {
              const profile = await this.profilesService.getProfile(userId);
              if (profile) {
                const firstName = profile.first_name?.trim() || '';
                const lastName = profile.last_name?.trim() || '';
                if (firstName || lastName) {
                  userName = `${firstName} ${lastName}`.trim();
                }
              }
            } catch (error) {
              this.logger.warn(
                `[streamRunSdkPattern] Could not fetch user profile: ${error.message}`,
              );
            }
          }
        } catch (error) {
          this.logger.warn(
            `[streamRunSdkPattern] Could not fetch organization/team context: ${error.message}`,
          );
        }
      }
      
      config.configurable = {
        ...existingConfigurable,
        organization_id: organizationId,
        user_id: userId,
        thread_id: threadId,
        internal_service_secret: internalServiceSecret,
        organization_name: organizationName,
        team_name: teamName,
        user_name: userName,
      };

      // LOG: Trace config being set
      this.logger.warn(
        `[streamRunSdkPattern] Setting config for thread ${threadId}:`,
      );
      this.logger.warn(
        `  - organization_id: ${config.configurable.organization_id} (from user: ${user.organization_id}, from body: ${existingConfigurable.organization_id})`,
      );
      this.logger.warn(`  - user_id: ${config.configurable.user_id}`);
      this.logger.warn(
        `  - organization_name: ${organizationName || 'NOT SET'}`,
      );
      this.logger.warn(`  - team_name: ${teamName || 'NOT SET'}`);
      this.logger.warn(`  - user_name: ${userName || 'NOT SET'}`);
      this.logger.warn(
        `  - internal_service_secret: ${internalServiceSecret ? internalServiceSecret.substring(0, 20) + '...' : 'NOT SET'}`,
      );
      // Don't log full config with service secret for security
      const configForLogging = { ...config };
      if (configForLogging.configurable?.internal_service_secret) {
        configForLogging.configurable.internal_service_secret = '[REDACTED]';
      }
      this.logger.warn(
        `  - Full config: ${JSON.stringify(configForLogging, null, 2)}`,
      );

      // Transform request body: LangGraph API expects 'input' not 'messages'
      // The SDK sends { messages: [...] } but LangGraph expects { input: { messages: [...] } }
      // Based on the Python agent code (knowted_agent.py), it expects {"messages": [...]} format
      const transformedBody: any = {
        ...body,
        config,
      };

      // LOG: Verify transformedBody has the config
      this.logger.log(
        `[streamRunSdkPattern] transformedBody keys: ${Object.keys(transformedBody).join(', ')}`,
      );
      if (transformedBody.config) {
        this.logger.log(
          `[streamRunSdkPattern] transformedBody.config.configurable keys: ${Object.keys(transformedBody.config.configurable || {}).join(', ')}`,
        );
        this.logger.log(
          `[streamRunSdkPattern] transformedBody.config.configurable.organization_id: ${transformedBody.config.configurable?.organization_id}`,
        );
        this.logger.log(
          `[streamRunSdkPattern] transformedBody.config.configurable.user_id: ${transformedBody.config.configurable?.user_id}`,
        );
      } else {
        this.logger.warn(
          `[streamRunSdkPattern] ⚠️  transformedBody.config is missing!`,
        );
      }

      // LOG: Trace what's being sent to LangGraph
      this.logger.log(
        `[streamRunSdkPattern] Sending to LangGraph with config: ${JSON.stringify(config, null, 2)}`,
      );

      // If body has 'messages' but no 'input', convert messages to input format
      // LangGraph API expects: { input: { messages: [...] } }
      if (body.messages && !body.input) {
        transformedBody.input = { messages: body.messages };
        // Remove messages from body since we've converted it to input
        delete transformedBody.messages;
      }

      // Log the request for debugging 422 errors
      this.logger.log(
        `[streamRunSdkPattern] Streaming run: assistant=${assistantId}, threadId=${threadId}, body keys=${Object.keys(body).join(',')}`,
      );
      this.logger.log(
        `[streamRunSdkPattern] Transformed body keys: ${Object.keys(transformedBody).join(',')}, hasInput: ${!!transformedBody.input}, hasMessages: ${!!transformedBody.messages}`,
      );
      if (transformedBody.input) {
        this.logger.log(
          `[streamRunSdkPattern] Input structure: ${JSON.stringify({
            inputType: typeof transformedBody.input,
            isArray: Array.isArray(transformedBody.input),
            hasMessages: !!(transformedBody.input as any)?.messages,
            inputKeys: typeof transformedBody.input === 'object' ? Object.keys(transformedBody.input) : [],
          })}`,
        );
      }

      // Forward request to LangGraph server
      const stream = await this.langGraphProxyService.streamRun(
        assistantId,
        threadId,
        transformedBody,
      );

      // Pipe the stream to client
      stream.pipe(res);

      // Handle stream errors
      stream.on('error', (error) => {
        const errorMessage = error.message || 'Unknown stream error';
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
        res.end();
      });

      // Handle stream end
      stream.on('end', () => {
        res.end();
      });
    } catch (error) {
      // Handle connection errors or other exceptions
      // Extract only primitive values to avoid circular reference errors
      let errorMessage = 'Failed to connect to LangGraph server';
      let statusCode: number | string | undefined;

      // Safely extract error message
      try {
        if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
      } catch (e) {
        // Ignore extraction errors
      }

      // Safely extract status code (only primitive values)
      try {
        const err = error as any;
        if (typeof err?.status === 'number' || typeof err?.status === 'string') {
          statusCode = err.status;
        } else if (typeof err?.code === 'number' || typeof err?.code === 'string') {
          statusCode = err.code;
        } else if (err?.response && typeof err.response.status === 'number') {
          statusCode = err.response.status;
        }
      } catch (e) {
        // Ignore extraction errors
      }

      // Build error details string
      const errorDetails = statusCode ? ` (Status: ${statusCode})` : '';

      // Send error via SSE if headers haven't been sent
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
      }

      // Send clean error message without circular references
      const cleanError = {
        error: `${errorMessage}${errorDetails}`,
      };

      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify(cleanError)}\n\n`);
      res.end();
    }
  }

  /**
   * Proxy non-streaming run creation (SDK pattern)
   * POST /api/v1/langgraph/threads/:threadId/runs
   */
  @Post('threads/:threadId/runs')
  @ApiOperation({
    summary: 'Create agent run in LangGraph (SDK pattern)',
    description:
      'Proxies run creation to LangGraph server using SDK URL pattern',
  })
  async createRunSdkPattern(
    @Param('threadId') threadId: string,
    @Body() body: any,
    @GetUser() user: any,
  ) {
    try {
      // Extract assistantId from body or use default
      const assistantId = body.assistant_id || 'knowted_agent';

      // Add organization_id and user_id to config
      const config = body.config || {};
      config.configurable = {
        ...config.configurable,
        organization_id: user.organization_id,
        user_id: user.sub,
        thread_id: threadId,
      };

      const result = await this.langGraphProxyService.createRun(
        assistantId,
        threadId,
        {
          ...body,
          config,
        },
      );

      return result;
    } catch (error) {
      // Safely extract error information without circular references
      let errorMessage = 'Failed to create run';
      let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

      try {
        if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        // Safely extract status code (only primitive values)
        const err = error as any;
        if (typeof err?.status === 'number') {
          statusCode = err.status;
        } else if (typeof err?.response?.status === 'number') {
          statusCode = err.response.status;
        } else if (typeof err?.code === 'number') {
          statusCode = err.code;
        }
      } catch {
        // If extraction fails, use defaults
      }

      throw new HttpException(errorMessage, statusCode);
    }
  }

  /**
   * Get thread state (SDK pattern)
   * GET /api/v1/langgraph/threads/:threadId/state
   */
  @Get('threads/:threadId/state')
  @ApiOperation({
    summary: 'Get thread state from LangGraph (SDK pattern)',
    description: 'Retrieves the current state of a thread using SDK URL pattern',
  })
  async getThreadStateSdkPattern(
    @Param('threadId') threadId: string,
    @GetUser() user: any,
  ) {
    try {
      // Use default assistantId since SDK doesn't include it in GET requests
      const assistantId = 'knowted_agent';

      const result = await this.langGraphProxyService.getThreadState(
        assistantId,
        threadId,
      );

      return result;
    } catch (error) {
      // Safely extract error information without circular references
      let errorMessage = 'Failed to get thread state';
      let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

      try {
        if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        // Safely extract status code (only primitive values)
        const err = error as any;
        if (typeof err?.status === 'number') {
          statusCode = err.status;
        } else if (typeof err?.response?.status === 'number') {
          statusCode = err.response.status;
        } else if (typeof err?.code === 'number') {
          statusCode = err.code;
        }
      } catch {
        // If extraction fails, use defaults
      }

      throw new HttpException(errorMessage, statusCode);
    }
  }
}

