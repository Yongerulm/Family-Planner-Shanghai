import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';
import { TimetableSlot } from './entities/timetable-slot.entity';
import { Homework } from './entities/homework.entity';
import { Exam } from './entities/exam.entity';
import { Grade } from './entities/grade.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TimetableSlot, Homework, Exam, Grade])],
  controllers: [SchoolController],
  providers: [SchoolService],
  exports: [SchoolService],
})
export class SchoolModule {}
