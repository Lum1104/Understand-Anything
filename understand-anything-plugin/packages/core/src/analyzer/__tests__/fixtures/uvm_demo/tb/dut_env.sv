// dut_env — top-level UVM environment (agent + scoreboard)
class dut_env extends uvm_env;
  `uvm_component_utils(dut_env)

  dut_agent      agt;
  dut_scoreboard sb;

  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction

  function void build_phase(uvm_phase phase);
    super.build_phase(phase);
    agt = dut_agent::type_id::create("agt", this);
    sb  = dut_scoreboard::type_id::create("sb", this);
  endfunction

  function void connect_phase(uvm_phase phase);
    agt.mon.ap.connect(sb.imp);
  endfunction
endclass
