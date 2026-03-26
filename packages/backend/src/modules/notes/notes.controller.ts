import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { NotesService } from './notes.service';
import { CreateNoteDto, UpdateNoteDto } from './dto/notes.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { FamilyMemberGuard } from '../../shared/guards/family-member.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtPayload } from '../../shared/types/common.types';

@ApiTags('notes')
@ApiBearerAuth('access-token')
@Controller('families/:familyId/notes')
@UseGuards(JwtAuthGuard, RolesGuard, FamilyMemberGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all accessible notes' })
  getNotes(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notesService.getNotes(familyId, user.sub);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search notes by content' })
  @ApiQuery({ name: 'q', type: String })
  searchNotes(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @CurrentUser() user: JwtPayload,
    @Query('q') query: string,
  ) {
    return this.notesService.searchNotes(familyId, user.sub, query);
  }

  @Get(':noteId')
  @ApiOperation({ summary: 'Get single note' })
  getNote(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notesService.getNote(noteId, familyId, user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Create note' })
  createNote(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notesService.createNote(dto, familyId, user.sub);
  }

  @Put(':noteId')
  @ApiOperation({ summary: 'Update note' })
  updateNote(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() dto: UpdateNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notesService.updateNote(noteId, dto, familyId, user.sub);
  }

  @Delete(':noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete note (soft)' })
  deleteNote(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notesService.deleteNote(noteId, familyId, user);
  }
}
