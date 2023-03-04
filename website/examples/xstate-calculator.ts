// Based on xstate-vue-calculator:
// https://github.com/Glutnix/xstate-vue-calculator
// Can't import from "xstate":
// https://github.com/statelyai/xstate/pull/2318#issuecomment-864795216
import {Machine, assign} from "xstate/dist/xstate.web.js";
import { Context, createElement } from "@bikeshaving/crank";
import { renderer } from "@bikeshaving/crank/dom";

const not = fn => (...args) => !fn.apply(null, args);
const isZero = (context, event) => event.key === 0;
const isNotZero = not(isZero);
const isMinus = (context, event) => event.operator === "-";
const isNotMinus = not(isMinus);
const divideByZero = (context, event) =>
  context.operand2 === "0." && context.operator === "/";
const notDivideByZero = not(divideByZero);

function doMath(operand1, operand2, operator) {
  switch (operator) {
    case "+":
      return +operand1 + +operand2;
    case "-":
      return +operand1 - +operand2;
    case "/":
      return +operand1 / +operand2;
    case "x":
      return +operand1 * +operand2;
    default:
      return Infinity;
  }
}

export const calcMachine = Machine(
  {
    id: "calcMachine",
    context: {
      display: "0.",
      operand1: null,
      operand2: null,
      operator: null
    },
    // strict: true,
    on: {
      CLEAR_EVERYTHING: {
        target: ".start",
        actions: ["reset"]
      }
    },
    initial: "start",
    states: {
      start: {
        on: {
          NUMBER: [
            {
              cond: "isZero",
              target: "operand1.zero",
              actions: ["defaultReadout"]
            },
            {
              cond: "isNotZero",
              target: "operand1.before_decimal_point",
              actions: ["setReadoutNum"]
            }
          ],
          OPERATOR: {
            cond: "isMinus",
            target: "negative_number",
            actions: ["startNegativeNumber"]
          },
          DECIMAL_POINT: {
            target: "operand1.after_decimal_point",
            actions: ["defaultReadout"]
          }
        }
      },
      operand1: {
        on: {
          OPERATOR: {
            target: "operator_entered",
            actions: ["recordOperator"]
          },
          PERCENTAGE: {
            target: "result",
            actions: ["storeResultAsOperand2", "computePercentage"]
          },
          CLEAR_ENTRY: {
            target: "operand1",
            actions: ["defaultReadout"]
          }
        },
        initial: "zero",
        states: {
          zero: {
            on: {
              NUMBER: {
                target: "before_decimal_point",
                actions: ["setReadoutNum"]
              },
              DECIMAL_POINT: "after_decimal_point"
            }
          },
          before_decimal_point: {
            on: {
              NUMBER: {
                target: "before_decimal_point",
                actions: ["appendNumBeforeDecimal"]
              },
              DECIMAL_POINT: "after_decimal_point"
            }
          },
          after_decimal_point: {
            on: {
              NUMBER: {
                target: "after_decimal_point",
                actions: ["appendNumAfterDecimal"]
              }
            }
          }
        }
      },
      negative_number: {
        on: {
          NUMBER: [
            {
              cond: "isZero",
              target: "operand1.zero",
              actions: ["defaultNegativeReadout"]
            },
            {
              cond: "isNotZero",
              target: "operand1.before_decimal_point",
              actions: ["setNegativeReadoutNum"]
            }
          ],
          DECIMAL_POINT: {
            target: "operand1.after_decimal_point",
            actions: ["defaultNegativeReadout"]
          },
          CLEAR_ENTRY: {
            target: "start",
            actions: ["defaultReadout"]
          }
        }
      },
      operator_entered: {
        on: {
          OPERATOR: [
            {
              cond: "isNotMinus",
              target: "operator_entered",
              actions: ["setOperator"]
            },
            {
              cond: "isMinus",
              target: "negative_number_2",
              actions: ["startNegativeNumber"]
            }
          ],
          NUMBER: [
            {
              target: "operand2.zero",
              actions: ["defaultReadout"],
              cond: "isZero"
            },
            {
              cond: "isNotZero",
              target: "operand2.before_decimal_point",
              actions: ["setReadoutNum"]
            }
          ],
          DECIMAL_POINT: {
            target: "operand2.after_decimal_point",
            actions: ["defaultReadout"]
          }
        }
      },
      operand2: {
        on: {
          OPERATOR: {
            target: "operator_entered",
            actions: [
              "storeResultAsOperand2",
              "compute",
              "storeResultAsOperand1",
              "setOperator"
            ]
          },
          EQUALS: [
            {
              cond: "notDivideByZero",
              target: "result",
              actions: ["storeResultAsOperand2", "compute"]
            },
            { target: "alert", actions: ["divideByZeroAlert"] }
          ],
          CLEAR_ENTRY: {
            target: "operand2",
            actions: ["defaultReadout"]
          }
        },
        initial: "hist",
        states: {
          hist: {
            type: "history",
            target: "zero"
          },
          zero: {
            on: {
              NUMBER: {
                target: "before_decimal_point",
                actions: ["setReadoutNum"]
              },
              DECIMAL_POINT: "after_decimal_point"
            }
          },
          before_decimal_point: {
            on: {
              NUMBER: {
                target: "before_decimal_point",
                actions: ["appendNumBeforeDecimal"]
              },
              DECIMAL_POINT: "after_decimal_point"
            }
          },
          after_decimal_point: {
            on: {
              NUMBER: {
                target: "after_decimal_point",
                actions: ["appendNumAfterDecimal"]
              }
            }
          }
        }
      },
      negative_number_2: {
        on: {
          NUMBER: [
            {
              cond: "isZero",
              target: "operand2.zero",
              actions: ["defaultNegativeReadout"]
            },
            {
              cond: "isNotZero",
              target: "operand2.before_decimal_point",
              actions: ["setNegativeReadoutNum"]
            }
          ],
          DECIMAL_POINT: {
            target: "operand2.after_decimal_point",
            actions: ["defaultNegativeReadout"]
          },
          CLEAR_ENTRY: {
            target: "operator_entered",
            actions: ["defaultReadout"]
          }
        }
      },
      result: {
        on: {
          NUMBER: [
            {
              cond: "isZero",
              target: "operand1",
              actions: ["defaultReadout"]
            },
            {
              cond: "isNotZero",
              target: "operand1.before_decimal_point",
              actions: ["setReadoutNum"]
            }
          ],
          PERCENTAGE: {
            target: "result",
            actions: ["storeResultAsOperand2", "computePercentage"]
          },
          OPERATOR: {
            target: "operator_entered",
            actions: ["storeResultAsOperand1", "recordOperator"]
          },
          CLEAR_ENTRY: {
            target: "start",
            actions: ["defaultReadout"]
          }
        }
      },
      alert: {
        on: {
          OK: "operand2.hist"
        }
      }
    }
  },
  {
    guards: {
      isMinus,
      isNotMinus,
      isZero,
      isNotZero,
      notDivideByZero
    },
    actions: {
      defaultReadout: assign({
        display: () => "0."
      }),

      defaultNegativeReadout: assign({
        display: () => "-0."
      }),

      appendNumBeforeDecimal: assign({
        display: (context, event) =>
          context.display.slice(0, -1) + event.key + "."
      }),

      appendNumAfterDecimal: assign({
        display: (context, event) => context.display + event.key
      }),

      setReadoutNum: assign({
        display: (context, event) => event.key + "."
      }),

      setNegativeReadoutNum: assign({
        display: (context, event) => "-" + event.key + "."
      }),

      startNegativeNumber: assign({
        display: () => "-"
      }),

      recordOperator: assign({
        operand1: context => context.display,
        operator: (_, event) => event.operator
      }),

      setOperator: assign({
        operator: ({ operator }) => operator
      }),

      computePercentage: assign({
        display: context => context.display / 100
      }),

      compute: assign({
        display: ({ operand1, operand2, operator }) =>
          doMath(operand1, operand2, operator)
      }),

      storeResultAsOperand1: assign({
        operand1: context => context.display
      }),

      storeResultAsOperand2: assign({
        operand2: context => context.display
      }),

      divideByZeroAlert() {
        // have to put the alert in setTimeout because action is executed on event, before the transition to next state happens
        // this alert is supposed to happend on transition
        // setTimeout allows time for other state transition (to 'alert' state) to happen before showing the alert
        // probably a better way to do it. like entry or exit actions
        setTimeout(() => {
          alert("Cannot divide by zero!");
          this.transition("OK");
        }, 0);
      },

      reset: assign({
        display: () => "0.",
        operand1: () => null,
        operand2: () => null,
        operator: () => null
      })
    }
  }
);

