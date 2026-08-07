import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiFeedback, AiFeedbackDocument } from '../../../schemas/ai-feedback.schema';
import { BaseRepository } from '../../../database/base.repository';
import { AiFeedbackDomain } from '@constructtrack/types';
import { FeedbackDto } from '../dto/feedback.dto';

@Injectable()
export class AiFeedbackRepository extends BaseRepository<AiFeedbackDomain, AiFeedbackDocument, FeedbackDto, Partial<AiFeedbackDomain>> {
  constructor(
    @InjectModel(AiFeedback.name)
    model: Model<AiFeedbackDocument>,
  ) {
    super(model);
  }

  protected toDomain(doc: AiFeedbackDocument): AiFeedbackDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      userId: doc.userId.toString(),
      messageId: doc.messageId.toString(),
      jobId: doc.jobId?.toString(),
      rating: doc.rating,
      comment: doc.comment,
      createdAt: doc.createdAt,
    };
  }

  protected toCreateDoc(tenantId: string, data: FeedbackDto): Partial<AiFeedbackDocument> {
    return {
      tenantId,
      userId: '',
      messageId: data.messageId,
      jobId: data.jobId,
      rating: data.rating,
      comment: data.comment,
    };
  }

  protected toUpdateDoc(_data: Partial<AiFeedbackDomain>): Partial<AiFeedbackDocument> {
    return {};
  }
}
