import { PartialType } from "@nestjs/mapped-types";

import { CreateCalendarsDto } from "./create-calendars.dto";

export class UpdateCalendarsDto extends PartialType(CreateCalendarsDto) {}
