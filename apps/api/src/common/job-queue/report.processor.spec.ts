import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportProcessor, ReportJobPayload, IReportRunWriter, IReportTemplateReader } from './report.processor';
import { ReportStatus, ReportTemplateDomain } from '@constructtrack/types';

describe('ReportProcessor', () => {
  let processor: ReportProcessor;
  let mockRunWriter: IReportRunWriter;
  let mockTemplateReader: IReportTemplateReader;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRunWriter = {
      updateStatus: vi.fn().mockResolvedValue(undefined),
    };
    mockTemplateReader = {
      findById: vi.fn().mockResolvedValue({
        id: 'tpl-1',
        tenantId: 't-1',
        name: 'Weekly Summary',
        type: 'weekly_summary',
        config: { description: 'Weekly project summary report' },
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReportTemplateDomain),
    };
    processor = new ReportProcessor(mockRunWriter, mockTemplateReader);
  });

  it('has jobType "report.generate"', () => {
    expect(processor.jobType).toBe('report.generate');
  });

  describe('process', () => {
    const payload: ReportJobPayload = {
      runId: 'run-1',
      tenantId: 't-1',
      templateId: 'tpl-1',
      params: { week: 28 },
    };

    it('transitions run to GENERATING then SUCCEEDED', async () => {
      const result = await processor.process(payload);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // First call: GENERATING
      expect(mockRunWriter.updateStatus).toHaveBeenCalledWith('t-1', 'run-1', {
        status: ReportStatus.GENERATING,
      });

      // Second call: SUCCEEDED with resultUrl and completedAt
      expect(mockRunWriter.updateStatus).toHaveBeenCalledWith('t-1', 'run-1',
        expect.objectContaining({
          status: ReportStatus.SUCCEEDED,
          resultUrl: expect.stringContaining('local://reports/'),
          completedAt: expect.any(Date),
        }),
      );
    });

    it('returns success with data containing generated report', async () => {
      const result = await processor.process(payload);

      expect(result.success).toBe(true);
      // result.data is { url, data: { type, config, params, sections, generatedAt } }
      const report = (result.data as { data: Record<string, unknown> }).data;
      expect(report).toEqual(
        expect.objectContaining({
          type: 'weekly_summary',
          params: { week: 28 },
          sections: expect.arrayContaining([
            expect.objectContaining({ title: 'Summary' }),
          ]),
        }),
      );
    });

    it('transitions to FAILED when template is not found', async () => {
      (mockTemplateReader.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await processor.process(payload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');

      expect(mockRunWriter.updateStatus).toHaveBeenCalledWith('t-1', 'run-1',
        expect.objectContaining({
          status: ReportStatus.FAILED,
          errorMessage: expect.stringContaining('not found'),
        }),
      );
    });

    it('transitions to FAILED when updateStatus throws on SUCCEEDED', async () => {
      // First call (GENERATING) succeeds, second call (SUCCEEDED) throws
      (mockRunWriter.updateStatus as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(undefined)  // GENERATING
        .mockRejectedValueOnce(new Error('DB write error'));  // SUCCEEDED

      const result = await processor.process(payload);

      expect(result.success).toBe(false);
    });

    it('includes config.description in report sections when present', async () => {
      const result = await processor.process(payload);

      const report = (result.data as { data: { sections: Array<{ title: string; content: string }> } }).data;
      const descSection = report.sections.find(s => s.title === 'Description');
      expect(descSection).toBeDefined();
      expect(descSection!.content).toBe('Weekly project summary report');
    });

    it('fetches the correct template by tenantId and templateId', async () => {
      await processor.process(payload);

      expect(mockTemplateReader.findById).toHaveBeenCalledWith('t-1', 'tpl-1');
    });

    it('generates a local:// URL for the report result', async () => {
      await processor.process(payload);

      expect(mockRunWriter.updateStatus).toHaveBeenCalledWith('t-1', 'run-1',
        expect.objectContaining({
          resultUrl: expect.stringMatching(/^local:\/\/reports\//),
        }),
      );
    });

    it('handles template with no description gracefully', async () => {
      (mockTemplateReader.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'tpl-2',
        tenantId: 't-1',
        name: 'Daily Log',
        type: 'daily_log',
        config: {},
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReportTemplateDomain);

      const result = await processor.process({ ...payload, templateId: 'tpl-2' });

      expect(result.success).toBe(true);
      const report = (result.data as { data: { sections: Array<{ title: string }> } }).data;
      expect(report.sections.find(s => s.title === 'Description')).toBeUndefined();
    });
  });
});
