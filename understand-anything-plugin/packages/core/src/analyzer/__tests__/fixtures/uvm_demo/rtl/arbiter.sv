// arbiter — fixed-priority N-request arbiter
module arbiter #(parameter int N = 4) (
  input  logic         clk,
  input  logic         rst_n,
  input  logic [N-1:0] reqs,
  output logic [N-1:0] grants
);
  always_comb begin
    grants = '0;
    for (int i = 0; i < N; i++) begin
      if (reqs[i]) begin
        grants[i] = 1'b1;
        break;
      end
    end
  end
endmodule
