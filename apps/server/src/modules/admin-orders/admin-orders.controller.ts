import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  Req,
} from '@nestjs/common'
import { Response, Request } from 'express'
import { AdminOrdersService } from './admin-orders.service'
import { AdminGenerationJobCommandService } from '../admin-generation-jobs/admin-generation-job-command.service'
import { AdminSessionGuard } from '../../common/guards/admin-session.guard'
import {
  AdminOrderListQueryDto,
  RetryOrderDto,
  UpdateOrderNoteDto,
  OrderExportQueryDto,
} from '@ai-paper/shared'
import type { AdminSession } from '../admin-auth/admin-session.service'

@UseGuards(AdminSessionGuard)
@Controller('api/admin/orders')
export class AdminOrdersController {
  constructor(
    private readonly ordersService: AdminOrdersService,
    private readonly commandService: AdminGenerationJobCommandService,
  ) {}

  @Get()
  async listOrders(@Query() query: AdminOrderListQueryDto) {
    return this.ordersService.listOrders(query)
  }

  @Get('export')
  async exportOrders(
    @Query() query: OrderExportQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.ordersService.exportOrdersCsv(query)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"')
    res.send(csv)
  }

  @Get(':orderId')
  async getOrderDetail(@Param('orderId') orderId: string) {
    return this.ordersService.getOrderDetail(orderId)
  }

  @Post(':orderId/retry-generation')
  async retryOrderGeneration(
    @Param('orderId') orderId: string,
    @Body() dto: RetryOrderDto,
    @Req() req: Request,
  ) {
    const session = req['adminSession'] as AdminSession
    return this.commandService.retryOrder(orderId, session.adminUserId)
  }

  @Patch(':orderId/note')
  async updateOrderNote(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderNoteDto,
    @Req() req: Request,
  ) {
    const session = req['adminSession'] as AdminSession
    await this.ordersService.updateOrderNote(orderId, dto.note, session.adminUserId)
    return { success: true }
  }
}
