import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Family } from './entities/family.entity';

export interface CreateFamilyDto {
  name: string;
}

export interface UpdateFamilyDto {
  name?: string;
  settings?: Record<string, unknown>;
}

function generateInviteCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

@Injectable()
export class FamiliesService {
  constructor(
    @InjectRepository(Family)
    private readonly familyRepository: Repository<Family>,
  ) {}

  async findById(id: string): Promise<Family | null> {
    return this.familyRepository.findOne({ where: { id } });
  }

  async findByInviteCode(inviteCode: string): Promise<Family | null> {
    return this.familyRepository.findOne({ where: { inviteCode } });
  }

  async findAll(): Promise<Family[]> {
    return this.familyRepository.find();
  }

  async create(dto: CreateFamilyDto): Promise<Family> {
    let inviteCode: string;
    let attempts = 0;

    do {
      inviteCode = generateInviteCode();
      attempts++;
      if (attempts > 10) {
        throw new ConflictException('Unable to generate a unique invite code');
      }
    } while (await this.findByInviteCode(inviteCode));

    const family = this.familyRepository.create({
      name: dto.name,
      inviteCode,
      settings: {},
    });

    return this.familyRepository.save(family);
  }

  async update(id: string, dto: UpdateFamilyDto): Promise<Family> {
    const family = await this.findById(id);

    if (!family) {
      throw new NotFoundException(`Family with id ${id} not found`);
    }

    if (dto.name !== undefined) {
      family.name = dto.name;
    }
    if (dto.settings !== undefined) {
      family.settings = { ...family.settings, ...dto.settings };
    }

    return this.familyRepository.save(family);
  }

  async remove(id: string): Promise<void> {
    const family = await this.findById(id);

    if (!family) {
      throw new NotFoundException(`Family with id ${id} not found`);
    }

    await this.familyRepository.remove(family);
  }
}
