export function serializeBigInt(data: any): any {
  if (Array.isArray(data)) {
    return data.map(serializeBigInt);
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
