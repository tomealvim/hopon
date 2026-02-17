import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle as VehicleModel } from '@prisma/client';
import { VehicleFeaturesDto } from './dto/vehicle-features.dto';

type VehicleFeatures = {
  airConditioning: boolean;
  heater: boolean;
};

@Injectable()
export class VehiclesService {
  private readonly DEFAULT_FEATURES: VehicleFeatures = {
    airConditioning: true,
    heater: true,
  };

  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return vehicles.map((vehicle) => this.toResponse(vehicle));
  }

  async create(userId: string, dto: CreateVehicleDto) {
    const vehicle = await this.prisma.vehicle.create({
      data: {
        userId,
        brand: dto.brand,
        model: dto.model,
        plate: dto.plate,
        color: dto.color,
        imageUrl: dto.imageUrl,
        seats: dto.seats ?? 4,
        features: JSON.stringify(this.normalizeFeatures(dto.features)),
      },
    });
    return this.toResponse(vehicle);
  }

  async update(userId: string, vehicleId: string, dto: UpdateVehicleDto) {
    await this.ensureVehicleOwnership(userId, vehicleId);
    const vehicle = await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        brand: dto.brand,
        model: dto.model,
        plate: dto.plate,
        color: dto.color,
        imageUrl: dto.imageUrl,
        seats: dto.seats,
        features:
          dto.features !== undefined
            ? JSON.stringify(this.normalizeFeatures(dto.features))
            : undefined,
      },
    });
    return this.toResponse(vehicle);
  }

  async remove(userId: string, vehicleId: string) {
    await this.ensureVehicleOwnership(userId, vehicleId);
    await this.prisma.vehicle.delete({
      where: { id: vehicleId },
    });
    return { success: true };
  }

  private async ensureVehicleOwnership(userId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, userId },
    });
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }
    return vehicle;
  }

  private normalizeFeatures(
    features?: VehicleFeaturesDto | null,
  ): VehicleFeatures {
    return {
      airConditioning: features?.airConditioning ?? this.DEFAULT_FEATURES.airConditioning,
      heater: features?.heater ?? this.DEFAULT_FEATURES.heater,
    };
  }

  private toResponse(vehicle: VehicleModel) {
    return {
      ...vehicle,
      features: this.safeParseJson(vehicle.features) ?? this.DEFAULT_FEATURES,
    };
  }

  private safeParseJson(value?: string | null) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
}

