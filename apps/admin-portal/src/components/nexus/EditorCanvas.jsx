import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowUp, ArrowDown, GripVertical, Pencil, Plus, EyeOff } from 'lucide-react';
import ClubPageRenderer from '../../../../../shared/ClubPageRenderer';
import { WIDGET_LABELS, moveContainer, moveWidget } from '../../utils/clubPageEditing';
import './editor-canvas.css';

function SortableFrame({ id, kind, label, disabled, onEdit, onUp, onDown, onAdd, hidden, children }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled, data: { kind } });
  return <div ref={setNodeRef} className={`nexus-edit-frame nexus-edit-${kind}${hidden ? ' is-hidden' : ''}${isDragging ? ' is-dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
    {!disabled && <div className="nexus-edit-tools">
      <button ref={setActivatorNodeRef} type="button" className="nexus-edit-handle" aria-label={`Drag ${label}`} {...attributes} {...listeners}><GripVertical size={16}/></button>
      <span className="nexus-edit-label">{hidden && <EyeOff size={13}/>}<span>{label}</span>{hidden && <small>Hidden</small>}</span>
      <div className="nexus-edit-actions">
        <button type="button" aria-label={`Move ${kind} ${label} up`} disabled={!onUp} onClick={onUp}><ArrowUp size={15}/></button>
        <button type="button" aria-label={`Move ${kind} ${label} down`} disabled={!onDown} onClick={onDown}><ArrowDown size={15}/></button>
        <button type="button" className="nexus-edit-labeled" aria-label={`Edit ${label}`} onClick={onEdit}><Pencil size={14}/><span>Edit</span></button>
        {onAdd && <button type="button" className="nexus-edit-labeled" onClick={onAdd}><Plus size={15}/><span>Add widget</span></button>}
      </div>
    </div>}
    {children}
  </div>;
}

export default function EditorCanvas({ page, onChange, onEdit, onAddWidget, disabled = false, events, team }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 7 } }), useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }));
  function eligibleTargets(active, containers) {
    const kind = active.data.current?.kind;
    return containers.filter(target => {
      if (kind === 'section') return target.data.current?.kind === 'section';
      if (target.data.current?.kind === 'widget') return true;
      return target.data.current?.kind === 'section' && page.containers.some(section => section.id === target.id && section.widgets.length === 0);
    });
  }
  function collisionDetection(args) {
    return closestCenter({ ...args, droppableContainers: eligibleTargets(args.active, args.droppableContainers) });
  }
  function keyboardCoordinates(event, args) {
    const containers = args.context.droppableContainers;
    // Nested widgets must not become keyboard targets while moving a section.
    const targets = eligibleTargets(args.context.active, containers.getEnabled());
    return sortableKeyboardCoordinates(event, { ...args, context: { ...args.context, droppableContainers: { getEnabled: () => targets, get: id => containers.get(id) } } });
  }
  function drop({ active, over }) {
    if (disabled || !over || active.id === over.id) return;
    if (active.data.current?.kind === 'section') {
      const from = page.containers.findIndex(section => section.id === active.id);
      const to = page.containers.findIndex(section => section.id === over.id);
      if (from >= 0 && to >= 0) onChange(moveContainer(page, active.id, to - from));
      return;
    }
    const target = page.containers.find(section => section.id === over.id || section.widgets.some(widget => widget.id === over.id));
    if (!target) return;
    const index = target.widgets.findIndex(widget => widget.id === over.id);
    onChange(moveWidget(page, active.id, target.id, index < 0 ? target.widgets.length : index));
  }
  function renderContainer(section, content) {
    const index = page.containers.findIndex(item => item.id === section.id);
    return <SortableFrame id={section.id} kind="section" label={section.title || `Section ${index + 1}`} disabled={disabled} hidden={section.hidden} onEdit={() => onEdit(section.id)} onAdd={() => onAddWidget(section.id)} onUp={index > 0 ? () => onChange(moveContainer(page, section.id, -1)) : null} onDown={index < page.containers.length - 1 ? () => onChange(moveContainer(page, section.id, 1)) : null}>
      <SortableContext items={section.widgets.map(widget => widget.id)} strategy={rectSortingStrategy}>{content}</SortableContext>
      {!section.widgets.length && !disabled && <button type="button" className="nexus-edit-empty" onClick={() => onAddWidget(section.id)}><Plus size={18}/><span>Add the first widget to this section</span></button>}
    </SortableFrame>;
  }
  function renderWidget(widget, content, section) {
    const index = section.widgets.findIndex(item => item.id === widget.id);
    return <SortableFrame id={widget.id} kind="widget" label={widget.settings.title || WIDGET_LABELS[widget.type]} disabled={disabled} onEdit={() => onEdit(widget.id)} onUp={index > 0 ? () => onChange(moveWidget(page, widget.id, section.id, index - 1)) : null} onDown={index < section.widgets.length - 1 ? () => onChange(moveWidget(page, widget.id, section.id, index + 1)) : null}>{content}</SortableFrame>;
  }
  return <div className="nexus-edit-canvas">
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={drop}>
      <SortableContext items={page.containers.map(section => section.id)} strategy={verticalListSortingStrategy}>
        <ClubPageRenderer page={page} theme="public" executeCustomCode={false} events={events} team={team} showHidden renderContainer={renderContainer} renderWidget={renderWidget}/>
      </SortableContext>
    </DndContext>
  </div>;
}
