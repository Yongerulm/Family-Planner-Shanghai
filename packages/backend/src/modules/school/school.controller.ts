import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  ParseUUIDPipe, UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SchoolService } from './school.service';
import {
  CreateTimetableSlotDto, UpdateTimetableSlotDto,
  CreateHomeworkDto, UpdateHomeworkDto,
  CreateExamDto, UpdateExamDto,
  CreateGradeDto, UpdateGradeDto,
} from './dto/school.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { FamilyMemberGuard } from '../../shared/guards/family-member.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtPayload } from '../../shared/types/common.types';

@ApiTags('School')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FamilyMemberGuard)
@Controller('families/:familyId/school')
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  // ─── Timetable ─────────────────────────────────────────────────────────────

  @Get('children/:childId/timetable')
  @ApiOperation({ summary: 'Get timetable for a child' })
  getTimetable(@Param('childId', ParseUUIDPipe) childId: string) {
    return this.schoolService.getTimetable(childId);
  }

  @Post('timetable')
  @ApiOperation({ summary: 'Add a timetable slot' })
  addSlot(@Body() dto: CreateTimetableSlotDto, @CurrentUser() user: JwtPayload) {
    return this.schoolService.addSlot(dto, user);
  }

  @Patch('timetable/:id')
  @ApiOperation({ summary: 'Update a timetable slot' })
  updateSlot(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTimetableSlotDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.schoolService.updateSlot(id, dto, user);
  }

  @Delete('timetable/:id')
  @ApiOperation({ summary: 'Delete a timetable slot' })
  deleteSlot(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.schoolService.deleteSlot(id, user);
  }

  // ─── Homework ──────────────────────────────────────────────────────────────

  @Get('children/:childId/homework')
  @ApiOperation({ summary: 'Get homework for a child' })
  @ApiQuery({ name: 'showDone', required: false, type: Boolean })
  getHomework(
    @Param('childId', ParseUUIDPipe) childId: string,
    @Query('showDone') showDone?: string,
  ) {
    return this.schoolService.getHomework(childId, showDone === 'true');
  }

  @Post('homework')
  @ApiOperation({ summary: 'Add homework entry' })
  addHomework(@Body() dto: CreateHomeworkDto, @CurrentUser() user: JwtPayload) {
    return this.schoolService.addHomework(dto, user);
  }

  @Patch('homework/:id')
  @ApiOperation({ summary: 'Update homework (including marking done)' })
  updateHomework(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHomeworkDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.schoolService.updateHomework(id, dto, user);
  }

  @Delete('homework/:id')
  @ApiOperation({ summary: 'Delete homework entry' })
  deleteHomework(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.schoolService.deleteHomework(id, user);
  }

  // ─── Exams ─────────────────────────────────────────────────────────────────

  @Get('children/:childId/exams')
  @ApiOperation({ summary: 'Get exams for a child' })
  getExams(@Param('childId', ParseUUIDPipe) childId: string) {
    return this.schoolService.getExams(childId);
  }

  @Post('exams')
  @ApiOperation({ summary: 'Add an exam' })
  addExam(@Body() dto: CreateExamDto, @CurrentUser() user: JwtPayload) {
    return this.schoolService.addExam(dto, user);
  }

  @Patch('exams/:id')
  @ApiOperation({ summary: 'Update an exam (can add grade)' })
  updateExam(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExamDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.schoolService.updateExam(id, dto, user);
  }

  @Delete('exams/:id')
  @ApiOperation({ summary: 'Delete an exam' })
  deleteExam(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.schoolService.deleteExam(id, user);
  }

  // ─── Grades ────────────────────────────────────────────────────────────────

  @Get('children/:childId/grades')
  @ApiOperation({ summary: 'Get grades for a child' })
  @ApiQuery({ name: 'schoolYear', required: false })
  getGrades(
    @Param('childId', ParseUUIDPipe) childId: string,
    @Query('schoolYear') schoolYear?: string,
  ) {
    return this.schoolService.getGrades(childId, schoolYear);
  }

  @Post('grades')
  @ApiOperation({ summary: 'Add a grade entry' })
  addGrade(@Body() dto: CreateGradeDto, @CurrentUser() user: JwtPayload) {
    return this.schoolService.addGrade(dto, user);
  }

  @Patch('grades/:id')
  @ApiOperation({ summary: 'Update a grade entry' })
  updateGrade(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGradeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.schoolService.updateGrade(id, dto, user);
  }

  @Delete('grades/:id')
  @ApiOperation({ summary: 'Delete a grade entry' })
  deleteGrade(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.schoolService.deleteGrade(id, user);
  }
}
