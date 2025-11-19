import { createParamDecorator, ExecutionContext } from "@nestjs/common";
//organization
export const Organization = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const organization = request.organization;

    return data ? organization?.[data] : organization;
  },
);
