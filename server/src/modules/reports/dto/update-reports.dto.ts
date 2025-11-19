import { PartialType } from "@nestjs/mapped-types";

import { CreateReportsDto } from "./create-reports.dto";

export class UpdateReportsDto extends PartialType(CreateReportsDto) {}
