// top — design top that instantiates the RTL submodules
module top #(parameter int W = 8) (
  input  logic clk,
  input  logic rst_n
);
  import dut_pkg::*;

  logic [W-1:0] a, b, y, din, dout;
  logic [3:0]   reqs, grants;
  logic         push, pop, full, empty;

  alu     #(.W(W))             u_alu     (.clk(clk), .a(a), .b(b), .y(y));
  fifo    #(.W(W), .DEPTH(16)) u_fifo    (.clk(clk), .rst_n(rst_n), .push(push),
                                          .pop(pop), .din(din), .dout(dout),
                                          .full(full), .empty(empty));
  arbiter #(.N(4))             u_arbiter (.clk(clk), .rst_n(rst_n),
                                          .reqs(reqs), .grants(grants));
endmodule
