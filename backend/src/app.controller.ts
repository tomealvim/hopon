import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      message: 'Hopon API v1',
      docs: '/api/docs',
      health: 'ok',
    };
  }
}
