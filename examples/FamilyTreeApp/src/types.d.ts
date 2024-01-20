export {};

declare global {
  namespace Nodeflow {
    export interface CustomDataType {
      gender: "M" | "F";
      name: string;
    }
  }
}
