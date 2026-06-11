// fifo — simple synchronous FIFO
module fifo #(parameter int W = 8, parameter int DEPTH = 16) (
  input  logic         clk,
  input  logic         rst_n,
  input  logic         push,
  input  logic         pop,
  input  logic [W-1:0] din,
  output logic [W-1:0] dout,
  output logic         full,
  output logic         empty
);
  logic [W-1:0] mem [0:DEPTH-1];
  logic [$clog2(DEPTH):0] count;

  assign full  = (count == DEPTH);
  assign empty = (count == 0);

  always_ff @(posedge clk) begin
    if (!rst_n) count <= '0;
    else        count <= count + (push & ~full) - (pop & ~empty);
  end
endmodule
