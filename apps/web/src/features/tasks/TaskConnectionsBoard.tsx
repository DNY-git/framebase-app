import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { authFetch } from '../../auth-fetch';
import type { TaskDomain } from '@constructtrack/types';
import { TaskStatus } from '@constructtrack/types';

// ── Node Types ───────────────────────────────────────────────────────────────

function TaskNode({ data }: { data: { label: string; sublabel?: string; status?: string; isCurrent?: boolean } }) {
  return (
    <div
      className={`min-w-[180px] rounded-xl border bg-surface px-4 py-3 shadow-sm ${data.isCurrent ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
    >
      {data.isCurrent && <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">Current Task</p>}
      <p className="text-sm font-semibold text-foreground">{data.label}</p>
      {data.sublabel && <p className="mt-0.5 text-xs text-foreground-muted line-clamp-2">{data.sublabel}</p>}
      {data.status && <p className="mt-2 text-xs font-medium capitalize text-foreground-muted">{data.status.replace(/_/g, ' ')}</p>}
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !bg-primary" />
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-primary" />
    </div>
  );
}

function ProjectNode({ data }: { data: { label: string; name: string } }) {
  return (
    <div className="min-w-[180px] rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">Project</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{data.name}</p>
      <Link to={`/projects/${data.label}`} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">View Project →</Link>
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !bg-primary" />
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-primary" />
    </div>
  );
}

const nodeTypes = { task: TaskNode, currentTask: TaskNode, project: ProjectNode };

// ── Board ──────────────────────────────────────────────────────────────────

export function TaskConnectionsBoard({
  task,
  projectId,
  projectName,
  onDependencyChange,
}: {
  task: TaskDomain;
  projectId: string;
  projectName?: string;
  onDependencyChange?: () => void;
}): React.JSX.Element {
  const [predecessors, setPredecessors] = useState<Array<{ id: string; predecessorId: string }>>([]);
  const [successors, setSuccessors] = useState<Array<{ id: string; successorId: string }>>([]);
  const [projectTasks, setProjectTasks] = useState<TaskDomain[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [view, setView] = useState<'board' | 'list'>('board');
  const [error, setError] = useState<string | null>(null);
  const [showPaletteTaskPicker, setShowPaletteTaskPicker] = useState(false);

  const fetchDeps = useCallback(async () => {
    try {
      const res = await authFetch(`/api/v1/projects/${projectId}/tasks/${task.id}/dependencies`);
      if (!res.ok) return;
      const body = await res.json();
      const data = body.data ?? body;
      setPredecessors(data.predecessors ?? []);
      setSuccessors(data.successors ?? []);
    } catch {
      // silent
    }
  }, [projectId, task.id]);

  const fetchProjectTasks = useCallback(async () => {
    try {
      const res = await authFetch(`/api/v1/projects/${projectId}/tasks?perPage=100`);
      if (!res.ok) return;
      const body = await res.json();
      const items = body.data ?? body.items ?? body ?? [];
      setProjectTasks(Array.isArray(items) ? items : []);
    } catch {
      // silent
    }
  }, [projectId]);

  useEffect(() => {
    void fetchDeps();
    void fetchProjectTasks();
  }, [fetchDeps, fetchProjectTasks]);

  // Build nodes/edges from dependencies
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];
    // Current task center
    nodes.push({
      id: task.id,
      type: 'currentTask',
      position: { x: 250, y: 200 },
      data: { label: task.title, sublabel: task.description, status: task.status, isCurrent: true },
    });
    // Predecessors above
    predecessors.forEach((dep, idx) => {
      const t = projectTasks.find((pt) => pt.id === dep.predecessorId);
      nodes.push({
        id: dep.predecessorId,
        type: 'task',
        position: { x: 250 + (idx - predecessors.length / 2) * 220, y: 40 },
        data: { label: t?.title ?? dep.predecessorId.slice(0, 8), sublabel: t?.description, status: t?.status ?? 'todo' },
      });
    });
    // Successors below
    successors.forEach((dep, idx) => {
      const t = projectTasks.find((pt) => pt.id === dep.successorId);
      nodes.push({
        id: dep.successorId,
        type: 'task',
        position: { x: 250 + (idx - successors.length / 2) * 220, y: 360 },
        data: { label: t?.title ?? dep.successorId.slice(0, 8), sublabel: t?.description, status: t?.status ?? 'todo' },
      });
    });
    // Project node
    if (projectName) {
      nodes.push({
        id: `project-${projectId}`,
        type: 'project',
        position: { x: 550, y: 200 },
        data: { label: projectId, name: projectName },
      });
    }
    return nodes;
  }, [task, predecessors, successors, projectTasks, projectId, projectName]);

  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    predecessors.forEach((dep) => {
      edges.push({ id: `e-${dep.predecessorId}-${task.id}`, source: dep.predecessorId, target: task.id, label: 'Blocked by', animated: false, style: { stroke: 'var(--primary)' } });
    });
    successors.forEach((dep) => {
      edges.push({ id: `e-${task.id}-${dep.successorId}`, source: task.id, target: dep.successorId, label: 'Blocking', animated: false, style: { stroke: 'var(--primary)' } });
    });
    if (projectName) {
      edges.push({ id: `e-project-${task.id}`, source: `project-${projectId}`, target: task.id, label: 'Belongs to', style: { stroke: '#a1a1aa', strokeDasharray: '6 4' } });
    }
    return edges;
  }, [predecessors, successors, task.id, projectId, projectName]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      // Only allow Task -> Current Task or Current Task -> Task as dependency
      const isToCurrent = connection.target === task.id;
      const isFromCurrent = connection.source === task.id;
      if (!isToCurrent && !isFromCurrent) {
        setError('Only connections to/from the current task are supported in this view.');
        setTimeout(() => setError(null), 3000);
        return;
      }
      // The API is POST /projects/:projectId/tasks/:taskId/dependencies/:predecessorId where taskId is the successor
      const targetId = isToCurrent ? task.id : connection.target!;
      const predId = isToCurrent ? connection.source! : task.id;
      try {
        const res = await authFetch(`/api/v1/projects/${projectId}/tasks/${targetId}/dependencies/${predId}`, { method: 'POST' });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message ?? 'Failed to create dependency');
        }
        setEdges((eds) => addEdge({ ...connection, id: `e-${predId}-${targetId}`, label: 'Task Dependency' }, eds));
        onDependencyChange?.();
        void fetchDeps();
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.toLowerCase().includes('cycle') || msg.toLowerCase().includes('circular')) {
          setError('Cannot connect these tasks. This would create a circular dependency.');
        } else {
          setError(msg);
        }
        setTimeout(() => setError(null), 4000);
      }
    },
    [task.id, projectId, setEdges, onDependencyChange, fetchDeps],
  );

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const handleDeleteEdge = async () => {
    if (!selectedEdge) return;
    // Edge id is e-<pred>-<succ> or e-project-... ; only handle task dependency
    if (selectedEdge.id.startsWith('e-project')) {
      setSelectedEdge(null);
      return;
    }
    // For our edges, source is predecessor, target is successor
    const predecessorId = selectedEdge.source;
    const successorId = selectedEdge.target;
    try {
      const res = await authFetch(`/api/v1/projects/${projectId}/tasks/${successorId}/dependencies/${predecessorId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Failed to delete dependency');
      }
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
      setSelectedEdge(null);
      onDependencyChange?.();
      void fetchDeps();
    } catch (err) {
      setError((err as Error).message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleAddTaskNode = async (taskIdToAdd: string) => {
    // Just add visual node; actual dependency requires connection
    const t = projectTasks.find((pt) => pt.id === taskIdToAdd);
    if (!t) return;
    setNodes((nds) => [
      ...nds,
      { id: t.id, type: 'task', position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 300 }, data: { label: t.title, sublabel: t.description, status: t.status } },
    ]);
    setShowPaletteTaskPicker(false);
  };

  if (view === 'list') {
    return (
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex gap-2">
          <button onClick={() => setView('board')} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground">Board</button>
          <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">List</button>
        </div>
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Blocked by</p>
            {predecessors.length === 0 ? <p className="mt-1 text-xs text-foreground-muted">No predecessors</p> : predecessors.map((d) => {
              const t = projectTasks.find((pt) => pt.id === d.predecessorId);
              return <div key={d.id} className="mt-1 rounded-lg border border-border bg-surface-muted/30 px-3 py-2"><p className="font-medium text-foreground">{t?.title ?? d.predecessorId.slice(0,8)}</p><p className="text-xs text-foreground-muted">{t?.status ?? 'todo'}</p></div>;
            })}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Blocking</p>
            {successors.length === 0 ? <p className="mt-1 text-xs text-foreground-muted">No successors</p> : successors.map((d) => {
              const t = projectTasks.find((pt) => pt.id === d.successorId);
              return <div key={d.id} className="mt-1 rounded-lg border border-border bg-surface-muted/30 px-3 py-2"><p className="font-medium text-foreground">{t?.title ?? d.successorId.slice(0,8)}</p><p className="text-xs text-foreground-muted">{t?.status ?? 'todo'}</p></div>;
            })}
          </div>
          {projectName && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Project</p>
              <div className="mt-1 rounded-lg border border-border bg-surface-muted/30 px-3 py-2"><p className="font-medium text-foreground">{projectName}</p></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex gap-2">
          <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Board</button>
          <button onClick={() => setView('list')} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground">List</button>
        </div>
        <span className="hidden text-xs text-foreground-muted sm:inline">Drag to pan • Scroll to zoom • Drag handles to connect</span>
      </div>

      {error && <div className="border-b border-danger/20 bg-danger/5 px-4 py-2 text-xs text-danger">{error}</div>}

      <div className="grid h-[520px] grid-cols-12">
        {/* Palette */}
        <div className="col-span-3 lg:col-span-2 border-r border-border bg-surface-muted/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Add Connection</p>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-foreground-muted">Tasks</p>
              <button onClick={() => setShowPaletteTaskPicker((v) => !v)} className="mt-1 w-full rounded-lg border border-dashed border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-muted">+ Task</button>
              {showPaletteTaskPicker && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-sm">
                  {projectTasks.filter((pt) => pt.id !== task.id && !predecessors.some((p) => p.predecessorId === pt.id) && !successors.some((s) => s.successorId === pt.id)).slice(0, 20).map((pt) => (
                    <button key={pt.id} onClick={() => handleAddTaskNode(pt.id)} className="w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-surface-muted">{pt.title}</button>
                  ))}
                  {projectTasks.length === 0 && <p className="p-2 text-xs text-foreground-muted">No other tasks</p>}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-border bg-surface p-2 text-xs text-foreground-muted">
              <p className="font-medium text-foreground">Tip</p>
              <p className="mt-1">Drag from a handle to create a dependency. The current task is the visual anchor.</p>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="col-span-9 lg:col-span-7 relative bg-background">
          {nodes.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <p className="text-sm font-semibold text-foreground">No connections yet.</p>
              <p className="mt-1 max-w-sm text-xs text-foreground-muted">Connect this task to another task, project, or resource.</p>
              <button onClick={() => setShowPaletteTaskPicker(true)} className="mt-3 rounded-lg bg-action px-3 py-1.5 text-xs font-medium text-action-foreground">+ Add Connection</button>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onPaneClick={() => { setSelectedNode(null); setSelectedEdge(null); }}
              nodeTypes={nodeTypes}
              fitView
              panOnScroll
              zoomOnScroll
              className="bg-background"
            >
              <Background gap={16} />
              <Controls showInteractive={false} />
              <MiniMap className="!bg-surface" />
            </ReactFlow>
          )}
        </div>

        {/* Inspector */}
        <div className="col-span-12 lg:col-span-3 border-t border-border bg-surface p-3 lg:border-l lg:border-t-0">
          {!selectedNode && !selectedEdge && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Inspector</p>
              <p className="mt-2 text-xs text-foreground-muted">Select a node or connection to inspect.</p>
              <div className="mt-4 rounded-lg border border-border bg-surface-muted/30 p-3">
                <p className="text-sm font-semibold text-foreground">{task.title}</p>
                {/* @ts-ignore - TaskStatus enum string */}
                <p className="mt-1 text-xs text-foreground-muted">{(TaskStatus as unknown as Record<string, string>)[task.status] ?? task.status}</p>
                <Link to={`/projects/${projectId}`} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">Open Project</Link>
              </div>
            </div>
          )}
          {selectedNode && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Task</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{String((selectedNode.data as { label: unknown }).label)}</p>
              {!!(selectedNode.data as { sublabel?: unknown }).sublabel && <p className="mt-1 text-xs text-foreground-muted">{String((selectedNode.data as { sublabel: unknown }).sublabel)}</p>}
              {!!(selectedNode.data as { status?: unknown }).status && <p className="mt-2 text-xs"><span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs">{String((selectedNode.data as { status: unknown }).status)}</span></p>}
              <Link to={`/tasks/${selectedNode.id}`} className="mt-3 inline-flex rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted">Open Task</Link>
              {selectedNode.id !== task.id && selectedNode.id !== `project-${projectId}` && (
                <button onClick={() => { setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id)); setSelectedNode(null); }} className="mt-2 block text-xs text-danger hover:underline">Remove from Board</button>
              )}
            </div>
          )}
          {selectedEdge && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Connection</p>
              <p className="mt-2 text-xs text-foreground-muted">From</p>
              <p className="text-sm font-medium text-foreground">{selectedEdge.source.slice(0, 8)}</p>
              <p className="mt-1 text-xs text-foreground-muted">To</p>
              <p className="text-sm font-medium text-foreground">{selectedEdge.target.slice(0, 8)}</p>
              <p className="mt-2 text-xs"><span className="rounded-full bg-surface-muted px-2 py-0.5">Task Dependency</span></p>
              <button onClick={handleDeleteEdge} className="mt-3 w-full rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-white hover:bg-danger/90">Delete Connection</button>
              <p className="mt-2 text-xs text-foreground-muted">This removes the dependency, not the tasks.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
