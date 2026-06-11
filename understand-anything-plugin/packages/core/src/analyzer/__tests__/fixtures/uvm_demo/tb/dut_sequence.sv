// dut_sequence — produces a stream of transactions
class dut_sequence extends uvm_sequence #(dut_seq_item);
  `uvm_object_utils(dut_sequence)

  function new(string name = "dut_sequence");
    super.new(name);
  endfunction

  task body();
    dut_seq_item req;
    repeat (8) begin
      req = dut_seq_item::type_id::create("req");
      start_item(req);
      assert (req.randomize());
      finish_item(req);
    end
  endtask
endclass
