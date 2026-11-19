import { CalendarDays, LayoutDashboard, Mail, Settings, ShieldCheck, UserPlus, Users, Wrench } from 'lucide-react';

export const workspacePages = [
  { id: 'dashboard', label: 'Dashboard', path: '/', Icon: LayoutDashboard },
  { id: 'events', label: 'Events', path: '/events', Icon: CalendarDays },
  { id: 'registrations', label: 'Members', path: '/registrations', Icon: Users },
  { id: 'users', label: 'Team & access', path: '/users', Icon: ShieldCheck },
  { id: 'firstYearReps', label: 'First-year reps', path: '/first-year-reps', Icon: UserPlus },
  { id: 'secondYearReps', label: 'Second-year reps', path: '/second-year-reps', Icon: UserPlus },
  { id: 'makerspace', label: 'Makerspace', path: '/makerspace', Icon: Wrench },
  { id: 'mailer', label: 'Email center', path: '/mailer', Icon: Mail },
  { id: 'settings', label: 'Settings', path: '/settings', Icon: Settings },
];
