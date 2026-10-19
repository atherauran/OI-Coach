export const fillBlanks = (code: string, fills: Record<number, string>) =>
  code.replace(/⟦(\d+)⟧/g, (_, id) => fills[Number(id)] ?? "");
