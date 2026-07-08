import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from '../../schemas/project.schema';
import { ProjectMember, ProjectMemberSchema } from '../../schemas/project-member.schema';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectRepository } from './repositories/project.repository';
import { ProjectMemberRepository } from './repositories/project-member.repository';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: ProjectMember.name, schema: ProjectMemberSchema },
    ]),
    AuditModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectRepository, ProjectMemberRepository],
  exports: [ProjectsService, ProjectRepository],
})
export class ProjectsModule {}
