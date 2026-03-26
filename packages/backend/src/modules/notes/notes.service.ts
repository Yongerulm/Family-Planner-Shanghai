import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './entities/note.entity';
import { CreateNoteDto, UpdateNoteDto } from './dto/notes.dto';
import { JwtPayload } from '../../shared/types/common.types';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepo: Repository<Note>,
  ) {}

  async getNotes(familyId: string, userId: string): Promise<Note[]> {
    return this.noteRepo
      .createQueryBuilder('note')
      .where(
        '(note.family_id = :familyId AND note.is_private = false) OR ' +
          '(note.owner_id = :userId AND note.is_private = true)',
        { familyId, userId },
      )
      .andWhere('note.deleted_at IS NULL')
      .orderBy('note.updated_at', 'DESC')
      .getMany();
  }

  async getNote(noteId: string, familyId: string, userId: string): Promise<Note> {
    const note = await this.noteRepo.findOne({ where: { id: noteId } });
    if (!note) throw new NotFoundException('Note not found');
    this.assertAccess(note, familyId, userId);
    return note;
  }

  async createNote(
    dto: CreateNoteDto,
    familyId: string,
    userId: string,
  ): Promise<Note> {
    const note = this.noteRepo.create({
      title: dto.title ?? null,
      content: dto.content,
      isPrivate: dto.isPrivate ?? false,
      color: dto.color ?? null,
      familyId: dto.isPrivate ? null : familyId,
      ownerId: dto.isPrivate ? userId : null,
      createdBy: userId,
    });

    return this.noteRepo.save(note);
  }

  async updateNote(
    noteId: string,
    dto: UpdateNoteDto,
    familyId: string,
    userId: string,
  ): Promise<Note> {
    const note = await this.noteRepo.findOne({ where: { id: noteId } });
    if (!note) throw new NotFoundException('Note not found');
    this.assertAccess(note, familyId, userId);

    // Nur Ersteller oder family_admin kann bearbeiten
    if (note.createdBy !== userId) {
      throw new ForbiddenException('Only the creator can edit this note');
    }

    Object.assign(note, dto);
    return this.noteRepo.save(note);
  }

  async deleteNote(noteId: string, familyId: string, user: JwtPayload): Promise<void> {
    const note = await this.noteRepo.findOne({ where: { id: noteId } });
    if (!note) throw new NotFoundException('Note not found');
    this.assertAccess(note, familyId, user.sub);

    if (
      note.createdBy !== user.sub &&
      user.role !== 'family_admin' &&
      user.role !== 'super_admin'
    ) {
      throw new ForbiddenException('Only the creator or family admin can delete');
    }

    await this.noteRepo.softRemove(note);
  }

  async searchNotes(familyId: string, userId: string, query: string): Promise<Note[]> {
    // PostgreSQL Volltextsuche via pg_trgm (ILIKE für einfache Variante)
    // Für Produktions-Optimierung: GIN-Index mit to_tsvector nutzen
    return this.noteRepo
      .createQueryBuilder('note')
      .where(
        '(note.family_id = :familyId AND note.is_private = false) OR ' +
          '(note.owner_id = :userId AND note.is_private = true)',
        { familyId, userId },
      )
      .andWhere('note.deleted_at IS NULL')
      .andWhere(
        "(note.title ILIKE :q OR note.content ILIKE :q)",
        { q: `%${query}%` },
      )
      .orderBy('note.updated_at', 'DESC')
      .limit(50)
      .getMany();
  }

  private assertAccess(note: Note, familyId: string, userId: string): void {
    if (note.isPrivate && note.ownerId !== userId) {
      throw new ForbiddenException('Access denied: private note');
    }
    if (!note.isPrivate && note.familyId !== familyId) {
      throw new ForbiddenException('Access denied: wrong family');
    }
  }
}
