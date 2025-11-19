import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";

import { Request, Response } from "express";

import { PinoLoggerService } from "../../common/logger/pino-logger.service";
import { Public } from "../auth/decorators/public.decorator";

import { VideoStreamResponseDto } from "./dto/video-stream.dto";
import { MeetingSharesService } from "./meeting-shares.service";
import { MeetingsService } from "./meetings.service";

@ApiTags("Public Meetings")
@Controller("api/v1/public/meetings")
@Public()
export class PublicMeetingsController {
  constructor(
    private readonly logger: PinoLoggerService,
    private readonly meetingsService: MeetingsService,
    private readonly meetingSharesService: MeetingSharesService,
    private readonly configService: ConfigService,
  ) {}

  @Get(":id/streaming-url")
  @ApiOperation({
    summary: "Get video streaming URL for shared meeting",
    description:
      "Get a secure URL for streaming a shared meeting's video using share token",
  })
  @ApiQuery({
    name: "share_token",
    required: true,
    description: "Share token to access the meeting",
    type: String,
  })
  @ApiQuery({
    name: "format",
    required: false,
    description: "Streaming format (hls, dash, progressive)",
    type: String,
    enum: ["hls", "dash", "progressive"],
  })
  @ApiQuery({
    name: "quality",
    required: false,
    description: "Video quality (1080p, 720p, 480p, 360p)",
    type: String,
    enum: ["1080p", "720p", "480p", "360p"],
  })
  @ApiResponse({
    status: 200,
    description: "Streaming URL generated successfully",
    type: VideoStreamResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Meeting not found or invalid share token",
  })
  async getSharedMeetingStreamingUrl(
    @Param("id") meetingId: string,
    @Query("share_token") shareToken: string,
    @Query("format") format: string = "progressive",
    @Query("quality") quality: string = "720p",
  ) {
    try {
      // Validate the share token first
      const isValid = await this.meetingSharesService.validateShareToken(
        meetingId,
        shareToken,
      );
      if (!isValid) {
        throw new NotFoundException("Invalid or expired share token");
      }

      // Get the meeting data
      const meeting = await this.meetingsService.findOneShared(meetingId);
      if (!meeting || !meeting.video_url) {
        throw new NotFoundException("Meeting not found or no video available");
      }

      // Generate streaming URL based on format and source
      if (meeting.video_url.startsWith("meeting-videos/")) {
        // Stored video - generate streaming URL with token
        this.logger.log(
          `✅ Generating streaming URL for shared meeting: ${meeting.video_url}`,
        );
        const streamingToken =
          await this.meetingsService.generateStreamingTokenForSharedMeeting(
            meetingId,
            shareToken,
            3600,
          );
        const baseUrl =
          this.configService.get<string>("API_URL") || "http://localhost:3000";
        const streamingUrl = `${baseUrl}/api/v1/public/meetings/${meetingId}/video-stream?token=${streamingToken}&format=${format}&quality=${quality}`;
        this.logger.log(`✅ Generated shared streaming URL: ${streamingUrl}`);
        return {
          streamUrl: streamingUrl,
          format,
          quality,
          expiresIn: 3600, // 1 hour
        };
      } else if (meeting.video_url.startsWith("http")) {
        // External video - return the URL directly
        this.logger.log(
          `✅ Using external video URL for shared meeting:`,
          meeting.video_url,
        );
        return {
          streamUrl: meeting.video_url,
          format,
          quality,
          expiresIn: 3600, // 1 hour
        };
      }

      throw new NotFoundException("Video format not supported");
    } catch (error) {
      this.logger.error("Error getting shared meeting streaming URL:", error);
      throw error;
    }
  }

  @Get(":id/video-stream")
  @ApiOperation({
    summary: "Stream meeting video with signed token",
    description:
      "Stream a meeting's video using a signed token for secure access without full authentication",
  })
  @ApiQuery({
    name: "token",
    required: true,
    description: "Signed access token",
    type: String,
  })
  @ApiQuery({
    name: "format",
    required: false,
    description: "Streaming format (hls, dash, progressive)",
    type: String,
    enum: ["hls", "dash", "progressive"],
  })
  @ApiQuery({
    name: "quality",
    required: false,
    description: "Video quality (1080p, 720p, 480p, 360p)",
    type: String,
    enum: ["1080p", "720p", "480p", "360p"],
  })
  @ApiResponse({
    status: 200,
    description: "Video stream",
    content: {
      "video/mp4": {},
      "application/x-mpegURL": {},
      "application/dash+xml": {},
    },
  })
  @ApiResponse({ status: 404, description: "Meeting not found or no video" })
  @ApiResponse({ status: 401, description: "Invalid token" })
  async streamMeetingVideo(
    @Param("id") meetingId: string,
    @Query("token") token: string,
    @Query("format") format: string = "progressive",
    @Query("quality") quality: string = "720p",
    @Res() res: Response,
    @Req() req: Request,
  ) {
    try {
      this.logger.log(
        `🎬 streamMeetingVideo called:`,
        "PublicMeetingsController",
        {
          meetingId,
          token: token.substring(0, 20) + "...",
          format,
          quality,
          rangeHeader: req.headers.range,
        },
      );

      const streamResult =
        await this.meetingsService.streamMeetingVideoWithToken(
          meetingId,
          token,
          format,
          quality,
          req.headers.range,
        );

      this.logger.log(`🎬 Stream result:`, "PublicMeetingsController", {
        hasStream: !!streamResult?.stream,
        hasUrl: !!streamResult?.url,
        contentLength: streamResult?.contentLength,
        range: streamResult?.range,
      });

      if (!streamResult) {
        throw new NotFoundException("Meeting not found or no video available");
      }

      // Set appropriate headers based on format
      if (format === "hls") {
        res.setHeader("Content-Type", "application/x-mpegURL");
        res.setHeader("Cache-Control", "public, max-age=3600");
      } else if (format === "dash") {
        res.setHeader("Content-Type", "application/dash+xml");
        res.setHeader("Cache-Control", "public, max-age=3600");
      } else {
        // Progressive streaming
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Cache-Control", "private, max-age=3600");

        if (streamResult.contentLength) {
          res.setHeader("Content-Length", streamResult.contentLength);
        }

        if (streamResult.range) {
          res.setHeader(
            "Content-Range",
            `bytes ${streamResult.range.start}-${streamResult.range.end}/${streamResult.contentLength}`,
          );
          res.status(206); // Partial Content
        }
      }

      // Stream the video
      if (streamResult.stream) {
        this.logger.log(
          `🎬 Streaming video with stream, content length: ${streamResult.contentLength}`,
        );
        streamResult.stream.pipe(res);
      } else if (streamResult.url) {
        this.logger.log(`🎬 Redirecting to external URL: ${streamResult.url}`);
        res.redirect(streamResult.url);
      } else {
        throw new NotFoundException("No video stream available");
      }
    } catch (error) {
      this.logger.error("Error streaming meeting video:", error);
      throw error;
    }
  }
}
