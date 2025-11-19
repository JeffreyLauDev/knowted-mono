import { Body, Controller, Post, Req } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { Request } from "express";

import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

@ApiTags("Auth")
@Controller("api/v1/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  @ApiOperation({
    summary: "User signup",
    description: "Create a new user account",
  })
  @ApiBody({
    type: LoginDto,
    description: "User credentials",
  })
  @ApiResponse({
    status: 201,
    description: "User created successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid input",
  })
  async signUp(@Body() body: { email: string; password: string }) {
    return this.authService.signUp(body.email, body.password);
  }

  @Post("login")
  @ApiOperation({
    summary: "User login",
    description: "Authenticate a user and return a JWT token",
  })
  @ApiBody({
    type: LoginDto,
    description: "User credentials",
    examples: {
      example1: {
        value: {
          email: "user@example.com",
          password: "password123",
        },
        summary: "Example login credentials",
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    schema: {
      properties: {
        access_token: {
          type: "string",
          example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        },
        user: {
          type: "object",
          properties: {
            id: {
              type: "string",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            email: {
              type: "string",
              example: "user@example.com",
            },
            profile: {
              type: "object",
              nullable: true,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Invalid credentials",
    schema: {
      properties: {
        statusCode: { type: "number", example: 401 },
        message: { type: "string", example: "Invalid credentials" },
        error: { type: "string", example: "Unauthorized" },
      },
    },
  })
  async login(@Body() loginDto: LoginDto, @Req() request: Request) {
    const ip = request.ip || request.connection.remoteAddress || "unknown";
    return this.authService.login(loginDto, ip);
  }

  @Post("signout")
  @ApiOperation({
    summary: "User signout",
    description: "Sign out the current user",
  })
  @ApiResponse({
    status: 200,
    description: "Signout successful",
  })
  async signOut() {
    return this.authService.signOut();
  }
}
