// dut_scoreboard — checks observed transactions against a reference model
class dut_scoreboard extends uvm_scoreboard;
  `uvm_component_utils(dut_scoreboard)

  uvm_analysis_imp #(dut_seq_item, dut_scoreboard) imp;

  function new(string name, uvm_component parent);
    super.new(name, parent);
    imp = new("imp", this);
  endfunction

  function void write(dut_seq_item item);
    // compare item against the reference model ...
  endfunction
endclass
