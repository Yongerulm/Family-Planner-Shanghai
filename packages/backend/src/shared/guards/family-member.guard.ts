import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Family } from '../../modules/families/entities/family.entity';
import { JwtPayload } from '../types/common.types';

interface RequestWithParams {
  user: JwtPayload;
  params: { familyId?: string };
  body: { familyId?: string };
}

@Injectable()
export class FamilyMemberGuard implements CanActivate {
  constructor(
    @InjectRepository(Family)
    private readonly familyRepo: Repository<Family>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithParams>();
    const user = request.user;

    // super_admin darf alles
    if (user.role === 'super_admin') {
      return true;
    }

    const familyId = request.params.familyId ?? request.body.familyId;

    if (!familyId) {
      return true; // Kein familyId angegeben, andere Guards prüfen
    }

    if (user.familyId !== familyId) {
      throw new ForbiddenException('Access denied: Not a member of this family');
    }

    const family = await this.familyRepo.findOne({ where: { id: familyId } });
    if (!family) {
      throw new NotFoundException('Family not found');
    }

    return true;
  }
}
