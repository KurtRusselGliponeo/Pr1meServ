'use client';

import * as React from 'react';
import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  prospectPipelineStages,
  type Prospect,
  type ProspectPipelineStage,
  type ProspectTemperature,
} from '@a1prime/schemas';
import { Filter, Phone, Thermometer } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const temperatureFilters = ['All', 'Warm', 'Cold'] as const;
type TemperatureFilter = (typeof temperatureFilters)[number];

function ProspectCard({ prospect }: { prospect: Prospect }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: prospect.id,
    data: {
      type: 'prospect',
      stage: prospect.pipelineStage,
    },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
      className={isDragging ? 'opacity-70' : undefined}
    >
      <Card className="cursor-grab border border-border/70 bg-background/90 shadow-sm active:cursor-grabbing">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">{prospect.clientName}</p>
              <p className="text-xs text-muted-foreground">{prospect.agentCode}</p>
            </div>
            <Badge
              variant="secondary"
              className={
                prospect.temperature === 'Warm'
                  ? 'border-amber-200 bg-amber-100 text-amber-900'
                  : 'border-sky-200 bg-sky-100 text-sky-900'
              }
            >
              <Thermometer className="mr-1 size-3" />
              {prospect.temperature}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="size-4" />
            <span>{prospect.contactNumber}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StageColumn({
  stage,
  prospects,
}: {
  stage: ProspectPipelineStage;
  prospects: Prospect[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: {
      type: 'column',
      stage,
    },
  });

  return (
    <div className="flex min-w-[280px] flex-1 flex-col">
      <Card className="h-full border border-border/70 bg-muted/30">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">{stage}</CardTitle>
              <CardDescription>{prospects.length} prospect{prospects.length === 1 ? '' : 's'}</CardDescription>
            </div>
            <Badge variant="outline">{prospects.length}</Badge>
          </div>
        </CardHeader>
        <CardContent
          ref={setNodeRef}
          className={`min-h-[360px] space-y-3 rounded-b-[inherit] transition-colors ${
            isOver ? 'bg-primary/5' : ''
          }`}
        >
          <SortableContext items={prospects.map((prospect) => prospect.id)} strategy={verticalListSortingStrategy}>
            {prospects.map((prospect) => (
              <ProspectCard key={prospect.id} prospect={prospect} />
            ))}
          </SortableContext>
          {prospects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
              Drop a prospect here
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function KanbanBoard({
  prospects,
  onStageChange,
  isUpdating,
}: {
  prospects: Prospect[];
  onStageChange: (prospectId: string, stage: ProspectPipelineStage) => Promise<void>;
  isUpdating?: boolean;
}) {
  const [temperatureFilter, setTemperatureFilter] = React.useState<TemperatureFilter>('All');
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const filteredProspects = React.useMemo(() => {
    if (temperatureFilter === 'All') {
      return prospects;
    }

    return prospects.filter(
      (prospect) => prospect.temperature === (temperatureFilter as ProspectTemperature),
    );
  }, [prospects, temperatureFilter]);

  const prospectsByStage = React.useMemo(
    () =>
      prospectPipelineStages.reduce<Record<ProspectPipelineStage, Prospect[]>>((accumulator, stage) => {
        accumulator[stage] = filteredProspects.filter((prospect) => prospect.pipelineStage === stage);
        return accumulator;
      }, {} as Record<ProspectPipelineStage, Prospect[]>),
    [filteredProspects],
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeProspect = prospects.find((prospect) => prospect.id === active.id);

    if (!activeProspect) {
      return;
    }

    const overStage =
      typeof over.id === 'string' && prospectPipelineStages.includes(over.id as ProspectPipelineStage)
        ? (over.id as ProspectPipelineStage)
        : (over.data.current?.stage as ProspectPipelineStage | undefined);

    if (!overStage || overStage === activeProspect.pipelineStage) {
      return;
    }

    await onStageChange(activeProspect.id, overStage);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Prospecting CRM</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track leads before they convert into official NAP policies.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="size-4" />
            Temperature
          </span>
          {temperatureFilters.map((filterValue) => (
            <Button
              key={filterValue}
              type="button"
              size="sm"
              variant={temperatureFilter === filterValue ? 'default' : 'outline'}
              disabled={isUpdating}
              onClick={() => setTemperatureFilter(filterValue)}
            >
              {filterValue}
            </Button>
          ))}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 xl:grid-cols-5">
          {prospectPipelineStages.map((stage) => (
            <StageColumn key={stage} stage={stage} prospects={prospectsByStage[stage]} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