const buttonLabels = [
  "C",
  "CE",
  "/",
  "7",
  "8",
  "9",
  "x",
  "4",
  "5",
  "6",
  "-",
  "1",
  "2",
  "3",
  "+",
  "0",
  ".",
  "=",
  "%"
];

function isOperator(label: string): boolean {
  return "+-x/".indexOf(label) > -1;
}

function buttonDescription(label: string): string {
  if (Number.isInteger(+label)) return `NUMBER ${label}`;
  if (isOperator(label)) return `OPERATOR ${label}`;
  if (label === "C") return "CLEAR_EVERYTHING";
  if (label === "CE") return "CLEAR_ENTRY";
  if (label === ".") return "DECIMAL_POINT";
  if (label === "%") return "PERCENTAGE";
  if (label === "=") return "EQUALS";
  return "";
}

// TODO: what is the type of state
function transition(state: any, label: string) {
  if (Number.isInteger(+label)) {
    return calcMachine.transition(state, { type: "NUMBER", key: +label });
  } else if (isOperator(label)) {
    return calcMachine.transition(state, { type: "OPERATOR", operator: label });
  } else if (label === "C") {
    return calcMachine.transition(state, { type: "CLEAR_EVERYTHING" });
  } else if (label === ".") {
    return calcMachine.transition(state, { type: "DECIMAL_POINT" });
  } else if (label === "%") {
    return calcMachine.transition(state, { type: "PERCENTAGE" });
  } else if (label === "CE") {
    return calcMachine.transition(state, { type: "CLEAR_ENTRY" });
  } else {
    return calcMachine.transition(state, { type: "EQUALS" });
  }
}

