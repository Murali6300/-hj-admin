export const VEHICLE_ICONS: Record<string, string> = {
  BIKE: '🏍️',
  SCOOTY: '🛵',
  AUTO: '🛺',
  CAR: '🚗',
  MINI: '🚙',
  SEDAN: '🚘',
  SUV: '🚙',
};

export const VEHICLE_COLORS: Record<string, string> = {
  BIKE: '#FF6D00',
  SCOOTY: '#FF5722',
  AUTO: '#9C27B0',
  CAR: '#1A73E8',
  MINI: '#00BCD4',
  SEDAN: '#3F51B5',
  SUV: '#795548',
};

export function getVehicleIcon(type: string): string {
  return VEHICLE_ICONS[type?.toUpperCase()] || '🚗';
}

export function getVehicleColor(type: string): string {
  return VEHICLE_COLORS[type?.toUpperCase()] || '#757575';
}

export function formatVehicleType(type: string): string {
  if (!type) return '-';
  const icons = getVehicleIcon(type);
  return `${icons} ${type.charAt(0) + type.slice(1).toLowerCase()}`;
}
