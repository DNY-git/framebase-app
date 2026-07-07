import { Global, Module, forwardRef } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ProjectsModule } from '../../modules/projects/projects.module';

@Global()
@Module({
  imports: [forwardRef(() => ProjectsModule)],
  providers: [AuthorizationService],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}
