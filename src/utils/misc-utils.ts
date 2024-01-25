/**
 * Returns the intersection of given arrays
 *
 * @params - arrays to find intersection of
 * @returns - intersection of given arrays
 *
 * @example
 * intersection([1, 2, 3], [2, 3, 4], [3, 4, 5]) // [3]
 */
export const intersection = <T>(...arr1: T[][]): T[] => {
  const firstArr = arr1[0];
  const otherArrays = arr1.slice(1);

  return otherArrays.reduce(
    (acc, curr) => acc.filter((x) => curr.includes(x)),
    firstArr,
  );
};

/**
 * Returns the intersection of given sets
 *
 * @params - sets to find intersection of
 * @returns - intersection of given sets
 *
 * @example
 * intersectionOfSets(new Set([1, 2, 3]), new Set([2, 3, 4]), new Set([3, 4, 5])) // Set([3])
 */
export const intersectionOfSets = <T>(...sets: Set<T>[]): Set<T> => {
  const firstSet = sets[0];
  const otherSets = sets.slice(1);
  return otherSets.reduce(
    (acc, curr) => new Set([...acc].filter((x) => curr.has(x))),
    firstSet,
  );
};

/**
 * @param arr - array to check
 * @returns - true if given array is empty, false otherwise
 */
export const isArrayEmpty = <T>(arr: T[]) => arr.length === 0;

/**
 * @param set - set to check
 * @returns - true if given set is empty, false otherwise
 */
export const isSetEmpty = <T>(set: Set<T>) => set.size === 0;

/**
 * @param obj - object to copy
 * @returns - deep copy of given object
 */
export const deepCopy = <T>(obj: T): T => {
  if (typeof obj !== "object" || obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepCopy) as unknown as T;
  }
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, deepCopy(value)]),
    ) as unknown as T;
  }
  return obj;
};
