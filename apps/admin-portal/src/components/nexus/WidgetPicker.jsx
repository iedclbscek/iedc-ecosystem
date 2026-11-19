import { Type, Image, Images, Link, Users, Calendar, Code, X } from 'lucide-react';
import PortalDialog from '../PortalDialog';
import { WIDGET_LABELS } from '../../utils/clubPageEditing';
const icons={text:Type,image:Image,gallery:Images,people:Users,events:Calendar,links:Link,custom:Code};
const presets=['text','image','gallery','people','events','links','custom'];
export default function WidgetPicker({onChoose,onClose}) {
  return <PortalDialog label="Add widget" onClose={onClose} className="nexus-picker"><div className="op-dialog-head"><div><h2>Add a widget</h2><p>Choose the content for this section.</p></div><button className="op-icon" aria-label="Close widget library" onClick={onClose}><X size={18}/></button></div><div className="nexus-widget-library">{presets.map(type=>{const label=WIDGET_LABELS[type], Icon=icons[type];return <button key={type} onClick={()=>onChoose(type)}><Icon size={23}/><strong>{label}</strong><span>{type==='custom'?'HTML, CSS & JavaScript':type==='people'?'From your club’s database':type==='events'?'Your published club events':'Ready to customize'}</span></button>;})}</div></PortalDialog>;
}
