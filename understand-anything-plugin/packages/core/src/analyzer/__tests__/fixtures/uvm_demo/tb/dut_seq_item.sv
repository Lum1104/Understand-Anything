// dut_seq_item — UVM transaction (sequence item)
class dut_seq_item extends uvm_sequence_item;
  rand bit [7:0] addr;
  rand bit [7:0] data;

  `uvm_object_utils_begin(dut_seq_item)
    `uvm_field_int(addr, UVM_ALL_ON)
    `uvm_field_int(data, UVM_ALL_ON)
  `uvm_object_utils_end

  function new(string name = "dut_seq_item");
    super.new(name);
  endfunction
endclass
