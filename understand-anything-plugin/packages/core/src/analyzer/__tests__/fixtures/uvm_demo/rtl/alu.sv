// alu — minimal ALU using dut_pkg::op_e
module alu #(parameter int W = 8) (
  input  logic         clk,
  input  logic [W-1:0] a,
  input  logic [W-1:0] b,
  output logic [W-1:0] y
);
  import dut_pkg::*;
  op_e op;

  always_comb begin
    unique case (op)
      OP_ADD:  y = a + b;
      OP_SUB:  y = a - b;
      OP_AND:  y = a & b;
      OP_OR:   y = a | b;
      default: y = '0;
    endcase
  end
endmodule
