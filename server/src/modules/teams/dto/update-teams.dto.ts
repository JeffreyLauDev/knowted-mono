import { PartialType } from "@nestjs/swagger";

import { CreateTeamsDto } from "./create-teams.dto";

export class UpdateTeamsDto extends PartialType(CreateTeamsDto) {}
