import { Controller, Get, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SuspendUserDto } from './dto/suspend-user.dto';
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
  suspendUser(@Request() req, @Param('id') id: string, @Body() dto: SuspendUserDto) {
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
}
