// dut_sequencer — arbitrates sequences onto the driver
class dut_sequencer extends uvm_sequencer #(dut_seq_item);
  `uvm_component_utils(dut_sequencer)

  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction
endclass
