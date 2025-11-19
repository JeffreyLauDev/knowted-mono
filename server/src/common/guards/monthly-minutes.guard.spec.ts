import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";

import "reflect-metadata";
import { UsageEventsService } from "../../modules/usage-events/usage-events.service";

import {
  MONTHLY_MINUTES_KEY,
  MonthlyMinutesGuard,
  RequireMonthlyMinutes,
} from "./monthly-minutes.guard";

describe("MonthlyMinutesGuard", () => {
  let guard: MonthlyMinutesGuard;
  let reflector: Reflector;
  let usageEventsService: UsageEventsService;

  const mockUsageEventsService = {
    getMonthlyMinutesUsage: jest.fn(),
  };

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => ({}),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonthlyMinutesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: UsageEventsService,
          useValue: mockUsageEventsService,
        },
      ],
    }).compile();

    guard = module.get<MonthlyMinutesGuard>(MonthlyMinutesGuard);
    reflector = module.get<Reflector>(Reflector);
    usageEventsService = module.get<UsageEventsService>(UsageEventsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("RequireMonthlyMinutes Decorator", () => {
    it("should define metadata on the target", () => {
      const target = {};
      const key = "testMethod";
      const descriptor = { value: target };

      RequireMonthlyMinutes()(target, key, descriptor);

      expect(Reflect.getMetadata(MONTHLY_MINUTES_KEY, target)).toBe(true);
    });

    it("should work without descriptor", () => {
      const target = {};

      RequireMonthlyMinutes()(target);

      expect(Reflect.getMetadata(MONTHLY_MINUTES_KEY, target)).toBe(true);
    });
  });

  describe("canActivate", () => {
    it("should return true when monthly minutes check is not required", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(
        mockUsageEventsService.getMonthlyMinutesUsage,
      ).not.toHaveBeenCalled();
    });

    it("should return true when no organization ID is found in request", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
      const mockRequest = {
        params: {},
        body: {},
        query: {},
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(
        mockUsageEventsService.getMonthlyMinutesUsage,
      ).not.toHaveBeenCalled();
    });

    it("should check monthly minutes when organization ID is in params", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
      const mockRequest = {
        params: { organizationId: "org-123" },
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const mockUsageData = {
        currentUsage: 150,
        monthlyLimit: 300,
        usagePercentage: 50,
        canInviteKnowted: true,
        resetDate: "2024-02-15T00:00:00.000Z",
      };

      mockUsageEventsService.getMonthlyMinutesUsage.mockResolvedValue(
        mockUsageData,
      );

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(
        mockUsageEventsService.getMonthlyMinutesUsage,
      ).toHaveBeenCalledWith("org-123");
    });

    it("should check monthly minutes when organization ID is in body", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
      const mockRequest = {
        params: {},
        body: { organizationId: "org-456" },
        query: {},
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const mockUsageData = {
        currentUsage: 150,
        monthlyLimit: 300,
        usagePercentage: 50,
        canInviteKnowted: true,
        resetDate: "2024-02-15T00:00:00.000Z",
      };

      mockUsageEventsService.getMonthlyMinutesUsage.mockResolvedValue(
        mockUsageData,
      );

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(
        mockUsageEventsService.getMonthlyMinutesUsage,
      ).toHaveBeenCalledWith("org-456");
    });

    it("should check monthly minutes when organization ID is in query", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
      const mockRequest = {
        params: {},
        body: {},
        query: { organizationId: "org-789" },
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const mockUsageData = {
        currentUsage: 150,
        monthlyLimit: 300,
        usagePercentage: 50,
        canInviteKnowted: true,
        resetDate: "2024-02-15T00:00:00.000Z",
      };

      mockUsageEventsService.getMonthlyMinutesUsage.mockResolvedValue(
        mockUsageData,
      );

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(
        mockUsageEventsService.getMonthlyMinutesUsage,
      ).toHaveBeenCalledWith("org-789");
    });

    it("should allow access when usage is under limit", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
      const mockRequest = {
        params: { organizationId: "org-123" },
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const mockUsageData = {
        currentUsage: 150,
        monthlyLimit: 300,
        usagePercentage: 50,
        canInviteKnowted: true,
        resetDate: "2024-02-15T00:00:00.000Z",
      };

      mockUsageEventsService.getMonthlyMinutesUsage.mockResolvedValue(
        mockUsageData,
      );

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it("should allow access when usage is exactly at limit", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
      const mockRequest = {
        params: { organizationId: "org-123" },
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const mockUsageData = {
        currentUsage: 300,
        monthlyLimit: 300,
        usagePercentage: 100,
        canInviteKnowted: true, // Still can invite
        resetDate: "2024-02-15T00:00:00.000Z",
      };

      mockUsageEventsService.getMonthlyMinutesUsage.mockResolvedValue(
        mockUsageData,
      );

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it("should block access when monthly limit is exceeded", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
      const mockRequest = {
        params: { organizationId: "org-123" },
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const mockUsageData = {
        currentUsage: 350,
        monthlyLimit: 300,
        usagePercentage: 100,
        canInviteKnowted: false,
        resetDate: "2024-02-15T00:00:00.000Z",
      };

      mockUsageEventsService.getMonthlyMinutesUsage.mockResolvedValue(
        mockUsageData,
      );

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );

      try {
        await guard.canActivate(mockContext);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("Monthly minutes limit exceeded");
        // Check the response object structure
        expect(error.getResponse()).toEqual({
          message: "Monthly minutes limit exceeded",
          error: "MONTHLY_MINUTES_LIMIT_EXCEEDED",
          currentUsage: 350,
          monthlyLimit: 300,
          usagePercentage: 100,
          resetDate: "2024-02-15T00:00:00.000Z",
          upgradeRequired: true,
        });
      }
    });

    it("should block access when usage is exactly at limit and cannot invite", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
      const mockRequest = {
        params: { organizationId: "org-123" },
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const mockUsageData = {
        currentUsage: 300,
        monthlyLimit: 300,
        usagePercentage: 100,
        canInviteKnowted: false,
        resetDate: "2024-02-15T00:00:00.000Z",
      };

      mockUsageEventsService.getMonthlyMinutesUsage.mockResolvedValue(
        mockUsageData,
      );

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("Error Handling", () => {
    it("should return true when usage service throws non-ForbiddenException", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
      const mockRequest = {
        params: { organizationId: "org-123" },
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      mockUsageEventsService.getMonthlyMinutesUsage.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it("should return true when usage service throws any other error", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
      const mockRequest = {
        params: { organizationId: "org-123" },
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      mockUsageEventsService.getMonthlyMinutesUsage.mockRejectedValue(
        new TypeError("Invalid argument"),
      );

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it("should log error when usage service fails", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
      const mockRequest = {
        params: { organizationId: "org-123" },
        body: {},
        query: {},
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const loggerSpy = jest
        .spyOn(guard["logger"], "error")
        .mockImplementation();
      mockUsageEventsService.getMonthlyMinutesUsage.mockRejectedValue(
        new Error("Service unavailable"),
      );

      await guard.canActivate(mockContext);

      expect(loggerSpy).toHaveBeenCalledWith(
        "Error checking monthly minutes for organization org-123:",
        expect.any(Error),
      );

      loggerSpy.mockRestore();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty organization ID", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
      const mockRequest = {
        params: { organizationId: "" },
        body: {},
        query: {},
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(
        mockUsageEventsService.getMonthlyMinutesUsage,
      ).not.toHaveBeenCalled();
    });

    it("should handle undefined organization ID", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
      const mockRequest = {
        params: { organizationId: undefined },
        body: {},
        query: {},
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(
        mockUsageEventsService.getMonthlyMinutesUsage,
      ).not.toHaveBeenCalled();
    });

    it("should handle null organization ID", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
      const mockRequest = {
        params: { organizationId: null },
        body: {},
        query: {},
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(
        mockUsageEventsService.getMonthlyMinutesUsage,
      ).not.toHaveBeenCalled();
    });

    it("should handle missing organization ID in all locations", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
      const mockRequest = {
        params: {},
        body: {},
        query: {},
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(
        mockUsageEventsService.getMonthlyMinutesUsage,
      ).not.toHaveBeenCalled();
    });
  });

  describe("Integration Scenarios", () => {
    it("should work with different request structures", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);

      const testCases = [
        { params: { organizationId: "org-1" } },
        { body: { organizationId: "org-2" } },
        { query: { organizationId: "org-3" } },
        { params: { organizationId: "org-4" }, body: { otherField: "value" } },
        { body: { organizationId: "org-5" }, query: { otherParam: "value" } },
      ];

      for (const testCase of testCases) {
        const mockRequest = {
          params: testCase.params || {},
          body: testCase.body || {},
          query: testCase.query || {},
        };
        const mockContext = {
          switchToHttp: () => ({
            getRequest: () => mockRequest,
          }),
          getHandler: jest.fn(),
          getClass: jest.fn(),
        } as unknown as ExecutionContext;

        const mockUsageData = {
          currentUsage: 150,
          monthlyLimit: 300,
          usagePercentage: 50,
          canInviteKnowted: true,
          resetDate: "2024-02-15T00:00:00.000Z",
        };

        mockUsageEventsService.getMonthlyMinutesUsage.mockResolvedValue(
          mockUsageData,
        );

        const result = await guard.canActivate(mockContext);
        expect(result).toBe(true);

        // Find the organization ID from the test case
        const orgId =
          testCase.params?.organizationId ||
          testCase.body?.organizationId ||
          testCase.query?.organizationId;

        expect(
          mockUsageEventsService.getMonthlyMinutesUsage,
        ).toHaveBeenCalledWith(orgId);
      }
    });

    it("should handle priority order correctly (params > body > query)", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
      const mockRequest = {
        params: { organizationId: "org-params" },
        body: { organizationId: "org-body" },
        query: { organizationId: "org-query" },
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const mockUsageData = {
        currentUsage: 150,
        monthlyLimit: 300,
        usagePercentage: 50,
        canInviteKnowted: true,
        resetDate: "2024-02-15T00:00:00.000Z",
      };

      mockUsageEventsService.getMonthlyMinutesUsage.mockResolvedValue(
        mockUsageData,
      );

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      // Should use params.organizationId (highest priority)
      expect(
        mockUsageEventsService.getMonthlyMinutesUsage,
      ).toHaveBeenCalledWith("org-params");
    });
  });
});