function* Calculator(this: Context) {
  let state = calcMachine.initialState;
  this.addEventListener("click", el => {
    if ((el.target as Element).tagName === "BUTTON") {
      // TODO: could this be abstracted somehow :-)
      state = transition(state, (el.target as Element).textContent!);
      this.refresh();
    }
  });

  for ({} of this) {
    yield (
      <div id="app">
        <div class="container">
          <input class="readout" disabled value={state.context.display} />
          <div class="button-grid">{buttonLabels.map(b => (
            <button
              class={"calc-button" + (b === "C" ? " two-span" : "")}
              title={buttonDescription(b)}
            >{b}</button>
          ))}
          </div>
        </div>
        {/* Uncomment to debug
        <div class="debug">
          <label>State:</label>
          <pre>
            <code>{JSON.stringify(state.value, null, 2)}</code>
          </pre>
          <label>Context:</label>
          <pre>
            <code>{JSON.stringify(state.context, null, 2)}</code>
          </pre>
        </div>
        */}
      </div>
    );
  }
}

const style = document.createElement("style");
style.textContent = `
.container {
  max-width: 300px;
  margin: 0 auto;
  border: 2px solid gray;
  border-radius: 4px;
  box-sizing: border-box;
}
.readout {
  font-size: 32px;
  color: #333;
  text-align: right;
  padding: 5px 13px;
  width: 100%;
  border: none;
  border-bottom: 1px solid gray;
  box-sizing: border-box;
}
.button-grid {
  display: grid;
  padding: 20px;
  grid-template-columns: repeat(4, 1fr);
  grid-gap: 15px;
}
.calc-button {
  padding: 10px;
  font-size: 22px;
  color: #eee;
  background: rgba(0, 0, 0, 0.5);
  cursor: pointer;
  border-radius: 2px;
  border: 0;
  outline: none;
  opacity: 0.8;
  transition: opacity 0.2s ease-in-out;
}
.calc-button:hover {
  opacity: 1;
}
.calc-button:active {
  background: #999;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.6);
}
.two-span {
  grid-column: span 2;
  background-color: #3572db;
}
`;
document.head.appendChild(style);

renderer.render(<Calculator />, document.body);
