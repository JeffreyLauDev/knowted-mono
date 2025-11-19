import { PartialType } from "@nestjs/mapped-types";

import { CreateMeetingsDto } from "./create-meetings.dto";

export class UpdateMeetingsDto extends PartialType(CreateMeetingsDto) {}
