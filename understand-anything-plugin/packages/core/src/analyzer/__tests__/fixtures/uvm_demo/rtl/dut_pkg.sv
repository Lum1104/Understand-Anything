// dut_pkg — shared types for the demo DUT
package dut_pkg;
  typedef enum logic [1:0] { OP_ADD, OP_SUB, OP_AND, OP_OR } op_e;
  typedef struct packed {
    logic [7:0] addr;
    logic [7:0] data;
  } bus_t;
  parameter int BUS_WIDTH = 8;
endpackage
