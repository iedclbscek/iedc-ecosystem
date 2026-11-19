import { GraduationCap, Lightbulb, ShieldCheck, Terminal, MonitorPlay, Code2, Rocket, Globe, Zap, CircuitBoard, Blocks, Sparkles, Cloud } from 'lucide-react';
const icons={GraduationCap,Lightbulb,ShieldCheck,Terminal,MonitorPlay,Code2,Rocket,Globe,Zap,CircuitBoard,Blocks,Sparkles,Cloud};
export default function CommunityIcon({name}){const Icon=icons[name]||Blocks;return <Icon className="w-6 h-6"/>;}
