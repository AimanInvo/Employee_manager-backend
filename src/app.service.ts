import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      status:"ok",
      service:"employee-manager-backend-practice"
    };
  }
}
