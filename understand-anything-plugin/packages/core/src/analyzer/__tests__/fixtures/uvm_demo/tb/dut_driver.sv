// dut_driver — drives transactions onto the DUT interface
class dut_driver extends uvm_driver #(dut_seq_item);
  `uvm_component_utils(dut_driver)

  virtual dut_if vif;

  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction

  task run_phase(uvm_phase phase);
    forever begin
      seq_item_port.get_next_item(req);
      // drive req.data onto vif.cb ...
      seq_item_port.item_done();
    end
  endtask
endclass
