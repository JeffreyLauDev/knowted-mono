import { PartialType } from "@nestjs/mapped-types";

import { CreateReportTypesDto } from "./create-report_types.dto";

export class UpdateReportTypesDto extends PartialType(CreateReportTypesDto) {}
