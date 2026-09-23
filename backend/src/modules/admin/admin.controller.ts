import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  Post,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('reports')
  @ApiOperation({ summary: 'Listar denúncias' })
  getReports(@Query('status') status?: string) {
    return this.adminService.getReports(status);
  }

  @Patch('reports/:id/status')
  @ApiOperation({ summary: 'Atualizar estado de uma denúncia' })
  updateReportStatus(@Param('id') id: string, @Body() dto: { status: string }) {
    return this.adminService.updateReportStatus(id, dto.status);
  }

  @Patch('users/:id/suspend')
  @ApiOperation({ summary: 'Suspender um utilizador' })
  suspendUser(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
  ) {
    return this.adminService.suspendUser(req.user.id, id, dto.reason);
  }

  @Delete('users/:id/suspend')
  @ApiOperation({ summary: 'Remover suspensão de um utilizador' })
  unsuspendUser(@Param('id') id: string) {
    return this.adminService.unsuspendUser(id);
  }

  @Patch('users/:id/verify')
  @ApiOperation({ summary: 'Marcar utilizador como verificado' })
  verifyUser(@Param('id') id: string) {
    return this.adminService.verifyUser(id);
  }

  @Delete('users/:id/verify')
  @ApiOperation({ summary: 'Remover verificação de um utilizador' })
  unverifyUser(@Param('id') id: string) {
    return this.adminService.unverifyUser(id);
  }

  @Post('users/:id/verify/reject')
  @ApiOperation({ summary: 'Rejeitar documento de identidade' })
  rejectVerification(@Param('id') id: string) {
    return this.adminService.rejectVerification(id);
  }

  @Get('verifications/pending')
  @ApiOperation({ summary: 'Listar utilizadores com verificação pendente' })
  getPendingVerifications() {
    return this.adminService.getPendingVerifications();
  }

  @Get('driver-licenses/pending')
  @ApiOperation({
    summary: 'Listar cartas de condução pendentes de verificação',
  })
  getPendingDriverLicenses() {
    return this.adminService.getPendingDriverLicenses();
  }

  @Patch('users/:id/driver-license/approve')
  @ApiOperation({ summary: 'Aprovar carta de condução' })
  approveDriverLicense(@Param('id') id: string) {
    return this.adminService.approveDriverLicense(id);
  }

  @Patch('users/:id/driver-license/reject')
  @ApiOperation({ summary: 'Rejeitar carta de condução com nota opcional' })
  rejectDriverLicense(
    @Param('id') id: string,
    @Body() dto: { adminNote?: string },
  ) {
    return this.adminService.rejectDriverLicense(id, dto.adminNote);
  }

  @Get('disputes')
  @ApiOperation({ summary: 'Listar disputas' })
  getDisputes(@Query('status') status?: string) {
    return this.adminService.getDisputes(status);
  }

  @Patch('disputes/:id')
  @ApiOperation({ summary: 'Resolver ou descartar uma disputa' })
  resolveDispute(@Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.adminService.resolveDispute(id, dto);
  }

  @Get('payout-requests')
  @ApiOperation({ summary: 'Listar pedidos de levantamento' })
  getPayoutRequests(@Query('status') status?: string) {
    return this.adminService.getPayoutRequests(status);
  }

  @Patch('payout-requests/:id')
  @ApiOperation({
    summary: 'Aprovar, processar ou rejeitar pedido de levantamento',
  })
  processPayoutRequest(
    @Param('id') id: string,
    @Body() dto: { status: string; adminNote?: string },
  ) {
    return this.adminService.processPayoutRequest(id, dto);
  }
}
