import { CustomNodeData } from "nodeflow-lib";
import { createStore } from "solid-js/store";

export default class FamilyMember extends CustomNodeData {
  private readonly store;

  public constructor(gender: "M" | "F", name: string) {
    super();
    this.store = createStore({ gender, name });
  }

  public get gender(): "M" | "F" {
    return this.store[0].gender;
  }

  public get name(): string {
    return this.store[0].name;
  }

  public set name(name: string) {
    this.store[1]({ name });
  }

  public set gender(gender: "M" | "F") {
    this.store[1]({ gender });
  }

  public serialize() {
    return {
      gender: this.gender,
      name: this.name,
    };
  }
}
