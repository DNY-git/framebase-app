import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task, TaskSchema } from '../../schemas/task.schema';
import { TaskDependency, TaskDependencySchema } from '../../schemas/task-dependency.schema';
import { TaskRepository } from './repositories/task.repository';
import { TaskDependencyRepository } from './repositories/task-dependency.repository';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: TaskDependency.name, schema: TaskDependencySchema },
    ]),
    ProjectsModule, // Assuming we need to check project status/phases
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskRepository, TaskDependencyRepository],
  exports: [TasksService, TaskRepository],
})
export class TasksModule {}
