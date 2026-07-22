import { Module } from '@nestjs/common';
import { LeaveTypesController, LeaveRequestsController } from './leave.controller';
import { LeaveService } from './leave.service';
@Module({
  controllers: [LeaveTypesController, LeaveRequestsController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}
