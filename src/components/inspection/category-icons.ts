import {
  Building2Icon,
  CarIcon,
  ClipboardCheckIcon,
  DoorOpenIcon,
  DropletIcon,
  DropletsIcon,
  FileTextIcon,
  FlameIcon,
  HouseIcon,
  KeyRoundIcon,
  PaintbrushIcon,
  PlugIcon,
  ShieldIcon,
  SunIcon,
  ThermometerIcon,
  TreesIcon,
  UsersIcon,
  WindIcon,
  WrenchIcon,
  ZapIcon,
  type LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICONS = {
  'building-2': Building2Icon,
  droplets: DropletsIcon,
  zap: ZapIcon,
  droplet: DropletIcon,
  flame: FlameIcon,
  'door-open': DoorOpenIcon,
  thermometer: ThermometerIcon,
  paintbrush: PaintbrushIcon,
  users: UsersIcon,
  'file-text': FileTextIcon,
  shield: ShieldIcon,
  house: HouseIcon,
  wrench: WrenchIcon,
  plug: PlugIcon,
  wind: WindIcon,
  sun: SunIcon,
  trees: TreesIcon,
  car: CarIcon,
  'key-round': KeyRoundIcon,
  'clipboard-check': ClipboardCheckIcon,
} as const satisfies Record<string, LucideIcon>;

export type CategoryIconKey = keyof typeof CATEGORY_ICONS;

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS) as CategoryIconKey[];

export function isCategoryIconKey(value: string): value is CategoryIconKey {
  return Object.hasOwn(CATEGORY_ICONS, value);
}
