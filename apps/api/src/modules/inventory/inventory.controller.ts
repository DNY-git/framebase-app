import { Controller, Get, Post, Patch, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { CurrentUser } from '../../common/decorators/auth.decorator';
import { AuthenticatedUser } from '../../common/decorators/authenticated-user.interface';
import { parsePagination, formatPaginatedResponse } from '../../common/utils/pagination.util';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@constructtrack/types';

@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ====== Materials ======

  @Post('materials')
  @Roles(Role.ADMIN, Role.PROCUREMENT, Role.PROJECT_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMaterialDto) {
    const material = await this.inventoryService.create(user, dto);
    return { data: material };
  }

  @Get('materials')
  async find(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const options = parsePagination(page, perPage);
    const result = await this.inventoryService.find(user, {}, options);
    return formatPaginatedResponse(result);
  }

  @Get('materials/low-stock')
  async getLowStock(@CurrentUser() user: AuthenticatedUser) {
    const materials = await this.inventoryService.getLowStock(user);
    return { data: materials };
  }

  @Get('materials/:id')
  async findById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const material = await this.inventoryService.findById(user, id);
    return { data: material };
  }

  @Get('materials/:id/stock')
  async getStockLevel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const stock = await this.inventoryService.getStockLevel(user, id);
    return { data: stock };
  }

  @Get('materials/:id/transactions')
  async getMaterialTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const options = parsePagination(page, perPage);
    const result = await this.inventoryService.getMaterialTransactions(
      user,
      id,
      options,
    );
    return formatPaginatedResponse(result);
  }

  @Patch('materials/:id')
  @Roles(Role.ADMIN, Role.PROCUREMENT, Role.PROJECT_MANAGER)
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateMaterialDto) {
    const material = await this.inventoryService.update(user, id, dto);
    return { data: material };
  }

  @Patch('materials/:id/archive')
  @Roles(Role.ADMIN, Role.PROCUREMENT)
  async archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const material = await this.inventoryService.archive(user, id);
    return { data: material };
  }

  // ====== Transactions ======

  @Post('inventory/transactions')
  @HttpCode(HttpStatus.CREATED)
  async recordTransaction(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTransactionDto) {
    const transaction = await this.inventoryService.recordTransaction(
      user,
      dto,
    );
    return { data: transaction };
  }

  @Get('inventory/transactions')
  async getTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('materialId') materialId?: string,
    @Query('projectId') projectId?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const options = parsePagination(page, perPage);
    const filter: Record<string, unknown> = {};
    if (materialId) filter.materialId = materialId;
    if (projectId) filter.projectId = projectId;
    if (type) filter.type = type;

    const result = await this.inventoryService.getTransactions(
      user,
      filter,
      options,
    );
    return formatPaginatedResponse(result);
  }

  // ====== Deliveries ======

  @Post('deliveries')
  @Roles(Role.ADMIN, Role.PROCUREMENT, Role.PROJECT_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async recordDelivery(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDeliveryDto) {
    const result = await this.inventoryService.recordDelivery(
      user,
      dto,
    );
    return { data: result };
  }

  @Get('deliveries/:id')
  async getDeliveryById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const delivery = await this.inventoryService.getDeliveryById(
      user,
      id,
    );
    return { data: delivery };
  }
}
