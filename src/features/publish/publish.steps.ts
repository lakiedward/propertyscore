import {
  ImagesIcon,
  MapPinIcon,
  PencilLineIcon,
  RulerIcon,
  SendIcon,
  TagIcon,
  type LucideIcon,
} from 'lucide-react';

export type PublishStepKey = 'type' | 'photos' | 'description' | 'details' | 'location' | 'contact';

type StepHue = 'slate' | 'coral' | 'berry' | 'sky' | 'leaf' | 'aqua';

type StepHueClasses = {
  tile: string;
  activeTile: string;
  label: string;
  underline: string;
  panel: string;
  ink: string;
};

const STEP_HUE_CLASSES: Record<StepHue, StepHueClasses> = {
  slate: {
    tile: 'bg-step-slate-surface text-step-slate-ink',
    activeTile: 'bg-step-slate-solid text-primary-foreground',
    label: 'text-step-slate-ink',
    underline: 'bg-step-slate-solid',
    panel: 'bg-step-slate-surface',
    ink: 'text-step-slate-ink',
  },
  coral: {
    tile: 'bg-step-coral-surface text-step-coral-ink',
    activeTile: 'bg-step-coral-solid text-primary-foreground',
    label: 'text-step-coral-ink',
    underline: 'bg-step-coral-solid',
    panel: 'bg-step-coral-surface',
    ink: 'text-step-coral-ink',
  },
  berry: {
    tile: 'bg-step-berry-surface text-step-berry-ink',
    activeTile: 'bg-step-berry-solid text-primary-foreground',
    label: 'text-step-berry-ink',
    underline: 'bg-step-berry-solid',
    panel: 'bg-step-berry-surface',
    ink: 'text-step-berry-ink',
  },
  sky: {
    tile: 'bg-step-sky-surface text-step-sky-ink',
    activeTile: 'bg-step-sky-solid text-primary-foreground',
    label: 'text-step-sky-ink',
    underline: 'bg-step-sky-solid',
    panel: 'bg-step-sky-surface',
    ink: 'text-step-sky-ink',
  },
  leaf: {
    tile: 'bg-step-leaf-surface text-step-leaf-ink',
    activeTile: 'bg-step-leaf-solid text-primary-foreground',
    label: 'text-step-leaf-ink',
    underline: 'bg-step-leaf-solid',
    panel: 'bg-step-leaf-surface',
    ink: 'text-step-leaf-ink',
  },
  aqua: {
    tile: 'bg-step-aqua-surface text-step-aqua-ink',
    activeTile: 'bg-step-aqua-solid text-primary-foreground',
    label: 'text-step-aqua-ink',
    underline: 'bg-step-aqua-solid',
    panel: 'bg-step-aqua-surface',
    ink: 'text-step-aqua-ink',
  },
};

export type PublishStep = {
  key: PublishStepKey;
  icon: LucideIcon;
  hue: StepHueClasses;
};

export const PUBLISH_STEPS: readonly PublishStep[] = [
  { key: 'type', icon: TagIcon, hue: STEP_HUE_CLASSES.slate },
  { key: 'photos', icon: ImagesIcon, hue: STEP_HUE_CLASSES.coral },
  { key: 'description', icon: PencilLineIcon, hue: STEP_HUE_CLASSES.berry },
  { key: 'details', icon: RulerIcon, hue: STEP_HUE_CLASSES.sky },
  { key: 'location', icon: MapPinIcon, hue: STEP_HUE_CLASSES.leaf },
  { key: 'contact', icon: SendIcon, hue: STEP_HUE_CLASSES.aqua },
];
