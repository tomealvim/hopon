import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WalletService } from './wallet.service';
import { TopupDto } from './dto/topup.dto';

@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /** GET /wallet — saldo actual */
  @Get()
  getBalance(@Request() req: any) {
    return this.walletService.getBalance(req.user.id);
  }

  /** GET /wallet/transactions?limit=30 — histórico de transações */
  @Get('transactions')
  getTransactions(@Request() req: any, @Query('limit') limit?: string) {
    return this.walletService.getTransactions(req.user.id, limit ? parseInt(limit) : 30);
  }

  /** POST /wallet/topup — carregar saldo (demo) */
  @Post('topup')
  topup(@Request() req: any, @Body() dto: TopupDto) {
    return this.walletService.topup(req.user.id, dto.amount, dto.description);
  }
}
