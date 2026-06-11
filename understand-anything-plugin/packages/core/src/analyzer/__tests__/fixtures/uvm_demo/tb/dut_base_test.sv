// dut_base_test — base UVM test: builds the env and runs the sequence
class dut_base_test extends uvm_test;
  `uvm_component_utils(dut_base_test)

  dut_env env;

  function new(string name = "dut_base_test", uvm_component parent = null);
    super.new(name, parent);
  endfunction

  function void build_phase(uvm_phase phase);
    super.build_phase(phase);
    env = dut_env::type_id::create("env", this);
  endfunction

  task run_phase(uvm_phase phase);
    dut_sequence seq;
    phase.raise_objection(this);
    seq = dut_sequence::type_id::create("seq");
    seq.start(env.agt.sqr);
    phase.drop_objection(this);
  endtask
endclass
