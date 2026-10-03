export function calculateFuelCost(
  routeData: { distance: number } | undefined,
  fuelType: string,
  fuelMap: Map<string, number>,
  literPerKm = 0.07,
): number {
  if (!routeData) return 0;
  return (routeData.distance / 1000) * literPerKm * (fuelMap.get(fuelType) || 0);
}
