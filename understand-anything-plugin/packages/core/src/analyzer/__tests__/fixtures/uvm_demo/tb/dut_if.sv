// dut_if — DUT interface with a clocking block
interface dut_if (input logic clk);
  logic       rst_n;
  logic [7:0] data;
  logic       valid;
  logic       ready;

  clocking cb @(posedge clk);
    output data, valid;
    input  ready;
  endclocking
endinterface
