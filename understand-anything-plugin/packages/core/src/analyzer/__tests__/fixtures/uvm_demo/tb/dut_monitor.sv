// dut_monitor — samples the interface and publishes observed items
class dut_monitor extends uvm_monitor;
  `uvm_component_utils(dut_monitor)

  virtual dut_if vif;
  uvm_analysis_port #(dut_seq_item) ap;

  function new(string name, uvm_component parent);
    super.new(name, parent);
    ap = new("ap", this);
  endfunction

  task run_phase(uvm_phase phase);
    // sample vif.cb, build dut_seq_item, ap.write(item) ...
  endtask
endclass
