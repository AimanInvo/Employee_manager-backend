import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentAccessToken = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest();
    return request.accessToken;
  },
);
