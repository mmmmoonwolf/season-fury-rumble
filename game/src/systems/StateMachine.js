/**
 * Generic Finite State Machine.
 * ตัวละครทุกตัวใช้ instance นี้ร่วมกัน — แค่ register state ที่ต้องการ
 *
 * แต่ละ state เป็น object รูปแบบ:
 * {
 *   onEnter?: (machine) => void,
 *   onUpdate?: (machine, dt) => void,
 *   onExit?: (machine) => void,
 * }
 */
export class StateMachine {
  constructor(owner) {
    this.owner = owner; // reference กลับไปที่ Player instance (เข้าถึง sprite, body, input ได้)
    this.states = new Map();
    this.currentStateName = null;
    this.currentState = null;
  }

  addState(name, stateDef) {
    this.states.set(name, stateDef);
    return this;
  }

  /**
   * เปลี่ยน state — ถ้าอยู่ state เดิมอยู่แล้วจะไม่ทำอะไร (กัน onEnter ยิงซ้ำ)
   * ใส่ force=true ถ้าต้องการ re-enter state เดิมจริงๆ
   */
  setState(name, force = false) {
    if (!this.states.has(name)) {
      console.warn(`[StateMachine] ไม่มี state ชื่อ "${name}"`);
      return;
    }
    if (this.currentStateName === name && !force) return;

    if (this.currentState?.onExit) {
      this.currentState.onExit(this.owner);
    }

    this.currentStateName = name;
    this.currentState = this.states.get(name);

    if (this.currentState.onEnter) {
      this.currentState.onEnter(this.owner);
    }
  }

  update(dt) {
    if (this.currentState?.onUpdate) {
      this.currentState.onUpdate(this.owner, dt);
    }
  }

  is(name) {
    return this.currentStateName === name;
  }
}
