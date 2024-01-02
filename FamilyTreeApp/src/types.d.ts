export {};

declare global {
  namespace SolidDrawflow {
    export interface CustomDataType {
      gender: "M" | "F";
      name: string;
    }
  }
}
