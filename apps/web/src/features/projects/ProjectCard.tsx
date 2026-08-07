import { Card } from '@astryxdesign/core/Card';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Badge } from '@astryxdesign/core/Badge';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export interface ProjectCardData {
  id: string;
  name: string;
  status: string;
  progress: number;
  team?: string;
}

const STATUS_BADGE: Record<string, { variant: 'info' | 'success' | 'warning' | 'error' | 'neutral'; label: string }> = {
  planning: { variant: 'info', label: 'Planning' },
  active: { variant: 'success', label: 'Active' },
  on_hold: { variant: 'warning', label: 'On Hold' },
  completed: { variant: 'success', label: 'Completed' },
  archived: { variant: 'neutral', label: 'Archived' },
};

function getStatusBadge(status: string) {
  return STATUS_BADGE[status.toLowerCase()] ?? { variant: 'neutral' as const, label: status.replace(/_/g, ' ') };
}

interface ProjectCardProps {
  project: ProjectCardData;
  href?: string;
  endContent?: ReactNode;
}

export function ProjectCard({ project, href, endContent }: ProjectCardProps) {
  const badge = getStatusBadge(project.status);

  const card = (
    <Card elevation="low" padding={4}>
      <VStack gap={3}>
        <HStack gap={2} hAlign="between" vAlign="center">
          <Heading level={5}>{project.name}</Heading>
          <Badge variant={badge.variant} label={badge.label} />
        </HStack>
        <ProgressBar
          value={project.progress}
          label={`Progress: ${project.progress}%`}
          hasValueLabel
        />
        {project.team && (
          <Text type="supporting" color="secondary">
            Team: {project.team}
          </Text>
        )}
        {endContent && (
          <HStack gap={2} hAlign="end">
            {endContent}
          </HStack>
        )}
      </VStack>
    </Card>
  );

  if (href) {
    return <Link to={href} style={{ textDecoration: 'none', display: 'block' }}>{card}</Link>;
  }

  return card;
}
