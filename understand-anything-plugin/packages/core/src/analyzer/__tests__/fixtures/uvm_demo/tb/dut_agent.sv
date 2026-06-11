// dut_agent — wraps driver + monitor + sequencer
class dut_agent extends uvm_agent;
  `uvm_component_utils(dut_agent)

  dut_driver    drv;
  dut_monitor   mon;
  dut_sequencer sqr;

  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction

  function void build_phase(uvm_phase phase);
    super.build_phase(phase);
    drv = dut_driver::type_id::create("drv", this);
    mon = dut_monitor::type_id::create("mon", this);
    sqr = dut_sequencer::type_id::create("sqr", this);
  endfunction

  function void connect_phase(uvm_phase phase);
    drv.seq_item_port.connect(sqr.seq_item_export);
  endfunction
endclass
