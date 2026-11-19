import { GraduationCap, Lightbulb, ShieldCheck, Terminal, MonitorPlay, Code2, Rocket, Globe, Zap, CircuitBoard, Blocks, Sparkles, Cloud } from 'lucide-react';
import { communities as catalogue, communityData as details } from '../../../../shared/legacyCommunityData.js';
const icons = { GraduationCap, Lightbulb, ShieldCheck, Terminal, MonitorPlay, Code2, Rocket, Globe, Zap, CircuitBoard, Blocks, Sparkles, Cloud };
function withIcon(item) { const Icon = icons[item.iconName] || Terminal; return { ...item, icon: <Icon className="w-6 h-6" /> }; }
export const communities = catalogue.map(withIcon);
export const communityData = Object.fromEntries(Object.entries(details).map(([id, data]) => [id, withIcon(data)]));
export const getCommunityById = id => communities.find(item => item.id === id) || null;
