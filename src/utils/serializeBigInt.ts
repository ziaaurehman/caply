export function serializeBigInt(data: any): any {
  if (Array.isArray(data)) {
    return data.map(serializeBigInt);
  }

  // Handle Date objects by converting to ISO string
  if (data instanceof Date) {
    return data.toISOString();
  }

  if (data && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        typeof value === "bigint" ? Number(value) : serializeBigInt(value),
      ])
    );
  }

  return data;
}
