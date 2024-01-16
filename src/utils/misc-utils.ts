export const intersection = <T>(...arr1: T[][]): T[] => {
  const firstArr = arr1[0];
  const otherArrays = arr1.slice(1);

  return otherArrays.reduce(
    (acc, curr) => acc.filter((x) => curr.includes(x)),
    firstArr,
  );
};

export const intersectionOfSets = <T>(...sets: Set<T>[]): Set<T> => {
  const firstSet = sets[0];
  const otherSets = sets.slice(1);
  return otherSets.reduce(
    (acc, curr) => new Set([...acc].filter((x) => curr.has(x))),
    firstSet,
  );
};
export const isArrayEmpty = <T>(arr: T[]) => arr.length === 0;
export const isSetEmpty = <T>(set: Set<T>) => set.size === 0;
export const breakApartObjectRecursively = <T>(obj: T): T => {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(breakApartObjectRecursively) as unknown as T;
  }
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        breakApartObjectRecursively(value),
      ]),
    ) as unknown as T;
  }
};
